// Fonctions de calcul pures, partagées entre PerdusView et DashboardView.
// Aucun accès réseau ici — tout part des organisations déjà chargées côté page.

import { ETAPE_VALUES, MOTIF_LABELS_COMBINES, type Etape, type OrganisationDTO } from "@/config/organisations";
import type { StaffMember } from "@/hooks/useOrganisations";

// ─── Page Perdus ────────────────────────────────────────────────────────────

export interface MotifBreakdownItem {
  motif: string;
  label: string;
  count: number;
  pct: number; // 0-100, sur le total des dossiers perdus
}

/** Répartition des motifs de perte — seule analyse conservée sur la page Perdus (le taux/la distribution par étape a été explicitement écarté). */
export function motifBreakdown(perdus: OrganisationDTO[]): MotifBreakdownItem[] {
  const total = perdus.length;
  if (total === 0) return [];
  const counts = new Map<string, number>();
  for (const org of perdus) {
    const key = org.motifPerte ?? "sans_motif";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([motif, count]) => ({
      motif,
      label: motif === "sans_motif" ? "Sans motif" : (MOTIF_LABELS_COMBINES[motif] ?? motif),
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/** Dossiers récupérables dont la date de relance suggérée est dépassée. */
export function relancesEnRetard(perdus: OrganisationDTO[]): OrganisationDTO[] {
  const now = Date.now();
  return perdus.filter(o =>
    (o.recuperable === "oui" || o.recuperable === "peut_etre") &&
    !!o.dateRelanceSuggeree &&
    new Date(o.dateRelanceSuggeree).getTime() < now
  );
}

// ─── Tableau de bord ────────────────────────────────────────────────────────

export const ETAPES_PIPELINE: Etape[] = ETAPE_VALUES.filter(e => e !== "perdu") as Etape[];

/** Valeur mensuelle estimée cumulée, groupée par étape actuelle (dossiers non perdus uniquement). */
export function valeurCumuleeParEtape(organisations: OrganisationDTO[]): { etape: Etape; total: number; count: number }[] {
  return ETAPES_PIPELINE.map(etape => {
    const dossiers = organisations.filter(o => o.etape === etape);
    const total = dossiers.reduce((sum, o) => sum + (o.valeurMensuelleEstimee ?? 0), 0);
    return { etape, total, count: dossiers.length };
  });
}

export interface TauxAvecEchantillon {
  taux: number; // 0-100
  n: number; // taille de l'échantillon (dénominateur) — à afficher à côté du taux
}

/**
 * Taux de conversion global — dossiers signés / total des dossiers créés.
 * Faute d'historique des transitions, c'est le seul dénominateur défendable :
 * il ne préjuge pas de ce qu'auraient dû devenir les dossiers encore en cours.
 */
export function tauxConversionGlobal(organisations: OrganisationDTO[]): TauxAvecEchantillon {
  const n = organisations.length;
  if (n === 0) return { taux: 0, n: 0 };
  const signes = organisations.filter(o => o.etape === "signe").length;
  return { taux: Math.round((signes / n) * 100), n };
}

const CHAMP_DATE_PAR_ETAPE: Partial<Record<Etape, keyof OrganisationDTO>> = {
  contacte: "datePremierContact",
  demo_faite: "dateDemo",
  proposition_envoyee: "datePropositionEnvoyee",
  negociation: "dateNegociation",
  signe: "dateSignature",
};

export interface EtapeFunnelItem {
  etape: Etape;
  atteints: number; // nb de dossiers ayant un jour atteint cette étape (proxy : date correspondante remplie)
  tauxDepuisPrecedente: TauxAvecEchantillon | null; // null pour la première étape (rien avant "nouveau")
}

/**
 * Taux de conversion entre chaque étape — approximatif : faute d'historique
 * des transitions, "atteint l'étape X" est déduit de la présence de la date
 * associée (remplie une seule fois, la première fois que l'étape est
 * atteinte, et jamais effacée même si le dossier est ensuite perdu). Un
 * dossier réactivé garde donc ses dates d'origine, ce qui est correct ici.
 */
export function funnelEtapes(organisations: OrganisationDTO[]): EtapeFunnelItem[] {
  const total = organisations.length;
  const items: EtapeFunnelItem[] = [{ etape: "nouveau", atteints: total, tauxDepuisPrecedente: null }];

  let precedent = total;
  for (const etape of ETAPES_PIPELINE) {
    if (etape === "nouveau") continue;
    const champ = CHAMP_DATE_PAR_ETAPE[etape];
    const atteints = champ ? organisations.filter(o => !!o[champ]).length : 0;
    const taux: TauxAvecEchantillon = { taux: precedent > 0 ? Math.round((atteints / precedent) * 100) : 0, n: precedent };
    items.push({ etape, atteints, tauxDepuisPrecedente: taux });
    precedent = atteints;
  }
  return items;
}

export interface DureeMoyenneItem {
  etape: Etape;
  joursMoyens: number | null; // null si aucun dossier n'a les deux dates nécessaires
  n: number;
}

/**
 * Durée moyenne passée dans chaque étape, calculée à partir des dates du
 * cycle de vente (écart entre la date d'entrée dans l'étape et la date
 * d'entrée dans la suivante, sur les dossiers qui ont les deux). Toujours
 * approximatif : un dossier encore bloqué dans une étape n'a pas de date de
 * sortie et n'est donc pas compté — la vraie durée moyenne, en incluant les
 * dossiers encore en cours, ne peut pas être connue sans historique complet.
 */
export function dureeMoyenneParEtape(organisations: OrganisationDTO[]): DureeMoyenneItem[] {
  const etapes: { etape: Etape; entree: (o: OrganisationDTO) => string | null; sortie: (o: OrganisationDTO) => string | null }[] = [
    { etape: "nouveau", entree: o => o.createdAt, sortie: o => o.datePremierContact },
    { etape: "contacte", entree: o => o.datePremierContact, sortie: o => o.dateDemo },
    { etape: "demo_faite", entree: o => o.dateDemo, sortie: o => o.datePropositionEnvoyee },
    { etape: "proposition_envoyee", entree: o => o.datePropositionEnvoyee, sortie: o => o.dateNegociation },
    { etape: "negociation", entree: o => o.dateNegociation, sortie: o => o.dateSignature },
  ];

  return etapes.map(({ etape, entree, sortie }) => {
    const ecarts: number[] = [];
    for (const o of organisations) {
      const debut = entree(o);
      const fin = sortie(o);
      if (!debut || !fin) continue;
      const jours = (new Date(fin).getTime() - new Date(debut).getTime()) / (1000 * 60 * 60 * 24);
      if (jours >= 0) ecarts.push(jours);
    }
    if (ecarts.length === 0) return { etape, joursMoyens: null, n: 0 };
    const moyenne = ecarts.reduce((a, b) => a + b, 0) / ecarts.length;
    return { etape, joursMoyens: Math.round(moyenne * 10) / 10, n: ecarts.length };
  });
}

export interface ActivitePersonne {
  uid: string;
  nom: string;
  nbDossiers: number;
  nbInteractions: number;
  nbSignes: number;
}

/** Activité par personne : nombre de dossiers, d'interactions cumulées, et de dossiers signés dont elle est responsable. */
export function activiteParPersonne(organisations: OrganisationDTO[], staff: StaffMember[]): ActivitePersonne[] {
  return staff.map(s => {
    const dossiers = organisations.filter(o => o.proprietaire === s.uid);
    return {
      uid: s.uid,
      nom: `${s.prenom} ${s.nom}`.trim() || s.courriel,
      nbDossiers: dossiers.length,
      nbInteractions: dossiers.reduce((sum, o) => sum + (o.interactionsCount ?? 0), 0),
      nbSignes: dossiers.filter(o => o.etape === "signe").length,
    };
  }).filter(a => a.nbDossiers > 0);
}
