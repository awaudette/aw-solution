// Configuration centralisée du CRM (collection organisations).
// Le CRM couvre uniquement le cycle de vente — s'arrête à la signature.
// Le suivi de livraison se fait ensuite par la feuille de route de la fiche client.

import type { Timestamp } from "firebase/firestore";

export const ETAPE_VALUES = [
  "nouveau", "contacte", "demo_faite", "proposition_envoyee",
  "negociation", "signe", "perdu",
] as const;
export type Etape = (typeof ETAPE_VALUES)[number];

/** Libellés lisibles — source unique utilisée à l'affichage ET pour générer le texte des entrées automatiques de la timeline côté serveur. */
export const ETAPE_LABELS: Record<Etape, string> = {
  nouveau: "Nouveau", contacte: "Contacté", demo_faite: "Démo faite",
  proposition_envoyee: "Proposition envoyée", negociation: "Négociation",
  signe: "Signé", perdu: "Perdu",
};

export const RECUPERABLE_VALUES = ["oui", "non", "peut_etre"] as const;
export type Recuperable = (typeof RECUPERABLE_VALUES)[number];

export const INTERACTION_TYPE_VALUES = [
  "appel", "courriel", "rencontre", "demo", "texto", "note",
] as const;
export type InteractionType = (typeof INTERACTION_TYPE_VALUES)[number];

export const REACTION_VALUES = [
  "tres_positif", "positif", "neutre", "reserve", "negatif",
] as const;
export type Reaction = (typeof REACTION_VALUES)[number];

/**
 * Motifs de perte proposés dans la fenêtre dédiée au passage à "perdu".
 * Liste fermée côté interface uniquement — le champ motifPerte reste du
 * texte libre côté serveur (déjà construit ainsi), donc aucune contrainte
 * serveur n'est ajoutée ici, seulement une source unique pour le menu.
 */
export const MOTIF_PERTE_VALUES = [
  "prix_trop_eleve", "concurrent_choisi", "pas_de_budget", "mauvais_moment",
  "aucune_reponse", "decideur_jamais_atteint", "fonctionnalite_manquante", "pas_le_bon_profil",
] as const;
export type MotifPerte = (typeof MOTIF_PERTE_VALUES)[number];

export const MOTIF_PERTE_LABELS: Record<MotifPerte, string> = {
  prix_trop_eleve: "Prix trop élevé",
  concurrent_choisi: "Concurrent choisi",
  pas_de_budget: "Pas de budget",
  mauvais_moment: "Mauvais moment",
  aucune_reponse: "Aucune réponse",
  decideur_jamais_atteint: "Décideur jamais atteint",
  fonctionnalite_manquante: "Fonctionnalité manquante",
  pas_le_bon_profil: "Pas le bon profil",
};

/**
 * Motifs d'annulation proposés quand le dossier était à l'étape "signe" —
 * un ancien client qui annule, pas un prospect jamais converti. Liste
 * distincte de MOTIF_PERTE_VALUES, choisie selon etapeAvantPerte.
 */
export const MOTIF_CHURN_VALUES = [
  "pas_assez_de_resultats", "trop_complique", "manque_de_temps",
  "fermeture_ou_vente_du_commerce", "prix", "concurrent",
] as const;
export type MotifChurn = (typeof MOTIF_CHURN_VALUES)[number];

export const MOTIF_CHURN_LABELS: Record<MotifChurn, string> = {
  pas_assez_de_resultats: "Pas assez de résultats",
  trop_complique: "Trop compliqué",
  manque_de_temps: "Manque de temps",
  fermeture_ou_vente_du_commerce: "Fermeture ou vente du commerce",
  prix: "Prix",
  concurrent: "Concurrent",
};

/** Motif de perte, quel que soit le type de dossier — pour résoudre un libellé sans savoir d'avance lequel des deux vocabulaires s'applique. */
export const MOTIF_LABELS_COMBINES: Record<string, string> = { ...MOTIF_PERTE_LABELS, ...MOTIF_CHURN_LABELS };

/**
 * Étape → champ de date rempli automatiquement la première fois qu'elle est
 * atteinte (voir computeAutoDates dans src/lib/organisations.ts). "nouveau"
 * et "negociation" n'ont pas de champ correspondant — pas de remplissage
 * auto pour ces deux-là. dateLancement n'apparaît jamais ici : c'est une
 * date de livraison, toujours manuelle, jamais liée à une étape du CRM.
 */
// "perdu" n'est PAS ici : son remplissage de date dépend de etapeAvantPerte
// (dateChurn seulement si on vient de "signe") — logique spéciale gérée
// directement dans la route PATCH, pas par ce mécanisme générique.
export const ETAPE_DATE_FIELD: Partial<Record<Etape, string>> = {
  contacte: "datePremierContact",
  demo_faite: "dateDemo",
  proposition_envoyee: "datePropositionEnvoyee",
  negociation: "dateNegociation",
  signe: "dateSignature",
};

