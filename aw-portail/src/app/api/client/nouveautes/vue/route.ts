import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { nouveauteId, clientId } = await req.json() as {
      nouveauteId: string;
      clientId: string;
    };
    if (!nouveauteId || !clientId) {
      return NextResponse.json({ ok: false }, { status: 400 });
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
