/**
 * Sert le contenu d'un document de la base de connaissances interne — aperçu
 * (inline) ou téléchargement (?telecharger=1). Le fichier n'est jamais public
 * dans Storage ; il transite uniquement par cette route, protégée par
 * requireSection(req, "documentation").
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { requireSection } from "@/lib/requireAdmin";

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "aw-portail.firebasestorage.app";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const auth = await requireSection(req, "documentation");
  if (!auth.ok) return new NextResponse(auth.error, { status: auth.status });

  const { docId } = await params;
  const snap = await adminDb.collection("documentation_interne").doc(docId).get();
  if (!snap.exists) return new NextResponse("Document introuvable", { status: 404 });

  const data = snap.data()!;
  const storagePath = data.storagePath as string;
  const mimeType    = (data.mimeType as string) ?? "application/octet-stream";
  const nom          = (data.nom as string) ?? "fichier";

  const file = adminStorage.bucket(BUCKET_NAME).file(storagePath);
  const [exists] = await file.exists();
  if (!exists) return new NextResponse("Fichier introuvable dans Storage", { status: 404 });

  const [content] = await file.download();

  const telecharger = req.nextUrl.searchParams.get("telecharger") === "1";
  const disposition = `${telecharger ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(nom)}`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type":        mimeType,
      "Content-Disposition": disposition,
      "Cache-Control":       "private, max-age=0, must-revalidate",
      "X-Frame-Options":     "SAMEORIGIN",
    },
  });
}
