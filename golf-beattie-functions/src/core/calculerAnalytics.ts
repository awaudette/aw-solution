/**
 * calculerAnalytics.ts — Calcul des agrégats analytics du golf.
 *
 * Lit les 4 collections métier du projet golf-beattie-d5062 (factures,
 * utilisateurs, Tirage, Recompenses_reclamees) + les 2 collections de push
 * (ff_push_notifications, ff_user_push_notifications) et calcule les agrégats
 * pour trois fenêtres : depuis le lancement, 30 derniers jours, hier. Fuseau
 * America/Toronto partout (voir dateToronto.ts).
 *
 * Ce module NE FAIT AUCUNE ÉCRITURE FIRESTORE et N'APPELLE JAMAIS
 * POST /api/sync/analytics lui-même — c'est un calcul pur (Firestore → objet
 * JS). Le mapping vers le contrat AnalyticsGlobal (aw-portail) et l'envoi au
 * portail sont faits par construirePayloadPortail.ts + src/index.ts, qui
 * réutilisent chargerDonneesBrutes() ci-dessous pour ne lire Firestore
 * qu'une seule fois par exécution de portailSyncJob.
 *
 * "depuis le lancement" = TOUT l'historique des 4 collections, aucun plancher
 * de date appliqué ni à la requête Firestore ni à l'agrégation (demandé par
 * Alex pour matcher le tableau de bord de l'app, ex. 286 factures / 45 664 $).
 * DEBUT_RAPPORTS (2026-05-01, ex-FACTURES_FLOOR) sert de plancher pour
 * seriesMensuelles et pour la moyenne d'achalandage par jour de semaine
 * (premier mois complet de saison pour le golf) — n'affecte PAS les totaux
 * aVie ci-dessus, ni churnMoyenMensuel/tauxVisiteMoyenMensuel (bornés à
 * DATE_LANCEMENT, inchangé).
 *
 * Portée volontairement limitée à ce qu'Alex a demandé — tout le reste du
 * contrat src/types/analytics.ts (aw-portail) n'est PAS calculé ici :
 * promotions détaillées / clics / conversions (aucune collection de ce type
 * côté golf — voir recompensesActives/promosActives ci-dessous pour les deux
 * compteurs simples qui, eux, sont calculés), taux d'ouverture des
 * notifications (aucune donnée d'ouverture dans ff_push_notifications /
 * ff_user_push_notifications — ces collections ne donnent que le nombre
 * d'envois et de destinataires, pas d'ouverture). Voir README.md.
 */
