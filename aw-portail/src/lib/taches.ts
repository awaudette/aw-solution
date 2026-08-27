import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, FieldPath, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { resend } from "@/lib/resend";
import { type Portee, type Priorite } from "@/config/taches";
import type { StaffRole } from "@/lib/requireAdmin";

/** Uids du personnel (users/{uid}.role) correspondant aux rôles demandés. */
export async function getStaffUids(roles: StaffRole[]): Promise<string[]> {
  const snap = await adminDb.collection("users").where("role", "in", roles).get();
  return snap.docs.map(d => d.id);
}

/**
 * Calcule le tableau `assignes` final selon `portee`.
 * - tous_employes / tout_le_monde : toujours recalculé depuis le personnel
 *   actuel (users) — reste synchronisé si l'équipe change, ignore toute
 *   valeur fournie par l'appelant.
 * - individuel : utilise le tableau fourni, après validation que chaque uid
 *   correspond bien à un compte admin ou employé existant.
 */
export async function resolveAssignes(
  portee: Portee,
  provided: unknown
): Promise<{ assignes: string[] } | { error: string }> {
  if (portee === "tous_employes") {
    return { assignes: await getStaffUids(["employe"]) };
  }
  if (portee === "tout_le_monde") {
    return { assignes: await getStaffUids(["admin", "employe"]) };
  }

  // individuel
  if (!Array.isArray(provided) || provided.length === 0 || !provided.every(u => typeof u === "string")) {
    return { error: "assignes doit être un tableau d'uids non vide pour portee=individuel" };
  }
  const validUids = new Set(await getStaffUids(["admin", "employe"]));
  const invalid = provided.filter(u => !validUids.has(u));
  if (invalid.length > 0) {
    return { error: `uid(s) invalide(s) dans assignes : ${invalid.join(", ")}` };
  }
  return { assignes: provided };
}

/** Un admin voit/modifie tout ; un employé seulement ce qui lui est assigné ou qu'il a créé. */
export function canAccessTache(data: DocumentData, uid: string, role: StaffRole): boolean {
  if (role === "admin") return true;
  return (data.assignes ?? []).includes(uid) || data.creePar === uid;
}

function tsToIso(v: unknown): string | null {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

/**
 * Convertit un document Firestore taches/{id} en JSON sûr (Timestamp → ISO).
 * `commentairesCount` est calculé par l'appelant (requête count() séparée,
 * bien moins coûteuse qu'un fetch complet de la sous-collection) et injecté
 * ici — 0 par défaut pour les endroits qui n'en ont pas besoin.
 */
export function serializeTache(id: string, data: DocumentData, commentairesCount = 0) {
  return {
    id,
    titre: data.titre ?? "",
    description: data.description ?? null,
    assignes: (data.assignes ?? []) as string[],
    portee: data.portee,
    creePar: data.creePar,
    statut: data.statut,
    priorite: data.priorite,
    dateEcheance: tsToIso(data.dateEcheance),
    heureEcheance: data.heureEcheance === true,
    clientId: data.clientId ?? null,
    lienType: data.lienType ?? null,
    lienId: data.lienId ?? null,
    createdAt: tsToIso(data.createdAt),
    completedAt: tsToIso(data.completedAt),
    completePar: data.completePar ?? null,
    commentairesCount,
  };
}

/** Convertit un document taches/{id}/commentaires/{id} en JSON sûr. */
export function serializeCommentaire(id: string, data: DocumentData) {
  return {
    id,
    texte: data.texte ?? "",
    auteur: data.auteur,
    createdAt: tsToIso(data.createdAt),
  };
}

export type TacheAccessResult =
  | { ok: true; ref: DocumentReference; data: DocumentData }
  | { ok: false; status: 403 | 404; error: string };

/** Charge une tâche par id et vérifie que l'appelant peut la voir/agir dessus. */
export async function loadTacheForAccess(id: string, uid: string, role: StaffRole): Promise<TacheAccessResult> {
  const ref = adminDb.collection("taches").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Tâche introuvable" };
  }
  const data = snap.data()!;
  if (!canAccessTache(data, uid, role)) {
    return { ok: false, status: 403, error: "Cette tâche ne vous est pas assignée" };
  }
  return { ok: true, ref, data };
}

// ─── Notifications de tâches assignées ─────────────────────────────────────────

/**
 * Formate une date/heure d'échéance pour un courriel, toujours en heure de
 * Montréal peu importe le fuseau du serveur (souvent UTC sur Vercel) — même
 * piège que côté navigateur : ne jamais laisser le fuseau par défaut décider.
 */
function formatDateEmail(iso: string, avecHeure: boolean): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("fr-CA", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Toronto",
  });
  if (!avecHeure) return datePart;
  const heurePart = d.toLocaleTimeString("fr-CA", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto",
  });
  return `${datePart} à ${heurePart}`;
}

