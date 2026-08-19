import type { Timestamp } from "firebase/firestore";

export type StatutEtape = "a_venir" | "a_faire" | "en_cours" | "complete" | "bloque";

export interface RoadmapEtape {
  id: string;
  nom: string;
  statut: StatutEtape;
  dateDebut: Timestamp | null;
  dateFin: Timestamp | null;
  dateEstimee: Timestamp | null;
  completedAt: Timestamp | null;
  blocageRaison?: string | null;
}

export interface RencontreValidation {
  creneaux: { date: string; heure: string }[];
  creneauChoisi: number | null;   // -1 = client's own date was confirmed
  envoye: boolean;
  dateClientProposee?: string | null;
  messageClientPropose?: string | null;
  statutClient?: "propose" | null;
}

export interface RoadmapMain {
  etapes: RoadmapEtape[];
  dateLancementEstimee: Timestamp | null;
  dateCreation: Timestamp;
  introVue: boolean;
}
