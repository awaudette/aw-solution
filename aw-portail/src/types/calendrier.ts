import type { Timestamp } from "firebase/firestore";

export type RdvStatut = "en_attente" | "accepte" | "refuse" | "modifie";
export type RdvInitiateur = "admin" | "client";

export interface RendezVous {
  id: string;
  titre: string;
  description: string;
  date: string;        // "YYYY-MM-DD"
  heure: string;       // "HH:MM"
  statut: RdvStatut;
  initiateur: RdvInitiateur;
  raisonRefus: string | null;
  nouvelleDate: string | null;   // si modifié
  nouvelleHeure: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clientId?: string;   // pour la vue globale admin
  clientNom?: string;
  lienRencontre?: string | null; // lien Zoom / Google Meet / Teams
  reminderEnvoye?: boolean;      // true une fois le rappel 2h envoyé
}
