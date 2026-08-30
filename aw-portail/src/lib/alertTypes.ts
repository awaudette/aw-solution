/**
 * alertTypes.ts
 *
 * Traduit alertType (catégorie sémantique envoyée par la CF cliente dans
 * aVie.alertesActives, ex: Poké Station) vers SeveriteAlerte (niveau
 * d'affichage attendu par OngletAlertes : critique | attention | positive).
 *
 * Ce n'est pas la même notion : alertType dit QUOI, severite dit à quel
 * point c'est urgent/positif à l'affichage. Aucune correspondance
 * automatique n'existe — cette table est la seule source de vérité.
 */

import type { SeveriteAlerte } from "@/types/analytics";

export const ALERT_TYPE_SEVERITE: Record<string, SeveriteAlerte> = {
  // Critique — perte de membre ou de revenu déjà en cours
  lost:                 "critique",
  at_risk:              "critique",

  // Attention — signal à surveiller, pas une urgence par client
  dormant:              "attention",
  vip_inactif:          "attention",
  journee_lente:        "attention",

  // Positive — croissance ou opportunité
  nouveaux_membres:     "positive",
  gros_depensiers:      "positive",
  anniversaire:         "positive",
  evenement_saisonnier: "positive",
  record_ventes:        "positive",
};

/** Repli si un alertType inconnu arrive (nouvelle catégorie pas encore
 *  répertoriée ici) — "attention" plutôt que de planter ou de deviner. */
export const DEFAULT_ALERT_SEVERITE: SeveriteAlerte = "attention";

export function severiteForAlertType(alertType: string): SeveriteAlerte {
  return ALERT_TYPE_SEVERITE[alertType] ?? DEFAULT_ALERT_SEVERITE;
}
