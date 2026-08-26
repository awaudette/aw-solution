import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAnySession } from "@/lib/requireClientAccess";

export async function GET(req: NextRequest) {
  const access = await requireAnySession(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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
