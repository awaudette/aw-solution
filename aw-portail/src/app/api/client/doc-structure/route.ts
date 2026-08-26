import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAnySession } from "@/lib/requireClientAccess";

export async function GET(req: NextRequest) {
  const access = await requireAnySession(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const snap = await adminDb.doc("admin_config/documentation_structure").get();
    if (!snap.exists) return NextResponse.json({ categories: [] });
    return NextResponse.json({ categories: snap.data()?.categories ?? [] });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