function tacheEmailHtml(params: {
  titre: string; description: string | null; priorite: Priorite;
  dateEcheance: string | null; heureEcheance: boolean; assignePar: string;
}): string {
  const { titre, description, priorite, dateEcheance, heureEcheance, assignePar } = params;
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:36px 24px;color:#1F2937">
      <div style="margin-bottom:24px">
        <span style="background:#0362E3;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px">AW Solution</span>
      </div>
      <h2 style="font-size:20px;font-weight:700;margin:0 0 10px;color:#0A0A0A">Nouvelle tâche assignée</h2>
      <p style="font-size:14px;color:#6B7280;margin:0 0 20px;line-height:1.6">
        <strong>${assignePar}</strong> vous a assigné une tâche dans « À faire ».
      </p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <p style="font-size:15px;font-weight:600;color:#0A0A0A;margin:0 0 8px">${titre}</p>
        ${description ? `<p style="font-size:13px;color:#6B7280;margin:0 0 8px;white-space:pre-wrap">${description}</p>` : ""}
        ${priorite === "urgente" ? `<p style="font-size:12px;color:#DC2626;font-weight:700;margin:0 0 4px">Priorité urgente</p>` : ""}
        ${dateEcheance ? `<p style="font-size:12px;color:#6B7280;margin:0">Échéance : ${formatDateEmail(dateEcheance, heureEcheance)}</p>` : ""}
      </div>
      <a href="https://portail.awsolution.ca/admin/a-faire"
         style="display:inline-block;background:#0362E3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600">
        Voir la tâche →
      </a>
    </div>
  `;
}

/**
 * Notifie (portail + courriel) chaque uid de `recipientUids` qu'une tâche
 * lui a été assignée. N'échoue jamais et ne fait jamais échouer l'appelant —
 * chaque destinataire est traité indépendamment, toute erreur est journalisée
 * côté serveur (console.error) et avalée. À appeler après l'écriture
 * principale de la tâche (création, ou modification qui ajoute des assignés).
 */
export async function notifyStaffOfTache(params: {
  tacheId: string;
  titre: string;
  description: string | null;
  priorite: Priorite;
  dateEcheance: string | null;
  heureEcheance: boolean;
  clientId: string | null;
  actorUid: string;
  recipientUids: string[];
}): Promise<void> {
  const recipients = params.recipientUids.filter(uid => uid !== params.actorUid);
  if (recipients.length === 0) return;

  try {
    const [actorSnap, clientSnap, recipientsSnap] = await Promise.all([
      adminDb.collection("users").doc(params.actorUid).get(),
      params.clientId ? adminDb.collection("clients").doc(params.clientId).get() : Promise.resolve(null),
      adminDb.collection("users").where(FieldPath.documentId(), "in", recipients).get(),
    ]);

    const actorData = actorSnap.data();
    const assignePar = actorData
      ? (`${actorData.prenom ?? ""} ${actorData.nom ?? ""}`.trim() || actorData.courriel || "Un membre de l'équipe")
      : "Un membre de l'équipe";
    const clientNom = clientSnap?.exists ? (clientSnap.data()?.nom ?? "") : "";

    const description = `Nouvelle tâche assignée : « ${params.titre} »`;
    const lien = `/admin/a-faire?tacheId=${params.tacheId}`;

    const usersById = new Map(recipientsSnap.docs.map(d => [d.id, d.data()]));

    await Promise.all(recipients.map(async (uid) => {
      // Chaque destinataire est isolé — l'échec de l'un ne doit jamais
      // empêcher les autres ni remonter à l'appelant.
      try {
        const notifDoc = {
          type: "tache_assignee",
          destinataire: "admin" as const,
          destinataireUid: uid,
          clientId: params.clientId,
          clientNom,
          auteurRole: "admin" as const,
          description,
          lien,
          date: FieldValue.serverTimestamp(),
          lu: false,
          actionRequise: false,
          actionCompletee: false,
        };

        if (params.clientId) {
          await adminDb.collection("clients").doc(params.clientId).collection("notifs").add(notifDoc);
        } else {
          await adminDb.collection("notifs_internes").add(notifDoc);
        }
      } catch (err) {
        console.error("[notifyStaffOfTache] échec écriture notification", uid, err);
      }

      try {
        const courriel = usersById.get(uid)?.courriel;
        if (courriel) {
          await resend.emails.send({
            from: "AW Solution <noreply@awsolution.ca>",
            to: courriel,
            subject: `Nouvelle tâche assignée — ${params.titre}`,
            html: tacheEmailHtml({
              titre: params.titre,
              description: params.description,
              priorite: params.priorite,
              dateEcheance: params.dateEcheance,
              heureEcheance: params.heureEcheance,
              assignePar,
            }),
          });
        }
      } catch (err) {
        console.error("[notifyStaffOfTache] échec envoi courriel", uid, err);
      }
    }));
  } catch (err) {
    // Échec des lectures préparatoires (users/clients) — journalisé, jamais propagé.
    console.error("[notifyStaffOfTache] échec général", err);
  }
}
