import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { sessionCookie } = await request.json();

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userData = userDoc.data()!;

    // Même garde que /api/auth/session : un compte révoqué ne doit jamais
    // repasser cette vérification, permissions ou pas.
    if (userData.statut === "revoque") {
      return NextResponse.json({ error: "Accès révoqué" }, { status: 403 });
    }

    const role     = userData.role as string;
    const clientId = (userData.clientId ?? null) as string | null;

    // Permissions par section — uniquement pertinent pour un rôle "client".
    // clients/{clientId}/users/{uid} absent = compte propriétaire (créé par
    // scripts/seed-*.mjs, jamais dans cette sous-collection) = accès complet,
    // signalé par permissions: null. Document présent = compte invité,
    // permissions restreintes à ce qui est explicitement coché.
    let permissions: Record<string, string | null> | null = null;
    if (role === "client" && clientId) {
      const guestDoc = await adminDb.collection("clients").doc(clientId).collection("users").doc(uid).get();
      if (guestDoc.exists) {
        permissions = (guestDoc.data()?.permissions ?? {}) as Record<string, string | null>;
      }
    }

    return NextResponse.json({ uid, role, clientId, permissions });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
