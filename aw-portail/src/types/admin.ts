export type Forfait = "Essentiel" | "Prestige";
export type StatutFacture = "payé" | "en attente" | "en retard";
export type StatutClient = "actif" | "inactif" | "pause";
export type EtapePipeline =
  | "Prospect"
  | "Signé"
  | "En développement"
  | "Live"
  | "Actif"
  | "À risque de churn";

export interface Client {
  id: string;
  nom: string;
  forfait: Forfait;
  etapePipeline: EtapePipeline;
  onboardingPct: number;
  derniereConnexion: Date | null;
  statutFacture: StatutFacture;
  prochaineAction: string;
  montantMensuel: number;
  statut: StatutClient;
  clientId: string;
  succursales: number;
  dateDebut: Date | null;
  joursInactif?: number;
}
