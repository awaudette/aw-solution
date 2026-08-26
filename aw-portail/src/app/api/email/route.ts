import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { requireAnySession } from "@/lib/requireClientAccess";

// Boîtes internes vers lesquelles le portail client peut déclencher un envoi
// (notifications de messagerie et de calendrier). Un client ne peut jamais
// cibler une autre adresse ; seul un admin peut envoyer à un destinataire
// arbitraire (ex. notifier un client à son courriel enregistré).
const INTERNAL_INBOXES = new Set(["support@awsolution.ca", "alex@awsolution.ca"]);

export async function POST(request: NextRequest) {
  const access = await requireAnySession(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { to, subject, html } = await request.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    if (access.role !== "admin" && !INTERNAL_INBOXES.has(to)) {
      return NextResponse.json({ error: "Destinataire non autorisé" }, { status: 403 });
    }

    console.log("Email request:", { to, subject });

    const { data, error } = await resend.emails.send({
      from: "support@awsolution.ca",
      to,
      subject,
      html,
    });

    console.log("Resend response:", JSON.stringify(data));

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("Resend error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