/** Champs de date modifiables directement (auto-remplis ou à la main). */
export const DATE_FIELDS = [
  "dateProchaineAction", "datePremierContact", "dateDemo",
  "datePropositionEnvoyee", "dateNegociation", "dateSignature", "dateLancement",
  "dateChurn", "dateRelanceSuggeree",
] as const;

export interface Contact {
  id: string;
  prenom: string;
  nom: string;
  role: string | null;
  courriel: string | null;
  telephone: string | null;
  cellulaire: string | null;
  estDecideur: boolean;
  notes: string | null;
  createdAt: Timestamp;
}

export interface Interaction {
  id: string;
  type: InteractionType;
  date: Timestamp;
  auteur: string; // uid
  texte: string;
  reaction: Reaction | null;
  /** true uniquement pour les entrées générées par le serveur (ex. changement d'étape) — jamais pour une saisie manuelle. */
  automatique: boolean;
}

export interface Organisation {
  id: string;
  nom: string;
  secteur: string | null;
  siteWeb: string | null;
  adresse: string | null;
  nombreSuccursales: number;
  groupeId: string | null;
  etape: Etape;
  proprietaire: string; // uid
  source: string | null;
  forfaitPressenti: string | null;
  valeurMensuelleEstimee: number | null;
  concurrentEnPlace: string | null;
  prochaineAction: string | null;
  dateProchaineAction: Timestamp | null;
  datePremierContact: Timestamp | null;
  dateDemo: Timestamp | null;
  datePropositionEnvoyee: Timestamp | null;
  dateNegociation: Timestamp | null;
  dateSignature: Timestamp | null;
  /** Date de livraison (lancement réel) — jamais auto-remplie par le CRM. */
  dateLancement: Timestamp | null;
  /** Rempli seulement si etapeAvantPerte === "signe" (ancien client qui annule) — jamais pour un prospect. */
  dateChurn: Timestamp | null;
  motifPerte: string | null;
  motifPerteDetail: string | null;
  recuperable: Recuperable | null;
  dateRelanceSuggeree: Timestamp | null;
  /** null tant que non signé ; pointe ensuite vers clients/{id}. Jamais créé automatiquement par ce chantier. */
  clientId: string | null;
  /** Date de la dernière interaction (manuelle ou automatique) — tenue à jour côté serveur à chaque ajout. */
  derniereInteraction: Timestamp | null;
  /** Étape juste avant le passage à "perdu" — distingue prospect (jamais signé) d'ancien client (annulation). Effacé à la réactivation. */
  etapeAvantPerte: Etape | null;
  /** Toujours rempli au passage à "perdu", peu importe le type — contrairement à dateChurn qui ne l'est que pour un ancien client. Sert de "date de perte" générique à l'affichage. */
  dateEtapePerdu: Timestamp | null;
  /** Tâche de relance créée automatiquement quand le dossier est marqué récupérable avec une date — mise à jour plutôt que dupliquée si la date change. */
  tacheRelanceId: string | null;
  createdAt: Timestamp;
  createdBy: string; // uid
}

/** Dossiers dormants : aucune interaction (ou la dernière) depuis plus de ce nombre de jours. */
export const JOURS_DORMANT = 14;

// ─── Formes sérialisées (JSON renvoyé par l'API — dates en ISO) ────────────────

export interface ContactDTO extends Omit<Contact, "createdAt"> {
  createdAt: string | null;
}

export interface InteractionDTO extends Omit<Interaction, "date"> {
  date: string | null;
}

export interface OrganisationDTO extends Omit<Organisation,
  "dateProchaineAction" | "datePremierContact" | "dateDemo" | "datePropositionEnvoyee" |
  "dateNegociation" | "dateSignature" | "dateLancement" | "dateChurn" | "dateRelanceSuggeree" |
  "derniereInteraction" | "dateEtapePerdu" | "createdAt"
> {
  dateProchaineAction: string | null;
  datePremierContact: string | null;
  dateDemo: string | null;
  datePropositionEnvoyee: string | null;
  dateNegociation: string | null;
  dateSignature: string | null;
  dateLancement: string | null;
  dateChurn: string | null;
  dateRelanceSuggeree: string | null;
  derniereInteraction: string | null;
  dateEtapePerdu: string | null;
  createdAt: string | null;
  /** Nombre d'interactions dans la sous-collection — agrégé côté serveur au listage, jamais stocké sur le document. */
  interactionsCount: number;
}
