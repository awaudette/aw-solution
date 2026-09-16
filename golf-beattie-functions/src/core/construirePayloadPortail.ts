/**
 * construirePayloadPortail.ts — Mappe DonneesBrutes/ResultatCalculAnalytics
 * (calculerAnalytics.ts) vers le contrat AnalyticsGlobal de aw-portail
 * (aw-portail/src/types/analytics.ts, lecture seule — jamais importé/modifié
 * ici, seulement reproduit structurellement ci-dessous).
 *
 * Champs obligatoires du contrat : tous fournis avec de vraies données
 * calculées depuis Firestore (jamais une valeur inventée pour combler un
 * champ requis). Les 7 champs suivants, devenus optionnels dans le contrat,
 * sont volontairement OMIS (aucune source de données côté golf) plutôt que
 * envoyés à 0/vide, qui serait trompeur sur le dashboard portail — décision
 * confirmée par Alex le 2026-09-16 :
 *   - campagnes            (aucune collection de campagnes/envois ciblés)
 *   - promotionsDetail     (aucun tracking clics/conversions/revenus de promo)
 *   - comptabilite.codesPromo (aucun code promo suivi)
 *   - promos (bloc 7j/30j/90j/aVie) (idem — aucune donnée de promo)
 *   - recompenses[].foodCost (aucun coût réel suivi sur les réclamations)
 *   - comptabilite.synthese.valeurRachetee (aucun taux $/point établi)
 *   - notifications.tauxOuverture (ff_push_notifications ne donne aucune donnée d'ouverture)
 *
 * aVie.recompensesActives / aVie.promosActives : calculés depuis les
 * collections "recompenses" (actif === true && !isDeletedLogical) et
 * "Promotions" (Actif === true && aujourd'hui ∈ [Date_debut, Date_fin],
 * fuseau America/Toronto) — voir calculerAnalytics.ts.
 *
 * Limitations connues — champs OBLIGATOIRES (non optionnels dans le contrat)
 * sans aucune source de données réelle, mis à 0 faute d'alternative (même
 * cause racine que les champs ci-dessus, mais le contrat ne les rend pas
 * optionnels) — à surveiller sur le dashboard portail, à signaler à Alex si
 * la distinction "0 réel" / "0 faute de données" devient un problème :
 *   - comptabilite.synthese.tauxOuverturePush (même absence de tracking que notifications.tauxOuverture)
 *   - comptabilite.synthese.valeurBonus, comptabilite.snapshotFinMois.valeurPointsDistribues
 *     (même absence de taux $/point que valeurRachetee, mais pas listés comme optionnels)
 *   - comptabilite.reclamationsDetail[].foodCost (version obligatoire, par ligne, du foodCost optionnel de recompenses[])
 *   - recompenses[].pourcentageFoodCost (dérivé d'un foodCost qui n'existe pas)
 *
 * Hypothèses de calcul documentées (le contrat ne précise pas la formule) :
 *   - tauxVisite (periodeStandard) = % des membres actifs de la fenêtre ayant
 *     visité ≥2 jours distincts dans cette même fenêtre (taux de visite répétée)
 *   - participationBonus = % des membres actifs de la fenêtre ayant joué ≥1
 *     bonus (Tirage) dans cette même fenêtre
 *   - variations.* = (valeur période courante − valeur période précédente
 *     équivalente immédiate) / valeur précédente ; si la précédente vaut 0,
 *     ratio = 1 si la courante est >0, sinon 0
 *   - customerMomentum = visites (30j courants) / visites (30j précédents),
 *     même règle de repli à 0/1 que variations
 *   - "franchise" (comptabilite.facturesDetail/reclamationsDetail) = SITE_UNIQUE
 *     ci-dessous : le golf est un site unique (account_id Lightspeed 250755),
 *     pas de multi-franchise — voir README.md
 *
 * Ce module NE FAIT AUCUNE ÉCRITURE FIRESTORE et N'ENVOIE RIEN au portail —
 * il retourne un objet JS pur. L'appel réseau est fait par src/index.ts.
 */
import type { Firestore } from "firebase-admin/firestore";
import { torontoDateString, shiftDateStr } from "./dateToronto";
import {
  chargerDonneesBrutes,
  calculerDepuisBruts,
  agregerPeriodeBrute,
  moisKey,
  moisSuivant,
  moisPrecedent,
  DATE_LANCEMENT,
  type DonneesBrutes,
} from "./calculerAnalytics";

