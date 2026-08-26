import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { requireAdminDetailed } from "@/lib/requireAdmin";
import { requireClientAccess } from "@/lib/requireClientAccess";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file   = form.get("file")   as File | null;
    const folder = (form.get("folder") as string | null) ?? "uploads";

    // Cette route est appelée à la fois par le portail admin (dossiers
    // génériques : "nouveautes", "uploads"...) et par le portail client
    // (dossiers scopés : "clients/{clientId}/support",
    // "clients/{clientId}/documentation/..."). Un dossier scopé à un client
    // autorise l'admin ou ce client précis ; un dossier générique exige l'admin.
    const clientMatch = folder.match(/^clients\/([^/]+)\//);
    if (clientMatch) {
      const access = await requireClientAccess(req, clientMatch[1]);
      if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
    } else {
      const auth = await requireAdminDetailed(req);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    }

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
    }

    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "aw-portail.firebasestorage.app";
    const bucket  = adminStorage.bucket(bucketName);
    const fileRef = bucket.file(`${folder}/${safeName}`);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });

    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${bucketName}/${folder}/${safeName}`;

    return NextResponse.json({ url, nom: file.name, type: file.type });
  } catch (err) {
    console.error("[upload API]", err);
    return NextResponse.json({ error: "Échec de l'upload" }, { status: 500 });
  }
}
