import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";
import { requireClientAccess } from "@/lib/requireClientAccess";

/**
 * Définit le moyen de paiement confirmé par un SetupIntent comme
 * invoice_settings.default_payment_method du customer — celui réellement
 * utilisé pour les prélèvements automatiques. Appelée côté client juste
 * après stripe.confirmSetup(), avec l'id du SetupIntent (jamais directement
 * un paymentMethodId : on relit le SetupIntent côté serveur pour vérifier
 * qu'il appartient bien à CE customer avant de rien enregistrer).
 */
export async function POST(request: NextRequest) {
  try {
    const { customerId, clientId, setupIntentId } = await request.json();
    if (!clientId) {
      return NextResponse.json({ error: "clientId requis" }, { status: 400 });
    }

    const access = await requireClientAccess(request, clientId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!customerId || !setupIntentId) {
      return NextResponse.json({ error: "customerId et setupIntentId requis" }, { status: 400 });
    }

    const clientSnap = await adminDb.collection("clients").doc(clientId).get();
    if (!clientSnap.exists || clientSnap.data()?.stripeCustomerId !== customerId) {
      return NextResponse.json({ error: "customerId ne correspond pas à ce client" }, { status: 403 });
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.customer !== customerId || setupIntent.status !== "succeeded" || !setupIntent.payment_method) {
      return NextResponse.json({ error: "SetupIntent invalide pour ce client" }, { status: 400 });
    }

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: setupIntent.payment_method as string,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[stripe/default-payment-method]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
