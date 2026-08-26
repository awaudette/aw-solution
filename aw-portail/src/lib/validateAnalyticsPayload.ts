/**
 * validateAnalyticsPayload.ts — Validation structurelle du corps de
 * POST /api/sync/analytics contre le contrat de données src/types/analytics.ts.
 *
 * Vérifie uniquement la présence des champs obligatoires et leur type — pas
 * de règles métier (cohérence de totaux, etc.). Objectif : rejeter tôt avec
 * un message clair plutôt que d'écrire des données Firestore corrompues.
 *
 * Note transport : Date (ex: periode.derniereSync) voyage en JSON sous forme
 * de chaîne ISO 8601 — c'est pourquoi le schéma l'attend en "string". La
 * conversion en Timestamp Firestore se fait côté route, après validation.
 */

type Spec =
  | "string"
  | "number"
  | "boolean"
  | { array: Spec }
  | { object: Record<string, Spec> }
  | { optional: Spec };

function typeName(spec: Spec): string {
  if (typeof spec === "string") return spec;
  if ("array" in spec) return `array<${typeName(spec.array)}>`;
  if ("object" in spec) return "object";
  return `${typeName(spec.optional)}?`;
}

function extend(base: Spec, extra: Record<string, Spec>): Spec {
  if (typeof base === "object" && "object" in base) {
    return { object: { ...base.object, ...extra } };
  }
  throw new Error("extend() requiert un Spec de type object");
}

function validate(value: unknown, spec: Spec, path: string, errors: string[]): void {
  if (typeof spec === "object" && "optional" in spec) {
    if (value === undefined) return;
    validate(value, spec.optional, path, errors);
    return;
  }

  if (value === undefined || value === null) {
    errors.push(`${path} : champ manquant (attendu ${typeName(spec)})`);
    return;
  }

  if (spec === "string") {
    if (typeof value !== "string") errors.push(`${path} : doit être une chaîne (reçu ${typeof value})`);
    return;
  }
  if (spec === "number") {
    if (typeof value !== "number" || Number.isNaN(value)) errors.push(`${path} : doit être un nombre (reçu ${typeof value})`);
    return;
  }
  if (spec === "boolean") {
    if (typeof value !== "boolean") errors.push(`${path} : doit être un booléen (reçu ${typeof value})`);
    return;
  }
  if ("array" in spec) {
    if (!Array.isArray(value)) { errors.push(`${path} : doit être un tableau (reçu ${typeof value})`); return; }
    value.forEach((item, i) => validate(item, spec.array, `${path}[${i}]`, errors));
    return;
  }
  if ("object" in spec) {
    if (typeof value !== "object" || Array.isArray(value)) { errors.push(`${path} : doit être un objet (reçu ${typeof value})`); return; }
    for (const [key, childSpec] of Object.entries(spec.object)) {
      validate((value as Record<string, unknown>)[key], childSpec, `${path}.${key}`, errors);
    }
    return;
  }
}

// ─── Blocs réutilisables ────────────────────────────────────────────────────

const blocNotifications: Spec = { object: {
  envoyees: "number",
  tauxOuverture: "number",
  meilleureCampagne: { optional: { object: { nom: "string", revenus: "number" } } },
} };

const blocPromos: Spec = { object: {
  lancees: "number",
  clics: "number",
  conversions: "number",
  revenusAttribues: "number",
  meilleurePromo: { optional: { object: { nom: "string", revenusAttribues: "number" } } },
} };

const serieJournaliere: Spec = { object: { date: "string", visites: "number", revenus: "number" } };

const variations: Spec = { object: {
  revenus: "number", ventes: "number", membresActifs: "number", panierMoyen: "number",
} };

const periodeStandard: Spec = { object: {
  membresActifs: "number", nouveauxMembres: "number", ventes: "number", revenus: "number",
  panierMoyen: "number", visites: "number", reclamations: "number", bonusJoues: "number",
  participationBonus: "number", pointsEmisFactures: "number", pointsEmisBonus: "number",
  tauxVisite: "number", revenuParVisite: "number", breakageRate: "number", burnRate: "number",
  variations, series: { array: serieJournaliere },
  notifications: blocNotifications, promos: blocPromos,
} };

