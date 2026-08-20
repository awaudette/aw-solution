/**
 * Base de connaissances interne AW Solution — liste + upload.
 * Collection Firestore : documentation_interne. Fichiers : Firebase Storage
 * sous documentation-interne/, jamais rendus publics (adminStorage uniquement).
 * Accès strictement réservé aux comptes admin — voir requireAdmin().
 */

import { NextRequest, NextResponse } from "next/server";
import { Timestamp, DocumentData } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/requireAdmin";

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "aw-portail.firebasestorage.app";
const SANS_CATEGORIE_LABEL = "Sans catégorie";

function serialize(id: string, data: DocumentData) {
  return {
    id,
    nom: data.nom as string,
    extension: data.extension as string,
    categorieId: data.categorieId as string,
    categorieLabel: data.categorieLabel as string,
    mimeType: data.mimeType as string,
    taille: data.taille as number,
    uploadedByNom: (data.uploadedByNom as string) ?? "",
    createdAt: (data.createdAt as Timestamp)?.toDate?.().toISOString() ?? null,
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.().toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const snap = await adminDb.collection("documentation_interne").orderBy("createdAt", "desc").get();
  const documents = snap.docs.map(d => serialize(d.id, d.data()));

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const uid = await requireAdmin(req);
  if (!uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const form = await req.formData();
  const file           = form.get("file") as File | null;
  const categorieId    = ((form.get("categorieId") as string | null) ?? "").trim();
  const categorieLabel = ((form.get("categorieLabel") as string | null) ?? "").trim() || SANS_CATEGORIE_LABEL;

  if (!file) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });

  const uploaderSnap = await adminDb.collection("users").doc(uid).get();
  const uploadedByNom = (uploaderSnap.data()?.nom as string) ?? (uploaderSnap.data()?.email as string) ?? "";

  const extension = (file.name.split(".").pop() ?? "").toLowerCase();
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `documentation-interne/${categorieId || "sans-categorie"}/${Date.now()}_${safeName}`;

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const bucket = adminStorage.bucket(BUCKET_NAME);
  const fileRef = bucket.file(storagePath);

  // Jamais public — accès exclusivement via /fichier, protégé par requireAdmin.
  await fileRef.save(buffer, { metadata: { contentType: file.type || "application/octet-stream" } });

  const now = Timestamp.now();
  const docRef = await adminDb.collection("documentation_interne").add({
    nom: file.name,
    extension,
    categorieId,
    categorieLabel,
    mimeType: file.type || "application/octet-stream",
    taille: file.size,
    storagePath,
    uploadedByUid: uid,
    uploadedByNom,
    createdAt: now,
    updatedAt: now,
  });

  const created = await docRef.get();
  return NextResponse.json({ document: serialize(created.id, created.data()!) });
}
