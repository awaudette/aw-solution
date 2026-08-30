import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireSection } from "@/lib/requireAdmin";
import { loadTacheForAccess, serializeCommentaire } from "@/lib/taches";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSection(req, "aFaire");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadTacheForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const snap = await access.ref.collection("commentaires").orderBy("createdAt", "asc").get();
  return NextResponse.json({ commentaires: snap.docs.map(d => serializeCommentaire(d.id, d.data())) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSection(req, "aFaire", "ecriture");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadTacheForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { texte } = await req.json() as { texte?: string };
    if (!texte || !texte.trim()) {
      return NextResponse.json({ error: "texte requis" }, { status: 400 });
    }

    const docRef = await access.ref.collection("commentaires").add({
      texte: texte.trim(),
      auteur: auth.uid,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (err) {
    console.error("[taches/commentaires POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
