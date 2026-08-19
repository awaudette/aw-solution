import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snap = await adminDb.doc("admin_config/faq").get();
    if (!snap.exists) return NextResponse.json({ questions: [] });
    const questions = (snap.data()?.questions ?? [])
      .filter((q: { active?: boolean }) => q.active !== false)
      .sort((a: { ordre?: number }, b: { ordre?: number }) => (a.ordre ?? 0) - (b.ordre ?? 0));
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ questions: [] });
  }
}
