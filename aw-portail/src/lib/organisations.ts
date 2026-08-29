import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, type DocumentData, type DocumentReference } from "firebase-admin/firestore";
import { ETAPE_DATE_FIELD, ETAPE_LABELS, type Etape } from "@/config/organisations";
import type { StaffRole } from "@/lib/requireAdmin";
import { getStaffUids } from "@/lib/taches";

function tsToIso(v: unknown): string | null {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

/** Convertit un document Firestore organisations/{id} en JSON sûr (Timestamp → ISO). */
export function serializeOrganisation(id: string, data: DocumentData) {
  return {
    id,
    nom: data.nom ?? "",
    secteur: data.secteur ?? null,
    siteWeb: data.siteWeb ?? null,
    adresse: data.adresse ?? null,
    nombreSuccursales: data.nombreSuccursales ?? 1,
    groupeId: data.groupeId ?? null,
    etape: data.etape,
    proprietaire: data.proprietaire,
    source: data.source ?? null,
    forfaitPressenti: data.forfaitPressenti ?? null,
    valeurMensuelleEstimee: data.valeurMensuelleEstimee ?? null,
    concurrentEnPlace: data.concurrentEnPlace ?? null,
    prochaineAction: data.prochaineAction ?? null,
    dateProchaineAction: tsToIso(data.dateProchaineAction),
    datePremierContact: tsToIso(data.datePremierContact),
    dateDemo: tsToIso(data.dateDemo),
    datePropositionEnvoyee: tsToIso(data.datePropositionEnvoyee),
    dateSignature: tsToIso(data.dateSignature),
    dateLancement: tsToIso(data.dateLancement),
    dateChurn: tsToIso(data.dateChurn),
    motifPerte: data.motifPerte ?? null,
    motifPerteDetail: data.motifPerteDetail ?? null,
    recuperable: data.recuperable ?? null,
    dateRelanceSuggeree: tsToIso(data.dateRelanceSuggeree),
    clientId: data.clientId ?? null,
    derniereInteraction: tsToIso(data.derniereInteraction),
    createdAt: tsToIso(data.createdAt),
    createdBy: data.createdBy,
  };
}

/** Convertit un document organisations/{id}/contacts/{id} en JSON sûr. */
export function serializeContact(id: string, data: DocumentData) {
  return {
    id,
    prenom: data.prenom ?? "",
    nom: data.nom ?? "",
    role: data.role ?? null,
    courriel: data.courriel ?? null,
    telephone: data.telephone ?? null,
    cellulaire: data.cellulaire ?? null,
    estDecideur: data.estDecideur === true,
    notes: data.notes ?? null,
    createdAt: tsToIso(data.createdAt),
  };
}

/** Convertit un document organisations/{id}/interactions/{id} en JSON sûr. */
export function serializeInteraction(id: string, data: DocumentData) {
  return {
    id,
    type: data.type,
    date: tsToIso(data.date),
    auteur: data.auteur,
    texte: data.texte ?? "",
    reaction: data.reaction ?? null,
    automatique: data.automatique === true,
  };
}

/** Un admin voit/modifie tout ; un employé seulement les dossiers dont il est propriétaire. */
export function canAccessOrganisation(data: DocumentData, uid: string, role: StaffRole): boolean {
  if (role === "admin") return true;
  return data.proprietaire === uid;
}

export type OrgAccessResult =
  | { ok: true; ref: DocumentReference; data: DocumentData }
  | { ok: false; status: 403 | 404; error: string };

/** Charge un dossier par id et vérifie que l'appelant peut le voir/agir dessus. */
export async function loadOrganisationForAccess(id: string, uid: string, role: StaffRole): Promise<OrgAccessResult> {
  const ref = adminDb.collection("organisations").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Dossier introuvable" };
  }
  const data = snap.data()!;
  if (!canAccessOrganisation(data, uid, role)) {
    return { ok: false, status: 403, error: "Ce dossier ne vous est pas assigné" };
  }
  return { ok: true, ref, data };
}

/** Valide qu'un uid correspond bien à un compte admin ou employé existant. */
export async function isValidStaffUid(uid: string): Promise<boolean> {
  const uids = await getStaffUids(["admin", "employe"]);
  return uids.includes(uid);
}

