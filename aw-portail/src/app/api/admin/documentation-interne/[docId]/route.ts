import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/requireAdmin";

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "aw-portail.firebasestorage.app";
const SANS_CATEGORIE_LABEL = "Sans catégorie";

// Renommer et/ou déplacer un document vers une autre catégorie.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { docId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    nom?: string; categorieId?: string; categorieLabel?: string;
  };

  const ref  = adminDb.collection("documentation_interne").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (typeof body.nom === "string" && body.nom.trim()) {
    updates.nom = body.nom.trim();
  }
  if (typeof body.categorieId === "string") {
    updates.categorieId    = body.categorieId;
    updates.categorieLabel = body.categorieLabel?.trim() || SANS_CATEGORIE_LABEL;
  }

  await ref.update(updates);
  return NextResponse.json({ success: true });
}

// Supprime le document et son fichier associé dans Storage.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { docId } = await params;
  const ref  = adminDb.collection("documentation_interne").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const storagePath = snap.data()?.storagePath as string | undefined;
  if (storagePath) {
    await adminStorage.bucket(BUCKET_NAME).file(storagePath).delete({ ignoreNotFound: true });
  }
  await ref.delete();

  return NextResponse.json({ success: true });
}
