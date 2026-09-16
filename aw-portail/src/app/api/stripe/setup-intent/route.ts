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
      payment_method_types: ["card", "acss_debit"],
      usage: "off_session",
      // acss_debit exige toujours un mandat explicite (aucune valeur implicite
      // possible via un futur PaymentIntent, contrairement à card) — mandat de
      // type "business" (le payeur est la franchise, pas un particulier) avec
      // un prélèvement mensuel récurrent.
      payment_method_options: {
        acss_debit: {
          currency: "cad",
          mandate_options: {
            transaction_type: "business",
            payment_schedule: "interval",
            interval_description: "Prélèvement automatique le 1er de chaque mois pour l'abonnement AW Solution.",
          },
        },
      },
    });

    return NextResponse.json({ client_secret: setupIntent.client_secret });
  } catch (err) {
    console.error("[stripe/setup-intent]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
