import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireClientAccess } from "@/lib/requireClientAccess";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const access = await requireClientAccess(req, clientId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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
