// Configuration centralisée des sections du portail client.
// Ajouter une section ici la fait apparaître automatiquement partout
// (navigation, formulaire d'invitation, gestion des permissions).

export const PORTAL_SECTIONS = [
  { key: "accueil",       label: "Accueil",             slug: "accueil",          maxPermission: "ecriture" },
  { key: "contrat",       label: "Contrat & Paiement",  slug: "contrat",          maxPermission: "ecriture" },
  { key: "branding",      label: "Branding",            slug: "branding",         maxPermission: "ecriture" },
  { key: "feuilleDeRoute",label: "Feuille de route",    slug: "feuille-de-route", maxPermission: "ecriture" },
  { key: "documentation", label: "Documentation",       slug: "documentation",    maxPermission: "ecriture" },
  { key: "rapports",      label: "Données & Rapports",  slug: "donnees",          maxPermission: "ecriture" },
  { key: "support",       label: "Support",             slug: "support",          maxPermission: "ecriture" },
  { key: "parametres",    label: "Paramètres",          slug: "parametres",       maxPermission: "lecture"  },
] as const;

export type SectionKey  = (typeof PORTAL_SECTIONS)[number]["key"];
export type Permission  = "lecture" | "ecriture" | null;
export type Permissions = Record<SectionKey, Permission>;

export const DEFAULT_PERMISSIONS: Permissions = {
  accueil:       null,
  contrat:       null,
  branding:      null,
  feuilleDeRoute:null,
  documentation: null,
  rapports:      null,
  support:       null,
  parametres:    null,
};
