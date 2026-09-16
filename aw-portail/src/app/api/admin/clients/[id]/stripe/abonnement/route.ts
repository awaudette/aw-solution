import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { stripe, PRICE_ID_FORFAIT_ESSENTIEL } from "@/lib/stripe";
import { requireAdminDetailed } from "@/lib/requireAdmin";
import { aujourdhuiMontreal, montrealVersUTC } from "@/lib/tz";

/** 1er jour du mois suivant, minuit heure de Montréal, en instant UTC. */
function premierDuMoisSuivantMontreal(): Date {
  const [y, m] = aujourdhuiMontreal().split("-").map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear  = m === 12 ? y + 1 : y;
  return montrealVersUTC(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`, "00:00");
}

const STATUTS_INACTIFS = new Set(["canceled", "incomplete_expired"]);

/**
 * État de l'abonnement Stripe d'un client, pour la fiche client admin —
 * soit l'abonnement actif existant (avec sa prochaine date de prélèvement),
 * soit la liste des prix récurrents actifs pour permettre d'en créer un.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminDetailed(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: clientId } = await params;
  const clientSnap = await adminDb.collection("clients").doc(clientId).get();
  if (!clientSnap.exists) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }
  const customerId = clientSnap.data()?.stripeCustomerId as string | undefined;
  if (!customerId) {
    return NextResponse.json({ hasStripeCustomer: false, subscription: null, prices: [] });
  }

  try {
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    const actif = existing.data.find((s) => !STATUTS_INACTIFS.has(s.status));

    if (actif) {
      const item = actif.items.data[0] ?? null;
      const price = item?.price ?? null;
      const productId = price?.product;
      let nom: string | null = null;
      if (typeof productId === "string") {
        const product = await stripe.products.retrieve(productId);
        nom = product.deleted ? null : product.name;
      }
      return NextResponse.json({
        hasStripeCustomer: true,
        subscription: {
          id: actif.id,
          statut: actif.status,
          nom,
          prix: price?.unit_amount != null ? price.unit_amount / 100 : null,
          devise: price?.currency?.toUpperCase() ?? "CAD",
          dateProchaineFacture: item ? new Date(item.current_period_end * 1000).toISOString() : null,
        },
        prices: [],
      });
    }

    const pricesList = await stripe.prices.list({ active: true, type: "recurring", limit: 100, expand: ["data.product"] });
    const prices = pricesList.data
      .filter((p) => {
        const product = p.product;
        return typeof product !== "string" && !("deleted" in product && product.deleted) && product.active === true;
      })
      .map((p) => {
        const product = p.product as import("stripe").Stripe.Product;
        return {
          id: p.id,
          nom: product.name,
          montant: p.unit_amount != null ? p.unit_amount / 100 : null,
          devise: p.currency.toUpperCase(),
        };
      });

    return NextResponse.json({ hasStripeCustomer: true, subscription: null, prices });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/clients/stripe/abonnement][GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Crée l'abonnement Stripe d'un client — réservé aux admins (jamais aux
 * employés : c'est un engagement financier, pas une action opérationnelle).
 *
 * Par défaut : prix "Forfait Essentiel" (149 $ CAD/mois), premier prélèvement
 * le 1er du mois suivant, sans prorata (billing_cycle_anchor futur — pas
 * trial_end, qui mettrait l'abonnement en statut "trialing" et le ferait
 * disparaître du filtre status:"active" utilisé par /api/stripe/customer).
 *
 * Body optionnel :
 *   priceId           — pour un test avec un prix temporaire (ex. 1 $ CAD/mois).
 *   demarrageImmediat — true = facturé tout de suite (nécessite un moyen de
 *                       paiement déjà enregistré) ; false/absent = comportement
 *                       par défaut ci-dessus.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminDetailed(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: clientId } = await params;
  const clientSnap = await adminDb.collection("clients").doc(clientId).get();
  if (!clientSnap.exists) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }
  const customerId = clientSnap.data()?.stripeCustomerId as string | undefined;
  if (!customerId) {
    return NextResponse.json({ error: "Ce client n'a pas de customerId Stripe" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { priceId?: string; demarrageImmediat?: boolean };
  const priceId = body.priceId?.trim() || PRICE_ID_FORFAIT_ESSENTIEL;
  const demarrageImmediat = body.demarrageImmediat === true;

  try {
    // Refuse si un abonnement (peu importe son statut, sauf annulé/expiré) existe déjà.
    const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    const actif = existing.data.find((s) => !STATUTS_INACTIFS.has(s.status));
    if (actif) {
      return NextResponse.json(
        { error: `Un abonnement existe déjà pour ce client (${actif.id}, statut : ${actif.status})` },
        { status: 409 },
      );
    }

    if (demarrageImmediat) {
      const customer = await stripe.customers.retrieve(customerId);
      const hasPm = !("deleted" in customer && customer.deleted) && !!customer.invoice_settings?.default_payment_method;
      if (!hasPm) {
        return NextResponse.json(
          { error: "Aucun moyen de paiement enregistré pour ce client — ajoutez-en un avant un démarrage immédiat" },
          { status: 400 },
        );
      }

      const sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        collection_method: "charge_automatically",
        proration_behavior: "none",
      });
      return NextResponse.json({ ok: true, subscriptionId: sub.id, status: sub.status, priceId, demarrageImmediat: true });
    }

    const anchor = premierDuMoisSuivantMontreal();
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      collection_method: "charge_automatically",
      proration_behavior: "none",
      billing_cycle_anchor: Math.floor(anchor.getTime() / 1000),
    });

    return NextResponse.json({
      ok: true,
      subscriptionId: sub.id,
      status: sub.status,
      priceId,
      premierPrelevement: anchor.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/clients/stripe/abonnement]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
