import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snap = await adminDb.doc("admin_config/annonces").get();
    const texte = snap.exists ? (snap.data()?.texte ?? "") : "";
    return NextResponse.json({ texte });
  } catch {
    return NextResponse.json({ texte: "" });
  }
}
