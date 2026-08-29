import { JOURS_DORMANT, type OrganisationDTO } from "@/config/organisations";

export function estSansProchaineAction(org: OrganisationDTO): boolean {
  return !org.prochaineAction || !org.prochaineAction.trim();
}

/**
 * Dormant : pas d'interaction (ou la dernière) depuis plus de JOURS_DORMANT
 * jours. En l'absence de toute interaction, on se rabat sur createdAt —
 * un dossier tout juste créé n'est donc pas dormant du seul fait de ne rien
 * avoir encore, mais un vieux dossier jamais suivi le devient.
 */
export function estDormant(org: OrganisationDTO): boolean {
  const reference = org.derniereInteraction ?? org.createdAt;
  if (!reference) return false;
  const ms = Date.now() - new Date(reference).getTime();
  return ms > JOURS_DORMANT * 24 * 60 * 60 * 1000;
}
