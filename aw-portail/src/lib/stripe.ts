import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Doit correspondre à la version attendue par le package "stripe" installé
  // (voir node_modules/stripe/esm/apiVersion.d.ts) — un décalage ici casse le
  // typage sur des champs déplacés entre versions (ex. Subscription.current_period_end
  // déplacé vers SubscriptionItem, Invoices.retrieveUpcoming renommé createPreview).
  apiVersion: "2026-07-29.dahlia",
});

/** Price ID du produit Stripe "Forfait Essentiel" (149 $ CAD/mois, prix par défaut). */
export const PRICE_ID_FORFAIT_ESSENTIEL = "price_1UG2ZxQ6rh1Rg4OlNYDyeiW3";
