/**
 * analytics.ts — Contrat de données : Données & Rapports
 *
 * Source unique de vérité côté portail : Firestore de aw-portail.
 * Une Cloud Function planifiée dans le projet Firebase de chaque client
 * pousse les agrégats vers aw-portail chaque matin à 5 h.
 *
 * Logique des dates
 * ─────────────────
 * La sync du 15 août à 5 h agrège la journée du 14 août complète (00 h – 23 h 59).
 * → dateDonnees = "2026-08-14"
 * L'interface affiche « Données à jour au 14 août 2026 ».
 * Le portail n'affiche jamais les données du jour en cours.
 *
 * Ordre des jobs dans le projet client :
 *   04 h 30 — lifecycleTriggersEvalJob
 *   05 h 00 — portailSyncJob
 *
 * Chemins Firestore (dans aw-portail)
 * ─────────────────────────────────────
 *   clients/{clientId}/analytics/global          → agrégat toutes franchises
 *   clients/{clientId}/analytics/{franchiseId}   → vue par franchise
 *   clients/{clientId}/alertes/{id}              → alertes intelligentes (Prestige)
 *   clients/{clientId}/rapports/{id}             → rapports mensuels / annuels
 *   clients/{clientId}/appConfig                 → config Firebase + franchises
 *
 * Différenciation forfaits
 * ─────────────────────────
 *   Essentiel — global: hier, 7j, 30j, mois, aVie, achalandage, recompenses, campagnes, comptabilite
 *   Prestige  — + segmentation, parcours, alertes, analyseIA dans les rapports, scoreFidelite (90j)
 */

// ─── Scalaires communs ────────────────────────────────────────────────────────

export type NiveauScore  = "fort" | "modere" | "faible";
export type SegmentId    = "vip" | "regulier" | "nouveau" | "aRisque" | "inactif" | "perdu";
export type SeveriteAlerte = "critique" | "attention" | "positive";
export type TypeRapport  = "performance" | "comptable" | "annuel";

// ─── Blocs réutilisables ──────────────────────────────────────────────────────

/** Métriques du bloc Notifications (présent dans chaque période) */
export interface BlocNotifications {
  envoyees:            number;
  tauxOuverture:       number; // %
  meilleureCampagne?:  { nom: string; revenus: number };
}

/** Métriques du bloc Promotions (présent dans aVie, 7j, 90j) */
export interface BlocPromos {
  lancees:         number;
  clics:           number;
  conversions:     number; // réclamations liées à une promo
  revenusAttribues:number;
  /** Phase 3 — portailSyncJob : meilleure promotion par revenus attribués depuis le lancement. */
  meilleurePromo?: { nom: string; revenusAttribues: number };
}

// ─── Période : Hier ───────────────────────────────────────────────────────────

export interface PeriodeHier {
  membresActifs:    number; // membres ayant visité hier
  ventes:           number; // nb de transactions
  revenus:          number; // CAD
  visites: number;
  reclamations:     number; // réclamations de récompenses
  bonusJoues:       number;
}

// ─── Période standard (7j, mois, 30j) ────────────────────────────────────────

export interface SerieJournaliere {
  date:    string; // "YYYY-MM-DD"
  visites: number;
  revenus: number;
}

export interface PeriodeStandard {
  membresActifs:       number;
  nouveauxMembres:     number;
  ventes:              number;
  revenus:             number;
  panierMoyen:         number;
  visites:             number;
  reclamations:        number;
  bonusJoues:          number;
  participationBonus:  number; // % de membres ayant joué un bonus
  pointsEmisFactures:  number;
  pointsEmisBonus:     number;
  tauxVisite:          number; // % (membresActifs / membresTotal * 100)
  revenuParVisite:     number; // CAD
  breakageRate:        number; // % points non réclamés / points émis
  burnRate:            number; // % points réclamés / points émis
  variations: {
    revenus:       number; // ratio vs période précédente équivalente (+0.11 = +11 %)
    ventes:        number;
    membresActifs: number;
    panierMoyen:   number;
  };
  series:        SerieJournaliere[]; // une entrée par jour
  notifications: BlocNotifications;
  promos:        BlocPromos;
}

// ─── Période 30 j ─────────────────────────────────────────────────────────────

export interface Periode30j extends PeriodeStandard {
  /** Ratio visites ce mois / visites le mois précédent. >1 = croissance. */
  customerMomentum:      number;
  tauxChurn:             number; // % membres perdus ce mois
  pointsMoyensParMembre: number;
}

