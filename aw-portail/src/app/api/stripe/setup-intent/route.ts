import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";
import { requireClientAccess } from "@/lib/requireClientAccess";

export async function POST(request: NextRequest) {
  try {
    const { customerId, clientId } = await request.json();
    if (!clientId) {
      return NextResponse.json({ error: "clientId requis" }, { status: 400 });
    }

    const access = await requireClientAccess(request, clientId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!customerId) {
      return NextResponse.json({ error: "customerId requis" }, { status: 400 });
    }

    // Le customerId doit correspondre à celui enregistré pour CE client —
    // jamais faire confiance à la seule valeur reçue dans le corps.
    const clientSnap = await adminDb.collection("clients").doc(clientId).get();
    if (!clientSnap.exists || clientSnap.data()?.stripeCustomerId !== customerId) {
      return NextResponse.json({ error: "customerId ne correspond pas à ce client" }, { status: 403 });
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
