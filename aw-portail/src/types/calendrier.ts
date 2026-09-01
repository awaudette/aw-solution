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
  /** Ids Resend des rappels 2h programmés (scheduledAt) — null une fois
   *  annulés par reconcilierRappels ou si l'envoi a été immédiat (fenêtre de
   *  2h déjà entamée au moment de la programmation, rien à annuler).
   *  Voir src/lib/rendezvousReminders.ts. */
  rappelResendIdAdmin?:  string | null;
  rappelResendIdClient?: string | null;
  /** date/heure de la rencontre au moment où le rappel a été programmé —
   *  sert à détecter une modification manuelle depuis (voir reconcilierRappels). */
  rappelPourDate?:  string | null;
  rappelPourHeure?: string | null;
}
