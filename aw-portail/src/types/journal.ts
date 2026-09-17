import type { Timestamp } from "firebase/firestore";
import type { FichierJoint } from "@/lib/attachments";

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
  /** Fichiers joints par le client à sa demande de modification (voir raisonClient). */
  raisonClientFichiers?: FichierJoint[];
  commentaireClient: string | null;
  reponseAdmin: string | null;
  lu: boolean;
  version: number;
  /**
   * Vrai une fois qu'un admin a cliqué le ✓ "vu" sur une entrée refusée/en
   * modification demandée — ne change ni le statut ni son étiquette, sert
   * uniquement à retirer l'entrée des compteurs "à traiter" (voir Partie 6).
   * Remis à false par le client à chaque nouveau refus/demande de
   * modification, et sans effet une fois l'entrée republiée (hors du
   * périmètre du compteur, qui ne regarde que refuse/modification_demandee).
   */
  adminVu?: boolean;
}
