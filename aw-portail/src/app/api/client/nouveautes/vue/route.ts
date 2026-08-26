import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireClientAccess } from "@/lib/requireClientAccess";

export async function POST(req: NextRequest) {
  try {
    const { nouveauteId, clientId } = await req.json() as {
      nouveauteId: string;
      clientId: string;
    };
    if (!nouveauteId || !clientId) {
      return NextResponse.json({ ok: false, error: "Champs manquants" }, { status: 400 });
    }

    const access = await requireClientAccess(req, clientId);
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    await adminDb
      .collection("nouveautes")
      .doc(nouveauteId)
      .collection("vues")
      .doc(clientId)
      .set({ vuAt: FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[nouveautes/vue API]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
