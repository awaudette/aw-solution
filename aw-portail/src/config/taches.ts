// Configuration centralisée du modèle « À faire » (collection taches).

import type { Timestamp } from "firebase/firestore";

export const PORTEE_VALUES = ["individuel", "tous_employes", "tout_le_monde"] as const;
export type Portee = (typeof PORTEE_VALUES)[number];

export const STATUT_VALUES = ["a_faire", "en_cours", "complete"] as const;
export type Statut = (typeof STATUT_VALUES)[number];

export const PRIORITE_VALUES = ["normale", "urgente"] as const;
export type Priorite = (typeof PRIORITE_VALUES)[number];

export interface Commentaire {
  id: string;
  texte: string;
  auteur: string; // uid
  createdAt: Timestamp;
}

export interface Tache {
  id: string;
  titre: string;
  description: string | null;
  assignes: string[]; // uids — calculé côté serveur selon portee (voir src/lib/taches.ts)
  portee: Portee;
  creePar: string; // uid
  statut: Statut;
  priorite: Priorite;
  dateEcheance: Timestamp | null;
  heureEcheance: boolean; // l'heure de dateEcheance est-elle significative ?
  clientId: string | null;
  lienType: string | null;
  lienId: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  completePar: string | null; // uid
}

// ─── Formes sérialisées (JSON renvoyé par /api/admin/taches — dates en ISO) ────

export interface CommentaireDTO extends Omit<Commentaire, "createdAt"> {
  createdAt: string | null;
}

export interface TacheDTO extends Omit<Tache, "dateEcheance" | "createdAt" | "completedAt"> {
  dateEcheance: string | null;
  createdAt: string | null;
  completedAt: string | null;
  /** Nombre de commentaires — calculé côté serveur, évite une requête par tâche. */
  commentairesCount: number;
}