// ─── Période 90 j ─────────────────────────────────────────────────────────────

export interface SeriesMensuelles {
  mois:    string; // "2026-06"
  revenus: number;
  visites: number;
}

export interface ScoreFidelite {
  score:  number; // 0-100
  badges: { retention: NiveauScore; engagement: NiveauScore; croissance: NiveauScore };
  /** Comparaison sur 3 mois pour le graphique d'évolution */
  historique: { mois: string; score: number }[];
}

export interface Periode90j extends PeriodeStandard {
  tauxChurn:        number;
  revenuParMembre:  number;
  seriesMensuelles: SeriesMensuelles[];
  /** Prestige uniquement */
  scoreFidelite?: ScoreFidelite;
}

// ─── À vie ────────────────────────────────────────────────────────────────────

export interface PeriodeAVie {
  // ── Membres & revenus ─────────────────────────────────────────────────────
  membresTotal:           number;
  revenusTotal:           number;
  visites:                number;
  panierMoyen:            number;
  /** revenusTotal / nombreJoursDepuisLancement — pré-calculé par la CF */
  moyenneRevenusParJour:  number;
  revenuParMembre:        number;
  // ── Fidélité ──────────────────────────────────────────────────────────────
  reclamations:           number;
  bonusJoues:             number;
  pointsEnCirculation:    number; // passif — points jamais rachetés
  /** % points rachetés / points émis au total depuis le lancement */
  burnRate:               number;
  /** % points émis jamais réclamés — 100 - burnRate */
  breakageRate:           number;
  // ── Taux moyens mensuels depuis le lancement ──────────────────────────────
  /** Moyenne des taux de churn mensuels depuis le lancement */
  churnMoyenMensuel:      number;
  /** Moyenne des taux de visite mensuels (membresActifs/membresTotal) */
  tauxVisiteMoyenMensuel: number;
  // ── Blocs annexes ─────────────────────────────────────────────────────────
  notifications:          BlocNotifications;
  promos:                 BlocPromos;
  // ── Séries temporelles ────────────────────────────────────────────────────
  /** Revenus et visites par mois complet depuis le lancement.
   *  Phase 3 — portailSyncJob : calculé et poussé pour global + chaque franchise. */
  seriesMensuelles:         SeriesMensuelles[];
  // ── Points distribués (détail) ────────────────────────────────────────────
  /** Points émis via transactions (scan de factures) depuis le lancement.
   *  Phase 3 — portailSyncJob requis. */
  pointsDistribuesFactures: number;
  /** Points émis via bonus (anniversaire, parrainage, offres spéciales) depuis le lancement.
   *  Phase 3 — portailSyncJob requis. */
  pointsDistribuesBonus:    number;
  // ── Compteurs "actifs" (accueil — carte "Votre programme") ───────────────
  /** Nombre de récompenses actuellement actives dans le programme (offertes aux
   *  membres) — distinct de recompenses[] à la racine, qui ne liste que les
   *  récompenses déjà réclamées au moins une fois. Phase 3 — portailSyncJob. */
  recompensesActives?: number;
  /** Nombre de promotions globales actuellement actives. Phase 3 — portailSyncJob. */
  promosActives?: number;
  /** Variation absolue du nombre de membres actifs (ex: +94), pré-calculée par la CF.
   *  Remplace le calcul membresActifs × variations.membresActifs (30j) — ce dernier
   *  multipliait un décompte par un ratio de croissance et ne représentait rien de réel.
   *  Phase 3 — portailSyncJob. */
  variationMembres?: number;
}

// ─── Segmentation RFM (Prestige) ──────────────────────────────────────────────

export interface Segment {
  id:           SegmentId;
  nom:          string;
  count:        number;
  pourcentage:  number;
  critere:      string;     // description affichée dans la card
  variation:    number;     // net change vs période précédente (±N membres)
  panierMoyen?: number;     // VIP, Régulier, Nouveau
  valeurEnJeu?: number;     // À risque, Inactif, Perdu — revenu potentiel en CAD
}

export interface Segmentation {
  segments:   Segment[];
  /** 6 derniers mois — pour le graphique en aires empilées */
  historique: {
    mois:     string; // "Juin", "Juil", "Aoû"…
    vip:      number;
    regulier: number;
    nouveau:  number;
    aRisque:  number;
    inactif:  number;
    perdu:    number;
  }[];
}

