import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * Vérifie que la requête provient d'un admin authentifié (cookie session_admin).
 * Retourne l'uid si valide, sinon null. Ne lève jamais — laisse l'appelant
 * décider du code de statut (401/403) et du message renvoyé.
 */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const session = req.cookies.get("session_admin")?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== "admin") return null;
    return decoded.uid;
  } catch {
    return null;
  }
}
