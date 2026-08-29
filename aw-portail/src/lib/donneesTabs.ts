/**
 * donneesTabs.ts
 *
 * Définition des onglets de la page Données & rapports — partagée entre
 * /client/[clientId]/donnees/page.tsx et AdminDonneesViewer (fiche client
 * admin). Extrait de donnees/page.tsx : un fichier page.tsx en Next 16 ne
 * doit exporter que les exports de route reconnus (default, metadata, etc.),
 * donc ce tableau ne peut pas y vivre en export nommé.
 *
 * « prestige: true » = onglet masqué pour le forfait Essentiel.
 */

export const TABS = [
  { id: "resume",        label: "Résumé",       prestige: false },
  { id: "alertes",       label: "Alertes",       prestige: true  },
  { id: "segmentation",  label: "Segmentation",  prestige: true  },
  { id: "analytique",    label: "Analytique",    prestige: false }, // Essentiel: OngletAnalytiqueEssentiel / Prestige: OngletAnalytique
  { id: "comptabilite",  label: "Comptabilité",  prestige: false },
  { id: "historique",    label: "Historique",    prestige: false },
] as const;

export type TabId = (typeof TABS)[number]["id"];