// ─── Parcours de conversion ───────────────────────────────────────────────────

export interface Parcours {
  inscrits:           number;
  premiereVisite:     number;
  deuxiemeVisite:     number;
  recompenseReclamee: number;
  fidelise:           number; // membres avec 5+ visites
}

// ─── Achalandage ─────────────────────────────────────────────────────────────

export interface Achalandage {
  parJour:  { jour: string; visites: number }[];
  /** Chaque ligne = une combinaison jour × plage horaire */
  parPlage: { jour: string; plage: string; visites: number }[];
}

// ─── Récompenses ─────────────────────────────────────────────────────────────

export interface Recompense {
  nom:                 string;
  reclamations:        number;
  pointsUtilises:      number;
  foodCost:            number; // CAD — coût réel pour le client
  pourcentageFoodCost: number; // foodCost / revenusTotal * 100
}

// ─── Campagnes ────────────────────────────────────────────────────────────────

export interface Campagne {
  nom:          string;
  segmentCible: string;
  envois:       number;
  tauxOuverture:number; // %
  reclamations: number;
  revenus:      number; // CAD
  roi:          number; // revenus / coût de la campagne
  date:         string; // "YYYY-MM-DD"
}

// ─── Comptabilité ─────────────────────────────────────────────────────────────

export interface ComptabiliteFacture {
  date:            string; // "YYYY-MM-DD"
  montant:         number;
  pointsAttribues: number;
  franchise:       string;
  /** Code promotionnel scanné lors de la transaction (absent si aucun). */
  codePromo?:      string;
  /** Nom de la promotion liée au code, si applicable. */
  promotionLiee?:  string;
  /** Montant du rabais appliqué en CAD (absent si aucun). */
  rabaisApplique?: number;
}

export interface ComptabiliteCodePromo {
  code:          string;
  promotionLiee: string;
  utilisations:  number;
  rabaisTotal:   number;
}

export interface ComptabiliteReclamation {
  date:          string;
  recompense:    string;
  pointsReclames:number;
  foodCost:      number;
  franchise:     string;
}

export interface ComptabilitePromotion {
  nom:             string;
  periode:         string; // "1 juil. – 31 juil. 2026"
  typeRabais:      string; // "20 % sur facture", "2 pour 1", "Entrée gratuite à l'achat de 20 $"
  reclamations:    number;
  /** Coût réel pour le client (food cost restaurant, valeur article commerce) */
  coutReel:        number;
  valeurDistribuee:number;
  revenusGeneres:  number;
  roi:             number;
}

/** Cumulatifs figés au dernier jour du mois — jamais les valeurs du jour courant.
 *  Phase 3 — portailSyncJob : calculé et poussé à la clôture de chaque mois. */
export interface SnapshotFinMois {
  /** Membres inscrits au dernier jour du mois (cumulatif). */
  membresTotal:          number;
  /** Revenus CAD cumulés depuis le lancement jusqu'au dernier jour du mois. */
  revenusTotal:          number;
  /** Visites cumulées depuis le lancement jusqu'au dernier jour du mois. */
  visites:               number;
  /** Points non réclamés (passif) au dernier jour du mois. */
  pointsEnCirculation:   number;
  /** Valeur nominale CAD des points distribués DURANT ce mois (pts × taux de rachat). */
  valeurPointsDistribues:number;
}

/** Agrégats comptables mensuels propres à une franchise.
 *  Phase 3 — portailSyncJob : calculé et poussé à la clôture de chaque mois,
 *  franchise par franchise. Absent si la CF n'a pas encore produit les données. */
export interface ComptabiliteFranchise {
  synthese: {
    inscriptions:      number; // Phase 3 — portailSyncJob
    membresActifs:     number; // Phase 3 — portailSyncJob
    membresTotal:      number; // Phase 3 — portailSyncJob
    notifEnvoyees:     number; // Phase 3 — portailSyncJob
    tauxOuverturePush: number; // Phase 3 — portailSyncJob
    visites:           number; // Phase 3 — portailSyncJob
    pointsDistribues:  number; // Phase 3 — portailSyncJob
    pointsRachetes:    number; // Phase 3 — portailSyncJob
    valeurRachetee:    number; // Phase 3 — portailSyncJob
    bonusAttribues:    number; // Phase 3 — portailSyncJob
    valeurBonus:       number; // Phase 3 — portailSyncJob
  };
  /** Cumulatifs figés au dernier jour du mois pour cette seule franchise.
   *  Phase 3 — portailSyncJob requis. */
  snapshotFinMois: SnapshotFinMois; // Phase 3 — portailSyncJob
}

