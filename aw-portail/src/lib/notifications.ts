/**
 * notifications.ts — Système unifié de notifications AW Solution
 *
 * Remplace admin_config/global/alertes + clients/{id}/activite
 * par la sous-collection clients/{clientId}/notifs.
 *
 * Structure Firestore :
 *   clients/{clientId}/notifs/{id} {
 *     type, destinataire, clientId, clientNom, auteurRole,
 *     description, lien, date, lu, actionRequise, actionCompletee
 *   }
 *
 * Note : utiliser une sous-collection couverte par les règles existantes
 * évite d'avoir à ajouter une règle pour la collection notifications top-level.
 */

import {
  addDoc, collection, doc, updateDoc, Timestamp,
  getDocs, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotificationInput {
  /** Ex: "nouveau_message", "branding_complet", "contrat_signe" … */
  type: string;
  /** Qui reçoit la notification */
  destinataire: "admin" | "client";
  clientId: string;
  clientNom: string;
  /** Qui a posé l'action (n'est jamais notifié lui-même) */
  auteurRole: "admin" | "client";
  /** Texte affiché dans la notification */
  description: string;
  /** Chemin de redirection au clic "Voir" (ex: "/admin/clients/abc?tab=support") */
  lien: string;
  /** Vrai = le ✓ est désactivé tant que actionCompletee est false */
  actionRequise?: boolean;
}

export interface NotificationDoc {
  id: string;
  type: string;
  destinataire: "admin" | "client";
  clientId: string;
  clientNom: string;
  auteurRole: "admin" | "client";
  description: string;
  lien: string;
  date: Date | null;
  lu: boolean;
  actionRequise: boolean;
  actionCompletee: boolean;
}

// ─── Helpers privés ──────────────────────────────────────────────────────────

/** Chemin de la sous-collection de notifications d'un client. */
function notifCol(clientId: string) {
  return collection(db, "clients", clientId, "notifs");
}

async function writeOne(
  input: NotificationInput & { destinataire: "admin" | "client" },
  now: Timestamp,
): Promise<void> {
  await addDoc(notifCol(input.clientId), {
    type:             input.type,
    destinataire:     input.destinataire,
    clientId:         input.clientId,
    clientNom:        input.clientNom,
    auteurRole:       input.auteurRole,
    description:      input.description,
    lien:             input.lien,
    date:             now,
    lu:               false,
    actionRequise:    input.actionRequise ?? false,
    actionCompletee:  false,
  });

  // Auto-message dans la messagerie client pour les actions requises côté client
  if (input.destinataire === "client" && input.actionRequise) {
    await addDoc(collection(db, "clients", input.clientId, "messages"), {
      texte:      `${input.description} — Voir : ${input.lien}`,
      auteur:     "AW Solution",
      auteurRole: "admin",
      date:       now,
      lu:         false,
    });
  }
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Crée une notification dans la collection /notifications.
 * Si destinataire=="client" && actionRequise, crée aussi un message dans
 * clients/{clientId}/messages pour que le client le voie dans son support.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  const now = Timestamp.now();
  await writeOne(input as NotificationInput & { destinataire: "admin" | "client" }, now);
}

/**
 * Crée deux notifications (admin + client) avec des paramètres potentiellement
 * différents (ex: actionRequise peut varier par destinataire).
 */
export async function createDualNotification(
  admin: Omit<NotificationInput, "destinataire">,
  client: Omit<NotificationInput, "destinataire">,
): Promise<void> {
  const now = Timestamp.now();
  await Promise.all([
    writeOne({ ...admin,  destinataire: "admin"  }, now),
    writeOne({ ...client, destinataire: "client" }, now),
  ]);
}

/**
 * Marque une notification comme lue (et la retire de la vue "non lus").
 * Requiert clientId car les notifications sont stockées sous clients/{clientId}/notifs.
 */
export async function markNotificationRead(notifId: string, clientId: string): Promise<void> {
  await updateDoc(doc(db, "clients", clientId, "notifs", notifId), { lu: true });
}

/**
 * Marque l'action comme complétée + la notification comme lue.
 * Requiert clientId car les notifications sont stockées sous clients/{clientId}/notifs.
 */
export async function markActionDone(notifId: string, clientId: string): Promise<void> {
  await updateDoc(doc(db, "clients", clientId, "notifs", notifId), {
    actionCompletee: true,
    lu:              true,
  });
}

/**
 * Marque automatiquement toutes les notifications d'un type donné pour un client
 * comme `actionCompletee: true`.
 *
 * Usage : appeler quand une action requise est complétée côté UI (ex: client répond
 * au journal → marque la notification `nouveau_rapport` comme résolue).
 *
 * Utilise une seule clause where (clientId) pour éviter les index composés.
 * Le filtrage sur type et destinataire se fait en JS.
 */
export async function markActionCompleteFor(params: {
  clientId:     string;
  type:         string;
  destinataire?: "admin" | "client";
}): Promise<void> {
  // Lecture directe de la sous-collection du client — pas de where() composé,
  // filtrage en JS pour éviter tout problème d'index Firestore.
  const snap = await getDocs(notifCol(params.clientId));
  const toUpdate = snap.docs.filter((d) => {
    const data = d.data();
    return (
      data.type === params.type &&
      !data.actionCompletee &&
      (!params.destinataire || data.destinataire === params.destinataire)
    );
  });
  if (toUpdate.length === 0) return;
  const batch = writeBatch(db);
  toUpdate.forEach((d) => batch.update(d.ref, { actionCompletee: true }));
  await batch.commit();
}

// ─── Config d'affichage par type ──────────────────────────────────────────────

export interface NotifStyle {
  emoji: string;
  bg: string;
  border: string;
  text: string;
  label: string;
}

export const NOTIF_STYLE: Record<string, NotifStyle> = {
  // Messages
  nouveau_message:     { emoji: "💬", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Message" },

  // Support
  demande_support:     { emoji: "🆘", bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", label: "Support" },
  demande_rencontre:   { emoji: "📅", bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6", label: "Rencontre" },

  // Contrat & paiement
  contrat_signe:            { emoji: "✍️", bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", label: "Contrat" },
  contrat_non_signe_7j:     { emoji: "⚠️", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", label: "Contrat" },
  paiement_configure:       { emoji: "💳", bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", label: "Paiement" },
  paiement_refuse:          { emoji: "🔴", bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", label: "Paiement" },
  paiement_non_configure_14j: { emoji: "⚠️", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", label: "Paiement" },
  renouvellement_60j:       { emoji: "📆", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Renouvellement" },
  upsell_demande:           { emoji: "⭐", bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6", label: "Upsell" },

  // Branding
  branding_section:    { emoji: "🎨", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Branding" },
  branding_complet:    { emoji: "🎨", bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", label: "Branding" },
  profil_mis_a_jour:   { emoji: "👥", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Branding" },
  fichier_depose:      { emoji: "📎", bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6", label: "Fichier" },
  document_depose:     { emoji: "📄", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Document" },

  // Roadmap
  etape_completee:     { emoji: "✅", bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", label: "Roadmap" },
  etape_bloquee:       { emoji: "🚧", bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", label: "Roadmap" },
  roadmap_update:      { emoji: "🗺️", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Roadmap" },

  // Journal
  nouveau_rapport:     { emoji: "📝", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Journal" },
  journal_approuve:    { emoji: "✅", bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", label: "Journal" },
  journal_refuse:      { emoji: "❌", bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", label: "Journal" },
  journal_modification:{ emoji: "✏️", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", label: "Journal" },
  journal_reponse:     { emoji: "💬", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Journal" },

  // Calendrier
  nouveau_rendez_vous:     { emoji: "🗓️", bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", label: "Calendrier" },
  rendez_vous_confirme:    { emoji: "📅", bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", label: "Calendrier" },
  rappel_rencontre_2h:     { emoji: "⏰", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "Rappel" },

  // Rencontre mensuelle (support)
  creneau_accepte:     { emoji: "✅", bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", label: "Rencontre" },
  creneau_refuse:      { emoji: "📆", bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", label: "Rencontre" },
};

export function getNotifStyle(type: string): NotifStyle {
  return NOTIF_STYLE[type] ?? {
    emoji: "🔔", bg: "#F9FAFB", border: "#E5E7EB", text: "#374151", label: type,
  };
}