const SITE_UNIQUE = "Club de golf Beattie"; // site unique — account_id Lightspeed 250755, voir README.md

// ─── Types du payload — copie structurelle du contrat AnalyticsGlobal ─────
// (aw-portail/src/types/analytics.ts, lecture seule). Ne PAS importer ce
// fichier depuis aw-portail dans le code déployé : projets Firebase séparés,
// aucune dépendance cross-repo en production. Voir scripts/verifierPayload.ts
// pour la validation contre le vrai contrat (import direct, hors déploiement).

interface SerieJournaliere { date: string; visites: number; revenus: number }
interface Variations { revenus: number; ventes: number; membresActifs: number; panierMoyen: number }
interface BlocNotifications { envoyees: number }

interface PeriodeStandard {
  membresActifs: number; nouveauxMembres: number; ventes: number; revenus: number;
  panierMoyen: number; visites: number; reclamations: number; bonusJoues: number;
  participationBonus: number; pointsEmisFactures: number; pointsEmisBonus: number;
  tauxVisite: number; revenuParVisite: number; breakageRate: number; burnRate: number;
  variations: Variations; series: SerieJournaliere[]; notifications: BlocNotifications;
}
interface Periode30j extends PeriodeStandard { customerMomentum: number; tauxChurn: number; pointsMoyensParMembre: number }
interface SeriesMensuelles { mois: string; revenus: number; visites: number }
interface Periode90j extends PeriodeStandard { tauxChurn: number; revenuParMembre: number; seriesMensuelles: SeriesMensuelles[] }
interface PeriodeHier { membresActifs: number; ventes: number; revenus: number; visites: number; reclamations: number; bonusJoues: number }

interface PeriodeAVie {
  membresTotal: number; revenusTotal: number; visites: number; panierMoyen: number;
  moyenneRevenusParJour: number; revenuParMembre: number; reclamations: number; bonusJoues: number;
  pointsEnCirculation: number; burnRate: number; breakageRate: number;
  churnMoyenMensuel: number; tauxVisiteMoyenMensuel: number;
  notifications: BlocNotifications; seriesMensuelles: SeriesMensuelles[];
  pointsDistribuesFactures: number; pointsDistribuesBonus: number;
  recompensesActives?: number; promosActives?: number;
}

interface Achalandage { parJour: { jour: string; visites: number }[]; parPlage: { jour: string; plage: string; visites: number }[] }
interface Recompense { nom: string; reclamations: number; pointsUtilises: number; pourcentageFoodCost: number }

interface ComptabiliteFacture { date: string; montant: number; pointsAttribues: number; franchise: string }
interface ComptabiliteReclamation { date: string; recompense: string; pointsReclames: number; foodCost: number; franchise: string }
/** Champ minimal — seuls titre/dates existent côté golf (pas de rabais/coûts/revenus suivis
 *  par promo). `dateDebut`/`dateFin` et les autres champs de ComptabilitePromotion (aw-portail)
 *  sont optionnels dans le contrat précisément pour ce cas. */
interface ComptabilitePromotionMoisRef { nom: string; dateDebut: string; dateFin: string }
interface SyntheseComptable {
  inscriptions: number; revenus: number; membresActifs: number; membresTotal: number;
  notifEnvoyees: number; tauxOuverturePush: number; visites: number;
  pointsDistribues: number; pointsDistribuesFactures: number; pointsDistribuesBonus: number;
  pointsRachetes: number; bonusAttribues: number; valeurBonus: number;
}
interface SnapshotFinMois { membresTotal: number; revenusTotal: number; visites: number; pointsEnCirculation: number; valeurPointsDistribues: number }
interface Comptabilite {
  moisRef: string; facturesDetail: ComptabiliteFacture[]; reclamationsDetail: ComptabiliteReclamation[];
  promotions: ComptabilitePromotionMoisRef[]; synthese: SyntheseComptable; snapshotFinMois: SnapshotFinMois;
}

export interface PayloadAnalyticsGlobal {
  periode: { dateDonnees: string; derniereSync: string };
  dateLancement: string;
  aVie: PeriodeAVie;
  hier: PeriodeHier;
  "7j": PeriodeStandard;
  "30j": Periode30j;
  "90j": Periode90j;
  achalandage: Achalandage;
  frequenceVisite: { tranche: string; membres: number }[];
  recompenses: Recompense[];
  comptabilite: Comptabilite;
}

// ─── Utilitaires ──────────────────────────────────────────────────────────

