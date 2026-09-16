/**
 * Test local, lecture seule — aucune écriture Firestore/Storage, aucun
 * Puppeteer. Appelle directement rendreGabaritRapport() (voir
 * core/genererRapportPdf.ts) avec deux jeux de jetons représentatifs :
 *
 *  - golf-beattie/comptable-2026-08 : promotions à 3 champs seulement
 *    (nom/dateDebut/dateFin), aucun rabais, aucun taux de conversion défini
 *    — c'est exactement la forme que construirePayloadPortail.ts (golf)
 *    envoie aujourd'hui.
 *  - un rapport Poké Station existant : tout présent (rabais, taux, colonnes
 *    complètes de promotions, food cost, plusieurs franchises) — vérifie que
 *    rien n'a changé pour ce client.
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

// ── Scénario 1 : golf-beattie/comptable-2026-08 — promotions à 3 champs,
// aucun rabais, aucun taux de conversion défini, un seul établissement ──────
function testGolfBeattie(): void {
  const { html } = rendreGabaritRapport({
    scalaires: scalairesBase("Club de golf Beattie"),
    promotionsRows: [
      { promo_nom: "100$ de rabais Putter Odyssey", promo_dateDebut: "2026-08-07", promo_dateFin: "2026-09-08", promo_type: "", promo_utilisations: "", promo_revenus: "", promo_cout: "" },
      { promo_nom: "2 pour 90$", promo_dateDebut: "2026-08-20", promo_dateFin: "2026-09-13", promo_type: "", promo_utilisations: "", promo_revenus: "", promo_cout: "" },
    ],
    promotionsPresentes: true,
    promotionsChampExiste: true,
    joursFactures: [
      { jour_date: "2026-08-15", jour_nbFactures: "42", jour_montantTotal: "2 100,00 $", jour_pointsAttribues: "1 800" },
    ],
    facturesPresentes: true,
    reclamationsRows: [
      { reclamation_date: "2026-08-10", reclamation_recompense: "Cart Gratuit", reclamation_franchise: "Club de golf Beattie", reclamation_points: "2500", reclamation_cout: "" },
    ],
    reclamationsPresentes: true,
    foodCostPresent: false, // reclamationsDetail sans foodCost > 0 — colonne masquée
    valeurRacheteePresente: false, // pas de food cost total suivi non plus
    franchiseColPresent: false, // un seul établissement — colonne masquée
    tauxDefini: false, // aucun taux de conversion $/point défini
    rabaisPresent: false, // aucun rabais/code promo dans les données
    promoDatesPresentes: true, // toutes les promos ont dateDebut/dateFin
    promoTypePresent: false, // aucune promo n'a de typeRabais
    promoUtilisationsPresent: false,
    promoRevenusPresent: false,
    promoCoutPresent: false,
  });
  assert(!html.includes("Bloc introuvable"), "le HTML ne doit contenir aucune trace d'un jeton non résolu");
  assert(!/<!--\s*(ROW|IF):/.test(html), "aucun marqueur ROW:*/IF:* ne doit subsister dans le HTML final");
  assert(html.includes("100$ de rabais Putter Odyssey"), "la section Promotions doit afficher les promos du mois (titre + dates)");
  assert(html.includes("2026-08-07") && html.includes("2026-09-08"), "les colonnes Date de début/Date de fin doivent être rendues");
  assert(!html.includes("Type de rabais"), "la colonne Type de rabais doit être masquée (aucune donnée)");
  assert(!html.includes("Valeur des points accordés"), "masqué : aucun taux de conversion défini");
  assert(!html.includes("Passif en points en circulation"), "masqué : aucun taux de conversion défini");
  assert(!html.includes("taux de conversion de"), "footnote de taux masquée");
  assert(!html.includes("Rabais accordés"), "masqué : aucun rabais dans les données");
  assert(!html.includes("Coût des rabais accordés"), "masqué : aucun rabais dans les données");
  assert(!html.includes("Coût réel"), "masqué : aucune réclamation avec foodCost > 0");
  console.log("✅ golf-beattie/comptable-2026-08 (promotions 3 champs, sans rabais, sans taux) : rendu sans erreur.");
}

// ── Scénario 2 : rapport Poké Station — tout présent, comportement inchangé ─
function testPokeStation(): void {
  const { html } = rendreGabaritRapport({
    scalaires: scalairesBase("Poké Station — Trois-Rivières"),
    promotionsRows: [
      { promo_nom: "Rabais rentrée", promo_dateDebut: "", promo_dateFin: "", promo_type: "Pourcentage", promo_utilisations: "58", promo_revenus: "1 740,00 $", promo_cout: "174,00 $" },
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
    franchiseColPresent: true, // plusieurs franchises — colonne visible
    tauxDefini: true,
    rabaisPresent: true,
    promoDatesPresentes: false, // Poké n'envoie pas dateDebut/dateFin
    promoTypePresent: true,
    promoUtilisationsPresent: true,
    promoRevenusPresent: true,
    promoCoutPresent: true,
  });
  assert(!html.includes("Bloc introuvable"), "le HTML ne doit contenir aucune trace d'un jeton non résolu");
  assert(!/<!--\s*(ROW|IF):/.test(html), "aucun marqueur ROW:*/IF:* ne doit subsister dans le HTML final");
  assert(html.includes("Rabais rentrée"), "la section Promotions doit rester présente avec sa ligne (Poké a des promotions ce mois-ci)");
  assert(html.includes("Type de rabais") && html.includes("Pourcentage"), "colonne Type de rabais toujours affichée pour Poké");
  assert(html.includes("Valeur des points accordés"), "toujours affiché pour Poké (taux défini)");
  assert(html.includes("Passif en points en circulation"), "toujours affiché pour Poké (taux défini)");
  assert(html.includes("Rabais accordés"), "toujours affiché pour Poké (rabais présents)");
  assert(html.includes("Coût réel"), "toujours affiché pour Poké (food cost présent)");
  assert(html.includes("Franchise"), "colonne Franchise toujours affichée pour Poké (multi-franchise)");
  console.log("✅ rapport Poké Station (tout présent) : rendu sans erreur, section Promotions présente avec sa ligne, rien de masqué.");
}

testGolfBeattie();
testPokeStation();
console.log("✅ Les deux scénarios se rendent sans erreur.");
