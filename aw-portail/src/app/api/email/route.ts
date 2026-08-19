import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
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
