import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/requireAdmin";
import { loadOrganisationForAccess } from "@/lib/organisations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id, contactId } = await params;
  const access = await loadOrganisationForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const contactRef = access.ref.collection("contacts").doc(contactId);
  const contactSnap = await contactRef.get();
  if (!contactSnap.exists) {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    if ("prenom" in body) update.prenom = typeof body.prenom === "string" ? body.prenom.trim() : "";
    if ("nom" in body) update.nom = typeof body.nom === "string" ? body.nom.trim() : "";
    if ("role" in body) update.role = (body.role as string) || null;
    if ("courriel" in body) update.courriel = (body.courriel as string) || null;
    if ("telephone" in body) update.telephone = (body.telephone as string) || null;
    if ("cellulaire" in body) update.cellulaire = (body.cellulaire as string) || null;
    if ("estDecideur" in body) update.estDecideur = body.estDecideur === true;
    if ("notes" in body) update.notes = (body.notes as string) || null;

    if ("prenom" in update && "nom" in update && !update.prenom && !update.nom) {
      return NextResponse.json({ error: "prenom ou nom requis" }, { status: 400 });
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 });
    }

    await contactRef.update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[organisations/contacts PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id, contactId } = await params;
  const access = await loadOrganisationForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    await access.ref.collection("contacts").doc(contactId).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[organisations/contacts DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
