import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, FieldPath, Timestamp, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { resend } from "@/lib/resend";
import { PORTEE_VALUES, PRIORITE_VALUES, type Portee, type Priorite } from "@/config/taches";
import type { StaffRole } from "@/lib/requireAdmin";
import { aujourdhuiMontreal, finDeJourneeMontreal } from "@/lib/tz";

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

// ─── Création / modification centralisées des tâches ───────────────────────────

export interface CreateTacheInput {
  titre: string;
  description?: string | null;
  portee: Portee;
  /** Ignoré si portee !== "individuel" (resolveAssignes recalcule alors depuis le personnel actuel). */
  assignes?: unknown;
  priorite?: Priorite;
  dateEcheance?: string | null; // ISO
  heureEcheance?: boolean;
  clientId?: string | null;
  lienType?: string | null;
  lienId?: string | null;
  /** uid de l'auteur — aussi utilisé comme actorUid pour exclure ce créateur de ses propres notifications. */
  creePar: string;
}

export type CreateTacheResult =
  | { ok: true; id: string }
  | { ok: false; status: 400; error: string };

/**
 * Crée une tâche et notifie ses assignés — logique unique partagée par la
 * route POST /api/admin/taches et par toute création automatique (ex. tâche
 * de relance créée depuis le CRM) afin d'éviter un appel HTTP interne.
 */
export async function createTacheRecord(input: CreateTacheInput): Promise<CreateTacheResult> {
  const titre = input.titre?.trim();
  if (!titre) return { ok: false, status: 400, error: "titre requis" };
  if (!input.portee || !PORTEE_VALUES.includes(input.portee)) {
    return { ok: false, status: 400, error: "portee invalide" };
  }
  const finalPriorite: Priorite = input.priorite && PRIORITE_VALUES.includes(input.priorite) ? input.priorite : "normale";

  const resolved = await resolveAssignes(input.portee, input.assignes);
  if ("error" in resolved) {
    return { ok: false, status: 400, error: resolved.error };
  }

  let dateEcheanceTs: Timestamp | null = null;
  if (input.dateEcheance) {
    const d = new Date(input.dateEcheance);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, status: 400, error: "dateEcheance invalide" };
    }
    dateEcheanceTs = Timestamp.fromDate(d);
  }

  const finalClientId = input.clientId || null;
  const finalDescription = (input.description ?? "").trim() || null;
  const docRef = await adminDb.collection("taches").add({
    titre,
    description: finalDescription,
    assignes: resolved.assignes,
    portee: input.portee,
    creePar: input.creePar,
    statut: "a_faire",
    priorite: finalPriorite,
    dateEcheance: dateEcheanceTs,
    heureEcheance: input.heureEcheance === true,
    clientId: finalClientId,
    lienType: input.lienType || null,
    lienId: input.lienId || null,
    createdAt: Timestamp.now(),
    completedAt: null,
    completePar: null,
  });

  // Notification + courriel — ne doit jamais faire échouer la création elle-même.
  try {
    await notifyStaffOfTache({
      tacheId: docRef.id,
      titre,
      description: finalDescription,
      priorite: finalPriorite,
      dateEcheance: dateEcheanceTs ? dateEcheanceTs.toDate().toISOString() : null,
      heureEcheance: input.heureEcheance === true,
      clientId: finalClientId,
      actorUid: input.creePar,
      recipientUids: resolved.assignes,
    });
  } catch (err) {
    console.error("[createTacheRecord] notification échouée", err);
  }

  return { ok: true, id: docRef.id };
}

/**
 * Met à jour uniquement l'échéance d'une tâche existante — utilisé quand une
 * date de relance est modifiée sur un dossier CRM, pour éviter de dupliquer
 * la tâche de relance déjà créée.
 */
