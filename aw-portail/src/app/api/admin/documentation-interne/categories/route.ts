/**
 * Catégories de la base de connaissances interne (admin_config/documentation_interne_categories).
 * Un seul document avec un tableau `categories: [{ id, nom }]` — même convention que
 * admin_config/documentation_structure et admin_config/faq.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/requireAdmin";

interface Categorie { id: string; nom: string }

const CONFIG_DOC = adminDb.collection("admin_config").doc("documentation_interne_categories");

async function readCategories(): Promise<Categorie[]> {
  const snap = await CONFIG_DOC.get();
  return snap.exists ? (snap.data()?.categories ?? []) : [];
}

export async function GET(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const categories = await readCategories();
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { nom } = (await req.json().catch(() => ({}))) as { nom?: string };
  if (!nom?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const categories = await readCategories();
  const categorie: Categorie = { id: `cat_${Date.now()}`, nom: nom.trim() };
  await CONFIG_DOC.set({ categories: [...categories, categorie] });

  return NextResponse.json({ categorie });
}

export async function PATCH(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id, nom } = (await req.json().catch(() => ({}))) as { id?: string; nom?: string };
  if (!id || !nom?.trim()) return NextResponse.json({ error: "id et nom requis" }, { status: 400 });

  const categories = await readCategories();
  if (!categories.some(c => c.id === id)) {
    return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  }
  const updated = categories.map(c => c.id === id ? { ...c, nom: nom.trim() } : c);
  await CONFIG_DOC.set({ categories: updated });

  // Garder le libellé dénormalisé à jour sur tous les documents de cette catégorie.
  const docsSnap = await adminDb.collection("documentation_interne").where("categorieId", "==", id).get();
  if (!docsSnap.empty) {
    const batch = adminDb.batch();
    docsSnap.docs.forEach(d => batch.update(d.ref, { categorieLabel: nom.trim() }));
    await batch.commit();
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const inUse = await adminDb.collection("documentation_interne").where("categorieId", "==", id).limit(1).get();
  if (!inUse.empty) {
    return NextResponse.json(
      { error: "Cette catégorie contient encore des documents — déplacez-les avant de la supprimer." },
      { status: 409 }
    );
  }

  const categories = await readCategories();
  await CONFIG_DOC.set({ categories: categories.filter(c => c.id !== id) });

  return NextResponse.json({ success: true });
}
