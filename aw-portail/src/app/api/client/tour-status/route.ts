import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireClientAccess } from "@/lib/requireClientAccess";

/**
 * Marqueur de première visite guidée — users/{uid}.tourVu.
 *
 * Passe systématiquement par l'Admin SDK (adminDb), jamais par une écriture
 * Firestore directe depuis le navigateur : le SDK client tourne en session
 * anonyme (voir ClientLayoutWrapper), un uid différent de celui de
 * users/{uid} — l'admin SDK contourne ce problème et tiendra même si les
 * règles Firestore se resserrent plus tard.
 */

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId requis" }, { status: 400 });
  }

  const access = await requireClientAccess(request, clientId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const snap = await adminDb.collection("users").doc(access.uid).get();
  const tourVu = snap.exists ? !!snap.data()?.tourVu : false;
  return NextResponse.json({ tourVu });
}

export async function POST(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId requis" }, { status: 400 });
  }

  const access = await requireClientAccess(request, clientId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await adminDb.collection("users").doc(access.uid).set({ tourVu: true }, { merge: true });
  return NextResponse.json({ ok: true });
}
