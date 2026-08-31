/**
 * Types locaux, dupliqués intentionnellement depuis src/types/analytics.ts.
 *
 * functions/tsconfig.json restreint la compilation à functions/src ("include":
 * ["src"]) et firebase.json ne déploie que le contenu de functions/ — un
 * import relatif vers ../../src/types/analytics.ts (hors de functions/)
 * compilerait peut-être en local mais ne survivrait pas au déploiement (le
 * fichier ne serait pas dans le paquet zippé). D'où cette copie locale,
 * volontairement réduite aux champs consommés par genererRapportPdf.
 *
 * À maintenir manuellement en synchro avec src/types/analytics.ts si ces
 * champs changent côté portail — pas de lien automatique entre les deux.
 */

export interface ComptabiliteFacture {
  date: string;
  montant: number;
  pointsAttribues: number;
  franchise: string;
  codePromo?: string;
  promotionLiee?: string;
  rabaisApplique?: number;
}

export interface ComptabiliteReclamation {
  date: string;
  recompense: string;
  pointsReclames: number;
  foodCost: number;
  franchise: string;
}

export interface ComptabilitePromotion {
  nom: string;
  periode: string;
  typeRabais: string;
  reclamations: number;
  coutReel: number;
  valeurDistribuee: number;
  revenusGeneres: number;
  roi: number;
}

export interface SnapshotFinMois {
  membresTotal: number;
  revenusTotal: number;
  visites: number;
  pointsEnCirculation: number;
  valeurPointsDistribues: number;
}

/** Synthèse mensuelle — mêmes champs pour le document global et par franchise. */
export interface ComptabiliteSynthese {
  inscriptions: number;
  revenus: number;
  membresActifs: number;
  membresTotal: number;
  notifEnvoyees: number;
  tauxOuverturePush: number;
  visites: number;
  pointsDistribues: number;
  pointsRachetes: number;
  valeurRachetee: number;
  bonusAttribues: number;
  valeurBonus: number;
  /** Pas encore déployé partout — voir rapportMensuel.README.md. */
  tauxRachat?: number;
}

/** Document global — clients/{clientId}/rapports/comptable-{moisRef}, donnees. */
export interface Comptabilite {
  moisRef: string;
  facturesDetail: ComptabiliteFacture[];
  reclamationsDetail: ComptabiliteReclamation[];
  promotions: ComptabilitePromotion[];
  synthese: ComptabiliteSynthese;
  snapshotFinMois: SnapshotFinMois;
}

/** Document par franchise — clients/{clientId}/rapports/comptable-{moisRef}-{franchiseId}, donnees.
 *  Pas de facturesDetail/reclamationsDetail/promotions ici (voir README, section
 *  "Filtrage par franchise" — c'est précisément pourquoi la génération va les
 *  chercher dans le rapport global du même mois). */
export interface ComptabiliteFranchise {
  synthese: ComptabiliteSynthese;
  snapshotFinMois: SnapshotFinMois;
}

export interface RapportDoc {
  type: "performance" | "comptable" | "annuel";
  mois: number;
  annee: number;
  franchiseId?: string;
  donnees: Comptabilite | ComptabiliteFranchise | Record<string, unknown>;
  analyseIA: { bonsCoups: string[]; aTravailler: string[] };
  pdfUrl?: string;
  facturesCsvUrl?: string;
  publie: boolean;
  generatedAt: FirebaseFirestore.Timestamp;
}

export interface ClientDoc {
  restaurant: string;
  logo_url: string;
  couleur_primaire?: string;
  /** $/100 pts — configurable par client, défaut 0.40 si absent (voir genererRapportPdf.ts). */
  tauxConversionPoints?: number;
}

export interface AnalyticsFranchiseDoc {
  franchiseId: string;
  franchiseNom: string;
}