const seriesMensuelles: Spec = { object: { mois: "string", revenus: "number", visites: "number" } };

const scoreFidelite: Spec = { object: {
  score: "number",
  badges: { object: { retention: "string", engagement: "string", croissance: "string" } },
  historique: { array: { object: { mois: "string", score: "number" } } },
} };

const periode30j = extend(periodeStandard, {
  customerMomentum: "number",
  tauxChurn: "number",
  pointsMoyensParMembre: "number",
});

const periode90j = extend(periodeStandard, {
  tauxChurn: "number",
  revenuParMembre: "number",
  seriesMensuelles: { array: seriesMensuelles },
  scoreFidelite: { optional: scoreFidelite },
});

const periodeHier: Spec = { object: {
  membresActifs: "number", ventes: "number", revenus: "number", visites: "number",
  reclamations: "number", bonusJoues: "number",
} };

const periodeAVie: Spec = { object: {
  membresTotal: "number", revenusTotal: "number", visites: "number", panierMoyen: "number",
  moyenneRevenusParJour: "number", revenuParMembre: "number",
  reclamations: "number", bonusJoues: "number", pointsEnCirculation: "number",
  burnRate: "number", breakageRate: "number",
  churnMoyenMensuel: "number", tauxVisiteMoyenMensuel: "number",
  notifications: blocNotifications, promos: blocPromos,
  seriesMensuelles: { array: seriesMensuelles },
  pointsDistribuesFactures: "number", pointsDistribuesBonus: "number",
  recompensesActives: { optional: "number" },
  promosActives:      { optional: "number" },
  variationMembres:   { optional: "number" },
} };

const segment: Spec = { object: {
  id: "string", nom: "string", count: "number", pourcentage: "number",
  critere: "string", variation: "number",
  panierMoyen: { optional: "number" }, valeurEnJeu: { optional: "number" },
} };

const segmentation: Spec = { object: {
  segments: { array: segment },
  historique: { array: { object: {
    mois: "string", vip: "number", regulier: "number", nouveau: "number",
    aRisque: "number", inactif: "number", perdu: "number",
  } } },
} };

const parcours: Spec = { object: {
  inscrits: "number", premiereVisite: "number", deuxiemeVisite: "number",
  recompenseReclamee: "number", fidelise: "number",
} };

const achalandage: Spec = { object: {
  parJour: { array: { object: { jour: "string", visites: "number" } } },
  parPlage: { array: { object: { jour: "string", plage: "string", visites: "number" } } },
} };

const recompense: Spec = { object: {
  nom: "string", reclamations: "number", pointsUtilises: "number",
  foodCost: "number", pourcentageFoodCost: "number",
} };

const campagne: Spec = { object: {
  nom: "string", segmentCible: "string", envois: "number", tauxOuverture: "number",
  reclamations: "number", revenus: "number", roi: "number", date: "string",
} };

const comptabiliteFacture: Spec = { object: {
  date: "string", montant: "number", pointsAttribues: "number", franchise: "string",
  codePromo: { optional: "string" }, promotionLiee: { optional: "string" },
  rabaisApplique: { optional: "number" },
} };

const comptabiliteCodePromo: Spec = { object: {
  code: "string", promotionLiee: "string", utilisations: "number", rabaisTotal: "number",
} };

const comptabiliteReclamation: Spec = { object: {
  date: "string", recompense: "string", pointsReclames: "number", foodCost: "number", franchise: "string",
} };

const comptabilitePromotion: Spec = { object: {
  nom: "string", periode: "string", typeRabais: "string", reclamations: "number",
  coutReel: "number", valeurDistribuee: "number", revenusGeneres: "number", roi: "number",
} };

const syntheseComptable: Spec = { object: {
  inscriptions: "number", membresActifs: "number", membresTotal: "number",
  notifEnvoyees: "number", tauxOuverturePush: "number", visites: "number",
  pointsDistribues: "number", pointsRachetes: "number", valeurRachetee: "number",
  bonusAttribues: "number", valeurBonus: "number",
} };

const snapshotFinMois: Spec = { object: {
  membresTotal: "number", revenusTotal: "number", visites: "number",
  pointsEnCirculation: "number", valeurPointsDistribues: "number",
} };