export interface Comptabilite {
  /** Données du dernier mois complet (sélecteur de mois dans l'onglet Comptabilité) */
  moisRef:          string; // "2026-07" — mois couvert
  facturesDetail:   ComptabiliteFacture[];
  codesPromo:       ComptabiliteCodePromo[];
  reclamationsDetail:ComptabiliteReclamation[];
  promotions:       ComptabilitePromotion[];
  // Synthèse du mois
  synthese: {
    inscriptions:      number;
    membresActifs:     number;
    membresTotal:      number;
    notifEnvoyees:     number;
    tauxOuverturePush: number;
    visites:           number;
    pointsDistribues:  number;
    pointsRachetes:    number;
    valeurRachetee:    number; // food cost total des réclamations
    bonusAttribues:    number;
    valeurBonus:       number;
  };
  /** Cumulatifs figés au dernier jour du mois — ne jamais afficher les valeurs du jour courant.
   *  Phase 3 — portailSyncJob requis. */
  snapshotFinMois: SnapshotFinMois;
}

// ─── Promotion détaillée (lifetime, Analytique Prestige) ─────────────────────
/** Promotion individuelle avec stats lifetime.
 *  Phase 3 — portailSyncJob : agrégé depuis les transactions depuis le lancement.
 *  Règle de période : seule dateDebutISO détermine l'inclusion dans une fenêtre. */
export interface PromotionDetail {
  id:              string;
  nom:             string;
  description:     string;
  dateDebutISO:    string;   // "YYYY-MM-DD" — seule la date de lancement compte pour le filtre
  typeRabais:      string;   // "20 % sur facture", "2 pour 1", etc.
  portee:          "globale" | "individuelle"; // globale = réseau entier; individuelle = membre ciblé
  /** Phase 3 — portailSyncJob */
  utilisations:    number;
  clics:           number;
  coutReel:        number;
  valeurDistribuee:number;
  revenusGeneres:  number;
  roi:             number;
}

// ─── Document global ─────────────────────────────────────────────────────────
//   clients/{clientId}/analytics/global

export interface AnalyticsGlobal {
  periode: {
    dateDonnees:  string;    // "YYYY-MM-DD" — D-1 (jour agrégé)
    derniereSync: Date;      // 5 h le matin
  };
  /** Date de mise en ligne réelle de l'app, "YYYY-MM-DD" — distincte de
   *  clients/{clientId}.dateLancement (date d'acquisition saisie à la signature).
   *  Phase 3 — portailSyncJob : champ pas encore envoyé par toutes les CF clients,
   *  optionnel tant que la migration n'est pas complète. */
  dateLancement?: string; // Phase 3 — portailSyncJob
  aVie:  PeriodeAVie;
  hier:  PeriodeHier;
  "7j":  PeriodeStandard;
  "30j": Periode30j;
  "90j": Periode90j;

  // Prestige uniquement — champ absent pour les clients Essentiel
  segmentation?: Segmentation;
  parcours?:     Parcours;

  // Tous les forfaits
  achalandage:     Achalandage;
  frequenceVisite: { tranche: string; membres: number }[];
  recompenses:     Recompense[];
  campagnes:       Campagne[];
  comptabilite:    Comptabilite;
  /** Promotions lancées dans le programme — données lifetime.
   *  Phase 3 — portailSyncJob : calculé et poussé à la clôture de chaque mois.
   *  Règle de période : seul dateDebutISO détermine l'inclusion dans une fenêtre. */
  promotionsDetail: PromotionDetail[]; // Phase 3 — portailSyncJob
}

// ─── Document par franchise ───────────────────────────────────────────────────
//   clients/{clientId}/analytics/{franchiseId}
//   Contient les mêmes périodes que global mais pour une seule franchise.
//   Le portail ne fait aucun calcul côté client — tout est pré-agrégé par la CF.
//
//   Phase 3 — portailSyncJob : doit calculer et pousser la totalité de PeriodeAVie
//   pour chaque franchise, incluant promos, notifications, taux moyens mensuels,
//   series[] journalières, achalandage, seriesMensuelles et points distribués détaillés.

