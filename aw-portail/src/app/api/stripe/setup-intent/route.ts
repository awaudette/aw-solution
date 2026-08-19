import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await adminAuth.verifySessionCookie(sessionCookie, true);

    const { customerId } = await request.json();
    if (!customerId) {
      return NextResponse.json({ error: "customerId requis" }, { status: 400 });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    return NextResponse.json({ client_secret: setupIntent.client_secret });
  } catch (err) {
    console.error("[stripe/setup-intent]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
