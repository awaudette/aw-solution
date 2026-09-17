/**
 * attachments.ts — Pièces jointes partagées (Messagerie + demandes de
 * modification du journal).
 *
 * Tout type de fichier, aucune limite de nombre, 25 Mo maximum par fichier.
 * Stockage sous clients/{clientId}/fichiers-joints/... (voir storage.rules) —
 * le champ customMetadata.uploaderUid posé au téléversement est la source de
 * vérité pour l'autorisation de suppression (règle Storage), indépendamment
 * de ce qui est écrit côté Firestore.
 */

import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

export const MAX_FICHIER_TAILLE = 25 * 1024 * 1024; // 25 Mo

export interface FichierJoint {
  nom: string;
  url: string;
  type: string;
  taille: number;
  storagePath: string;
  uploaderUid: string;
}

/**
 * Valide (taille) et téléverse une liste de fichiers déjà retenus (le tri
 * "trop volumineux" se fait normalement avant, au moment de la sélection —
 * voir FichierPicker) sous le préfixe donné.
 */
export async function uploaderFichiersJoints(
  files: File[],
  storagePathPrefix: string, // ex: `clients/${clientId}/fichiers-joints/messages`
): Promise<{ fichiers: FichierJoint[]; erreurs: string[] }> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { fichiers: [], erreurs: ["Utilisateur non authentifié."] };

  const fichiers: FichierJoint[] = [];
  const erreurs: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FICHIER_TAILLE) {
      erreurs.push(`« ${file.name} » dépasse la taille maximale de 25 Mo.`);
      continue;
    }
    try {
      const path = `${storagePathPrefix}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const snap = await uploadBytes(sRef, file, { customMetadata: { uploaderUid: uid } });
      const url  = await getDownloadURL(snap.ref);
      fichiers.push({
        nom: file.name, url, type: file.type || "application/octet-stream",
        taille: file.size, storagePath: path, uploaderUid: uid,
      });
    } catch {
      erreurs.push(`Échec du téléversement de « ${file.name} ».`);
    }
  }
  return { fichiers, erreurs };
}

/**
 * Supprime un fichier joint de Storage. La règle storage.rules vérifie
 * l'autorisation réelle (auteur du fichier ou admin) — un appel non autorisé
 * échoue côté serveur même si l'UI qui l'a déclenché a été contournée.
 */
export async function supprimerFichierJoint(storagePath: string): Promise<void> {
  await deleteObject(storageRef(storage, storagePath));
}
