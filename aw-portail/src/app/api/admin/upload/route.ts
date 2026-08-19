import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file   = form.get("file")   as File | null;
    const folder = (form.get("folder") as string | null) ?? "uploads";

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