function arrondi2(n: number): number { return Math.round(n * 100) / 100; }

/** ratio (valeur courante − précédente) / précédente. Repli documenté en tête de fichier. */
function ratio(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 1 : 0;
  return Math.round(((cur - prev) / prev) * 10000) / 10000;
}

function joursListe(debut: string, fin: string): string[] {
  const out: string[] = [];
  for (let j = debut; j <= fin; j = shiftDateStr(j, 1)) out.push(j);
  return out;
}

function activeSet(bruts: DonneesBrutes, debut: string, fin: string): Set<string> {
  const s = new Set<string>();
  bruts.factures.forEach((f) => { if (f.jour >= debut && f.jour <= fin) s.add(f.uid); });
  bruts.tirages.forEach((t) => { if (t.jour >= debut && t.jour <= fin) s.add(t.uid); });
  return s;
}

function tauxChurnEntre(bruts: DonneesBrutes, debutPrec: string, finPrec: string, debutCur: string, finCur: string): number {
  const prec = activeSet(bruts, debutPrec, finPrec);
  if (prec.size === 0) return 0;
  const cur = activeSet(bruts, debutCur, finCur);
  let perdus = 0;
  prec.forEach((uid) => { if (!cur.has(uid)) perdus += 1; });
  return Math.round((perdus / prec.size) * 10000) / 100;
}

/** Construit un bloc PeriodeStandard complet pour une fenêtre [debut,fin], avec
 *  variations calculées contre la fenêtre précédente équivalente immédiate. */
function construirePeriodeStandard(bruts: DonneesBrutes, debut: string, fin: string, debutPrec: string, finPrec: string): PeriodeStandard {
  const base = agregerPeriodeBrute(bruts, debut, fin);
  const basePrec = agregerPeriodeBrute(bruts, debutPrec, finPrec);

  const actifs = activeSet(bruts, debut, fin);
  const tirageActifsFenetre = new Set(bruts.tirages.filter((t) => t.jour >= debut && t.jour <= fin).map((t) => t.uid));
  const visitesParUid = new Map<string, Set<string>>();
  bruts.factures.forEach((f) => {
    if (f.jour < debut || f.jour > fin) return;
    if (!visitesParUid.has(f.uid)) visitesParUid.set(f.uid, new Set());
    visitesParUid.get(f.uid)!.add(f.jour);
  });
  let repeatCount = 0;
  visitesParUid.forEach((jours) => { if (jours.size >= 2) repeatCount += 1; });
  let bonusCount = 0;
  actifs.forEach((uid) => { if (tirageActifsFenetre.has(uid)) bonusCount += 1; });

  const reclamations = base.reclamationsParRecompense.reduce((s, r) => s + r.reclamations, 0);
  const burnRate = base.pointsDistribuesTotal > 0 ? Math.round((base.pointsUtilises / base.pointsDistribuesTotal) * 10000) / 100 : 0;
  const breakageRate = arrondi2(100 - burnRate);

  const series: SerieJournaliere[] = joursListe(debut, fin).map((j) => {
    const facturesJour = bruts.factures.filter((f) => f.jour === j);
    return {
      date: j,
      visites: new Set(facturesJour.map((f) => f.uid)).size,
      revenus: arrondi2(facturesJour.reduce((s, f) => s + f.montant, 0)),
    };
  });

  const envoyees = bruts.pushs.filter((p) => p.jour >= debut && p.jour <= fin).length;

  return {
    membresActifs: base.membresActifs,
    nouveauxMembres: base.nouveauxMembres,
    ventes: base.ventes,
    revenus: base.revenus,
    panierMoyen: base.panierMoyen,
    visites: base.visites,
    reclamations,
    bonusJoues: base.bonusJoues,
    participationBonus: actifs.size > 0 ? Math.round((bonusCount / actifs.size) * 10000) / 100 : 0,
    pointsEmisFactures: base.pointsDistribuesFactures,
    pointsEmisBonus: base.pointsDistribuesTirage,
    tauxVisite: actifs.size > 0 ? Math.round((repeatCount / actifs.size) * 10000) / 100 : 0,
    revenuParVisite: base.visites > 0 ? arrondi2(base.revenus / base.visites) : 0,
    breakageRate,
    burnRate,
    variations: {
      revenus: ratio(base.revenus, basePrec.revenus),
      ventes: ratio(base.ventes, basePrec.ventes),
      membresActifs: ratio(base.membresActifs, basePrec.membresActifs),
      panierMoyen: ratio(base.panierMoyen, basePrec.panierMoyen),
    },
    series,
    notifications: { envoyees },
  };
}

