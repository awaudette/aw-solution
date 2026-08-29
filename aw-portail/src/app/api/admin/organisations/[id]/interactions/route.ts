import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireStaff } from "@/lib/requireAdmin";
import { loadOrganisationForAccess, serializeInteraction, addInteractionAndTouch } from "@/lib/organisations";
import { INTERACTION_TYPE_VALUES, REACTION_VALUES, type InteractionType, type Reaction } from "@/config/organisations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadOrganisationForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const snap = await access.ref.collection("interactions").orderBy("date", "desc").get();
  return NextResponse.json({ interactions: snap.docs.map(d => serializeInteraction(d.id, d.data())) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadOrganisationForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json() as Record<string, unknown>;

    if (!INTERACTION_TYPE_VALUES.includes(body.type as InteractionType)) {
      return NextResponse.json({ error: "type invalide" }, { status: 400 });
    }
    const texte = typeof body.texte === "string" ? body.texte.trim() : "";
    if (!texte) {
      return NextResponse.json({ error: "texte requis" }, { status: 400 });
    }
    if ("reaction" in body && body.reaction !== null && !REACTION_VALUES.includes(body.reaction as Reaction)) {
      return NextResponse.json({ error: "reaction invalide" }, { status: 400 });
    }

    let dateTs = Timestamp.now();
    if (body.date) {
      const d = new Date(body.date as string);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "date invalide" }, { status: 400 });
      }
      dateTs = Timestamp.fromDate(d);
    }

    const newId = await addInteractionAndTouch(access.ref, {
      type: body.type as string,
      date: dateTs,
      auteur: auth.uid,
      texte,
      reaction: (body.reaction as Reaction) ?? null,
      // Jamais laissé au client — une interaction saisie via cette route est
      // toujours manuelle. Seul logChangementEtape() pose automatique: true.
      automatique: false,
    }, access.data.derniereInteraction ?? null);

    return NextResponse.json({ ok: true, id: newId });
  } catch (err) {
    console.error("[organisations/interactions POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
