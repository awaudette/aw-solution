/**
 * mockAnalytics.ts
 * Données fictives conformes au contrat src/types/analytics.ts.
 *
 * Client de démo : Golf Beattie (Prestige, 2 franchises)
 *   franchise "cantley"  → Club de golf Beattie — Cantley
 *   franchise "gatineau" → Club de golf Beattie — Gatineau
 *
 * dateDonnees = "2026-08-14"  (sync du 15 août à 5 h → D-1 = 14 août)
 * Période mois : août 2026 MTD (1er–14 août)
 * Période 7j   : 8–14 août 2026
 * Période 30j  : 15 juil.–14 août 2026
 * Période 90j  : 15 mai–14 août 2026
 *
 * MIGRATION Phase 3 : remplacer getMockAnalytics() par un hook
 * useAnalyticsData(clientId) qui lit depuis Firestore.
 * Les types sont identiques — aucun changement côté composants.
 */

import type {
  AnalyticsGlobal,
  AnalyticsFranchise,
  AlerteDoc,
  RapportDoc,
  AppConfigDoc,
  Segment,
} from "@/types/analytics";

// ─── Utilitaires de formatage (Québec) ───────────────────────────────────────

/** 1 234 567 → "1 234 567" (espace fine insécable) */
export function fmtNombre(n: number, decimals = 0): string {
  return n.toLocaleString("fr-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 41 630.5 → "41 630,50 $" */
export function fmtArgent(n: number): string {
  return n.toLocaleString("fr-CA", {
    style: "currency", currency: "CAD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

/** 0.134 → "+13,4 %" */
export function fmtVariation(ratio: number): string {
  const pct = (ratio * 100).toLocaleString("fr-CA", {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  });
  return (ratio >= 0 ? "+" : "") + pct + " %";
}

/** 72.4 → "72,4 %" */
export function fmtPct(n: number, decimals = 1): string {
  return fmtNombre(n, decimals) + " %";
}

// ─── Document global ─────────────────────────────────────────────────────────

export function getMockGlobal(): AnalyticsGlobal {
  return {
    // ── Métadonnées ─────────────────────────────────────────────────────────
    periode: {
      dateDonnees:  "2026-08-14",
      derniereSync: new Date("2026-08-15T05:00:00-04:00"),
    },

    // ── À vie ────────────────────────────────────────────────────────────────
    // dateDonnees = 2026-08-14 ; lancement le 2026-02-01 → 194 jours
    aVie: {
      membresTotal:           1_284,
      revenusTotal:           228_400,
      visites:       18_620,
      panierMoyen:            12.26,
      moyenneRevenusParJour:  1_177, // 228 400 / 194 j ≈ 1 177 $
      revenuParMembre:        177.88,
      reclamations:           4_820,
      bonusJoues:             6_340,
      pointsEnCirculation:    312_800,
      burnRate:               58.8,  // % points rachetés / points émis total
      breakageRate:           41.2,  // 100 - burnRate
      churnMoyenMensuel:       5.4,  // moyenne des taux mensuels depuis le lancement
      tauxVisiteMoyenMensuel: 68.3,  // moyenne mensuelle (membresActifs/membresTotal)
      notifications: {
        envoyees:       28_400,
        tauxOuverture:  61.8,
        meilleureCampagne: { nom: "VIP — Saison estivale", revenus: 3_240 },
      },
      promos: {
        lancees:          18,
        clics:         3_820,
        conversions:     980,
        revenusAttribues:14_600,
        meilleurePromo: { nom: "Juillet — 20 % sur votre prochaine visite", revenusAttribues: 6_860 },
      },
      // ── Séries mensuelles depuis le lancement (Phase 3 — portailSyncJob) ────
      // 228 400 total − 14 760 (août MTD) = 213 640 (fév-juil) ; fév-juil sum ✓
      seriesMensuelles: [
        { mois: "2026-02", revenus: 28_000, visites: 2_286 },
        { mois: "2026-03", revenus: 33_200, visites: 2_640 },
        { mois: "2026-04", revenus: 37_800, visites: 3_020 },
        { mois: "2026-05", revenus: 41_560, visites: 3_510 },
        { mois: "2026-06", revenus: 34_820, visites: 2_840 }, // correspond à 90j.seriesMensuelles ✓
        { mois: "2026-07", revenus: 38_260, visites: 3_120 }, // correspond à 90j.seriesMensuelles ✓
      ],
      // ── Points distribués détail (Phase 3 — portailSyncJob) ──────────────────
      // total = 638 000 + 121 000 = 759 000
      // rachetés = 759 000 − 312 800 = 446 200 → burnRate = 446 200 / 759 000 = 58,8 % ✓
      pointsDistribuesFactures: 638_000,
      pointsDistribuesBonus:    121_000,
    },

    // ── Hier (14 août 2026) ──────────────────────────────────────────────────
    hier: {
      membresActifs:    87,
      ventes:           94,
      revenus:        1_152,
      visites: 94,
      reclamations:     18,
      bonusJoues:       11,
    },

    // ── 7 jours (8–14 août 2026) ─────────────────────────────────────────────
    "7j": {
      membresActifs:      348,
      nouveauxMembres:     24,
      ventes:             621,
      revenus:          7_612,
      panierMoyen:        12.26,
      visites:   621,
      reclamations:        98,
      bonusJoues:          74,
      participationBonus:  42.8,
      pointsEmisFactures: 38_060,
      pointsEmisBonus:     7_400,
      tauxVisite:          27.1,
      revenuParVisite:     12.26,
      breakageRate:        40.8,
      burnRate:            59.2,
      variations: {
        revenus:       +0.112,
        ventes:        +0.094,
        membresActifs: +0.073,
        panierMoyen:   -0.018,
      },
      series: [
        { date: "2026-08-08", visites:  82, revenus: 1_005 },
        { date: "2026-08-09", visites:  91, revenus: 1_115 },
        { date: "2026-08-10", visites: 110, revenus: 1_348 },
        { date: "2026-08-11", visites:  68, revenus:   833 },
        { date: "2026-08-12", visites:  74, revenus:   907 },
        { date: "2026-08-13", visites: 109, revenus: 1_336 },
        { date: "2026-08-14", visites:  87, revenus: 1_068 },
      ],
      notifications: {
        envoyees:      1_840,
        tauxOuverture:  58.4,
      },
      promos: {
        lancees:          2,
        clics:          312,
        conversions:     84,
        revenusAttribues: 1_028,
      },
    },

    // ── 30 jours (15 juil.–14 août 2026) ────────────────────────────────────
    "30j": {
      membresActifs:       874,
      nouveauxMembres:      96,
      ventes:            2_840,
      revenus:          34_820,
      panierMoyen:         12.26,
      visites:  2_840,
      reclamations:        428,
      bonusJoues:          324,
      participationBonus:   40.6,
      pointsEmisFactures: 174_200,
      pointsEmisBonus:     32_400,
      tauxVisite:           68.1,
      revenuParVisite:      12.26,
      breakageRate:         40.2,
      burnRate:             59.8,
      tauxChurn:             5.8,
      customerMomentum:      1.09, // visites ce mois / visites mois précédent
      pointsMoyensParMembre:  238,
      variations: {
        revenus:       +0.134,
        ventes:        +0.112,
        membresActifs: +0.087,
        panierMoyen:   -0.024,
      },
      series: [
        { date: "2026-07-15", visites:  98, revenus: 1_201 },
        { date: "2026-07-16", visites: 104, revenus: 1_275 },
        { date: "2026-07-17", visites: 118, revenus: 1_446 },
        { date: "2026-07-18", visites:  88, revenus: 1_079 },
        { date: "2026-07-19", visites:  92, revenus: 1_127 },
        { date: "2026-07-20", visites: 132, revenus: 1_618 },
        { date: "2026-07-21", visites: 124, revenus: 1_520 },
        { date: "2026-07-22", visites:  94, revenus: 1_152 },
        { date: "2026-07-23", visites:  86, revenus: 1_054 },
        { date: "2026-07-24", visites: 110, revenus: 1_348 },
        { date: "2026-07-25", visites:  78, revenus:   956 },
        { date: "2026-07-26", visites:  82, revenus: 1_005 },
        { date: "2026-07-27", visites: 126, revenus: 1_545 },
        { date: "2026-07-28", visites: 118, revenus: 1_447 },
        { date: "2026-07-29", visites:  96, revenus: 1_177 },
        { date: "2026-07-30", visites:  88, revenus: 1_079 },
        { date: "2026-07-31", visites: 112, revenus: 1_373 },
        { date: "2026-08-01", visites:  78, revenus:   956 },
        { date: "2026-08-02", visites:  94, revenus: 1_152 },
        { date: "2026-08-03", visites: 118, revenus: 1_447 },
        { date: "2026-08-04", visites:  72, revenus:   882 },
        { date: "2026-08-05", visites:  80, revenus:   981 },
        { date: "2026-08-06", visites: 112, revenus: 1_373 },
        { date: "2026-08-07", visites: 102, revenus: 1_250 },
        { date: "2026-08-08", visites:  82, revenus: 1_005 },
        { date: "2026-08-09", visites:  91, revenus: 1_115 },
        { date: "2026-08-10", visites: 110, revenus: 1_348 },
        { date: "2026-08-11", visites:  68, revenus:   833 },
        { date: "2026-08-12", visites:  74, revenus:   907 },
        { date: "2026-08-13", visites: 109, revenus: 1_336 },
        // 14 août inclus dans les 30j
        { date: "2026-08-14", visites:  87, revenus: 1_068 },
      ],
      notifications: {
        envoyees:       8_120,
        tauxOuverture:   60.4,
        meilleureCampagne: { nom: "VIP — Saison estivale", revenus: 3_240 },
      },
      promos: {
        lancees:           6,
        clics:           980,
        conversions:     248,
        revenusAttribues:3_041,
      },
    },

    // ── 90 jours (15 mai–14 août 2026) ──────────────────────────────────────
    "90j": {
      membresActifs:       984,
      nouveauxMembres:     218,
      ventes:            7_840,
      revenus:          96_080,
      panierMoyen:         12.26,
      visites:  7_840,
      reclamations:      1_180,
      bonusJoues:          892,
      participationBonus:   39.4,
      pointsEmisFactures: 480_400,
      pointsEmisBonus:     89_200,
      tauxVisite:           76.6,
      revenuParVisite:      12.26,
      breakageRate:         41.2,
      burnRate:             58.8,
      tauxChurn:             5.6,
      revenuParMembre:      97.64,
      variations: {
        revenus:       +0.186,
        ventes:        +0.154,
        membresActifs: +0.124,
        panierMoyen:   -0.031,
      },
      series: [
        { date: "2026-05-15", visites: 2_480, revenus: 30_400 },
        { date: "2026-06-15", visites: 2_840, revenus: 34_820 },
        { date: "2026-07-15", visites: 3_120, revenus: 38_260 },
      ],
      seriesMensuelles: [
        { mois: "2026-06", revenus: 34_820, visites: 2_840 },
        { mois: "2026-07", revenus: 38_260, visites: 3_120 },
        { mois: "2026-08", revenus: 14_760, visites: 1_204 }, // MTD
      ],
      scoreFidelite: {
        score: 72,
        badges: { retention: "fort", engagement: "modere", croissance: "fort" },
        historique: [
          { mois: "Juin 2026",  score: 64 },
          { mois: "Juil. 2026", score: 68 },
          { mois: "Août 2026",  score: 72 },
        ],
      },
      notifications: {
        envoyees:      22_400,
        tauxOuverture:  60.8,
        meilleureCampagne: { nom: "VIP — Saison estivale", revenus: 3_240 },
      },
      promos: {
        lancees:          14,
        clics:          2_840,
        conversions:      720,
        revenusAttribues:8_824,
      },
    },

    // ── Segmentation RFM (Prestige) ───────────────────────────────────────────
    segmentation: {
      segments: [
        {
          id: "vip", nom: "VIP",
          count: 142, pourcentage: 11.1,
          critere: "4+ visites / mois · Panier moyen élevé",
          variation: +14, panierMoyen: 18.84,
        },
        {
          id: "regulier", nom: "Régulier",
          count: 386, pourcentage: 30.1,
          critere: "2-3 visites / mois",
          variation: +22, panierMoyen: 12.42,
        },
        {
          id: "nouveau", nom: "Nouveau",
          count: 218, pourcentage: 17.0,
          critere: "Inscrit il y a moins de 30 jours",
          variation: +48, panierMoyen: 9.88,
        },
        {
          id: "aRisque", nom: "À risque",
          count: 164, pourcentage: 12.8,
          critere: "Aucune visite depuis 31–60 jours",
          variation: -8, valeurEnJeu: 8_200,
        },
        {
          id: "inactif", nom: "Inactif",
          count: 248, pourcentage: 19.3,
          critere: "Aucune visite depuis 61–90 jours",
          variation: -5, valeurEnJeu: 12_400,
        },
        {
          id: "perdu", nom: "Perdu",
          count: 126, pourcentage:  9.8,
          critere: "Aucune visite depuis plus de 90 jours",
          variation: +2, valeurEnJeu: 6_300,
        },
      ] satisfies Segment[],
      historique: [
        { mois: "Mar",  vip: 112, regulier: 348, nouveau: 180, aRisque: 188, inactif: 262, perdu: 112 },
        { mois: "Avr",  vip: 118, regulier: 358, nouveau: 196, aRisque: 182, inactif: 258, perdu: 116 },
        { mois: "Mai",  vip: 124, regulier: 364, nouveau: 202, aRisque: 178, inactif: 254, perdu: 118 },
        { mois: "Jun",  vip: 130, regulier: 370, nouveau: 208, aRisque: 174, inactif: 252, perdu: 122 },
        { mois: "Juil", vip: 136, regulier: 378, nouveau: 212, aRisque: 170, inactif: 250, perdu: 124 },
        { mois: "Aoû",  vip: 142, regulier: 386, nouveau: 218, aRisque: 164, inactif: 248, perdu: 126 },
      ],
    },

    // ── Parcours de conversion (Prestige) ────────────────────────────────────
    parcours: {
      inscrits:           1_284,
      premiereVisite:     1_048,
      deuxiemeVisite:       742,
      recompenseReclamee:   486,
      fidelise:             312,
    },

    // ── Achalandage (tous forfaits) ───────────────────────────────────────────
    achalandage: {
      parJour: [
        { jour: "Lundi",    visites:  88 },
        { jour: "Mardi",    visites:  94 },
        { jour: "Mercredi", visites: 112 },
        { jour: "Jeudi",    visites: 102 },
        { jour: "Vendredi", visites: 138 },
        { jour: "Samedi",   visites: 162 },
        { jour: "Dimanche", visites:  74 },
      ],
      parPlage: [
        // Matin
        { jour: "Lundi",    plage: "7 h – 11 h",  visites: 14 },
        { jour: "Mardi",    plage: "7 h – 11 h",  visites: 18 },
        { jour: "Mercredi", plage: "7 h – 11 h",  visites: 16 },
        { jour: "Jeudi",    plage: "7 h – 11 h",  visites: 14 },
        { jour: "Vendredi", plage: "7 h – 11 h",  visites: 22 },
        { jour: "Samedi",   plage: "7 h – 11 h",  visites: 48 },
        { jour: "Dimanche", plage: "7 h – 11 h",  visites: 38 },
        // Après-midi
        { jour: "Lundi",    plage: "11 h – 16 h", visites: 38 },
        { jour: "Mardi",    plage: "11 h – 16 h", visites: 42 },
        { jour: "Mercredi", plage: "11 h – 16 h", visites: 54 },
        { jour: "Jeudi",    plage: "11 h – 16 h", visites: 48 },
        { jour: "Vendredi", plage: "11 h – 16 h", visites: 64 },
        { jour: "Samedi",   plage: "11 h – 16 h", visites: 82 },
        { jour: "Dimanche", plage: "11 h – 16 h", visites: 24 },
        // Soirée
        { jour: "Lundi",    plage: "16 h – 21 h", visites: 36 },
        { jour: "Mardi",    plage: "16 h – 21 h", visites: 34 },
        { jour: "Mercredi", plage: "16 h – 21 h", visites: 42 },
        { jour: "Jeudi",    plage: "16 h – 21 h", visites: 40 },
        { jour: "Vendredi", plage: "16 h – 21 h", visites: 52 },
        { jour: "Samedi",   plage: "16 h – 21 h", visites: 32 },
        { jour: "Dimanche", plage: "16 h – 21 h", visites: 12 },
      ],
    },

    // ── Fréquence de visite ───────────────────────────────────────────────────
    frequenceVisite: [
      { tranche: "1 visite",    membres: 218 },
      { tranche: "2–3 visites", membres: 312 },
      { tranche: "4–6 visites", membres: 248 },
      { tranche: "7–9 visites", membres: 118 },
      { tranche: "10+ visites", membres:  88 },
    ],

    // ── Récompenses ───────────────────────────────────────────────────────────
    recompenses: [
      { nom: "Verre de vin offert",         reclamations: 1_842, pointsUtilises: 184_200, foodCost:  9_210, pourcentageFoodCost: 4.03 },
      { nom: "Partie de 9 trous gratuite",  reclamations:   284, pointsUtilises:  85_200, foodCost: 14_200, pourcentageFoodCost: 6.22 },
      { nom: "Panier de balles offert",     reclamations:   628, pointsUtilises:  31_400, foodCost:  3_140, pourcentageFoodCost: 1.38 },
      { nom: "Club rental gratuit",         reclamations:   184, pointsUtilises:  27_600, foodCost:  3_680, pourcentageFoodCost: 1.61 },
      { nom: "Repas au 19e trou",           reclamations:   242, pointsUtilises:  48_400, foodCost:  4_840, pourcentageFoodCost: 2.12 },
    ],

    // ── Campagnes ─────────────────────────────────────────────────────────────
    campagnes: [
      { nom: "VIP — Saison estivale",      segmentCible: "VIP",       envois:  142, tauxOuverture: 78.2, reclamations:  86, revenus: 3_240, roi: 4.2, date: "2026-07-28" },
      { nom: "À risque — On vous manque",  segmentCible: "À risque",  envois:  164, tauxOuverture: 42.1, reclamations:  38, revenus: 1_428, roi: 1.8, date: "2026-07-20" },
      { nom: "Saison de golf — Août",      segmentCible: "Réguliers", envois:  386, tauxOuverture: 61.4, reclamations: 124, revenus: 4_664, roi: 3.1, date: "2026-08-01" },
      { nom: "Nouveau membre — Bienvenue", segmentCible: "Nouveaux",  envois:  218, tauxOuverture: 68.8, reclamations:  96, revenus: 2_352, roi: 2.4, date: "2026-07-15" },
      { nom: "Créneau calme — Mardi midi", segmentCible: "Tous",      envois: 1_284, tauxOuverture: 48.2, reclamations: 168, revenus: 2_058, roi: 1.6, date: "2026-08-10" },
    ],

    // ── Promotions lifetime (Analytique Prestige) ────────────────────────────
    // Phase 3 — portailSyncJob : agrégé depuis les transactions depuis le lancement.
    // Règle de période : seule dateDebutISO détermine l'inclusion dans une fenêtre.
    promotionsDetail: [
      {
        id: "promo-bienvenue",
        nom: "Bienvenue — 15 % pour les nouveaux membres",
        description: "Rabais de bienvenue accordé automatiquement à chaque nouveau membre lors de sa première visite. Conçu pour convertir l'inscription en première transaction.",
        dateDebutISO: "2026-02-01",
        typeRabais: "15 % sur facture",
        portee: "globale",
        utilisations: 724, clics: 980, coutReel: 2_172, valeurDistribuee: 1_448, revenusGeneres: 9_660, roi: 4.4,
      },
      {
        id: "promo-vip-2026",
        nom: "VIP — Accès exclusif saison 2026",
        description: "Offre réservée aux membres VIP : accès prioritaire aux créneaux de pointe et rabais sur les services premium. Renforce l'engagement du segment le plus rentable.",
        dateDebutISO: "2026-03-15",
        typeRabais: "Accès prioritaire + 10 % sur services premium",
        portee: "globale",
        utilisations: 218, clics: 310, coutReel: 1_090, valeurDistribuee: 2_180, revenusGeneres: 8_720, roi: 8.0,
      },
      {
        id: "promo-double-points",
        nom: "Double points — Avril fidélité",
        description: "Mois de la fidélité : tous les membres accumulent le double de points sur chaque visite. Objectif d'accélération du burn rate et de la fréquence de visite.",
        dateDebutISO: "2026-04-01",
        typeRabais: "2× points par visite",
        portee: "globale",
        utilisations: 1_086, clics: 1_420, coutReel: 3_800, valeurDistribuee: 7_602, revenusGeneres: 18_400, roi: 4.8,
      },
      {
        id: "promo-ete-2pour1",
        nom: "Été golfique — 2 pour 1 sur la ronde du mercredi",
        description: "Promotion estivale ciblant les créneaux creux du mercredi : un invité gratuit pour chaque membre. Augmente l'achalandage mid-week et l'acquisition de nouveaux membres via le bouche-à-oreille.",
        dateDebutISO: "2026-06-01",
        typeRabais: "2 pour 1",
        portee: "globale",
        utilisations: 312, clics: 486, coutReel: 4_680, valeurDistribuee: 3_120, revenusGeneres: 9_360, roi: 2.0,
      },
      {
        id: "promo-golf20",
        nom: "Juillet — 20 % sur votre prochaine visite",
        description: "Campagne promotionnelle d'été : rabais de 20 % envoyé par notification push aux membres actifs. Objectif de maintien de la fréquence durant le mois le plus achalandé.",
        dateDebutISO: "2026-07-01",
        typeRabais: "20 % sur facture",
        portee: "globale",
        utilisations: 489, clics: 742, coutReel: 6_860, valeurDistribuee: 4_890, revenusGeneres: 22_010, roi: 3.2,
      },
      {
        id: "promo-rentree",
        nom: "Rentrée — 3e visite offerte en août",
        description: "Campagne de rentrée pour réactiver les membres ayant réduit leur fréquence durant les vacances. La 3e visite du mois est offerte pour recréer l'habitude.",
        dateDebutISO: "2026-08-01",
        typeRabais: "Visite gratuite à la 3e",
        portee: "globale",
        utilisations: 84, clics: 198, coutReel: 1_260, valeurDistribuee: 840, revenusGeneres: 3_360, roi: 2.7,
      },
      {
        id: "promo-anniversaire",
        nom: "Anniversaire — Surprise personnalisée",
        description: "Offre individuelle envoyée automatiquement à chaque membre le jour de son anniversaire. Génère un fort taux de conversion mais reste ciblée à l'individu.",
        dateDebutISO: "2026-02-01",
        typeRabais: "Cadeau surprise (valeur variable)",
        portee: "individuelle",
        utilisations: 342, clics: 398, coutReel: 2_052, valeurDistribuee: 3_420, revenusGeneres: 6_840, roi: 3.3,
      },
    ],

    // ── Comptabilité — dernier mois complet (juillet 2026) ───────────────────
    comptabilite: {
      moisRef: "2026-07",
      synthese: {
        inscriptions:      84,
        revenus:     5_422.36,
        membresActifs:    862,
        membresTotal:   1_236,
        notifEnvoyees:  8_648,
        tauxOuverturePush: 59.4,
        visites: 2_972,
        pointsDistribues: 182_180,
        pointsRachetes:    107_460,
        valeurRachetee:    5_372,
        bonusAttribues:    2_972,
        valeurBonus:       1_486,
      },
      // Phase 3 — portailSyncJob : cumulatifs figés au 31 juillet 2026
      // 228 400 − 14 760 (août MTD) = 213 640 ; 18 620 − 1 204 (août MTD) = 17 416
      snapshotFinMois: {
        membresTotal:           1_236, // membres au 31 juil. 2026
        revenusTotal:         213_640, // CAD cumulatif depuis le lancement jusqu'au 31 juil.
        visites:      17_416, // cumulatif depuis le lancement jusqu'au 31 juil.
        pointsEnCirculation:  294_400, // passif non réclamé au 31 juil. 2026
        valeurPointsDistribues: 1_822, // 182 180 pts × 0,01 $ ≈ 1 822 $
      },
      facturesDetail: [
        { date: "2026-07-01", montant: 52.40, pointsAttribues:  524, franchise: "Cantley",  codePromo: "GOLF20",    promotionLiee: "Juillet — 20 % sur votre prochaine visite",  rabaisApplique: 13.10 },
        { date: "2026-07-01", montant: 38.80, pointsAttribues:  388, franchise: "Gatineau" },
        { date: "2026-07-02", montant: 24.60, pointsAttribues:  246, franchise: "Cantley",  codePromo: "BIENVENUE", promotionLiee: "Bienvenue — 15 % pour les nouveaux membres", rabaisApplique:  4.34 },
        { date: "2026-07-02", montant: 67.20, pointsAttribues:  672, franchise: "Gatineau", codePromo: "VIP2024",   promotionLiee: "VIP — Accès exclusif saison 2026",           rabaisApplique: 16.80 },
        { date: "2026-07-03", montant: 18.90, pointsAttribues:  189, franchise: "Cantley"  },
        // … 2 967 autres factures — données représentatives
      ],
      codesPromo: [
        { code: "GOLF20",    promotionLiee: "Juillet — 20 % sur votre prochaine visite",  utilisations: 142, rabaisTotal: 2_840 },
        { code: "BIENVENUE", promotionLiee: "Bienvenue — 15 % pour les nouveaux membres", utilisations:  84, rabaisTotal:   756 },
        { code: "VIP2024",   promotionLiee: "VIP — Accès exclusif saison 2026",           utilisations:  38, rabaisTotal: 1_140 },
      ],
      reclamationsDetail: [
        { date: "2026-07-01", recompense: "Verre de vin offert",       pointsReclames: 100, foodCost: 5.00,  franchise: "Cantley"  },
        { date: "2026-07-01", recompense: "Panier de balles offert",   pointsReclames:  50, foodCost: 5.00,  franchise: "Gatineau" },
        { date: "2026-07-02", recompense: "Verre de vin offert",       pointsReclames: 100, foodCost: 5.00,  franchise: "Cantley"  },
        { date: "2026-07-03", recompense: "Partie de 9 trous gratuite",pointsReclames: 300, foodCost:50.00, franchise: "Gatineau" },
        // … 428 autres réclamations
      ],
      promotions: [
        {
          nom:             "Juillet — 20 % sur votre prochaine visite",
          periode:         "1 juil. – 31 juil. 2026",
          typeRabais:      "20 % sur la facture",
          reclamations:    142,
          coutReel:       2_840,
          valeurDistribuee:2_840,
          revenusGeneres: 14_200,
          roi:             5.00,
        },
        {
          nom:             "Bienvenue — 15 % pour les nouveaux membres",
          periode:         "En continu",
          typeRabais:      "15 % sur la facture",
          reclamations:     84,
          coutReel:         756,
          valeurDistribuee:  756,
          revenusGeneres:  5_040,
          roi:              6.67,
        },
        {
          nom:             "VIP — Accès exclusif saison 2026",
          periode:         "1 juin – 31 août 2026",
          typeRabais:      "Partie de 9 trous gratuite à l'achat de 60 $",
          reclamations:     38,
          coutReel:       1_900,
          valeurDistribuee:1_900,
          revenusGeneres:  2_280,
          roi:              1.20,
        },
      ],
    },
  };
}

// ─── Documents par franchise ─────────────────────────────────────────────────
// Series journalières : Cantley ≈ 60 % du global, Gatineau ≈ 40 %.
// (Données approximatives pour le mock — valeurs exactes calculées par portailSyncJob Phase 3.)

export function getMockFranchises(): AnalyticsFranchise[] {
  return [
    {
      franchiseId:  "cantley",
      franchiseNom: "Club de golf Beattie — Cantley",
      periode: {
        dateDonnees:  "2026-08-14",
        derniereSync: new Date("2026-08-15T05:00:00-04:00"),
      },
      // aVie complet — somme Cantley + Gatineau = global (vérifié champ par champ)
      aVie: {
        membresTotal:           724,
        revenusTotal:           128_800, // 128 800 + 99 600 = 228 400 ✓
        visites:       10_500,  // 10 500 + 8 120 = 18 620 ✓
        panierMoyen:            12.26,
        moyenneRevenusParJour:  664,     // 128 800 / 194 j
        revenuParMembre:        177.90,  // 128 800 / 724
        reclamations:           2_720,   // 2 720 + 2 100 = 4 820 ✓
        bonusJoues:             3_580,   // 3 580 + 2 760 = 6 340 ✓
        pointsEnCirculation:    176_400, // 176 400 + 136 400 = 312 800 ✓
        burnRate:               58.5,
        breakageRate:           41.5,
        churnMoyenMensuel:       5.2,
        tauxVisiteMoyenMensuel: 68.7,
        notifications: {
          envoyees:      16_000, // 16 000 + 12 400 = 28 400 ✓
          tauxOuverture: 62.1,
          meilleureCampagne: { nom: "VIP — Saison estivale", revenus: 1_840 },
        },
        promos: {
          lancees:           10,
          clics:          2_150, // 2 150 + 1 670 = 3 820 ✓
          conversions:       548, // 548 + 432 = 980 ✓
          revenusAttribues: 8_700, // 8 700 + 5 900 = 14 600 ✓
          meilleurePromo: { nom: "Juillet — 20 % sur votre prochaine visite", revenusAttribues: 3_980 },
        },
        // Phase 3 — portailSyncJob requis
        // total = 358 000 + 67 000 = 425 000 ; rachetés = 425 000 − 176 400 = 248 600 ; burnRate ≈ 58,5 % ✓
        pointsDistribuesFactures: 358_000, // 358 000 + 280 000 = 638 000 (global) ✓
        pointsDistribuesBonus:     67_000, //  67 000 +  54 000 = 121 000 (global) ✓
        seriesMensuelles: [
          { mois: "2026-02", revenus: 15_600, visites: 1_349 },
          { mois: "2026-03", revenus: 18_800, visites: 1_558 },
          { mois: "2026-04", revenus: 22_200, visites: 1_782 },
          { mois: "2026-05", revenus: 24_800, visites: 2_071 },
          { mois: "2026-06", revenus: 19_680, visites: 1_676 }, // 19 680 + 15 140 = 34 820 ✓
          { mois: "2026-07", revenus: 21_920, visites: 1_841 }, // 21 920 + 16 340 = 38 260 ✓
        ],
      },
      hier: { membresActifs: 52, ventes: 56, revenus: 686, visites: 56, reclamations: 10, bonusJoues: 7 },
      "7j": {
        membresActifs: 208, nouveauxMembres: 14, ventes: 372, revenus: 4_560, panierMoyen: 12.26,
        visites: 372, reclamations: 58, bonusJoues: 44,
        variations: { revenus: +0.108, ventes: +0.092, membresActifs: +0.068, panierMoyen: -0.018 },
        // Phase 3 — portailSyncJob requis : séries journalières par franchise
        series: [
          { date: "2026-08-08", visites: 49, revenus:  603 },
          { date: "2026-08-09", visites: 54, revenus:  668 },
          { date: "2026-08-10", visites: 66, revenus:  808 },
          { date: "2026-08-11", visites: 41, revenus:  499 },
          { date: "2026-08-12", visites: 44, revenus:  543 },
          { date: "2026-08-13", visites: 65, revenus:  800 },
          { date: "2026-08-14", visites: 52, revenus:  640 },
        ],
      },
      "30j": {
        membresActifs: 522, nouveauxMembres: 58, ventes: 1_700, revenus: 20_842, panierMoyen: 12.26,
        visites: 1_700, reclamations: 256, bonusJoues: 194,
        variations: { revenus: +0.131, ventes: +0.109, membresActifs: +0.084, panierMoyen: -0.024 },
        series: [
          { date: "2026-07-15", visites:  59, revenus:  719 },
          { date: "2026-07-16", visites:  62, revenus:  764 },
          { date: "2026-07-17", visites:  71, revenus:  866 },
          { date: "2026-07-18", visites:  53, revenus:  646 },
          { date: "2026-07-19", visites:  55, revenus:  675 },
          { date: "2026-07-20", visites:  79, revenus:  969 },
          { date: "2026-07-21", visites:  74, revenus:  910 },
          { date: "2026-07-22", visites:  56, revenus:  690 },
          { date: "2026-07-23", visites:  52, revenus:  631 },
          { date: "2026-07-24", visites:  66, revenus:  808 },
          { date: "2026-07-25", visites:  47, revenus:  573 },
          { date: "2026-07-26", visites:  49, revenus:  602 },
          { date: "2026-07-27", visites:  75, revenus:  925 },
          { date: "2026-07-28", visites:  71, revenus:  867 },
          { date: "2026-07-29", visites:  57, revenus:  705 },
          { date: "2026-07-30", visites:  53, revenus:  646 },
          { date: "2026-07-31", visites:  67, revenus:  822 },
          { date: "2026-08-01", visites:  47, revenus:  573 },
          { date: "2026-08-02", visites:  56, revenus:  690 },
          { date: "2026-08-03", visites:  71, revenus:  867 },
          { date: "2026-08-04", visites:  43, revenus:  528 },
          { date: "2026-08-05", visites:  48, revenus:  588 },
          { date: "2026-08-06", visites:  67, revenus:  822 },
          { date: "2026-08-07", visites:  61, revenus:  749 },
          { date: "2026-08-08", visites:  49, revenus:  603 },
          { date: "2026-08-09", visites:  55, revenus:  668 },
          { date: "2026-08-10", visites:  66, revenus:  808 },
          { date: "2026-08-11", visites:  41, revenus:  499 },
          { date: "2026-08-12", visites:  44, revenus:  543 },
          { date: "2026-08-13", visites:  65, revenus:  800 },
          { date: "2026-08-14", visites:  52, revenus:  640 },
        ],
      },
      mois: { membresActifs: 366, nouveauxMembres: 29, ventes: 722, revenus: 8_852, panierMoyen: 12.26, visites: 722, reclamations: 112, bonusJoues: 85, variations: { revenus: +0.086, ventes: +0.071, membresActifs: +0.054, panierMoyen: -0.021 } },
      // Phase 3 — portailSyncJob requis : achalandage par franchise
      // Cantley ≈ 59 % du global (Lun 52+36=88, Mar 56+38=94, Mer 66+46=112, Jeu 60+42=102, Ven 81+57=138, Sam 96+66=162, Dim 44+30=74) ✓
      achalandage: {
        parJour: [
          { jour: "Lundi",    visites: 52 },
          { jour: "Mardi",    visites: 56 },
          { jour: "Mercredi", visites: 66 },
          { jour: "Jeudi",    visites: 60 },
          { jour: "Vendredi", visites: 81 },
          { jour: "Samedi",   visites: 96 },
          { jour: "Dimanche", visites: 44 },
        ],
        parPlage: [
          { jour: "Lundi",    plage: "7 h – 11 h",  visites:  8 },
          { jour: "Mardi",    plage: "7 h – 11 h",  visites: 11 },
          { jour: "Mercredi", plage: "7 h – 11 h",  visites:  9 },
          { jour: "Jeudi",    plage: "7 h – 11 h",  visites:  8 },
          { jour: "Vendredi", plage: "7 h – 11 h",  visites: 13 },
          { jour: "Samedi",   plage: "7 h – 11 h",  visites: 28 },
          { jour: "Dimanche", plage: "7 h – 11 h",  visites: 22 },
          { jour: "Lundi",    plage: "11 h – 16 h", visites: 22 },
          { jour: "Mardi",    plage: "11 h – 16 h", visites: 25 },
          { jour: "Mercredi", plage: "11 h – 16 h", visites: 32 },
          { jour: "Jeudi",    plage: "11 h – 16 h", visites: 28 },
          { jour: "Vendredi", plage: "11 h – 16 h", visites: 38 },
          { jour: "Samedi",   plage: "11 h – 16 h", visites: 48 },
          { jour: "Dimanche", plage: "11 h – 16 h", visites: 14 },
          { jour: "Lundi",    plage: "16 h – 21 h", visites: 21 },
          { jour: "Mardi",    plage: "16 h – 21 h", visites: 20 },
          { jour: "Mercredi", plage: "16 h – 21 h", visites: 25 },
          { jour: "Jeudi",    plage: "16 h – 21 h", visites: 24 },
          { jour: "Vendredi", plage: "16 h – 21 h", visites: 31 },
          { jour: "Samedi",   plage: "16 h – 21 h", visites: 19 },
          { jour: "Dimanche", plage: "16 h – 21 h", visites:  7 },
        ],
      },
      // Phase 3 — portailSyncJob : agrégats comptables de juillet 2026 pour Cantley
      // Cantley ≈ 59,6 % du global — sums vérifient contre global ✓
      comptabilite: {
        synthese: {
          inscriptions:       50,      // 84 global — Gatineau 34 ✓
          revenus:      3_232.36,      // 5 422,36 $ global — Gatineau 2 190,00 $ ✓
          membresActifs:     514,      // 862 global — Gatineau 348 ✓
          membresTotal:      724,      // 1 236 global — Gatineau 512 ✓
          notifEnvoyees:   5_156,     // 8 648 global — Gatineau 3 492 ✓
          tauxOuverturePush: 61.2,
          visites: 1_772,    // 2 972 global — Gatineau 1 200 ✓
          pointsDistribues: 108_622,  // 182 180 global — Gatineau 73 558 ✓
          pointsRachetes:    64_052,  // 107 460 global — Gatineau 43 408 ✓
          valeurRachetee:    3_202,   // 5 372 global — Gatineau 2 170 ✓
          bonusAttribues:    1_772,   // 2 972 global — Gatineau 1 200 ✓
          valeurBonus:         886,   // 1 486 global — Gatineau 600 ✓
        },
        snapshotFinMois: {
          membresTotal:            724,    // 1 236 global — Gatineau 512 ✓
          revenusTotal:        127_780,   // 213 640 global — Gatineau 85 860 ✓
          visites:     10_500,   // 17 416 global — Gatineau 6 916 ✓
          pointsEnCirculation:  176_060,  // 294 400 global — Gatineau 118 340 ✓
          valeurPointsDistribues: 1_089,  // 1 822 global — Gatineau 733 ✓
        },
      },
    },
    {
      franchiseId:  "gatineau",
      franchiseNom: "Club de golf Beattie — Gatineau",
      periode: {
        dateDonnees:  "2026-08-14",
        derniereSync: new Date("2026-08-15T05:00:00-04:00"),
      },
      // aVie complet — somme Cantley + Gatineau = global
      aVie: {
        membresTotal:           560,
        revenusTotal:           99_600,
        visites:       8_120,
        panierMoyen:            12.26,
        moyenneRevenusParJour:  513,     // 99 600 / 194 j
        revenuParMembre:        177.86,  // 99 600 / 560
        reclamations:           2_100,
        bonusJoues:             2_760,
        pointsEnCirculation:    136_400,
        burnRate:               59.2,
        breakageRate:           40.8,
        churnMoyenMensuel:       5.7,
        tauxVisiteMoyenMensuel: 67.8,
        notifications: {
          envoyees:      12_400,
          tauxOuverture: 61.3,
        },
        promos: {
          lancees:           8,
          clics:          1_670,
          conversions:       432,
          revenusAttribues: 5_900,
          meilleurePromo: { nom: "Juillet — 20 % sur votre prochaine visite", revenusAttribues: 2_880 },
        },
        // Phase 3 — portailSyncJob requis
        // total = 280 000 + 54 000 = 334 000 ; rachetés = 334 000 − 136 400 = 197 600 ; burnRate ≈ 59,2 % ✓
        pointsDistribuesFactures: 280_000,
        pointsDistribuesBonus:     54_000,
        seriesMensuelles: [
          { mois: "2026-02", revenus: 12_400, visites:   937 },
          { mois: "2026-03", revenus: 14_400, visites: 1_082 },
          { mois: "2026-04", revenus: 15_600, visites: 1_238 },
          { mois: "2026-05", revenus: 16_760, visites: 1_439 },
          { mois: "2026-06", revenus: 15_140, visites: 1_164 }, // 15 140 + 19 680 = 34 820 ✓
          { mois: "2026-07", revenus: 16_340, visites: 1_279 }, // 16 340 + 21 920 = 38 260 ✓
        ],
      },
      hier: { membresActifs: 35, ventes: 38, revenus: 466, visites: 38, reclamations:  8, bonusJoues: 4 },
      "7j": {
        membresActifs: 140, nouveauxMembres: 10, ventes: 249, revenus: 3_052, panierMoyen: 12.26,
        visites: 249, reclamations: 40, bonusJoues: 30,
        variations: { revenus: +0.116, ventes: +0.097, membresActifs: +0.079, panierMoyen: -0.018 },
        series: [
          { date: "2026-08-08", visites: 33, revenus:  402 },
          { date: "2026-08-09", visites: 37, revenus:  447 },
          { date: "2026-08-10", visites: 44, revenus:  540 },
          { date: "2026-08-11", visites: 27, revenus:  334 },
          { date: "2026-08-12", visites: 30, revenus:  364 },
          { date: "2026-08-13", visites: 44, revenus:  536 },
          { date: "2026-08-14", visites: 35, revenus:  428 },
        ],
      },
      "30j": {
        membresActifs: 352, nouveauxMembres: 38, ventes: 1_140, revenus: 13_978, panierMoyen: 12.26,
        visites: 1_140, reclamations: 172, bonusJoues: 130,
        variations: { revenus: +0.138, ventes: +0.116, membresActifs: +0.091, panierMoyen: -0.024 },
        series: [
          { date: "2026-07-15", visites: 39, revenus:  482 },
          { date: "2026-07-16", visites: 42, revenus:  511 },
          { date: "2026-07-17", visites: 47, revenus:  580 },
          { date: "2026-07-18", visites: 35, revenus:  433 },
          { date: "2026-07-19", visites: 37, revenus:  452 },
          { date: "2026-07-20", visites: 53, revenus:  649 },
          { date: "2026-07-21", visites: 50, revenus:  610 },
          { date: "2026-07-22", visites: 38, revenus:  462 },
          { date: "2026-07-23", visites: 34, revenus:  423 },
          { date: "2026-07-24", visites: 44, revenus:  540 },
          { date: "2026-07-25", visites: 31, revenus:  383 },
          { date: "2026-07-26", visites: 33, revenus:  403 },
          { date: "2026-07-27", visites: 51, revenus:  620 },
          { date: "2026-07-28", visites: 47, revenus:  580 },
          { date: "2026-07-29", visites: 39, revenus:  472 },
          { date: "2026-07-30", visites: 35, revenus:  433 },
          { date: "2026-07-31", visites: 45, revenus:  551 },
          { date: "2026-08-01", visites: 31, revenus:  383 },
          { date: "2026-08-02", visites: 38, revenus:  462 },
          { date: "2026-08-03", visites: 47, revenus:  580 },
          { date: "2026-08-04", visites: 29, revenus:  354 },
          { date: "2026-08-05", visites: 32, revenus:  393 },
          { date: "2026-08-06", visites: 45, revenus:  551 },
          { date: "2026-08-07", visites: 41, revenus:  501 },
          { date: "2026-08-08", visites: 33, revenus:  402 },
          { date: "2026-08-09", visites: 36, revenus:  447 },
          { date: "2026-08-10", visites: 44, revenus:  540 },
          { date: "2026-08-11", visites: 27, revenus:  334 },
          { date: "2026-08-12", visites: 30, revenus:  364 },
          { date: "2026-08-13", visites: 44, revenus:  536 },
          { date: "2026-08-14", visites: 35, revenus:  428 },
        ],
      },
      mois: { membresActifs: 246, nouveauxMembres: 19, ventes: 482, revenus: 5_908, panierMoyen: 12.26, visites: 482, reclamations: 74, bonusJoues: 57, variations: { revenus: +0.093, ventes: +0.074, membresActifs: +0.059, panierMoyen: -0.021 } },
      achalandage: {
        parJour: [
          { jour: "Lundi",    visites: 36 },
          { jour: "Mardi",    visites: 38 },
          { jour: "Mercredi", visites: 46 },
          { jour: "Jeudi",    visites: 42 },
          { jour: "Vendredi", visites: 57 },
          { jour: "Samedi",   visites: 66 },
          { jour: "Dimanche", visites: 30 },
        ],
        parPlage: [
          { jour: "Lundi",    plage: "7 h – 11 h",  visites:  6 },
          { jour: "Mardi",    plage: "7 h – 11 h",  visites:  7 },
          { jour: "Mercredi", plage: "7 h – 11 h",  visites:  7 },
          { jour: "Jeudi",    plage: "7 h – 11 h",  visites:  6 },
          { jour: "Vendredi", plage: "7 h – 11 h",  visites:  9 },
          { jour: "Samedi",   plage: "7 h – 11 h",  visites: 20 },
          { jour: "Dimanche", plage: "7 h – 11 h",  visites: 16 },
          { jour: "Lundi",    plage: "11 h – 16 h", visites: 16 },
          { jour: "Mardi",    plage: "11 h – 16 h", visites: 17 },
          { jour: "Mercredi", plage: "11 h – 16 h", visites: 22 },
          { jour: "Jeudi",    plage: "11 h – 16 h", visites: 20 },
          { jour: "Vendredi", plage: "11 h – 16 h", visites: 26 },
          { jour: "Samedi",   plage: "11 h – 16 h", visites: 34 },
          { jour: "Dimanche", plage: "11 h – 16 h", visites: 10 },
          { jour: "Lundi",    plage: "16 h – 21 h", visites: 15 },
          { jour: "Mardi",    plage: "16 h – 21 h", visites: 14 },
          { jour: "Mercredi", plage: "16 h – 21 h", visites: 17 },
          { jour: "Jeudi",    plage: "16 h – 21 h", visites: 16 },
          { jour: "Vendredi", plage: "16 h – 21 h", visites: 21 },
          { jour: "Samedi",   plage: "16 h – 21 h", visites: 13 },
          { jour: "Dimanche", plage: "16 h – 21 h", visites:  5 },
        ],
      },
      // Phase 3 — portailSyncJob : agrégats comptables de juillet 2026 pour Gatineau
      // Gatineau ≈ 40,4 % du global — sums vérifient contre global ✓
      comptabilite: {
        synthese: {
          inscriptions:       34,      // 84 − 50 ✓
          revenus:      2_190.00,      // 5 422,36 − 3 232,36 ✓
          membresActifs:     348,      // 862 − 514 ✓
          membresTotal:      512,      // 1 236 − 724 ✓
          notifEnvoyees:   3_492,     // 8 648 − 5 156 ✓
          tauxOuverturePush: 56.8,
          visites: 1_200,    // 2 972 − 1 772 ✓
          pointsDistribues:  73_558,  // 182 180 − 108 622 ✓
          pointsRachetes:    43_408,  // 107 460 − 64 052 ✓
          valeurRachetee:    2_170,   // 5 372 − 3 202 ✓
          bonusAttribues:    1_200,   // 2 972 − 1 772 ✓
          valeurBonus:         600,   // 1 486 − 886 ✓
        },
        snapshotFinMois: {
          membresTotal:            512,    // 1 236 − 724 ✓
          revenusTotal:         85_860,   // 213 640 − 127 780 ✓
          visites:      6_916,   // 17 416 − 10 500 ✓
          pointsEnCirculation:  118_340,  // 294 400 − 176 060 ✓
          valeurPointsDistribues:   733,  // 1 822 − 1 089 ✓
        },
      },
    },
  ];
}

// ─── Alertes (Prestige) ───────────────────────────────────────────────────────

export function getMockAlertes(): AlerteDoc[] {
  return [
    {
      type: "vip_decroche", severite: "critique",
      titre: "18 membres VIP n'ont pas visité depuis 38 jours",
      description: "18 membres VIP (panier moyen 18,84 $, fréquence 4 visites/mois) sont absents depuis 38 jours. Valeur estimée en jeu : 12 800 $ sur 3 mois si non réactivés.",
      valeurEnJeu: 12_800,
      actionLabel: "Lancer une campagne de rétention",
      lienAction:  "donnees?tab=segmentation",
      franchiseId: undefined, lue: false, createdAt: new Date("2026-08-14T08:00:00"),
    },
    {
      type: "churn_rising", severite: "critique",
      titre: "Segment À risque en hausse : +22 membres ce mois",
      description: "Le segment À risque est passé de 142 à 164 membres depuis le 1er août. Si la tendance se maintient, 28 membres supplémentaires pourraient basculer vers Inactif d'ici septembre, représentant 8 200 $ en jeu.",
      valeurEnJeu: 8_200,
      actionLabel: "Voir le segment À risque",
      lienAction:  "donnees?tab=segmentation",
      lue: false, createdAt: new Date("2026-08-13T08:00:00"),
    },
    {
      type: "points_passif", severite: "attention",
      titre: "84 membres ont plus de 500 points non réclamés",
      description: "84 membres ont accumulé 500 points ou plus sans jamais réclamer de récompense. Ce passif représente 42 000 points — un rappel ciblé peut générer une visite et réduire le breakage.",
      actionLabel: "Envoyer un rappel ciblé",
      lienAction:  "donnees?tab=alertes",
      lue: false, createdAt: new Date("2026-08-12T10:00:00"),
    },
    {
      type: "record_visites", severite: "positive",
      titre: "Record de visites ce samedi : 162 validées",
      description: "Le samedi 10 août a enregistré 162 visites validées, un nouveau record mensuel. La campagne « Saison de golf — Août » lancée le 1er août a généré un effet de halo sur les fins de semaine.",
      actionLabel: "Dupliquer cette campagne",
      lienAction:  "donnees?tab=alertes",
      lue: false, createdAt: new Date("2026-08-11T08:00:00"),
    },
    {
      type: "créneau_calme", severite: "attention",
      titre: "Mardi matin 7 h – 11 h : seulement 18 visites",
      description: "Le mardi entre 7 h et 11 h est votre créneau le plus calme : 18 visites en moyenne vs 54 visites l'après-midi. Une promotion ciblée sur ce créneau pourrait générer 20 à 30 visites supplémentaires par semaine.",
      actionLabel: "Créer une promo ciblée",
      lienAction:  "donnees?tab=alertes",
      lue: true, createdAt: new Date("2026-08-10T08:00:00"),
    },
    {
      type: "nouveau_record", severite: "positive",
      titre: "Campagne VIP — ROI de 4,2×",
      description: "La campagne « VIP — Saison estivale » a généré 3 240 $ de revenus pour 86 réclamations sur 142 envois. Taux d'ouverture de 78,2 % — votre meilleure campagne depuis le lancement.",
      actionLabel: "Dupliquer cette campagne",
      lienAction:  "donnees?tab=alertes",
      lue: true, createdAt: new Date("2026-08-05T12:00:00"),
    },
  ];
}

// ─── Rapports ─────────────────────────────────────────────────────────────────

export function getMockRapports(): RapportDoc[] {
  return [
    // ── Rapports mensuels comptables (Essentiel + Prestige) ──────────────────
    {
      type: "comptable", mois: 7, annee: 2026,
      donnees: { moisRef: "2026-07", membresActifs: 862, visites: 2_972, revenus: 38_260 },
      analyseIA: { bonsCoups: [], aTravailler: [] },
      publie: true, generatedAt: new Date("2026-08-02T06:00:00"),
    },
    {
      type: "comptable", mois: 6, annee: 2026,
      donnees: { moisRef: "2026-06", membresActifs: 794, visites: 2_632, revenus: 34_820 },
      analyseIA: { bonsCoups: [], aTravailler: [] },
      publie: true, generatedAt: new Date("2026-07-02T06:00:00"),
    },
    {
      type: "comptable", mois: 5, annee: 2026,
      donnees: { moisRef: "2026-05", membresActifs: 728, visites: 2_414, revenus: 41_560 },
      analyseIA: { bonsCoups: [], aTravailler: [] },
      publie: true, generatedAt: new Date("2026-06-02T06:00:00"),
    },
    {
      type: "comptable", mois: 4, annee: 2026,
      donnees: { moisRef: "2026-04", membresActifs: 612, visites: 2_068, revenus: 37_800 },
      analyseIA: { bonsCoups: [], aTravailler: [] },
      publie: true, generatedAt: new Date("2026-05-02T06:00:00"),
    },
    {
      type: "comptable", mois: 3, annee: 2026,
      donnees: { moisRef: "2026-03", membresActifs: 524, visites: 1_842, revenus: 33_200 },
      analyseIA: { bonsCoups: [], aTravailler: [] },
      publie: true, generatedAt: new Date("2026-04-02T06:00:00"),
    },
    {
      type: "comptable", mois: 2, annee: 2026,
      donnees: { moisRef: "2026-02", membresActifs: 418, visites: 1_440, revenus: 28_000 },
      analyseIA: { bonsCoups: [], aTravailler: [] },
      publie: true, generatedAt: new Date("2026-03-02T06:00:00"),
    },
    // ── Rapports de performance (Prestige uniquement) ─────────────────────────
    {
      type: "performance", mois: 7, annee: 2026,
      donnees: {
        membresActifs: 862, visitesValidees: 2_972, revenusAttribues: 36_404,
        variationMembres: +8.4, variationVisites: +12.8, variationRevenus: +11.6,
      },
      analyseIA: {
        bonsCoups: [
          "Vos membres VIP ont généré 3 240 $ grâce à la campagne estivale — un ROI de 4,2×, le meilleur résultat depuis le lancement. La clé : envoi le lundi matin à 8 h 30, quand vos membres planifient leur semaine.",
          "Le segment Réguliers a gagné 22 membres nets en juillet, porté par la campagne « Saison de golf » avec 61,4 % d'ouverture. C'est 16 points au-dessus de la moyenne du secteur (45 %).",
          "Record de fréquentation le samedi : 162 visites validées le 10 août. La promo heure creuse du 1er août a créé un effet de halo notable sur les fins de semaine suivantes.",
        ],
        aTravailler: [
          "18 membres VIP sont absents depuis 38 jours — une campagne de rétention cette semaine peut récupérer jusqu'à 12 800 $ de revenu potentiel sur 3 mois.",
          "Le segment À risque a augmenté de 22 membres en août. Lancer un flux automatique de réengagement pour les membres sans visite depuis 31 jours.",
          "84 membres détiennent plus de 500 points non utilisés. Un rappel push avec offre limitée dans le temps peut déclencher une visite et réduire le passif.",
        ],
      },
      pdfUrl: undefined, publie: true,
      generatedAt: new Date("2026-08-01T06:00:00"),
    },
    {
      type: "performance", mois: 6, annee: 2026,
      donnees: { membresActifs: 794, visitesValidees: 2_632, revenusAttribues: 32_264 },
      analyseIA: { bonsCoups: ["Croissance constante de 12 % ce mois."], aTravailler: ["Augmenter la fréquence de push pour le segment À risque."] },
      publie: true, generatedAt: new Date("2026-07-01T06:00:00"),
    },
    {
      type: "performance", mois: 5, annee: 2026,
      donnees: { membresActifs: 728, visitesValidees: 2_414, revenusAttribues: 29_596 },
      analyseIA: { bonsCoups: ["Lancement réussi du programme de fidélité."], aTravailler: ["Définir une stratégie de réactivation pour les membres inactifs."] },
      publie: true, generatedAt: new Date("2026-06-01T06:00:00"),
    },
    // 4e rapport — nécessaire pour que le bouton « Voir tout » s'affiche (condition : > 3)
    {
      type: "performance", mois: 4, annee: 2026,
      donnees: { membresActifs: 648, visitesValidees: 2_184, revenusAttribues: 26_760 },
      analyseIA: {
        bonsCoups: [
          "Programme de fidélité bien adopté dès le 2e mois — 648 membres actifs.",
          "Taux d'ouverture push de 63 % — au-dessus de la moyenne sectorielle.",
          "La promo Double points a généré une hausse de fréquence de visite de 18 %.",
        ],
        aTravailler: [
          "Segment À risque en croissance — activer une campagne de réactivation ciblée.",
          "Burn rate à 54 % — augmenter la valeur perçue des récompenses pour stimuler les réclamations.",
          "Panier moyen stagnant — tester des offres de vente incitative sur les visites > 10 $.",
        ],
      },
      publie: true, generatedAt: new Date("2026-05-01T06:00:00"),
    },
  ];
}

// ─── Config application ───────────────────────────────────────────────────────

export function getMockAppConfig(): AppConfigDoc {
  return {
    firebaseProjectId: "golf-beattie-club",
    franchises: [
      { id: "cantley",  nom: "Beattie — Cantley"  },
      { id: "gatineau", nom: "Beattie — Gatineau"  },
    ],
    syncActive:   true,
    derniereSync: new Date("2026-08-15T05:00:00-04:00"),
    statutSync:   "ok",
  };
}
// ─── Export groupé — accueil État 3 ──────────────────────────────────────────

export function getMockAnalytics() {
  const g = getMockGlobal();
  const a = getMockAlertes();
  const r = getMockRapports();
  return {
    current: {
      membresTotal:     g.aVie.membresTotal,
      membresActifs:    g["30j"].membresActifs,
      visitesValidees:  g["30j"].ventes,
      revenusAttribues: g["30j"].revenus,
      variations: {
        membresActifs:    g["30j"].variations.membresActifs,
        visitesValidees:  g["30j"].variations.ventes,
        revenusAttribues: g["30j"].variations.revenus,
      },
    },
    alertes:     a.map(al => ({ ...al, id: al.type + "_" + al.createdAt.getTime() })),
    rapports:    r.map(rp => ({ ...rp, id: `rp_${rp.mois}_${rp.annee}` })),
    series:      { visitesRevenus: g["30j"].series },
    recompenses: g.recompenses,
    campagnes:   g.campagnes,
  };
}