import type { Firestore, DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { torontoDateString, shiftDateStr, torontoWeekday, torontoHour, torontoMidnightUTC } from "./dateToronto";

export const DEBUT_RAPPORTS = "2026-05-01"; // premier mois complet de saison — plancher seriesMensuelles + achalandage
export const DATE_LANCEMENT = "2025-12-08"; // date de lancement du programme — exposée dans le résultat, ne borne plus les requêtes
const AUCUNE_BORNE = "0000-01-01"; // debut pour "depuis le lancement" : aucun plancher, tout l'historique

const ORDRE_JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const PLAGES = [
  { min: 7, max: 11, label: "7 h – 11 h" },
  { min: 11, max: 16, label: "11 h – 16 h" },
  { min: 16, max: 21, label: "16 h – 21 h" },
];

// Saison d'ouverture du golf : 1er mai → 30 septembre, chaque année. Seule
// constante à modifier si la saison change. churnMoyenMensuel,
// tauxVisiteMoyenMensuel et moyenneRevenusParJour sont calculés uniquement
// sur ces mois (mois en cours toujours exclu, comme le reste du calcul).
const SAISON = { moisDebut: 5, moisFin: 9 };
function estMoisSaison(mois: string): boolean {
  const m = Number(mois.slice(5, 7));
  return m >= SAISON.moisDebut && m <= SAISON.moisFin;
}

export interface ReclamationRecompense {
  nom: string;
  reclamations: number;
  pointsUtilises: number;
}

export interface PeriodeCalcul {
  debut: string; // "YYYY-MM-DD" inclus, Toronto
  fin: string;   // "YYYY-MM-DD" inclus, Toronto
  membresActifs: number;      // uids distincts avec ≥1 facture OU ≥1 tirage dans la fenêtre
  nouveauxMembres: number;    // uids dont created_time (utilisateurs) tombe dans la fenêtre
  ventes: number;              // nb de factures — sur depuisLancement, compte TOUS les docs même sans uid/date valides
  revenus: number;             // somme montant_facture, CAD — idem, brut sur depuisLancement
  panierMoyen: number;         // revenus / ventes
  visites: number;             // paires (membre, jour) distinctes — dérivé des factures seulement
  bonusJoues: number;          // nb de documents Tirage (parties bonus jouées) dans la fenêtre
  pointsDistribuesFactures: number; // somme points_gagnes (factures)
  pointsDistribuesTirage: number;   // somme gain (Tirage)
  pointsDistribuesTotal: number;
  pointsUtilises: number;           // somme points_utilises (Recompenses_reclamees)
  reclamationsParRecompense: ReclamationRecompense[];
}

export interface AchalandageJour { jour: string; visites: number }
export interface AchalandagePlage { jour: string; plage: string; visites: number }
export interface Achalandage { parJour: AchalandageJour[]; parPlage: AchalandagePlage[] }

export interface SerieMensuelle { mois: string; revenus: number; visites: number } // "YYYY-MM"

/** envoyees = nb de DOCUMENTS (1 document = 1 envoi), pas la somme de num_sent
 *  (nb de destinataires) — pas de champ contrat pour les destinataires, donc pas envoyé.
 *  tauxOuverture: null explicite — aucune donnée d'ouverture disponible, volontairement
 *  distinct d'un 0 % qui laisserait croire à une mesure réelle. */
export interface NotificationsCalcul { envoyees: number; tauxOuverture: null }

export interface ResultatCalculAnalytics {
  genereLe: string;           // ISO — horodatage d'exécution du calcul
  fuseau: "America/Toronto";
  dateLancement: string;       // "YYYY-MM-DD" — DATE_LANCEMENT
  membresTotal: number;        // nb total de documents utilisateurs (inscrits depuis toujours)
  pointsEnCirculation: number; // snapshot ACTUEL de la somme points_restants (utilisateurs) — hors period, ignore points_grattage
  depuisLancement: PeriodeCalcul; // aucun plancher de date — tout l'historique des 4 collections
  derniers30Jours: PeriodeCalcul;
  hier: PeriodeCalcul;
  achalandage: Achalandage;    // calculé sur tout l'historique des factures — format identique au contrat portail
  // ── Champs PeriodeAVie additionnels (contrat aw-portail) ──────────────────
  burnRate: number;               // % pointsUtilises / pointsDistribuesTotal, depuis le lancement
  breakageRate: number;           // 100 - burnRate
  moyenneRevenusParJour: number;  // revenus / jours, EN SAISON seulement (mois en cours exclu)
  revenuParMembre: number;        // revenus depuisLancement / membresTotal
  churnMoyenMensuel: number;      // moyenne des taux de churn mensuels, EN SAISON seulement
  tauxVisiteMoyenMensuel: number; // moyenne des (membresActifs du mois / membresTotal fin de mois), EN SAISON seulement
  moisSaisonInclus: string[];     // mois "YYYY-MM" effectivement utilisés pour les 3 métriques ci-dessus
  seriesMensuelles: SerieMensuelle[]; // un point par mois calendaire complet depuis DEBUT_RAPPORTS (2026-05)
  notifications: NotificationsCalcul;
  recompensesActives: number; // recompenses[].actif === true && !isDeletedLogical, snapshot ACTUEL
  promosActives: number;      // Promotions[].Actif === true && aujourd'hui (Toronto) ∈ [Date_debut, Date_fin]
  avertissements: string[];
}

export interface FactureAgg { jour: string; uid: string; montant: number; points: number; ts: Date }
export interface TirageAgg  { jour: string; uid: string; gain: number }
export interface ReclamationAgg { jour: string; nomRecompense: string; pointsUtilises: number }

/** Un élément par document d'envoi (ff_push_notifications + ff_user_push_notifications). */
export interface PushAgg { jour: string }

/** Une Promotion brute (collection "Promotions") — dates déjà résolues en "YYYY-MM-DD" Toronto. */
export interface PromoAgg { actif: boolean; debut: string; fin: string }

function refUid(ref: unknown, warnings: string[], contexte: string): string | null {
  const r = ref as { id?: string } | undefined;
  if (!r || typeof r.id !== "string") {
    warnings.push(`${contexte} : utilisateur_ref absent ou invalide — document ignoré`);
    return null;
  }
  return r.id;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// ── Arithmétique calendaire sur des clés "YYYY-MM" / "YYYY-MM-DD" (chaînes déjà
// résolues en Toronto — comparaison lexicographique valide, pas de fuseau ici) ──
export function moisKey(jour: string): string { return jour.slice(0, 7); }
export function moisSuivant(mois: string): string {
  const [y, m] = mois.split("-").map(Number); // m = mois 1-indexé courant
  const d = new Date(Date.UTC(y, m, 1));       // m utilisé comme index 0-indexé => mois suivant
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function moisPrecedent(mois: string): string {
  const [y, m] = mois.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));   // m-1 = mois courant 0-indexé, -1 de plus = précédent
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function moisRange(debut: string, finInclus: string): string[] {
  const out: string[] = [];
  for (let cur = debut; cur <= finInclus; cur = moisSuivant(cur)) out.push(cur);
  return out;
}
function joursEntre(debut: string, fin: string): number {
  const [y1, m1, d1] = debut.split("-").map(Number);
  const [y2, m2, d2] = fin.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

/**
 * DonneesBrutes — résultat de la lecture Firestore + normalisation, sans
 * aucune agrégation par fenêtre. Exposé pour que construirePayloadPortail.ts
 * puisse calculer les fenêtres additionnelles du contrat AnalyticsGlobal
 * (7j, 90j, variations, séries journalières, comptabilité mensuelle...) sans
 * relire Firestore une deuxième fois.
 */
export interface DonneesBrutes {
  factures: FactureAgg[];
  tirages: TirageAgg[];
  reclamations: ReclamationAgg[];
  uidCreated: Map<string, string>; // uid → jour d'inscription (Toronto)
  pointsEnCirculation: number;     // snapshot ACTUEL, hors fenêtre
  membresTotal: number;
  pushs: PushAgg[];                // ff_push_notifications + ff_user_push_notifications, un élément par document
  ventesBrutDepuisLancement: number;
  revenusBrutDepuisLancement: number;
  pointsFacturesBrutDepuisLancement: number;
  recompensesActives: number;      // collection "recompenses" — snapshot ACTUEL, indépendant de "maintenant"
  promotions: PromoAgg[];          // collection "Promotions" — brut, filtré par date dans calculerDepuisBruts (a besoin de "maintenant")
  warnings: string[];
}

export async function chargerDonneesBrutes(db: Firestore): Promise<DonneesBrutes> {
  const warnings: string[] = [];

  // ── Lecture (aucune écriture) — aucun filtre de date : tout l'historique ──
  const [facturesSnap, tirageSnap, utilisateursSnap, reclamationsSnap, pushGlobalSnap, pushCibleSnap, recompensesSnap, promotionsSnap] = await Promise.all([
    db.collection("factures").get(),
    db.collection("Tirage").get(),
    db.collection("utilisateurs").get(),
    db.collection("Recompenses_reclamees").get(),
    db.collection("ff_push_notifications").get(),
    db.collection("ff_user_push_notifications").get(),
    db.collection("recompenses").get(),
    db.collection("Promotions").get(),
  ]);

  // ── Normalisation ─────────────────────────────────────────────────────────
  const factures: FactureAgg[] = [];
  facturesSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = d.data();
    const ts = data.date_soumission?.toDate?.();
    const uid = refUid(data.utilisateur_ref, warnings, `factures/${d.id}`);
    if (!ts || !uid) { if (!ts) warnings.push(`factures/${d.id} : date_soumission absente — ignoré`); return; }
    factures.push({ jour: torontoDateString(ts), uid, montant: num(data.montant_facture), points: num(data.points_gagnes), ts });
  });

  const tirages: TirageAgg[] = [];
  tirageSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = d.data();
    const ts = data.date_tirage?.toDate?.();
    const uid = refUid(data.utilisateur_ref, warnings, `Tirage/${d.id}`);
    if (!ts || !uid) { if (!ts) warnings.push(`Tirage/${d.id} : date_tirage absente — ignoré`); return; }
    tirages.push({ jour: torontoDateString(ts), uid, gain: num(data.gain) });
  });

  const reclamations: ReclamationAgg[] = [];
  reclamationsSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = d.data();
    const ts = data.date_reclamation?.toDate?.();
    if (!ts) { warnings.push(`Recompenses_reclamees/${d.id} : date_reclamation absente — ignoré`); return; }
    reclamations.push({
      jour: torontoDateString(ts),
      nomRecompense: typeof data.nom_recompense === "string" ? data.nom_recompense : "(sans nom)",
      pointsUtilises: num(data.points_utilises),
    });
  });

  // pointsEnCirculation : snapshot ACTUEL, pas une somme sur une fenêtre — points_grattage volontairement ignoré.
  // uidCreated : jour d'inscription (Toronto) par uid, pour nouveauxMembres.
  let pointsEnCirculation = 0;
  const uidCreated = new Map<string, string>();
  utilisateursSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = d.data();
    pointsEnCirculation += num(data.points_restants);
    const created = data.created_time?.toDate?.();
    if (created) uidCreated.set(d.id, torontoDateString(created));
    else warnings.push(`utilisateurs/${d.id} : created_time absent — exclu de nouveauxMembres`);
  });
  const membresTotal = utilisateursSnap.size;

  // Totaux BRUTS sur factures — TOUS les documents, même ceux sans utilisateur_ref
  // ni date_soumission valides (2 docs constatés). Sert uniquement à depuisLancement :
  // "toutes les factures, sans filtre de date" doit matcher le tableau de bord de
  // l'app (286 factures / 45 664 $) même pour ces docs orphelins ; ventes/revenus
  // ne dépendent pas d'un uid ou d'une date, contrairement à visites/membresActifs.
  let ventesBrutDepuisLancement = 0;
  let revenusBrutDepuisLancement = 0;
  let pointsFacturesBrutDepuisLancement = 0;
  facturesSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = d.data();
    ventesBrutDepuisLancement += 1;
    revenusBrutDepuisLancement += num(data.montant_facture);
    pointsFacturesBrutDepuisLancement += num(data.points_gagnes);
  });

  // Push notifications : seul `timestamp` (Firestore Timestamp) est utilisé — un
  // élément par document, quelle que soit num_sent (destinataires, hors contrat).
  const pushs: PushAgg[] = [];
  for (const snap of [pushGlobalSnap, pushCibleSnap]) {
    snap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      const data = d.data();
      const ts = data.timestamp?.toDate?.();
      if (!ts) { warnings.push(`${d.ref.parent.id}/${d.id} : timestamp absent — exclu des envois datés`); return; }
      pushs.push({ jour: torontoDateString(ts) });
    });
  }

  // recompensesActives : snapshot ACTUEL (indépendant de "maintenant") — actif === true ET
  // pas de soft-delete. isDeletedLogical absent (docs plus anciens) = traité comme "pas supprimé".
  let recompensesActives = 0;
  recompensesSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = d.data();
    if (data.actif === true && data.isDeletedLogical !== true) recompensesActives += 1;
  });

  // promotions : brut seulement ici — le filtre "date du jour ∈ [Date_debut, Date_fin]" a besoin
  // de "maintenant", fourni uniquement à calculerDepuisBruts.
  const promotions: PromoAgg[] = [];
  promotionsSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = d.data();
    const debutTs = data.Date_debut?.toDate?.();
    const finTs = data.Date_fin?.toDate?.();
    if (!debutTs || !finTs) { warnings.push(`Promotions/${d.id} : Date_debut/Date_fin absente — exclue de promosActives`); return; }
    promotions.push({ actif: data.Actif === true, debut: torontoDateString(debutTs), fin: torontoDateString(finTs) });
  });

  return {
    factures, tirages, reclamations, uidCreated, pointsEnCirculation, membresTotal, pushs,
    ventesBrutDepuisLancement, revenusBrutDepuisLancement, pointsFacturesBrutDepuisLancement,
    recompensesActives, promotions,
    warnings,
  };
}

