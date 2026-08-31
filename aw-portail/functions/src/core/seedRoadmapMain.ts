/**
 * seedRoadmapMain — crée clients/{clientId}/roadmap/main avec le gabarit
 * standard des 14 étapes de déploiement, pour tout nouveau client.
 *
 * Contexte : useClientData.ts (portail) lit exclusivement ce document pour
 * piloter les trois écrans d'accueil (AccueilOnboarding/Construction/Actif).
 * Sans lui, un client neuf se retrouve avec un tableau d'étapes vide, que
 * plusieurs endroits du code interprètent par erreur comme "tout est
 * complété" plutôt que "rien n'est configuré" — voir les correctifs dans
 * AccueilOnboarding.tsx (hasActionRequired, incompleteClientEtape).
 *
 * Avant cette fonction, aucun code de ce dépôt ne créait ce document —
 * les clients existants l'ont eu créé manuellement (console Firebase).
 * Noms et ordre des étapes repris tel quel des documents réels de
 * clients/poke-station-tr et clients/golf-beattie, pas inventés.
 */
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const ETAPES_TEMPLATE: { id: string; nom: string }[] = [
  { id: "signature",         nom: "Signature" },
  { id: "paiement",          nom: "Configuration paiement" },
  { id: "branding",          nom: "Branding" },
  { id: "design",            nom: "Design" },
  { id: "developpement",     nom: "Développement" },
  { id: "rencontre",         nom: "Rencontre de validation" },
  { id: "ajustements",       nom: "Ajustements" },
  { id: "tests",             nom: "Tests & Validation" },
  { id: "soumission",        nom: "Soumission App Store et Google Play" },
  { id: "formation",         nom: "Formation" },
  { id: "config_succursale", nom: "Configuration succursale" },
  { id: "materiel",          nom: "Conception matériel de lancement" },
  { id: "lancement",         nom: "Lancement 🚀" },
  { id: "suivi",             nom: "Suivi post-lancement" },
];

/**
 * Idempotent : ne touche jamais un document déjà existant (ex. si jamais
 * ce trigger était rejoué, ou si le document a été créé manuellement entre
 * la création du client et l'exécution de la fonction).
 */
export async function seedRoadmapMain(clientId: string): Promise<void> {
  const ref = getFirestore().collection("clients").doc(clientId).collection("roadmap").doc("main");
  const existing = await ref.get();
  if (existing.exists) return;

  await ref.set({
    dateCreation: Timestamp.now(),
    dateLancementEstimee: null,
    introVue: false,
    etapes: ETAPES_TEMPLATE.map((e, i) => ({
      id: e.id,
      nom: e.nom,
      // Première étape (signature) prête à être complétée par le client ;
      // le reste attend son tour — même convention que golf-beattie.
      statut: i === 0 ? "a_faire" : "a_venir",
      dateDebut: null,
      dateFin: null,
      dateEstimee: null,
      completedAt: null,
      blocageRaison: null,
    })),
  });
}
