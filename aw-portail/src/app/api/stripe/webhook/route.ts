import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { resend } from "@/lib/resend";

/**
 * Webhook Stripe — https://portail.awsolution.ca/api/stripe/webhook
 *
 * Endpoint public (aucun cookie de session côté Stripe) — l'authenticité de
 * chaque requête repose entièrement sur la vérification de signature
 * ci-dessous. Non protégé par src/middleware.ts : son matcher exclut déjà
 * tout /api/* (voir config.matcher), donc rien à ajouter là.
 *
 * Idempotence : Stripe peut renvoyer plusieurs fois le même event.id (retries
 * réseau, etc.) — chaque event traité est enregistré dans stripe_events/{id}
 * et un event déjà présent est ignoré (200 immédiat, aucun retraitement).
 */

const clientsCol = () => adminDb.collection("clients");

async function findClientByCustomerId(customerId: string): Promise<{ id: string; nom: string } | null> {
  const snap = await clientsCol().where("stripeCustomerId", "==", customerId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, nom: doc.data().nom ?? "" };
}

/** Écrit une notification dans clients/{clientId}/notifs — même forme que src/lib/notifications.ts,
 *  réécrite ici via adminDb (le helper existant utilise le SDK client, inutilisable côté serveur). */
async function writeNotif(params: {
  clientId: string; clientNom: string;
  destinataire: "admin" | "client";
  type: string; description: string; lien: string;
  actionRequise?: boolean;
}): Promise<void> {
  await clientsCol().doc(params.clientId).collection("notifs").add({
    type:            params.type,
    destinataire:    params.destinataire,
    clientId:        params.clientId,
    clientNom:       params.clientNom,
    auteurRole:      "admin",
    description:     params.description,
    lien:            params.lien,
    date:            FieldValue.serverTimestamp(),
    lu:              false,
    actionRequise:   params.actionRequise ?? false,
    actionCompletee: false,
  });
}

/** Emails chaque admin (users.role == "admin") — même sujet/html pour tous. */
async function emailAdmins(subject: string, html: string): Promise<void> {
  const snap = await adminDb.collection("users").where("role", "==", "admin").get();
  const courriels = snap.docs.map(d => d.data().courriel).filter((c): c is string => !!c);
  await Promise.all(courriels.map(to =>
    resend.emails.send({ from: "AW Solution <noreply@awsolution.ca>", to, subject, html })
      .catch(err => console.error("[stripe/webhook] échec courriel admin", to, err))
  ));
}

function montant(amount: number, currency: string): string {
  return `${(amount / 100).toLocaleString("fr-CA")} ${currency.toUpperCase()}`;
}