/**
 * Calcule les champs de date à auto-remplir pour un passage à `nouvelleEtape`.
 * Ne renvoie que le champ correspondant à cette étape (s'il y en a un), et
 * seulement s'il est encore vide dans `donneesActuelles` et n'a pas été
 * fourni explicitement dans la même requête — l'appelant reste toujours
 * prioritaire, et une date déjà posée n'est jamais réécrite silencieusement.
 */
export function computeAutoDates(
  nouvelleEtape: Etape,
  donneesActuelles: DocumentData,
  champsExplicites: Set<string>
): Record<string, Timestamp> {
  const champ = ETAPE_DATE_FIELD[nouvelleEtape];
  if (!champ) return {};
  if (champsExplicites.has(champ)) return {};
  if (donneesActuelles[champ]) return {};
  return { [champ]: Timestamp.now() };
}

/** Nom affichable d'un membre du personnel, résolu côté serveur pour figer un texte lisible dans la timeline. */
async function resolveStaffLabel(uid: string): Promise<string> {
  const snap = await adminDb.collection("users").doc(uid).get();
  const data = snap.data();
  if (!data) return uid;
  return `${data.prenom ?? ""} ${data.nom ?? ""}`.trim() || data.courriel || uid;
}

/**
 * Ajoute une interaction (manuelle ou automatique) et met à jour
 * derniereInteraction sur le dossier parent en une seule opération atomique
 * — c'est le seul chemin d'écriture des interactions, pour garantir que ce
 * champ reste toujours cohérent avec la sous-collection.
 *
 * derniereInteraction n'avance que si la date de cette interaction est plus
 * récente que la valeur actuelle — nécessaire depuis qu'une interaction peut
 * être datée rétroactivement : la logger ne doit jamais faire reculer
 * artificiellement "depuis quand ce dossier est dormant".
 */
export async function addInteractionAndTouch(
  orgRef: DocumentReference,
  interaction: {
    type: string;
    date: Timestamp;
    auteur: string;
    texte: string;
    reaction: string | null;
    automatique: boolean;
  },
  currentDerniereInteraction: Timestamp | null
): Promise<string> {
  const batch = adminDb.batch();
  const interactionRef = orgRef.collection("interactions").doc();
  batch.set(interactionRef, interaction);
  if (!currentDerniereInteraction || interaction.date.toMillis() > currentDerniereInteraction.toMillis()) {
    batch.update(orgRef, { derniereInteraction: interaction.date });
  }
  await batch.commit();
  return interactionRef.id;
}

/**
 * Crée l'entrée automatique dans interactions lors d'un changement d'étape.
 * type "note" (réutilisation de la valeur existante, pas de 8e type inventé),
 * automatique: true pour que l'interface puisse un jour l'afficher différemment.
 * Libellés lisibles résolus ici (pas de slug technique dans le texte).
 */
export async function logChangementEtape(
  orgRef: DocumentReference,
  ancienneEtape: Etape,
  nouvelleEtape: Etape,
  auteur: string,
  currentDerniereInteraction: Timestamp | null
): Promise<void> {
  await addInteractionAndTouch(orgRef, {
    type: "note",
    date: Timestamp.now(),
    auteur,
    texte: `Étape changée : ${ETAPE_LABELS[ancienneEtape]} → ${ETAPE_LABELS[nouvelleEtape]}`,
    reaction: null,
    automatique: true,
  }, currentDerniereInteraction);
}

/**
 * Crée l'entrée automatique dans interactions lors d'une réattribution de
 * propriétaire — réservée à l'admin côté route, journalisée ici.
 */
export async function logChangementProprietaire(
  orgRef: DocumentReference,
  ancienUid: string,
  nouvelUid: string,
  auteur: string,
  currentDerniereInteraction: Timestamp | null
): Promise<void> {
  const [ancienLabel, nouveauLabel] = await Promise.all([
    resolveStaffLabel(ancienUid),
    resolveStaffLabel(nouvelUid),
  ]);
  await addInteractionAndTouch(orgRef, {
    type: "note",
    date: Timestamp.now(),
    auteur,
    texte: `Dossier réattribué : ${ancienLabel} → ${nouveauLabel}`,
    reaction: null,
    automatique: true,
  }, currentDerniereInteraction);
}
