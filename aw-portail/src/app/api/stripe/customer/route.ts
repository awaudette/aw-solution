import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await adminAuth.verifySessionCookie(sessionCookie, true);

    const customerId = request.nextUrl.searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json({ error: "customerId requis" }, { status: 400 });
    }

    console.log("[stripe/customer] customerId:", customerId);
    console.log("[stripe/customer] STRIPE_SECRET_KEY présente:", !!process.env.STRIPE_SECRET_KEY);

    const [subscriptions, invoices, paymentMethods] = await Promise.all([
      stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      }),
      stripe.invoices.list({
        customer: customerId,
        limit: 100,
      }),
      stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      }),
    ]);

    console.log(`[stripe/customer] ${invoices.data.length} facture(s) trouvée(s) pour ${customerId}`);
    console.log("[stripe/customer] statuts:", invoices.data.map((inv) => `${inv.number ?? inv.id}=${inv.status}`));

    // Prochaine facture
    let upcomingInvoice: { montant: number; date: string | null } | null = null;
    try {
      const upcoming = await stripe.invoices.retrieveUpcoming({ customer: customerId });
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

    // Abonnement actif
    const sub = subscriptions.data[0] ?? null;
    const subscription = sub
      ? {
          statut:               sub.status,
          dateDebut:            new Date(sub.start_date * 1000).toISOString(),
          dateProchaineFacture: new Date(sub.current_period_end * 1000).toISOString(),
          prix: sub.items.data[0]?.price?.unit_amount
            ? sub.items.data[0].price.unit_amount / 100
            : null,
          devise: sub.items.data[0]?.price?.currency?.toUpperCase() ?? "CAD",
        }
      : null;

    // Carte enregistrée
    const pm = paymentMethods.data[0] ?? null;
    const carte = pm?.card
      ? {
          brand:     pm.card.brand,
          last4:     pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year:  pm.card.exp_year,
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