function emailHtml(titre: string, corps: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:36px 24px;color:#1F2937">
      <div style="margin-bottom:24px">
        <span style="background:#0362E3;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px">AW Solution</span>
      </div>
      <h2 style="font-size:20px;font-weight:700;margin:0 0 10px;color:#0A0A0A">${titre}</h2>
      <p style="font-size:14px;color:#6B7280;margin:0 0 20px;line-height:1.6">${corps}</p>
      <a href="https://portail.awsolution.ca/admin/pipeline"
         style="display:inline-block;background:#0362E3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600">
        Voir dans le portail →
      </a>
    </div>
  `;
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const client = customerId ? await findClientByCustomerId(customerId) : null;
      if (!client) break;
      await writeNotif({
        clientId: client.id, clientNom: client.nom, destinataire: "admin",
        type: "facture_payee",
        description: `Facture payée — ${client.nom} (${montant(invoice.amount_paid, invoice.currency)})`,
        lien: `/admin/clients/${client.id}?tab=paiement`,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const client = customerId ? await findClientByCustomerId(customerId) : null;
      if (!client) break;
      const montantStr = montant(invoice.amount_due, invoice.currency);
      await Promise.all([
        writeNotif({
          clientId: client.id, clientNom: client.nom, destinataire: "admin",
          type: "paiement_echoue",
          description: `Paiement échoué — ${client.nom} (${montantStr})`,
          lien: `/admin/clients/${client.id}?tab=paiement`,
          actionRequise: true,
        }),
        writeNotif({
          clientId: client.id, clientNom: client.nom, destinataire: "client",
          type: "paiement_echoue",
          description: `Votre paiement a échoué (${montantStr}) — veuillez vérifier votre moyen de paiement`,
          lien: `/client/${client.id}/paiement`,
          actionRequise: true,
        }),
        emailAdmins(
          `Paiement échoué — ${client.nom}`,
          emailHtml("Paiement échoué", `Le prélèvement de <strong>${montantStr}</strong> pour <strong>${client.nom}</strong> a échoué.`),
        ),
      ]);
      break;
    }

    case "payment_intent.processing":
    case "charge.pending": {
      const obj = event.data.object as Stripe.PaymentIntent | Stripe.Charge;
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      const client = customerId ? await findClientByCustomerId(customerId) : null;
      if (!client) break;
      await writeNotif({
        clientId: client.id, clientNom: client.nom, destinataire: "admin",
        type: "debit_en_traitement",
        description: `Débit préautorisé en traitement — ${client.nom} (${montant(obj.amount, obj.currency)})`,
        lien: `/admin/clients/${client.id}?tab=paiement`,
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const client = await findClientByCustomerId(customerId);
      if (!client) break;
      await writeNotif({
        clientId: client.id, clientNom: client.nom, destinataire: "admin",
        type: "abonnement_modifie",
        description: `Abonnement modifié — ${client.nom} (statut : ${sub.status})`,
        lien: `/admin/clients/${client.id}?tab=paiement`,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const client = await findClientByCustomerId(customerId);
      if (!client) break;
      await Promise.all([
        writeNotif({
          clientId: client.id, clientNom: client.nom, destinataire: "admin",
          type: "abonnement_annule",
          description: `Abonnement annulé — ${client.nom}`,
          lien: `/admin/clients/${client.id}?tab=paiement`,
          actionRequise: true,
        }),
        writeNotif({
          clientId: client.id, clientNom: client.nom, destinataire: "client",
          type: "abonnement_annule",
          description: `Votre abonnement a été annulé`,
          lien: `/client/${client.id}/paiement`,
        }),
        emailAdmins(
          `Abonnement annulé — ${client.nom}`,
          emailHtml("Abonnement annulé", `L'abonnement Stripe de <strong>${client.nom}</strong> a été annulé.`),
        ),
      ]);
      break;
    }

    case "payment_method.attached": {
      const pm = event.data.object as Stripe.PaymentMethod;
      const customerId = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
      const client = customerId ? await findClientByCustomerId(customerId) : null;
      if (!client) break;
      await writeNotif({
        clientId: client.id, clientNom: client.nom, destinataire: "admin",
        type: "moyen_paiement_ajoute",
        description: `Nouveau moyen de paiement ajouté — ${client.nom} (${pm.type})`,
        lien: `/admin/clients/${client.id}?tab=paiement`,
      });
      break;
    }

    default:
      break;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("signature manquante");
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe/webhook] signature invalide", err);
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  // Idempotence — un event.id déjà traité est ignoré sans erreur (Stripe
  // interprète toute réponse hors 2xx comme un échec à réessayer).
  const eventRef = adminDb.collection("stripe_events").doc(event.id);
  const already = await eventRef.get();
  if (already.exists) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    // Une notification/courriel manqué ne doit jamais faire échouer l'accusé
    // de réception — sinon Stripe re-livre indéfiniment un event dont le
    // traitement métier a un bug, sans jamais pouvoir avancer.
    console.error("[stripe/webhook] échec traitement", event.type, event.id, err);
  }

  await eventRef.set({ type: event.type, processedAt: FieldValue.serverTimestamp() });

  return NextResponse.json({ ok: true });
}
