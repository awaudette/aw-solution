import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type AuthSuccess = { ok: true; uid: string; role: "admin" | "client" };
export type AuthFailure = { ok: false; status: 401 | 403; error: string };
export type AuthResult  = AuthSuccess | AuthFailure;

/**
 * Vérifie qu'un appel API portant sur un clientId précis provient soit d'un
 * admin, soit du compte de CE client exactement. Reproduit la même
 * convention de cookies que src/middleware.ts (session_admin /
 * session_client_{clientId}) pour rester cohérent avec la protection des
 * pages.
 *
 * 401 = aucune session valide trouvée (cookie absent ou rejeté).
 * 403 = session valide, mais rôle ou clientId ne donnant pas accès à CE client.
 */
export async function requireClientAccess(req: NextRequest, clientId: string): Promise<AuthResult> {
  // 1. Session admin — un admin peut agir sur n'importe quel client.
  const adminSession = req.cookies.get("session_admin")?.value;
  if (adminSession) {
    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true);
      const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
      if (userSnap.exists && userSnap.data()?.role === "admin") {
        return { ok: true, uid: decoded.uid, role: "admin" };
      }
    } catch {
      // Cookie admin invalide — on retente la session client ci-dessous
      // avant de conclure à un échec.
    }
  }

  // 2. Session client — doit correspondre exactement au clientId visé.
  const clientSession = req.cookies.get(`session_client_${clientId}`)?.value;
  if (!clientSession) {
    return { ok: false, status: 401, error: "Non authentifié" };
  }
  try {
    const decoded = await adminAuth.verifySessionCookie(clientSession, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists) {
      return { ok: false, status: 401, error: "Compte introuvable" };
    }
    const data = userSnap.data()!;
    if (data.role !== "client" || data.clientId !== clientId) {
      return { ok: false, status: 403, error: "Accès refusé à ce client" };
    }
    return { ok: true, uid: decoded.uid, role: "client" };
  } catch {
    return { ok: false, status: 401, error: "Session invalide" };
  }
}

/**
 * Vérifie qu'un appel API provient d'une session valide — admin ou
 * n'importe quel client — sans comparer de clientId. Réservée aux endpoints
 * qui ne renvoient aucune donnée spécifique à un client (contenu global en
 * lecture seule : annonces, FAQ, structure de documentation).
 */
export async function requireAnySession(req: NextRequest): Promise<AuthResult> {
  const adminSession = req.cookies.get("session_admin")?.value;
  if (adminSession) {
    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true);
      const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
      if (userSnap.exists && userSnap.data()?.role === "admin") {
        return { ok: true, uid: decoded.uid, role: "admin" };
      }
    } catch {
      // on retente une session client ci-dessous
    }
  }

  const clientCookie = req.cookies.getAll().find(c => c.name.startsWith("session_client_"));
  if (!clientCookie) {
    return { ok: false, status: 401, error: "Non authentifié" };
  }
  try {
    const decoded = await adminAuth.verifySessionCookie(clientCookie.value, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== "client") {
      return { ok: false, status: 403, error: "Compte non autorisé" };
    }
    return { ok: true, uid: decoded.uid, role: "client" };
  } catch {
    return { ok: false, status: 401, error: "Session invalide" };
  }
}
