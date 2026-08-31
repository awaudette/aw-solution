/**
 * GET /api/client/{clientId}/permissions
 *
 * Utilisé côté navigateur (ClientSidebar.tsx) pour savoir quelles sections
 * masquer — la vraie protection vit dans src/middleware.ts, ceci n'est que
 * l'affichage. Nécessaire parce que le portail client se connecte en
 * anonyme côté Firebase Auth (voir ClientLayoutWrapper.tsx) : l'identité
 * réelle vit uniquement dans le cookie de session httpOnly, illisible en
 * JS — un composant client ne peut pas la lire lui-même, il doit demander
 * au serveur.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireClientAccess } from "@/lib/requireClientAccess";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const access = await requireClientAccess(req, clientId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // Admin/employé : accès complet, rien à restreindre.
  if (access.role !== "client") {
    return NextResponse.json({ permissions: null });
  }

  // clients/{clientId}/users/{uid} absent = compte propriétaire = accès
  // complet (permissions: null, même convention que /api/auth/verify).
  const guestDoc = await adminDb.collection("clients").doc(clientId).collection("users").doc(access.uid).get();
  const permissions = guestDoc.exists ? (guestDoc.data()?.permissions ?? {}) : null;

  return NextResponse.json({ permissions });
}
