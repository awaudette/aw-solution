import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const userData = userDoc.data()!;
    const role     = userData.role as string;
    const clientId = (userData.clientId ?? null) as string | null;

    const expiresIn    = 60 * 60 * 24 * 5 * 1000; // 5 jours
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Cookie isolé par rôle/client — permet d'être connecté en admin ET en client
    // simultanément dans des onglets différents sans interférence
    const cookieName = role === "admin"
      ? "session_admin"
      : `session_client_${clientId}`;

    const response = NextResponse.json({ role, clientId });

    response.cookies.set(cookieName, sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Supprime uniquement le cookie de session correspondant à la route d'origine.
  // Si "cookieName" est passé dans le body, on l'utilise ; sinon on supprime
  // uniquement le cookie de la session courante (pas les autres portails ouverts).
  let targetCookie: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.cookieName) targetCookie = body.cookieName;
  } catch { /* ignore */ }

  if (targetCookie) {
    response.cookies.delete(targetCookie);
  } else {
    // Fallback : supprimer tous (comportement précédent)
    for (const cookie of request.cookies.getAll()) {
      if (
        cookie.name === "session" ||
        cookie.name === "session_admin" ||
        cookie.name.startsWith("session_client_")
      ) {
        response.cookies.delete(cookie.name);
      }
    }
  }

  return response;
}
