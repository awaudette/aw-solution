import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireStaff } from "@/lib/requireAdmin";
import { loadOrganisationForAccess, serializeContact } from "@/lib/organisations";

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

  const snap = await access.ref.collection("contacts").orderBy("createdAt", "asc").get();
  return NextResponse.json({ contacts: snap.docs.map(d => serializeContact(d.id, d.data())) });
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
    const prenom = typeof body.prenom === "string" ? body.prenom.trim() : "";
    const nom = typeof body.nom === "string" ? body.nom.trim() : "";
    if (!prenom && !nom) {
      return NextResponse.json({ error: "prenom ou nom requis" }, { status: 400 });
    }

    const docRef = await access.ref.collection("contacts").add({
      prenom,
      nom,
      role: (body.role as string) || null,
      courriel: (body.courriel as string) || null,
      telephone: (body.telephone as string) || null,
      cellulaire: (body.cellulaire as string) || null,
      estDecideur: body.estDecideur === true,
      notes: (body.notes as string) || null,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (err) {
    console.error("[organisations/contacts POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
