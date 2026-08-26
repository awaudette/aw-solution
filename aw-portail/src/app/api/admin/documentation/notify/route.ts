import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { resend } from "@/lib/resend";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminDetailed } from "@/lib/requireAdmin";

export async function POST(req: NextRequest) {
  const auth = await requireAdminDetailed(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { clientId, titre } = await req.json() as { clientId: string; titre: string };
    if (!clientId || !titre) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    const clientSnap = await adminDb.doc(`clients/${clientId}`).get();
    const d = clientSnap.data() ?? {};
    const courriel = d.courriel ?? "";
    const nom = d.nom ?? d.restaurant ?? "client";

    const now = FieldValue.serverTimestamp();

    // Message dans la messagerie du client
    await adminDb.collection(`clients/${clientId}/messages`).add({
      texte: `Nouveau document disponible dans votre espace Documentation : ${titre}`,
      auteur: "AW Solution",
      auteurRole: "admin",
      date: now,
      lu: false,
      lien: "documentation",
      typeMsg: "document",
    });

    // Courriel au client
    if (courriel) {
      await resend.emails.send({
        from: "AW Solution <noreply@awsolution.ca>",
        to: courriel,
        subject: `Nouveau document disponible — ${titre}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:36px 24px;color:#1F2937">
            <div style="margin-bottom:24px">
              <span style="background:#0362E3;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px">AW Solution</span>
            </div>
            <h2 style="font-size:20px;font-weight:700;margin:0 0 10px;color:#0A0A0A">Nouveau document disponible</h2>
            <p style="font-size:14px;color:#6B7280;margin:0 0 20px;line-height:1.6">
              Bonjour <strong>${nom}</strong>,<br/>
              Un nouveau document vient d'être déposé dans votre espace Documentation :
            </p>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px 20px;margin-bottom:24px">
              <p style="font-size:15px;font-weight:600;color:#0A0A0A;margin:0">${titre}</p>
            </div>
            <a href="https://portail.awsolution.ca/client/${clientId}/documentation"
               style="display:inline-block;background:#0362E3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600">
              Voir le document →
            </a>
            <p style="font-size:12px;color:#9CA3AF;margin-top:28px">
              Ce document est disponible dans votre portail client, section Documentation.
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[doc notify]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
