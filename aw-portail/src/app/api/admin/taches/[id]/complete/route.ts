import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireSection } from "@/lib/requireAdmin";
import { loadTacheForAccess } from "@/lib/taches";

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
    // completedAt/commentaire sont optionnels — comportement inchangé
    // (Timestamp.now(), aucun commentaire) quand ils ne sont pas fournis.
    const body = await req.json().catch(() => ({})) as { completedAt?: string; commentaire?: string };

    let completedAtTs = Timestamp.now();
    if (body.completedAt) {
      const d = new Date(body.completedAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "completedAt invalide" }, { status: 400 });
      }
      completedAtTs = Timestamp.fromDate(d);
    }

    await access.ref.update({
      statut: "complete",
      completedAt: completedAtTs,
      completePar: auth.uid,
    });

    if (body.commentaire && body.commentaire.trim()) {
      await access.ref.collection("commentaires").add({
        texte: body.commentaire.trim(),
        auteur: auth.uid,
        createdAt: Timestamp.now(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[taches complete]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
