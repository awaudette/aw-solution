import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type AdminAuthResult =
  | { ok: true; uid: string }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Version détaillée de requireAdmin — distingue 401 (aucune session valide)
 * de 403 (session valide mais rôle non-admin), avec un message par cas.
 * À utiliser pour toute nouvelle route qui doit renvoyer un code précis.
 */
export async function requireAdminDetailed(req: NextRequest): Promise<AdminAuthResult> {
  const session = req.cookies.get("session_admin")?.value;
  if (!session) return { ok: false, status: 401, error: "Non authentifié" };
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== "admin") {
      return { ok: false, status: 403, error: "Accès réservé aux administrateurs" };
    }
    return { ok: true, uid: decoded.uid };
  } catch {
    return { ok: false, status: 401, error: "Session invalide" };
  }
}

/**
 * Vérifie que la requête provient d'un admin authentifié (cookie session_admin).
 * Retourne l'uid si valide, sinon null. Ne lève jamais — laisse l'appelant
 * décider du code de statut (401/403) et du message renvoyé.
 *
 * Conservée telle quelle pour compatibilité avec les appelants existants.
 * Pour un code d'erreur 401/403 distinct, utiliser requireAdminDetailed.
 */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const result = await requireAdminDetailed(req);
  return result.ok ? result.uid : null;
}