/** Tranches de fréquence de visite (nb de jours de visite distincts depuis le
 *  lancement, tout l'historique) — regroupement d'affichage, seuils choisis
 *  arbitrairement (à ajuster avec Alex si besoin), comptes réels sous-jacents. */
function construireFrequenceVisite(bruts: DonneesBrutes): { tranche: string; membres: number }[] {
  const joursParUid = new Map<string, Set<string>>();
  bruts.factures.forEach((f) => {
    if (!joursParUid.has(f.uid)) joursParUid.set(f.uid, new Set());
    joursParUid.get(f.uid)!.add(f.jour);
  });
  const tranches = [
    { tranche: "1 visite", min: 1, max: 1 },
    { tranche: "2-4 visites", min: 2, max: 4 },
    { tranche: "5-9 visites", min: 5, max: 9 },
    { tranche: "10-19 visites", min: 10, max: 19 },
    { tranche: "20+ visites", min: 20, max: Infinity },
  ];
  const comptes = tranches.map((t) => ({ tranche: t.tranche, membres: 0 }));
  joursParUid.forEach((jours) => {
    const n = jours.size;
    const i = tranches.findIndex((t) => n >= t.min && n <= t.max);
    if (i >= 0) comptes[i].membres += 1;
  });
  return comptes;
}

export interface ResultatConstruction {
  payload: PayloadAnalyticsGlobal;
  avertissements: string[];
}

