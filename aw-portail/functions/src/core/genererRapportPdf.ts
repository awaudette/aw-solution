/**
 * genererRapportPdf — génère le PDF (+ CSV du détail factures) d'un
 * RapportDoc "comptable", à partir du gabarit functions/src/templates/.
 * Voir functions/src/templates/rapportMensuel.README.md pour le contrat de
 * données complet, le mécanisme de jetons, et l'architecture de génération.
 *
 * Logique pure — appelée à la fois par le trigger onDocumentCreated et par
 * la fonction onCall regenererRapportPdf (functions/src/index.ts).
 */
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const puppeteer = require("puppeteer-core");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chromium = require("@sparticuz/chromium");

import type {
  Comptabilite,
  ComptabiliteFranchise,
  ComptabiliteFacture,
  ComptabiliteReclamation,
  ComptabilitePromotion,
  RapportDoc,
  ClientDoc,
  AnalyticsFranchiseDoc,
} from "./types";

const TAUX_CONVERSION_DEFAUT = 0.40; // $/100 pts — configurable via clients/{clientId}.tauxConversionPoints
const COULEUR_ACCENT_DEFAUT = "#0F2540";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const fmtArgent = (n: number) =>
  n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNombre = (n: number, decimals = 0) =>
  n.toLocaleString("fr-CA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function moisLettres(annee: number, mois: number): string {
  return `${MOIS_FR[mois - 1]} ${annee}`;
}
function dateGenerationLabel(d: Date): string {
  return `${d.getDate()} ${MOIS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}
function moisRefStr(annee: number, mois: number): string {
  return `${annee}-${String(mois).padStart(2, "0")}`;
}
function moisPrecedent(annee: number, mois: number): { annee: number; mois: number } {
  return mois === 1 ? { annee: annee - 1, mois: 12 } : { annee, mois: mois - 1 };
}
function couleurAccentValide(c?: string): string {
  return c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : COULEUR_ACCENT_DEFAUT;
}

// ── Mécanisme de jetons (identique à celui documenté dans le README) ──────
function extractBlock(html: string, name: string): { full: string; inner: string } {
  const re = new RegExp(`<!-- ${name} -->([\\s\\S]*?)<!-- /${name} -->`);
  const m = html.match(re);
  if (!m) throw new Error(`Bloc introuvable dans le gabarit : ${name}`);
  return { full: m[0], inner: m[1] };
}
function replaceScalars(str: string, data: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => (data[key] !== undefined ? data[key] : ""));
}
function renderRows(html: string, blockName: string, rows: Record<string, string>[]): string {
  const { full, inner } = extractBlock(html, `ROW:${blockName}`);
  const rendered = rows.map((row) => replaceScalars(inner, row)).join("\n");
  return html.replace(full, rendered);
}
function renderIf(html: string, presentName: string, videName: string, present: boolean): string {
  const p = extractBlock(html, `IF:${presentName}`);
  const v = extractBlock(html, `IF:${videName}`);
  const start = Math.min(html.indexOf(p.full), html.indexOf(v.full));
  const end = Math.max(html.indexOf(p.full) + p.full.length, html.indexOf(v.full) + v.full.length);
  return html.slice(0, start) + (present ? p.inner : v.inner) + html.slice(end);
}
function stripIfAbsent(html: string, name: string, present: boolean): string {
  // Comme renderIf, mais un seul bloc (pas de paire présent/vide) : retire le
  // bloc entièrement quand la donnée source n'existe pas dans le document
  // (undefined) plutôt que d'y laisser afficher une valeur fabriquée (0 $,
  // NaN). `g` global : gère aussi bien une occurrence unique (une ligne de
  // tableau, une section complète) que plusieurs occurrences du même nom
  // (ex. une colonne répétée dans l'en-tête ET dans chaque ligne).
  const re = new RegExp(`<!-- IF:${name} -->([\\s\\S]*?)<!-- /IF:${name} -->`, "g");
  return html.replace(re, present ? "$1" : "");
}
function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Assemble le gabarit HTML à partir des jetons déjà résolus — pure (aucun
 * accès Firestore/réseau), donc directement testable en local avec des
 * données réelles OU synthétiques. Voir functions/src/scripts/testerRenduRapport.ts.
 *
 * ROW:* est imbriqué dans la branche "présente" de son IF:*_PRESENTES/_VIDE —
 * renderRows doit donc toujours s'exécuter avant le renderIf correspondant :
 * sinon, dès que la liste est vide, renderIf a déjà substitué la branche
 * "vide" (qui ne contient pas le bloc ROW:*) et renderRows ne le trouve plus.
 * Vaut pour les trois paires ci-dessous (PROMOTION, JOUR_FACTURES, RECLAMATION).
 */
export function rendreGabaritRapport(params: {
  scalaires: Record<string, string>;
  promotionsRows: Record<string, string>[];
  promotionsPresentes: boolean;
  promotionsChampExiste: boolean;
  joursFactures: Record<string, string>[];
  facturesPresentes: boolean;
  reclamationsRows: Record<string, string>[];
  reclamationsPresentes: boolean;
  foodCostPresent: boolean;
  valeurRacheteePresente: boolean;
}): { html: string; footerHtml: string } {
  const templateDir = path.join(__dirname, "..", "templates");
  let html = fs.readFileSync(path.join(templateDir, "rapportMensuel.html"), "utf8");
  html = renderRows(html, "PROMOTION", params.promotionsRows);
  html = renderIf(html, "PROMOTIONS_PRESENTES", "PROMOTIONS_VIDE", params.promotionsPresentes);
  html = stripIfAbsent(html, "SECTION_PROMOTIONS", params.promotionsChampExiste);
  html = renderRows(html, "JOUR_FACTURES", params.joursFactures);
  html = renderIf(html, "FACTURES_PRESENTES", "FACTURES_VIDE", params.facturesPresentes);
  html = renderRows(html, "RECLAMATION", params.reclamationsRows);
  html = renderIf(html, "RECLAMATIONS_PRESENTES", "RECLAMATIONS_VIDE", params.reclamationsPresentes);
  html = stripIfAbsent(html, "FOODCOST_COL", params.foodCostPresent);
  html = stripIfAbsent(html, "VALEUR_RECOMPENSES", params.valeurRacheteePresente);
  html = stripIfAbsent(html, "COUT_TOTAL", params.valeurRacheteePresente);
  html = replaceScalars(html, params.scalaires);

  const footerRaw = fs.readFileSync(path.join(templateDir, "rapportMensuelPiedDePage.html"), "utf8");
  const footerHtml = replaceScalars(footerRaw, {
    NOM_COMMERCE: params.scalaires.NOM_COMMERCE,
    COULEUR_ACCENT: params.scalaires.COULEUR_ACCENT,
  });
  return { html, footerHtml };
}

/**
 * Construit le HTML du rapport (+ pied de page + CSV du détail factures) à
 * partir des données Firestore réelles — lecture seule, aucune écriture.
 * Séparé de genererRapportPdf() pour être testable localement (Puppeteer +
 * Storage exclus) : voir functions/src/scripts/testerRenduRapport.ts.
 */
export async function construireRapportHtml(
  clientId: string,
  rapportId: string,
): Promise<{ html: string; footerHtml: string; csvContent: string; facturesMismatchDetecte: boolean }> {
  const db = getFirestore();
  const rapportRef = db.collection("clients").doc(clientId).collection("rapports").doc(rapportId);
  const rapportSnap = await rapportRef.get();
  if (!rapportSnap.exists) throw new Error(`Rapport introuvable : clients/${clientId}/rapports/${rapportId}`);
  const rapport = rapportSnap.data() as RapportDoc;

  if (rapport.type !== "comptable") {
    throw new Error(`Type de rapport non supporté par genererRapportPdf : ${rapport.type}`);
  }

  const clientSnap = await db.collection("clients").doc(clientId).get();
  if (!clientSnap.exists) throw new Error(`Client introuvable : ${clientId}`);
  const client = clientSnap.data() as ClientDoc;

  const franchiseId = rapport.franchiseId;
  const moisRef = moisRefStr(rapport.annee, rapport.mois);

  let facturesDetail: ComptabiliteFacture[];
  let reclamationsDetail: ComptabiliteReclamation[];
  let promotions: ComptabilitePromotion[];
  let synthese: Comptabilite["synthese"];
  let snapshotFinMois: Comptabilite["snapshotFinMois"];
  let nomCommerce = client.restaurant;
  // Détecte un désaccord probable entre franchiseNom (analytics/{franchiseId})
  // et les valeurs de facturesDetail[].franchise/reclamationsDetail[].franchise
  // du rapport global — le filtrage se fait par comparaison de chaînes (voir
  // README, section "Filtrage par franchise"), donc un renommage ou une
  // orthographe différente d'un côté fait disparaître silencieusement toutes
  // les lignes de cette franchise. Signalé plutôt que laissé comme un tableau
  // vide sans explication.
  let facturesMismatchDetecte = false;
  // true seulement si le champ `promotions` existe dans le document source
  // (même vide : []) — distinct d'un tableau vide, qui affiche déjà l'état
  // "Aucune promotion créée ce mois-ci". Un document plus ancien qui n'a
  // jamais eu ce champ masque toute la section plutôt que d'afficher un
  // faux état vide.
  let promotionsChampExiste = false;

  if (franchiseId) {
    // Rapport par franchise : synthese/snapshotFinMois viennent du rapport
    // lui-même (déjà scopés), mais facturesDetail/reclamationsDetail/
    // promotions n'existent pas sur ComptabiliteFranchise — on va les
    // chercher dans le rapport GLOBAL du même mois et on filtre par nom de
    // franchise (fragilité connue et acceptée, voir README).
    const franchiseData = rapport.donnees as ComptabiliteFranchise;
    synthese = franchiseData.synthese;
    snapshotFinMois = franchiseData.snapshotFinMois;

    const analyticsFrSnap = await db.collection("clients").doc(clientId).collection("analytics").doc(franchiseId).get();
    const franchiseNom = analyticsFrSnap.exists
      ? (analyticsFrSnap.data() as AnalyticsFranchiseDoc).franchiseNom
      : franchiseId;
    nomCommerce = `${client.restaurant} — ${franchiseNom}`;

    const globalSnap = await db.collection("clients").doc(clientId).collection("rapports").doc(`comptable-${moisRef}`).get();
    const globalCompta = globalSnap.exists ? (globalSnap.data()!.donnees as Comptabilite) : null;
    const franchiseNomNorm = franchiseNom.trim().toLowerCase();
    facturesDetail = globalCompta ? globalCompta.facturesDetail.filter((f) => f.franchise.trim().toLowerCase() === franchiseNomNorm) : [];
    reclamationsDetail = globalCompta ? globalCompta.reclamationsDetail.filter((r) => r.franchise.trim().toLowerCase() === franchiseNomNorm) : [];
    promotionsChampExiste = !!globalCompta && globalCompta.promotions !== undefined;
    promotions = globalCompta ? (globalCompta.promotions ?? []) : [];

    // synthese.revenus > 0 = cette franchise a bel et bien eu des ventes ce
    // mois-ci (chiffre déjà scopé, fiable) ; facturesDetail vide malgré ça =
    // le filtrage par nom n'a rien trouvé alors qu'il aurait dû.
    facturesMismatchDetecte = synthese.revenus > 0 && facturesDetail.length === 0;
  } else {
    const compta = rapport.donnees as Comptabilite;
    facturesDetail = compta.facturesDetail;
    reclamationsDetail = compta.reclamationsDetail;
    promotionsChampExiste = compta.promotions !== undefined;
    promotions = compta.promotions ?? [];
    synthese = compta.synthese;
    snapshotFinMois = compta.snapshotFinMois;
  }

  const tauxConversion = client.tauxConversionPoints ?? TAUX_CONVERSION_DEFAUT;
  const couleurAccent = couleurAccentValide(client.couleur_primaire);

  // ── Solde de début de mois — hybride (voir README) ──────────────────────
  const prev = moisPrecedent(rapport.annee, rapport.mois);
  const prevMoisRef = moisRefStr(prev.annee, prev.mois);
  const prevRapportId = franchiseId ? `comptable-${prevMoisRef}-${franchiseId}` : `comptable-${prevMoisRef}`;
  const prevSnap = await db.collection("clients").doc(clientId).collection("rapports").doc(prevRapportId).get();
  let soldeDebut: number;
  if (prevSnap.exists) {
    const prevDonnees = prevSnap.data()!.donnees as Comptabilite | ComptabiliteFranchise;
    soldeDebut = prevDonnees.snapshotFinMois.pointsEnCirculation;
  } else {
    soldeDebut = snapshotFinMois.pointsEnCirculation - synthese.pointsDistribues + synthese.pointsRachetes;
  }

  // ── Résumé (section 1) ───────────────────────────────────────────────────
  // Documents antérieurs à l'ajout de ces champs : présents dans le type
  // TS (donc supposés là par le compilateur) mais potentiellement absents du
  // document Firestore réel. Détecté ici plutôt que laissé produire un $0/NaN
  // silencieux plus loin — voir stripIfAbsent().
  const valeurRacheteePresente = typeof synthese.valeurRachetee === "number" && !Number.isNaN(synthese.valeurRachetee);
  const foodCostPresent = reclamationsDetail.every((r) => typeof r.foodCost === "number" && !Number.isNaN(r.foodCost));

  const pointsBonus = synthese.valeurBonus;
  const pointsFactures = synthese.pointsDistribues - synthese.valeurBonus;
  const valeurPointsAccordes = (synthese.pointsDistribues / 100) * tauxConversion;
  const rabaisAccordes = facturesDetail.reduce((s, f) => s + (f.rabaisApplique ?? 0), 0);
  const coutRabais = promotions.reduce((s, p) => s + (p.coutReel ?? 0), 0);
  // Sans valeurRachetee, "coût total du programme" ne serait qu'un sous-total
  // partiel présenté comme un total — undefined masque toute la ligne au lieu
  // d'afficher un chiffre trompeur.
  const coutTotalProgramme = valeurRacheteePresente ? synthese.valeurRachetee + coutRabais : undefined;

  // ── Registre de points (section 3) ──────────────────────────────────────
  const tauxRachatPct = synthese.tauxRachat ?? (synthese.pointsDistribues > 0
    ? (synthese.pointsRachetes / synthese.pointsDistribues) * 100
    : 0);
  const passifDollars = (snapshotFinMois.pointsEnCirculation / 100) * tauxConversion;

  // ── Section 4 — résumé quotidien + total ────────────────────────────────
  const parJour = new Map<string, { nb: number; montant: number; points: number }>();
  for (const f of facturesDetail) {
    const acc = parJour.get(f.date) ?? { nb: 0, montant: 0, points: 0 };
    acc.nb += 1;
    acc.montant += f.montant;
    acc.points += f.pointsAttribues;
    parJour.set(f.date, acc);
  }
  const joursFactures = [...parJour.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, acc]) => ({
      jour_date: date,
      jour_nbFactures: fmtNombre(acc.nb),
      jour_montantTotal: fmtArgent(acc.montant),
      jour_pointsAttribues: fmtNombre(acc.points),
    }));
  const totalFacturesMontant = facturesDetail.reduce((s, f) => s + f.montant, 0);
  const totalFacturesPoints = facturesDetail.reduce((s, f) => s + f.pointsAttribues, 0);

  // ── Promotions (section 2) ──────────────────────────────────────────────
  const promotionsRows = promotions.map((p) => ({
    promo_nom: p.nom,
    promo_type: p.typeRabais,
    promo_utilisations: fmtNombre(p.reclamations),
    promo_revenus: fmtArgent(p.revenusGeneres),
    promo_cout: fmtArgent(p.coutReel ?? 0),
  }));
  const promotionsPorteeNote = franchiseId
    ? '<p class="mention-portee">Promotions du réseau — ces statistiques couvrent l\'ensemble des franchises.</p>'
    : "";

  // ── Réclamations (section 5) ────────────────────────────────────────────
  const reclamationsRows = reclamationsDetail.map((r) => ({
    reclamation_date: r.date,
    reclamation_recompense: r.recompense,
    reclamation_franchise: r.franchise,
    reclamation_points: fmtNombre(r.pointsReclames),
    reclamation_cout: typeof r.foodCost === "number" && !Number.isNaN(r.foodCost) ? fmtArgent(r.foodCost) : "",
  }));

  // ── CSV séparé (détail facture par facture, format machine) ─────────────
  const csvHeader = ["Date", "Franchise", "Montant", "Points attribués", "Code promo", "Promotion liée", "Rabais appliqué"];
  const csvLines = [csvHeader.map(csvEscape).join(",")];
  for (const f of facturesDetail) {
    csvLines.push([
      f.date, f.franchise, f.montant.toFixed(2), f.pointsAttribues,
      f.codePromo ?? "", f.promotionLiee ?? "", (f.rabaisApplique ?? 0).toFixed(2),
    ].map(csvEscape).join(","));
  }
  const csvContent = "﻿" + csvLines.join("\r\n") + "\r\n";

  // ── Assemblage des jetons scalaires ──────────────────────────────────────
  const scalaires: Record<string, string> = {
    NOM_COMMERCE: nomCommerce,
    LOGO_URL: client.logo_url,
    MOIS_LETTRES: moisLettres(rapport.annee, rapport.mois),
    DATE_GENERATION: dateGenerationLabel(new Date()),
    COULEUR_ACCENT: couleurAccent,
    TAUX_CONVERSION: fmtNombre(tauxConversion, 2),

    RESUME_VENTES: fmtArgent(synthese.revenus),
    RESUME_TRANSACTIONS: fmtNombre(facturesDetail.length),
    RESUME_POINTS_FACTURES: fmtNombre(pointsFactures),
    RESUME_POINTS_FACTURES_NOTE: "",
    RESUME_POINTS_BONUS: fmtNombre(pointsBonus),
    RESUME_POINTS_BONUS_NOTE: "",
    RESUME_POINTS_TOTAL: fmtNombre(synthese.pointsDistribues),
    RESUME_VALEUR_POINTS: fmtArgent(valeurPointsAccordes),
    RESUME_POINTS_RECLAMES: fmtNombre(synthese.pointsRachetes),
    RESUME_NB_RECOMPENSES: fmtNombre(reclamationsDetail.length),
    RESUME_VALEUR_RECOMPENSES: valeurRacheteePresente ? fmtArgent(synthese.valeurRachetee) : "",
    RESUME_RABAIS_ACCORDES: fmtArgent(rabaisAccordes),
    RESUME_COUT_RABAIS: fmtArgent(coutRabais),
    RESUME_COUT_TOTAL: coutTotalProgramme !== undefined ? fmtArgent(coutTotalProgramme) : "",

    PROMOTIONS_PORTEE_NOTE: promotionsPorteeNote,

    REGISTRE_SOLDE_DEBUT: fmtNombre(soldeDebut),
    REGISTRE_POINTS_GAGNES: fmtNombre(synthese.pointsDistribues),
    REGISTRE_POINTS_UTILISES: fmtNombre(synthese.pointsRachetes),
    REGISTRE_SOLDE_FIN: fmtNombre(snapshotFinMois.pointsEnCirculation),
    REGISTRE_TAUX_RACHAT: fmtNombre(tauxRachatPct, 1) + " %",
    REGISTRE_PASSIF_DOLLARS: fmtArgent(passifDollars),

    FACTURES_TOTAL_NB: fmtNombre(facturesDetail.length),
    FACTURES_TOTAL_MONTANT: fmtArgent(totalFacturesMontant),
    FACTURES_TOTAL_POINTS: fmtNombre(totalFacturesPoints),

    FACTURES_MISMATCH_WARNING: facturesMismatchDetecte
      ? '<p class="mention-avertissement">⚠️ Cette franchise a des revenus enregistrés ce mois-ci, mais aucune facture ne lui correspond dans le détail — le nom de franchise a probablement changé ou diffère entre les systèmes. Ce résumé est incomplet, à vérifier avec AW Solution.</p>'
      : "",
  };

  // ── Rendu HTML ────────────────────────────────────────────────────────────
  const { html, footerHtml } = rendreGabaritRapport({
    scalaires,
    promotionsRows,
    promotionsPresentes: promotions.length > 0,
    promotionsChampExiste,
    joursFactures,
    facturesPresentes: facturesDetail.length > 0,
    reclamationsRows,
    reclamationsPresentes: reclamationsDetail.length > 0,
    foodCostPresent,
    valeurRacheteePresente,
  });

  if (facturesMismatchDetecte) {
    logger.warn(`[genererRapportPdf] Désaccord franchiseNom/facturesDetail détecté pour clients/${clientId}/rapports/${rapportId} — revenus > 0 mais aucune facture filtrée.`);
  }

  return { html, footerHtml, csvContent, facturesMismatchDetecte };
}

export async function genererRapportPdf(
  clientId: string,
  rapportId: string,
): Promise<{ pdfUrl: string; facturesCsvUrl: string }> {
  const { html, footerHtml, csvContent } = await construireRapportHtml(clientId, rapportId);
  const db = getFirestore();
  const rapportRef = db.collection("clients").doc(clientId).collection("rapports").doc(rapportId);

  // ── PDF via Puppeteer + Chromium serverless ──────────────────────────────
  logger.info(`[genererRapportPdf] Lancement Chromium pour clients/${clientId}/rapports/${rapportId}`);
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  let pdfBuffer: Buffer;
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    pdfBuffer = (await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "14mm", bottom: "18mm", left: "0mm", right: "0mm" },
      displayHeaderFooter: true,
      footerTemplate: footerHtml,
      headerTemplate: "<span></span>",
    })) as Buffer;
  } finally {
    await browser.close();
  }

  // ── Upload Storage ────────────────────────────────────────────────────────
  const bucket = getStorage().bucket();
  const pdfPath = `clients/${clientId}/rapports/${rapportId}/rapport.pdf`;
  const csvPath = `clients/${clientId}/rapports/${rapportId}/factures.csv`;
  const pdfToken = randomUUID();
  const csvToken = randomUUID();

  await bucket.file(pdfPath).save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: { metadata: { firebaseStorageDownloadTokens: pdfToken } },
  });
  await bucket.file(csvPath).save(Buffer.from(csvContent, "utf8"), {
    contentType: "text/csv; charset=utf-8",
    metadata: { metadata: { firebaseStorageDownloadTokens: csvToken } },
  });

  const pdfUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(pdfPath)}?alt=media&token=${pdfToken}`;
  const facturesCsvUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(csvPath)}?alt=media&token=${csvToken}`;

  await rapportRef.update({ pdfUrl, facturesCsvUrl, publie: true });
  logger.info(`[genererRapportPdf] Terminé : ${pdfUrl}`);

  return { pdfUrl, facturesCsvUrl };
}
