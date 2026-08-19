import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  try {
    const snap = await adminDb
      .collection("nouveautes")
      .where("publie", "==", true)
      .orderBy("date", "desc")
      .get();

    const items = snap.docs
      .map(d => {
        const data = d.data();
        return {
          id:          d.id,
          titre:       data.titre        ?? "",
          contenu:     data.contenu      ?? "",
          type:        data.type         ?? "nouveaute",
          destinataires: data.destinataires,
          date:        data.date?.toMillis?.() ?? Date.now(),
          fichierUrl:  data.fichierUrl   ?? null,
          fichierNom:  data.fichierNom   ?? null,
          fichierType: data.fichierType  ?? null,
        };
      })
      .filter(n =>
        n.destinataires === "tous" ||
        (Array.isArray(n.destinataires) && n.destinataires.includes(clientId))
      );

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[nouveautes API]", err);
    return NextResponse.json({ items: [] });
  }
}
