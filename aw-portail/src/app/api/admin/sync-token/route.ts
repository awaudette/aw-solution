/**
 * Génère / régénère le jeton de synchronisation d'un client (portailSyncJob →
 * POST /api/sync/analytics) et expose son statut à l'interface admin.
 *
 * Le jeton en clair n'est renvoyé qu'à la génération — il n'est jamais stocké
 * ni relogué. Régénérer écrase le hash existant, ce qui révoque immédiatement
 * l'ancien jeton sans affecter les autres clients.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateSyncToken } from "@/lib/syncToken";

async function requireAdmin(req: NextRequest): Promise<string | null> {
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

function tokenDocRef(clientId: string) {
  return adminDb.collection("clients").doc(clientId).collection("syncConfig").doc("token");
}

// Génère (ou régénère) le jeton d'un client.
export async function POST(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { clientId } = (await req.json().catch(() => ({}))) as { clientId?: string };
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const clientSnap = await adminDb.collection("clients").doc(clientId).get();
  if (!clientSnap.exists) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  const { token, tokenHash, tokenSuffix } = generateSyncToken();

  await tokenDocRef(clientId).set({
    tokenHash,
    tokenSuffix,
    revoked: false,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
    lastUsedAt: null,
  });

  return NextResponse.json({ token, tokenSuffix });
}

// Statut du jeton — jamais le jeton ni son hash.
export async function GET(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const snap = await tokenDocRef(clientId).get();
  if (!snap.exists) return NextResponse.json({ exists: false });

  const d = snap.data()!;
  return NextResponse.json({
    exists: true,
    tokenSuffix: d.tokenSuffix ?? null,
    revoked: d.revoked === true,
    createdAt: d.createdAt?.toDate?.().toISOString() ?? null,
    lastUsedAt: d.lastUsedAt?.toDate?.().toISOString() ?? null,
  });
}