/** Agrège une fenêtre [debut, fin] à partir des données déjà chargées. Exporté
 *  pour être réutilisé par construirePayloadPortail.ts (fenêtres 7j/90j du
 *  contrat AnalyticsGlobal, absentes de ResultatCalculAnalytics). */
export function agregerPeriodeBrute(bruts: Pick<DonneesBrutes, "factures" | "tirages" | "reclamations" | "uidCreated">, debut: string, fin: string): PeriodeCalcul {
  const { factures, tirages, reclamations, uidCreated } = bruts;
  const facturesFenetre = factures.filter((f) => f.jour >= debut && f.jour <= fin);
  const tirageFenetre = tirages.filter((t) => t.jour >= debut && t.jour <= fin);
  const reclamationsFenetre = reclamations.filter((r) => r.jour >= debut && r.jour <= fin);

  const revenus = facturesFenetre.reduce((s, f) => s + f.montant, 0);
  const ventes = facturesFenetre.length;
  const pointsDistribuesFactures = facturesFenetre.reduce((s, f) => s + f.points, 0);
  const pointsDistribuesTirage = tirageFenetre.reduce((s, t) => s + t.gain, 0);

  const visitesSet = new Set(facturesFenetre.map((f) => `${f.uid}_${f.jour}`));
  const membresActifsSet = new Set<string>();
  facturesFenetre.forEach((f) => membresActifsSet.add(f.uid));
  tirageFenetre.forEach((t) => membresActifsSet.add(t.uid));

  let nouveauxMembres = 0;
  uidCreated.forEach((jourInscription) => {
    if (jourInscription >= debut && jourInscription <= fin) nouveauxMembres += 1;
  });

  const parRecompense = new Map<string, ReclamationRecompense>();
  for (const r of reclamationsFenetre) {
    const entry = parRecompense.get(r.nomRecompense) ?? { nom: r.nomRecompense, reclamations: 0, pointsUtilises: 0 };
    entry.reclamations += 1;
    entry.pointsUtilises += r.pointsUtilises;
    parRecompense.set(r.nomRecompense, entry);
  }

  return {
    debut, fin,
    membresActifs: membresActifsSet.size,
    nouveauxMembres,
    ventes,
    revenus: Math.round(revenus * 100) / 100,
    panierMoyen: ventes > 0 ? Math.round((revenus / ventes) * 100) / 100 : 0,
    visites: visitesSet.size,
    bonusJoues: tirageFenetre.length,
    pointsDistribuesFactures,
    pointsDistribuesTirage,
    pointsDistribuesTotal: pointsDistribuesFactures + pointsDistribuesTirage,
    pointsUtilises: reclamationsFenetre.reduce((s, r) => s + r.pointsUtilises, 0),
    reclamationsParRecompense: [...parRecompense.values()].sort((a, b) => b.reclamations - a.reclamations),
  };
}