const comptabilite: Spec = { object: {
  moisRef: "string",
  facturesDetail: { array: comptabiliteFacture },
  codesPromo: { array: comptabiliteCodePromo },
  reclamationsDetail: { array: comptabiliteReclamation },
  promotions: { array: comptabilitePromotion },
  synthese: syntheseComptable,
  snapshotFinMois,
} };

const comptabiliteFranchise: Spec = { object: {
  synthese: syntheseComptable,
  snapshotFinMois,
} };

const promotionDetail: Spec = { object: {
  id: "string", nom: "string", description: "string", dateDebutISO: "string",
  typeRabais: "string", portee: "string",
  utilisations: "number", clics: "number", coutReel: "number",
  valeurDistribuee: "number", revenusGeneres: "number", roi: "number",
} };

const periode: Spec = { object: { dateDonnees: "string", derniereSync: "string" } };

// ─── Document global — clients/{clientId}/analytics/global ───────────────────

const analyticsGlobalSpec: Spec = { object: {
  periode,
  dateLancement: { optional: "string" }, // "YYYY-MM-DD" — Phase 3, pas encore envoyé par toutes les CF
  aVie: periodeAVie,
  hier: periodeHier,
  "7j": periodeStandard,
  "30j": periode30j,
  "90j": periode90j,
  segmentation: { optional: segmentation },
  parcours: { optional: parcours },
  achalandage,
  frequenceVisite: { array: { object: { tranche: "string", membres: "number" } } },
  recompenses: { array: recompense },
  campagnes: { array: campagne },
  comptabilite,
  promotionsDetail: { array: promotionDetail },
} };

// ─── Document franchise — clients/{clientId}/analytics/{franchiseId} ─────────
// Reprend uniquement les champs exigés par AnalyticsFranchise (sous-ensemble
// de PeriodeStandard pour 7j/30j/mois).

const periodeStandardFranchise: Spec = { object: {
  membresActifs: "number", nouveauxMembres: "number", ventes: "number", revenus: "number",
  panierMoyen: "number", visites: "number", reclamations: "number", bonusJoues: "number",
  variations, series: { array: serieJournaliere },
} };

const periodeMoisFranchise: Spec = { object: {
  membresActifs: "number", nouveauxMembres: "number", ventes: "number", revenus: "number",
  panierMoyen: "number", visites: "number", reclamations: "number", bonusJoues: "number",
  variations,
} };

const analyticsFranchiseSpec: Spec = { object: {
  franchiseId: "string", franchiseNom: "string",
  periode,
  aVie: periodeAVie,
  hier: periodeHier,
  "7j": periodeStandardFranchise,
  "30j": periodeStandardFranchise,
  mois: periodeMoisFranchise,
  achalandage,
  comptabilite: { optional: comptabiliteFranchise },
} };

// ─── API publique ──────────────────────────────────────────────────────────

export interface ValidationResult {
  errors: string[];
}

/** Valide l'enveloppe complète reçue par POST /api/sync/analytics. */
export function validateSyncPayload(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof body !== "object" || body === null) {
    return { errors: ["body : doit être un objet JSON"] };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.clientId !== "string" || !b.clientId) {
    errors.push("clientId : champ manquant ou invalide (attendu string non vide)");
  }

  if (b.global === undefined || b.global === null) {
    errors.push("global : champ manquant (attendu un objet conforme à AnalyticsGlobal)");
  } else {
    validate(b.global, analyticsGlobalSpec, "global", errors);
  }

  if (b.franchises !== undefined) {
    if (typeof b.franchises !== "object" || b.franchises === null || Array.isArray(b.franchises)) {
      errors.push("franchises : doit être un objet { [franchiseId]: AnalyticsFranchise }");
    } else {
      for (const [franchiseId, fdata] of Object.entries(b.franchises as Record<string, unknown>)) {
        validate(fdata, analyticsFranchiseSpec, `franchises.${franchiseId}`, errors);
        const declared = (fdata as Record<string, unknown> | undefined)?.franchiseId;
        if (typeof declared === "string" && declared !== franchiseId) {
          errors.push(`franchises.${franchiseId}.franchiseId : "${declared}" ne correspond pas à la clé "${franchiseId}"`);
        }
      }
    }
  }

  return { errors };
}