export async function construirePayloadPortail(db: Firestore, options: { maintenant?: Date } = {}): Promise<ResultatConstruction> {
  const maintenant = options.maintenant ?? new Date();
  const bruts = await chargerDonneesBrutes(db);
  const resultat = calculerDepuisBruts(bruts, maintenant);
  const avertissements = [...resultat.avertissements];

  const aujourdHui = torontoDateString(maintenant);
  const hier = shiftDateStr(aujourdHui, -1);

  // ── Fenêtres et leurs précédentes équivalentes ────────────────────────────
  const debut7j = shiftDateStr(hier, -6);
  const fin7jPrec = shiftDateStr(debut7j, -1);
  const debut7jPrec = shiftDateStr(fin7jPrec, -6);

  const debut30j = shiftDateStr(hier, -29);
  const fin30jPrec = shiftDateStr(debut30j, -1);
  const debut30jPrec = shiftDateStr(fin30jPrec, -29);

  const debut90j = shiftDateStr(hier, -89);
  const fin90jPrec = shiftDateStr(debut90j, -1);
  const debut90jPrec = shiftDateStr(fin90jPrec, -89);

  const p7j = construirePeriodeStandard(bruts, debut7j, hier, debut7jPrec, fin7jPrec);
  const p30jBase = construirePeriodeStandard(bruts, debut30j, hier, debut30jPrec, fin30jPrec);
  const p90jBase = construirePeriodeStandard(bruts, debut90j, hier, debut90jPrec, fin90jPrec);

  const visites30jPrec = agregerPeriodeBrute(bruts, debut30jPrec, fin30jPrec).visites;
  const customerMomentum = visites30jPrec === 0
    ? (p30jBase.visites === 0 ? 1 : Math.round(p30jBase.visites * 10000) / 10000)
    : Math.round((p30jBase.visites / visites30jPrec) * 10000) / 10000;

  const periode30j: Periode30j = {
    ...p30jBase,
    customerMomentum,
    tauxChurn: tauxChurnEntre(bruts, debut30jPrec, fin30jPrec, debut30j, hier),
    pointsMoyensParMembre: p30jBase.membresActifs > 0
      ? arrondi2((p30jBase.pointsEmisFactures + p30jBase.pointsEmisBonus) / p30jBase.membresActifs)
      : 0,
  };

  const periode90j: Periode90j = {
    ...p90jBase,
    tauxChurn: tauxChurnEntre(bruts, debut90jPrec, fin90jPrec, debut90j, hier),
    revenuParMembre: resultat.membresTotal > 0 ? arrondi2(p90jBase.revenus / resultat.membresTotal) : 0,
    seriesMensuelles: resultat.seriesMensuelles.slice(-6), // 6 derniers mois complets, cohérent avec une fenêtre 90j
  };

  const periodeHier: PeriodeHier = {
    membresActifs: resultat.hier.membresActifs,
    ventes: resultat.hier.ventes,
    revenus: resultat.hier.revenus,
    visites: resultat.hier.visites,
    reclamations: resultat.hier.reclamationsParRecompense.reduce((s, r) => s + r.reclamations, 0),
    bonusJoues: resultat.hier.bonusJoues,
  };

  const aVie: PeriodeAVie = {
    membresTotal: resultat.membresTotal,
    revenusTotal: resultat.depuisLancement.revenus,
    visites: resultat.depuisLancement.visites,
    panierMoyen: resultat.depuisLancement.panierMoyen,
    moyenneRevenusParJour: resultat.moyenneRevenusParJour,
    revenuParMembre: resultat.revenuParMembre,
    reclamations: resultat.depuisLancement.reclamationsParRecompense.reduce((s, r) => s + r.reclamations, 0),
    bonusJoues: resultat.depuisLancement.bonusJoues,
    pointsEnCirculation: resultat.pointsEnCirculation,
    burnRate: resultat.burnRate,
    breakageRate: resultat.breakageRate,
    churnMoyenMensuel: resultat.churnMoyenMensuel,
    tauxVisiteMoyenMensuel: resultat.tauxVisiteMoyenMensuel,
    notifications: { envoyees: resultat.notifications.envoyees },
    seriesMensuelles: resultat.seriesMensuelles,
    pointsDistribuesFactures: resultat.depuisLancement.pointsDistribuesFactures,
    pointsDistribuesBonus: resultat.depuisLancement.pointsDistribuesTirage,
    recompensesActives: resultat.recompensesActives,
    promosActives: resultat.promosActives,
  };

  const recompenses: Recompense[] = resultat.depuisLancement.reclamationsParRecompense.map((r) => ({
    nom: r.nom,
    reclamations: r.reclamations,
    pointsUtilises: r.pointsUtilises,
    pourcentageFoodCost: 0, // aucun foodCost suivi — voir avertissement en tête de fichier
  }));

  // ── Comptabilité — dernier mois calendaire complet ────────────────────────
  const moisFinComplet = moisPrecedent(moisKey(aujourdHui));
  const debutMoisRef = `${moisFinComplet}-01`;
  const finMoisRef = shiftDateStr(`${moisSuivant(moisFinComplet)}-01`, -1);
  const debutMoisSuivantRef = `${moisSuivant(moisFinComplet)}-01`;
  if (moisKey(DATE_LANCEMENT) > moisFinComplet) {
    avertissements.push(`comptabilite : aucun mois calendaire complet depuis le lancement (${DATE_LANCEMENT}) — moisRef "${moisFinComplet}" est avant le lancement, données à 0`);
  }

  const facturesMoisRef = bruts.factures.filter((f) => f.jour >= debutMoisRef && f.jour <= finMoisRef);
  const tirageMoisRef = bruts.tirages.filter((t) => t.jour >= debutMoisRef && t.jour <= finMoisRef);
  const reclamationsMoisRef = bruts.reclamations.filter((r) => r.jour >= debutMoisRef && r.jour <= finMoisRef);
  const pushsMoisRef = bruts.pushs.filter((p) => p.jour >= debutMoisRef && p.jour <= finMoisRef);

  const facturesDetail: ComptabiliteFacture[] = facturesMoisRef.map((f) => ({
    date: f.jour, montant: f.montant, pointsAttribues: f.points, franchise: SITE_UNIQUE,
  }));
  const reclamationsDetail: ComptabiliteReclamation[] = reclamationsMoisRef.map((r) => ({
    date: r.jour, recompense: r.nomRecompense, pointsReclames: r.pointsUtilises, foodCost: 0, franchise: SITE_UNIQUE,
  }));

  const membresActifsMoisSet = new Set<string>();
  facturesMoisRef.forEach((f) => membresActifsMoisSet.add(f.uid));
  tirageMoisRef.forEach((t) => membresActifsMoisSet.add(t.uid));
  let inscriptionsMoisRef = 0;
  let membresTotalFinMoisRef = 0;
  bruts.uidCreated.forEach((j) => {
    if (j >= debutMoisRef && j <= finMoisRef) inscriptionsMoisRef += 1;
    if (j < debutMoisSuivantRef) membresTotalFinMoisRef += 1;
  });
  const visitesMoisRef = new Set(facturesMoisRef.map((f) => `${f.uid}_${f.jour}`)).size;
  const pointsDistribuesFacturesMoisRef = facturesMoisRef.reduce((s, f) => s + f.points, 0);
  const pointsDistribuesBonusMoisRef = tirageMoisRef.reduce((s, t) => s + t.gain, 0);
  const pointsDistribuesMoisRef = pointsDistribuesFacturesMoisRef + pointsDistribuesBonusMoisRef;
  const pointsRachetesMoisRef = reclamationsMoisRef.reduce((s, r) => s + r.pointsUtilises, 0);

  const facturesCumulFinMois = bruts.factures.filter((f) => f.jour <= finMoisRef);
  const revenusTotalFinMois = facturesCumulFinMois.reduce((s, f) => s + f.montant, 0);
  const visitesCumulFinMois = new Set(facturesCumulFinMois.map((f) => `${f.uid}_${f.jour}`)).size;

  // ── Solde de fin de mois — véritable snapshot au dernier jour de moisFinComplet,
  // pas le solde ACTUEL (qui inclut tout ce qui s'est passé depuis) : on part du
  // solde actuel et on annule l'effet de tout ce qui est arrivé APRÈS finMoisRef
  // (gagné après = à retirer, utilisé après = à rajouter, puisque ces points
  // n'avaient pas encore été distribués/rachetés au moment du snapshot voulu).
  const pointsGagnesApresFinMois =
    bruts.factures.filter((f) => f.jour > finMoisRef).reduce((s, f) => s + f.points, 0) +
    bruts.tirages.filter((t) => t.jour > finMoisRef).reduce((s, t) => s + t.gain, 0);
  const pointsUtilisesApresFinMois = bruts.reclamations
    .filter((r) => r.jour > finMoisRef)
    .reduce((s, r) => s + r.pointsUtilises, 0);
  const pointsEnCirculationFinMois = resultat.pointsEnCirculation - pointsGagnesApresFinMois + pointsUtilisesApresFinMois;

  // ── Promotions du mois — seules celles dont Date_debut tombe dans moisFinComplet
  // (fuseau America/Toronto, déjà résolu dans bruts.promotions), triées par date de
  // début. Champs minimaux (titre + dates) : aucun rabais/coût/revenu suivi par
  // promo côté golf — voir ComptabilitePromotionMoisRef ci-dessus.
  const promotionsMoisRef: ComptabilitePromotionMoisRef[] = bruts.promotions
    .filter((p) => p.debut >= debutMoisRef && p.debut <= finMoisRef)
    .map((p) => ({ nom: p.titre, dateDebut: p.debut, dateFin: p.fin }))
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  const comptabilite: Comptabilite = {
    moisRef: moisFinComplet,
    facturesDetail,
    reclamationsDetail,
    promotions: promotionsMoisRef,
    synthese: {
      inscriptions: inscriptionsMoisRef,
      revenus: arrondi2(facturesMoisRef.reduce((s, f) => s + f.montant, 0)),
      membresActifs: membresActifsMoisSet.size,
      membresTotal: membresTotalFinMoisRef,
      notifEnvoyees: pushsMoisRef.length,
      tauxOuverturePush: 0, // aucune donnée d'ouverture — voir avertissement en tête de fichier
      visites: visitesMoisRef,
      pointsDistribues: pointsDistribuesMoisRef,
      pointsDistribuesFactures: pointsDistribuesFacturesMoisRef,
      pointsDistribuesBonus: pointsDistribuesBonusMoisRef,
      pointsRachetes: pointsRachetesMoisRef,
      bonusAttribues: tirageMoisRef.length,
      valeurBonus: 0, // aucun taux $/point établi — voir avertissement en tête de fichier
    },
    snapshotFinMois: {
      membresTotal: membresTotalFinMoisRef,
      revenusTotal: arrondi2(revenusTotalFinMois),
      visites: visitesCumulFinMois,
      pointsEnCirculation: pointsEnCirculationFinMois, // véritable snapshot au dernier jour de moisFinComplet
      valeurPointsDistribues: 0, // aucun taux $/point établi — voir avertissement en tête de fichier
    },
  };

  const payload: PayloadAnalyticsGlobal = {
    periode: { dateDonnees: hier, derniereSync: resultat.genereLe },
    dateLancement: resultat.dateLancement,
    aVie,
    hier: periodeHier,
    "7j": p7j,
    "30j": periode30j,
    "90j": periode90j,
    achalandage: resultat.achalandage,
    frequenceVisite: construireFrequenceVisite(bruts),
    recompenses,
    comptabilite,
  };

  return { payload, avertissements };
}