/** Calcule ResultatCalculAnalytics à partir de données déjà chargées (aucune lecture Firestore ici). */
export function calculerDepuisBruts(bruts: DonneesBrutes, maintenant: Date): ResultatCalculAnalytics {
  const warnings: string[] = [...bruts.warnings];
  const { factures, tirages, uidCreated, pointsEnCirculation, membresTotal, pushs,
    ventesBrutDepuisLancement, revenusBrutDepuisLancement, pointsFacturesBrutDepuisLancement,
    recompensesActives, promotions } = bruts;

  const aujourdHui = torontoDateString(maintenant);
  const hier = shiftDateStr(aujourdHui, -1);
  const debut30j = shiftDateStr(hier, -29); // fenêtre de 30 jours se terminant hier inclus

  const agregerPeriode = (debut: string, fin: string) => agregerPeriodeBrute(bruts, debut, fin);

  // ── promosActives : Actif === true ET aujourd'hui (Toronto) ∈ [Date_debut, Date_fin] ──
  const promosActives = promotions.filter((p) => p.actif && p.debut <= aujourdHui && aujourdHui <= p.fin).length;

  // ── Achalandage (jour de semaine) — MOYENNE de visites par jour de semaine,
  // jours de saison seulement, depuis DEBUT_RAPPORTS jusqu'à hier inclus.
  // Bug précédent : parJour sommait TOUT l'historique des factures (aucun
  // plancher, hors saison inclus) sous le libellé "visites moyennes par jour
  // de semaine" côté portail — 25 à 51 "visites" par jour de semaine n'était
  // donc pas une moyenne mais un total cumulé sur ~9 mois (la somme des 7
  // jours = 261, exactement depuisLancement.visites) ; retirer 2 factures
  // d'octobre (hors saison) ne changeait presque rien à des sommes bâties sur
  // ~18 semaines de saison. Fix : diviser le total de chaque jour de semaine
  // par son nombre d'occurrences dans la même fenêtre (saison, depuis
  // DEBUT_RAPPORTS). "Visite" = 1re facture du jour pour un uid, jamais Tirage.
  const finAchalandage = hier;
  const facturesAchalandage = factures.filter((f) =>
    f.jour >= DEBUT_RAPPORTS && f.jour <= finAchalandage && estMoisSaison(moisKey(f.jour)));
  const visiteTs = new Map<string, Date>();
  facturesAchalandage.forEach((f) => {
    const key = `${f.uid}_${f.jour}`;
    const existant = visiteTs.get(key);
    if (!existant || f.ts < existant) visiteTs.set(key, f.ts);
  });
  const visitesParJourMap = new Map<string, number>();
  const parPlageMap = new Map<string, number>();
  visiteTs.forEach((ts, key) => {
    const jourSemaine = torontoWeekday(ts);
    visitesParJourMap.set(jourSemaine, (visitesParJourMap.get(jourSemaine) ?? 0) + 1);
    const heure = torontoHour(ts);
    const plage = PLAGES.find((p) => heure >= p.min && heure < p.max);
    if (!plage) { warnings.push(`achalandage : visite ${key} à ${heure} h — hors plages 7 h–21 h, exclue de parPlage`); return; }
    const pKey = `${jourSemaine}|${plage.label}`;
    parPlageMap.set(pKey, (parPlageMap.get(pKey) ?? 0) + 1);
  });
  // Dénominateur : nb d'occurrences de chaque jour de semaine, jours de saison
  // seulement, dans la même fenêtre [DEBUT_RAPPORTS, hier] — indépendant des visites réelles.
  const occurrencesParJour = new Map<string, number>();
  if (DEBUT_RAPPORTS <= finAchalandage) {
    for (let j = DEBUT_RAPPORTS; j <= finAchalandage; j = shiftDateStr(j, 1)) {
      if (!estMoisSaison(moisKey(j))) continue;
      const jourSemaine = torontoWeekday(torontoMidnightUTC(j));
      occurrencesParJour.set(jourSemaine, (occurrencesParJour.get(jourSemaine) ?? 0) + 1);
    }
  } else {
    warnings.push("achalandage : DEBUT_RAPPORTS est après hier — aucune moyenne calculable, parJour à 0");
  }
  const achalandage: Achalandage = {
    parJour: ORDRE_JOURS.map((jour) => {
      const occurrences = occurrencesParJour.get(jour) ?? 0;
      const total = visitesParJourMap.get(jour) ?? 0;
      return { jour, visites: occurrences > 0 ? Math.round((total / occurrences) * 10) / 10 : 0 };
    }),
    parPlage: PLAGES.flatMap((plage) =>
      ORDRE_JOURS.map((jour) => ({ jour, plage: plage.label, visites: parPlageMap.get(`${jour}|${plage.label}`) ?? 0 })),
    ),
  };

  // ── Séries mensuelles + churn + taux de visite moyen — mois calendaires
  // COMPLETS seulement (le mois en cours est exclu, comme "hier" pour le reste). ──
  const moisCourant = moisKey(aujourdHui);
  const moisFinComplet = moisPrecedent(moisCourant);
  const moisListe = moisKey(DATE_LANCEMENT) <= moisFinComplet ? moisRange(moisKey(DATE_LANCEMENT), moisFinComplet) : [];
  if (moisListe.length === 0) warnings.push("seriesMensuelles/churn/tauxVisite : aucun mois calendaire complet depuis le lancement");

  const statsMois = moisListe.map((m) => {
    const debutM = `${m}-01`;
    const finM = shiftDateStr(`${moisSuivant(m)}-01`, -1);
    const facturesMois = factures.filter((f) => f.jour >= debutM && f.jour <= finM);
    const tirageMois = tirages.filter((t) => t.jour >= debutM && t.jour <= finM);
    const membresActifsSet = new Set<string>();
    facturesMois.forEach((f) => membresActifsSet.add(f.uid));
    tirageMois.forEach((t) => membresActifsSet.add(t.uid));
    let membresTotalFin = 0;
    const debutMoisSuivant = `${moisSuivant(m)}-01`;
    uidCreated.forEach((j) => { if (j < debutMoisSuivant) membresTotalFin += 1; });
    return {
      mois: m,
      revenus: Math.round(facturesMois.reduce((s, f) => s + f.montant, 0) * 100) / 100,
      visites: new Set(facturesMois.map((f) => `${f.uid}_${f.jour}`)).size,
      membresActifsSet,
      membresTotalFin,
    };
  });

  // seriesMensuelles : démarre à DEBUT_RAPPORTS (2026-05), pas DATE_LANCEMENT (2025-12-08) —
  // statsMois/moisListe couvrent déjà DATE_LANCEMENT→moisFinComplet, on filtre juste l'affichage.
  // N'affecte PAS les totaux aVie (depuisLancement garde toutes les factures, sans plancher).
  const seriesMensuelles: SerieMensuelle[] = statsMois
    .filter((s) => s.mois >= moisKey(DEBUT_RAPPORTS))
    .map((s) => ({ mois: s.mois, revenus: s.revenus, visites: s.visites }));

  // Restriction à la saison (1er mai → 30 sept) pour churn / tauxVisite / moyenneRevenusParJour.
  const statsMoisSaison = statsMois.filter((s) => estMoisSaison(s.mois));
  const moisSaisonInclus = statsMoisSaison.map((s) => s.mois);
  if (statsMoisSaison.length === 0) warnings.push("churn/tauxVisite/moyenneRevenusParJour : aucun mois de saison (mai-sept) complet depuis le lancement");

  const tauxVisiteParMois = statsMoisSaison.map((s) => (s.membresTotalFin > 0 ? (s.membresActifsSet.size / s.membresTotalFin) * 100 : 0));
  const tauxVisiteMoyenMensuel = tauxVisiteParMois.length
    ? Math.round((tauxVisiteParMois.reduce((a, b) => a + b, 0) / tauxVisiteParMois.length) * 100) / 100
    : 0;

  const churnParMois: number[] = [];
  for (let i = 1; i < statsMoisSaison.length; i++) {
    // Ne compare que des mois de saison consécutifs (garde-fou pour une saison future :
    // ne pas confondre "hors saison" et "churn" entre sept. d'une année et mai de la suivante).
    if (moisSuivant(statsMoisSaison[i - 1].mois) !== statsMoisSaison[i].mois) continue;
    const prev = statsMoisSaison[i - 1].membresActifsSet;
    if (prev.size === 0) continue;
    const cur = statsMoisSaison[i].membresActifsSet;
    let perdus = 0;
    prev.forEach((uid) => { if (!cur.has(uid)) perdus += 1; });
    churnParMois.push((perdus / prev.size) * 100);
  }
  const churnMoyenMensuel = churnParMois.length
    ? Math.round((churnParMois.reduce((a, b) => a + b, 0) / churnParMois.length) * 100) / 100
    : 0;

  // moyenneRevenusParJour : jours de saison seulement, à l'intérieur des mois complets ci-dessus
  // (borné à DATE_LANCEMENT si le lancement tombe en cours de mois de saison).
  let joursSaison = 0;
  let revenusSaison = 0;
  for (const m of moisListe) {
    if (!estMoisSaison(m)) continue;
    const debutMoisStr = `${m}-01`;
    const debutM = debutMoisStr > DATE_LANCEMENT ? debutMoisStr : DATE_LANCEMENT;
    const finM = shiftDateStr(`${moisSuivant(m)}-01`, -1);
    joursSaison += joursEntre(debutM, finM);
    revenusSaison += factures.filter((f) => f.jour >= debutM && f.jour <= finM).reduce((s, f) => s + f.montant, 0);
  }
  const moyenneRevenusParJour = joursSaison > 0 ? Math.round((revenusSaison / joursSaison) * 100) / 100 : 0;

  // ── Notifications — envoyees = nb de DOCUMENTS (1 envoi = 1 doc), pas la somme de num_sent ──
  const notifications: NotificationsCalcul = { envoyees: pushs.length, tauxOuverture: null };

  const depuisLancement: PeriodeCalcul = {
    ...agregerPeriode(AUCUNE_BORNE, hier),
    ventes: ventesBrutDepuisLancement,
    revenus: Math.round(revenusBrutDepuisLancement * 100) / 100,
    panierMoyen: ventesBrutDepuisLancement > 0
      ? Math.round((revenusBrutDepuisLancement / ventesBrutDepuisLancement) * 100) / 100
      : 0,
    pointsDistribuesFactures: pointsFacturesBrutDepuisLancement,
  };
  depuisLancement.pointsDistribuesTotal = depuisLancement.pointsDistribuesFactures + depuisLancement.pointsDistribuesTirage;

  const burnRate = depuisLancement.pointsDistribuesTotal > 0
    ? Math.round((depuisLancement.pointsUtilises / depuisLancement.pointsDistribuesTotal) * 10000) / 100
    : 0;
  const breakageRate = Math.round((100 - burnRate) * 100) / 100;
  const revenuParMembre = membresTotal > 0 ? Math.round((depuisLancement.revenus / membresTotal) * 100) / 100 : 0;

  return {
    genereLe: maintenant.toISOString(),
    fuseau: "America/Toronto",
    dateLancement: DATE_LANCEMENT,
    membresTotal,
    pointsEnCirculation,
    depuisLancement,
    derniers30Jours: agregerPeriode(debut30j, hier),
    hier: agregerPeriode(hier, hier),
    achalandage,
    burnRate,
    breakageRate,
    moyenneRevenusParJour,
    revenuParMembre,
    churnMoyenMensuel,
    tauxVisiteMoyenMensuel,
    moisSaisonInclus,
    seriesMensuelles,
    notifications,
    recompensesActives,
    promosActives,
    avertissements: warnings,
  };
}

export async function calculerAnalytics(
  db: Firestore,
  options: { maintenant?: Date } = {},
): Promise<ResultatCalculAnalytics> {
  const maintenant = options.maintenant ?? new Date();
  const bruts = await chargerDonneesBrutes(db);
  return calculerDepuisBruts(bruts, maintenant);
}