export async function updateTacheDateEcheance(tacheId: string, dateEcheanceIso: string | null): Promise<void> {
  const dateEcheance = dateEcheanceIso ? Timestamp.fromDate(new Date(dateEcheanceIso)) : null;
  await adminDb.collection("taches").doc(tacheId).update({ dateEcheance });
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

// ─── Résumé quotidien des échéances (cron 8h) ────────────────────────────────

function digestEcheanceHtml(taches: DocumentData[]): string {
  const triees = [...taches].sort((a, b) => {
    const ta = a.dateEcheance instanceof Timestamp ? a.dateEcheance.toMillis() : 0;
    const tb = b.dateEcheance instanceof Timestamp ? b.dateEcheance.toMillis() : 0;
    return ta - tb; // plus en retard d'abord
  });

  const lignes = triees.map((t) => {
    const echeanceIso = t.dateEcheance instanceof Timestamp ? t.dateEcheance.toDate().toISOString() : null;
    return `
      <div style="padding:10px 0;border-bottom:1px solid #F3F4F6">
        <p style="font-size:14px;font-weight:600;color:#0A0A0A;margin:0 0 4px">
          ${t.titre ?? ""}${t.priorite === "urgente" ? ` <span style="color:#DC2626;font-size:11px;font-weight:700">· URGENTE</span>` : ""}
        </p>
        ${echeanceIso ? `<p style="font-size:12px;color:#6B7280;margin:0">Échéance : ${formatDateEmail(echeanceIso, t.heureEcheance === true)}</p>` : ""}
      </div>`;
  }).join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:36px 24px;color:#1F2937">
      <div style="margin-bottom:24px">
        <span style="background:#0362E3;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px">AW Solution</span>
      </div>
      <h2 style="font-size:20px;font-weight:700;margin:0 0 10px;color:#0A0A0A">Tâches en retard ou dues aujourd'hui</h2>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:4px 20px;margin-bottom:24px">
        ${lignes}
      </div>
      <a href="https://portail.awsolution.ca/admin/a-faire"
         style="display:inline-block;background:#0362E3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:14px;font-weight:600">
        Voir mes tâches →
      </a>
    </div>
  `;
}

export interface DigestEcheancesResult { courriels: number; taches: number; errors: string[] }

/**
 * Résumé quotidien des tâches en retard/dues aujourd'hui — un seul courriel
 * par personne assignée (pas un par tâche), envoyé immédiatement par le cron
 * de 8h (pas de scheduledAt : on est déjà à l'heure voulue).
 *
 * Filtre uniquement sur `statut in [...]` côté Firestore : combiner un `in`/
 * `!=` sur `statut` avec un range (`<=`) sur `dateEcheance` (champ différent)
 * est refusé par Firestore (les filtres d'inégalité d'une requête composée
 * doivent porter sur le même champ) — la comparaison à l'échéance se fait
 * donc en mémoire, ce qui est sans conséquence vu le faible volume de tâches.
 */
export async function sendEcheanceDigest(): Promise<DigestEcheancesResult> {
  const errors: string[] = [];
  const cutoff = finDeJourneeMontreal(aujourdhuiMontreal());

  const snap = await adminDb.collection("taches")
    .where("statut", "in", ["a_faire", "en_cours"])
    .get();

  const enRetardParUid = new Map<string, DocumentData[]>();
  for (const doc of snap.docs) {
    const data = doc.data();
    const echeance = data.dateEcheance instanceof Timestamp ? data.dateEcheance.toDate() : null;
    if (!echeance || echeance.getTime() > cutoff.getTime()) continue;
    for (const uid of (data.assignes ?? []) as string[]) {
      const liste = enRetardParUid.get(uid) ?? [];
      liste.push({ ...data, id: doc.id });
      enRetardParUid.set(uid, liste);
    }
  }

  const totalTaches = [...enRetardParUid.values()].reduce((n, l) => n + l.length, 0);
  if (enRetardParUid.size === 0) return { courriels: 0, taches: 0, errors };

  const uids = [...enRetardParUid.keys()];
  const usersSnap = await adminDb.collection("users")
    .where(FieldPath.documentId(), "in", uids)
    .get();
  const usersById = new Map(usersSnap.docs.map(d => [d.id, d.data()]));

  let courriels = 0;
  for (const [uid, taches] of enRetardParUid) {
    const courriel = usersById.get(uid)?.courriel;
    if (!courriel) continue;
    try {
      await resend.emails.send({
        from: "AW Solution <noreply@awsolution.ca>",
        to: courriel,
        subject: `📋 ${taches.length} tâche${taches.length > 1 ? "s" : ""} en retard ou due${taches.length > 1 ? "s" : ""} aujourd'hui`,
        html: digestEcheanceHtml(taches),
      });
      courriels++;
    } catch (e) {
      errors.push(`digest ${uid}: ${String(e)}`);
    }
  }

  return { courriels, taches: totalTaches, errors };
}
