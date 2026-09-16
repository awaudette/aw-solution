import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";
import { requireClientAccess } from "@/lib/requireClientAccess";

export async function GET(request: NextRequest) {
  try {
    const clientId   = request.nextUrl.searchParams.get("clientId");
    const customerId = request.nextUrl.searchParams.get("customerId");

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
    // jamais faire confiance à la seule valeur reçue en query string.
    const clientSnap = await adminDb.collection("clients").doc(clientId).get();
    if (!clientSnap.exists || clientSnap.data()?.stripeCustomerId !== customerId) {
      return NextResponse.json({ error: "customerId ne correspond pas à ce client" }, { status: 403 });
    }

    console.log("[stripe/customer] customerId:", customerId);
    console.log("[stripe/customer] STRIPE_SECRET_KEY présente:", !!process.env.STRIPE_SECRET_KEY);

    const [subscriptions, invoices, customer] = await Promise.all([
      stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      }),
      stripe.invoices.list({
        customer: customerId,
        limit: 100,
      }),
      // Le moyen de paiement affiché est toujours invoice_settings.default_payment_method
      // du customer (celui réellement utilisé pour les prélèvements) — jamais "le premier
      // trouvé", qui pouvait être une carte périmée si un débit préautorisé a été ajouté après.
      stripe.customers.retrieve(customerId, {
        expand: ["invoice_settings.default_payment_method"],
      }),
    ]);

    console.log(`[stripe/customer] ${invoices.data.length} facture(s) trouvée(s) pour ${customerId}`);
    console.log("[stripe/customer] statuts:", invoices.data.map((inv) => `${inv.number ?? inv.id}=${inv.status}`));

    // Prochaine facture (aperçu — ne reflète pas toujours la date réelle du prochain
    // prélèvement pour un abonnement en attente de son premier cycle ; voir dateProchaineFacture
    // ci-dessous, qui vient directement de l'item d'abonnement).
    let upcomingInvoice: { montant: number; date: string | null } | null = null;
    try {
      const upcoming = await stripe.invoices.createPreview({ customer: customerId });
      upcomingInvoice = {
        montant: upcoming.amount_due / 100,
        date: upcoming.next_payment_attempt
          ? new Date(upcoming.next_payment_attempt * 1000).toISOString()
          : upcoming.period_end
          ? new Date(upcoming.period_end * 1000).toISOString()
          : null,
      };
    } catch {
      upcomingInvoice = null;
    }

    // Abonnement actif — current_period_end/start vivent désormais sur l'item
    // d'abonnement (SubscriptionItem), plus sur la Subscription elle-même.
    const sub = subscriptions.data[0] ?? null;
    const subItem = sub?.items.data[0] ?? null;
    const subscription = sub
      ? {
          statut:               sub.status,
          dateDebut:            new Date(sub.start_date * 1000).toISOString(),
          dateProchaineFacture: subItem ? new Date(subItem.current_period_end * 1000).toISOString() : null,
          prix: subItem?.price?.unit_amount != null ? subItem.price.unit_amount / 100 : null,
          devise: subItem?.price?.currency?.toUpperCase() ?? "CAD",
        }
      : null;

    // Moyen de paiement par défaut — carte ou débit préautorisé (acss_debit).
    const customerObj = customer as import("stripe").Stripe.Customer;
    const defaultPm = customerObj.deleted ? null : customerObj.invoice_settings?.default_payment_method;
    const pm = defaultPm && typeof defaultPm !== "string" ? defaultPm : null;
    const carte = pm?.type === "card" && pm.card
      ? {
          type:      "card" as const,
          brand:     pm.card.brand,
          last4:     pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year:  pm.card.exp_year,
        }
      : pm?.type === "acss_debit" && pm.acss_debit
      ? {
          type:        "acss_debit" as const,
          bankName:    pm.acss_debit.bank_name,
          last4:       pm.acss_debit.last4,
        }
      : null;

    // Factures — toutes statuts confondus (paid, open, draft, void)
    const invoicesList = invoices.data.map((inv) => ({
      numero:  inv.number ?? inv.id,
      montant: inv.amount_paid / 100,
      devise:  inv.currency.toUpperCase(),
      date:    inv.created ? new Date(inv.created * 1000).toISOString() : null,
      statut:  inv.status,
      urlPDF:  inv.invoice_pdf ?? null,
    }));

    return NextResponse.json({
      subscription,
      invoices:        invoicesList,
      upcomingInvoice,
      paymentMethods:  carte,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? err.stack : undefined;
    console.error("[stripe/customer] ERREUR:", message);
    if (stack) console.error(stack);
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}
