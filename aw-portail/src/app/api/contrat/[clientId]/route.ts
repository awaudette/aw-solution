import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  // Vérifier le cookie de session
  const session = req.cookies.get("session")?.value;
  if (!session) {
    return new NextResponse("Non authentifié", { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifySessionCookie(session, true);
  } catch {
    return new NextResponse("Session invalide", { status: 401 });
  }

  // Vérifier que l'utilisateur est admin ou le client concerné
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userSnap.exists) {
    return new NextResponse("Accès refusé", { status: 403 });
  }
  const user = userSnap.data()!;
  if (user.role !== "admin" && user.clientId !== clientId) {
    return new NextResponse("Accès refusé", { status: 403 });
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
