import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snap = await adminDb.doc("admin_config/documentation_structure").get();
    if (!snap.exists) return NextResponse.json({ categories: [] });
    return NextResponse.json({ categories: snap.data()?.categories ?? [] });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
