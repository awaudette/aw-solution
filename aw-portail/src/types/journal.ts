import type { Timestamp } from "firebase/firestore";

export type JournalStatut = "en_attente" | "approuve" | "refuse" | "modification_demandee";

export interface JournalEntry {
  id: string;
  titre: string;
  description: string;
  etape: string;
  images: string[];
  publishedAt: Timestamp;
  statut: JournalStatut;
  raisonClient: string | null;
  commentaireClient: string | null;
  reponseAdmin: string | null;
  lu: boolean;
  version: number;
}

export interface JournalMessage {
  id: string;
  auteur: "client" | "admin";
  message: string;
  timestamp: Timestamp;
}
