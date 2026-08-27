import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/requireAdmin";
import { loadTacheForAccess } from "@/lib/taches";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadTacheForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    await access.ref.update({
      statut: "a_faire",
      completedAt: null,
      completePar: null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[taches reopen]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