export interface AnalyticsFranchise {
  franchiseId:  string;
  franchiseNom: string;
  periode: {
    dateDonnees:  string;
    derniereSync: Date;
  };
  /** Identique à PeriodeAVie dans le global — calculé et poussé par portailSyncJob. */
  aVie: PeriodeAVie;
  hier: PeriodeHier;
  "7j": Pick<PeriodeStandard, "membresActifs" | "nouveauxMembres" | "ventes" | "revenus" | "panierMoyen" | "visites" | "reclamations" | "bonusJoues" | "variations" | "series">;
  "30j":Pick<PeriodeStandard, "membresActifs" | "nouveauxMembres" | "ventes" | "revenus" | "panierMoyen" | "visites" | "reclamations" | "bonusJoues" | "variations" | "series">;
  mois: Pick<PeriodeStandard, "membresActifs" | "nouveauxMembres" | "ventes" | "revenus" | "panierMoyen" | "visites" | "reclamations" | "bonusJoues" | "variations">;
  /** Phase 3 — portailSyncJob : achalandage par franchise, agrégé depuis les logs de transactions. */
  achalandage: Achalandage;
  /** Agrégats comptables du dernier mois complet, filtrés pour cette franchise uniquement.
   *  Phase 3 — portailSyncJob : absent si la CF n'a pas encore produit les données pour ce mois. */
  comptabilite?: ComptabiliteFranchise; // Phase 3 — portailSyncJob
}

// ─── Alerte intelligente ──────────────────────────────────────────────────────
//   clients/{clientId}/alertes/{id}

export interface AlerteDoc {
  type:        string;         // "vip_at_risk" | "churn_rising" | "record_visites" | …
  severite:    SeveriteAlerte;
  titre:       string;
  description: string;         // chiffres concrets + valeur $
  valeurEnJeu?: number;        // CAD
  actionLabel?: string;
  lienAction?:  string;        // route relative (/client/{id}/donnees?tab=...)
  franchiseId?: string;        // null/absent = toutes franchises
  lue:          boolean;
  createdAt:    Date;
}

// ─── Rapport ──────────────────────────────────────────────────────────────────
//   clients/{clientId}/rapports/{id}
//   type "comptable"    → données de facturation du mois
//   type "performance"  → KPIs + analyse IA
//   type "annuel"       → synthèse annuelle

export interface RapportDoc {
  type:         TypeRapport;
  mois:         number;        // 1-12
  annee:        number;
  franchiseId?: string;        // absent = tous
  donnees:      Record<string, unknown>;
  analyseIA: {
    bonsCoups:   string[];     // 3 points Prestige, 1 point Essentiel
    aTravailler: string[];
  };
  pdfUrl?:    string;
  publie:     boolean;
  generatedAt:Date;
}

// ─── Config application ───────────────────────────────────────────────────────
//   clients/{clientId}/appConfig

export interface AppConfigDoc {
  firebaseProjectId: string;
  franchises:        { id: string; nom: string }[];
  syncActive:        boolean;
  derniereSync:      Date;
  statutSync:        "ok" | "erreur" | "en_cours";
}

// ─── Jeton de synchronisation ──────────────────────────────────────────────────
//   clients/{clientId}/syncConfig/token
//   Un jeton par client, hashé (jamais stocké en clair). Régénérer écrase le
//   hash existant, ce qui révoque l'ancien jeton sans toucher aux autres clients.

export interface SyncConfigDoc {
  tokenHash:   string;      // SHA-256 du jeton
  tokenSuffix: string;      // 6 derniers caractères — identification dans l'admin
  revoked:     boolean;
  createdAt:   Date;
  createdBy:   string;      // uid admin ayant généré le jeton
  lastUsedAt:  Date | null;
}

// ─── Journal de synchronisation ────────────────────────────────────────────────
//   clients/{clientId}/syncLogs/{dateDonnees}
//   Un document par nuit agrégée (dateDonnees) — une re-livraison de la même
//   nuit met à jour l'entrée existante plutôt que d'empiler des doublons.

export interface SyncLogDoc {
  dateDonnees:      string | null; // "YYYY-MM-DD"
  succes:           boolean;
  documentsEcrits:  number;
  franchisesCount?: number;
  erreur?:          string;
  horodatage:       Date;
}
