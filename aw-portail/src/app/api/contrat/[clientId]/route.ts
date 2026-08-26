import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { requireClientAccess } from "@/lib/requireClientAccess";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const access = await requireClientAccess(req, clientId);
  if (!access.ok) {
    return new NextResponse(access.error, { status: access.status });
  }

  // Lire l'URL du contrat dans Firestore
  const clientSnap = await adminDb.collection("clients").doc(clientId).get();
  if (!clientSnap.exists) {
    return new NextResponse("Client introuvable", { status: 404 });
  }

  const contrat = clientSnap.data()?.contrat;
  if (!contrat?.urlHTML) {
    return new NextResponse("Aucun contrat généré", { status: 404 });
  }

  // Extraire le chemin du fichier depuis l'URL stockée
  const match = contrat.urlHTML.match(/\/o\/([^?]+)/);
  if (!match) {
    return new NextResponse("URL contrat invalide", { status: 500 });
  }
  const filePath = decodeURIComponent(match[1]);

  // Télécharger le fichier depuis Firebase Storage via Admin SDK
  const bucket = adminStorage.bucket("aw-portail.firebasestorage.app");
  const file   = bucket.file(filePath);

  const [content] = await file.download();

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type":        "text/html; charset=utf-8",
      "Cache-Control":       "no-store",
      "X-Frame-Options":     "SAMEORIGIN",
    },
  });
}
