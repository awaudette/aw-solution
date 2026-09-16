/**
 * Test local, lecture seule — aucune écriture Firestore/Storage, aucun
 * Puppeteer. Appelle directement rendreGabaritRapport() (voir
 * core/genererRapportPdf.ts) avec deux jeux de jetons représentatifs :
 *
 *  - golf-beattie/comptable-2026-08 : `promotions` absent du document
 *    source (promotionsChampExiste=false, promotionsRows=[]) — c'est
 *    exactement la condition qui déclenchait "Bloc introuvable : ROW:PROMOTION".
 *  - un rapport Poké Station existant : `promotions` présent et non vide —
 *    vérifie que la section Promotions reste rendue avec ses lignes.
 *
 * Ni identifiants locaux (aucune credential aw-portail disponible sur ce
 * poste — poke-sync/poke-service-account.json est scopé au projet Firebase
 * de Poké Station, pas à aw-portail) ni émulateur Firestore (Java absent) ne
 * sont disponibles ici ; ce script utilise donc des jetons déjà résolus
 * équivalents aux vraies données (mêmes formes que construireRapportHtml()
 * produirait), conformément au repli demandé.
 *
 * Lancer après npm run build : node lib/scripts/testerRenduRapport.js
 */
import { rendreGabaritRapport } from "../core/genererRapportPdf";

function scalairesBase(nomCommerce: string): Record<string, string> {
  return {
    NOM_COMMERCE: nomCommerce,
    LOGO_URL: "https://example.com/logo.png",
    MOIS_LETTRES: "Août 2026",
    DATE_GENERATION: "16 septembre 2026",
    COULEUR_ACCENT: "#0F2540",
    TAUX_CONVERSION: "0,40",
    RESUME_VENTES: "12 345,67 $",
    RESUME_TRANSACTIONS: "210",
    RESUME_POINTS_FACTURES: "9 000",
    RESUME_POINTS_FACTURES_NOTE: "",
    RESUME_POINTS_BONUS: "500",
    RESUME_POINTS_BONUS_NOTE: "",
    RESUME_POINTS_TOTAL: "9 500",
    RESUME_VALEUR_POINTS: "38,00 $",
    RESUME_POINTS_RECLAMES: "3 000",
    RESUME_NB_RECOMPENSES: "12",
    RESUME_VALEUR_RECOMPENSES: "120,00 $",
    RESUME_RABAIS_ACCORDES: "45,00 $",
    RESUME_COUT_RABAIS: "60,00 $",
    RESUME_COUT_TOTAL: "180,00 $",
    PROMOTIONS_PORTEE_NOTE: "",
    REGISTRE_SOLDE_DEBUT: "5 000",
    REGISTRE_POINTS_GAGNES: "9 500",
    REGISTRE_POINTS_UTILISES: "3 000",
    REGISTRE_SOLDE_FIN: "11 500",
    REGISTRE_TAUX_RACHAT: "31,6 %",
    REGISTRE_PASSIF_DOLLARS: "46,00 $",
    FACTURES_TOTAL_NB: "210",
    FACTURES_TOTAL_MONTANT: "12 345,67 $",
    FACTURES_TOTAL_POINTS: "9 000",
    FACTURES_MISMATCH_WARNING: "",
  };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERTION ÉCHOUÉE : ${msg}`);
}

// ── Scénario 1 : golf-beattie/comptable-2026-08 — champ `promotions` absent ──
function testGolfBeattie(): void {
  const { html } = rendreGabaritRapport({
    scalaires: scalairesBase("Club de golf Beattie"),
    promotionsRows: [],
    promotionsPresentes: false,
    promotionsChampExiste: false, // champ absent du document — masque toute la section
    joursFactures: [
      { jour_date: "2026-08-15", jour_nbFactures: "42", jour_montantTotal: "2 100,00 $", jour_pointsAttribues: "1 800" },
    ],
    facturesPresentes: true,
    reclamationsRows: [
      { reclamation_date: "2026-08-10", reclamation_recompense: "10$ de rabais", reclamation_franchise: "Golf Beattie", reclamation_points: "1000", reclamation_cout: "" },
    ],
    reclamationsPresentes: true,
    foodCostPresent: false, // reclamationsDetail sans foodCost — colonne masquée
    valeurRacheteePresente: true,
  });
  assert(!html.includes("Bloc introuvable"), "le HTML ne doit contenir aucune trace d'un jeton non résolu");
  assert(!/<!--\s*(ROW|IF):/.test(html), "aucun marqueur ROW:*/IF:* ne doit subsister dans le HTML final");
  assert(!html.includes("Promotions"), "SECTION_PROMOTIONS doit être entièrement absente (champ non présent dans le document)");
  console.log("✅ golf-beattie/comptable-2026-08 (promotions absent) : rendu sans erreur, section Promotions masquée.");
}

// ── Scénario 2 : rapport Poké Station — `promotions` présent et non vide ────
function testPokeStation(): void {
  const { html } = rendreGabaritRapport({
    scalaires: scalairesBase("Poké Station — Trois-Rivières"),
    promotionsRows: [
      { promo_nom: "Rabais rentrée", promo_type: "Pourcentage", promo_utilisations: "58", promo_revenus: "1 740,00 $", promo_cout: "174,00 $" },
    ],
    promotionsPresentes: true,
    promotionsChampExiste: true,
    joursFactures: [
      { jour_date: "2026-08-20", jour_nbFactures: "30", jour_montantTotal: "900,00 $", jour_pointsAttribues: "700" },
    ],
    facturesPresentes: true,
    reclamationsRows: [
      { reclamation_date: "2026-08-05", reclamation_recompense: "Bol gratuit", reclamation_franchise: "Trois-Rivières", reclamation_points: "800", reclamation_cout: "6,50 $" },
    ],
    reclamationsPresentes: true,
    foodCostPresent: true,
    valeurRacheteePresente: true,
  });
  assert(!html.includes("Bloc introuvable"), "le HTML ne doit contenir aucune trace d'un jeton non résolu");
  assert(!/<!--\s*(ROW|IF):/.test(html), "aucun marqueur ROW:*/IF:* ne doit subsister dans le HTML final");
  assert(html.includes("Rabais rentrée"), "la section Promotions doit rester présente avec sa ligne (Poké a des promotions ce mois-ci)");
  console.log("✅ rapport Poké Station (promotions présent) : rendu sans erreur, section Promotions présente avec sa ligne.");
}

testGolfBeattie();
testPokeStation();
console.log("✅ Les deux scénarios se rendent sans erreur.");
