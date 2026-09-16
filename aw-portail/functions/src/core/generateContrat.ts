/**
 * generateContrat — callable v2, région northamerica-northeast1.
 *
 * Remis dans le dépôt le 2026-09-15 (le code tournait en production sans
 * être versionné — récupéré depuis la console). Comportement conservé à
 * l'identique pour tous les clients existants : mêmes variables, même choix
 * de gabarit Essentiel/Prestige, même sortie (HTML dans Storage + champ
 * clients/{clientId}.contrat). Trois ajouts, actifs seulement quand les
 * champs correspondants existent sur le document client :
 *   - gabaritContrat : force un gabarit dédié (templates/contrats/contrat-{gabaritContrat}-template.html)
 *     au lieu du choix Essentiel/Prestige habituel.
 *   - nomLegal : utilisé pour {{nom_legal_client}} à la place de `nom` (qui
 *     reste inchangé — affiché partout ailleurs dans le portail).
 *   - dateEntreeVigueur : fige {{date_entree_vigueur}} à cette date au lieu
 *     de la date du clic.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync } from "fs";
import { resolve } from "path";

const BUCKET_NAME = "aw-portail.firebasestorage.app";

interface ContratClientDoc {
  nom?: string;
  nomLegal?: string;
  adresse?: string;
  neq?: string;
  contact?: string;
  titreContact?: string;
  succursales?: number;
  prixParSuccursale?: number | string;
  montantMensuel?: number | string;
  forfait?: string;
  gabaritContrat?: string;
  dateEntreeVigueur?: FirebaseFirestore.Timestamp;
}

interface ContratTemplateData {
  nom_legal_client: string;
  adresse_client: string;
  neq_client: string;
  nom_representant: string;
  titre_representant: string;
  nombre_succursales: number;
  prix_par_succursale: number | string;
  prix_total_mensuel: number | string;
  date_entree_vigueur: string;
  date_signature_aw: string;
  signature_aw_base64?: string;
}

function formatDateFr(date: Date): string {
  return date.toLocaleDateString("fr-CA", {
    day:   "numeric",
    month: "long",
    year:  "numeric",
  });
}

// {{date_entree_vigueur}} : "1er octobre 2026" plutôt que "1 octobre 2026".
function formatDateFrOrdinal(date: Date): string {
  const formatted = formatDateFr(date);
  return date.getDate() === 1 ? formatted.replace(/^1\b/, "1er") : formatted;
}

function loadTemplate(forfait: string | undefined, gabaritContrat: string | undefined): string {
  const name = gabaritContrat
    ? `contrat-${gabaritContrat}-template.html`
    : forfait === "Prestige"
      ? "contrat-prestige-template.html"
      : "contrat-essentiel-template.html";
  return readFileSync(resolve(__dirname, "..", "templates", "contrats", name), "utf-8");
}

function fillTemplate(html: string, data: ContratTemplateData): string {
  const sigImg = data.signature_aw_base64
    ? `<img src="data:image/png;base64,${data.signature_aw_base64}" style="height:90px;max-width:260px;object-fit:contain;display:block;margin-bottom:2px;">`
    : "";
  return html
    .replace(/\{\{nom_legal_client\}\}/g,    data.nom_legal_client    ?? "")
    .replace(/\{\{adresse_client\}\}/g,      data.adresse_client      ?? "")
    .replace(/\{\{neq_client\}\}/g,          data.neq_client          ?? "")
    .replace(/\{\{nom_representant\}\}/g,    data.nom_representant    ?? "")
    .replace(/\{\{titre_representant\}\}/g,  data.titre_representant  ?? "")
    .replace(/\{\{nombre_succursales\}\}/g,  String(data.nombre_succursales ?? 1))
    .replace(/\{\{prix_par_succursale\}\}/g, String(data.prix_par_succursale ?? ""))
    .replace(/\{\{prix_total_mensuel\}\}/g,  String(data.prix_total_mensuel ?? ""))
    .replace(/\{\{date_entree_vigueur\}\}/g, data.date_entree_vigueur  ?? "")
    .replace(/\{\{date_signature_aw\}\}/g,   data.date_signature_aw   ?? "")
    .replace(/\{\{signature_aw\}\}/g,        sigImg);
}

function publicUrl(filePath: string): string {
  const encoded = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encoded}?alt=media`;
}

export const generateContrat = onCall(
  { region: "northamerica-northeast1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentification requise.");

    const clientId = request.data?.clientId as string | undefined;
    if (!clientId) throw new HttpsError("invalid-argument", "clientId manquant.");

    const db = getFirestore();
    const storage = getStorage();

    const snap = await db.collection("clients").doc(clientId).get();
    if (!snap.exists) throw new HttpsError("not-found", `Client ${clientId} introuvable.`);

    const c = snap.data() as ContratClientDoc;
    const now = new Date();

    const dateEntreeVigueur = c.dateEntreeVigueur
      ? formatDateFrOrdinal(c.dateEntreeVigueur.toDate())
      : formatDateFrOrdinal(now);

    const data: ContratTemplateData = {
      nom_legal_client:    c.nomLegal          ?? c.nom ?? "",
      adresse_client:      c.adresse           ?? "",
      neq_client:          c.neq               ?? "",
      nom_representant:    c.contact           ?? "",
      titre_representant:  c.titreContact      ?? "",
      nombre_succursales:  c.succursales       ?? 1,
      prix_par_succursale: c.prixParSuccursale ?? "",
      prix_total_mensuel:  c.montantMensuel    ?? "",
      date_entree_vigueur: dateEntreeVigueur,
      date_signature_aw:   formatDateFr(now),
    };

    // Télécharger la signature AW Solution depuis Storage
    let signature_aw_base64 = "";
    try {
      const [sigBuffer] = await storage.bucket(BUCKET_NAME).file("signature-awsolution.png").download();
      signature_aw_base64 = sigBuffer.toString("base64");
    } catch {
      // Signature non trouvée — le champ restera vide
    }

    const template = loadTemplate(c.forfait, c.gabaritContrat);
    const html     = fillTemplate(template, { ...data, signature_aw_base64 });

    const dateSuffix = now.toISOString().slice(0, 10);
    const filePath   = `contrats/${clientId}/contrat-${dateSuffix}.html`;

    const bucket = storage.bucket(BUCKET_NAME);
    const file   = bucket.file(filePath);

    await file.save(html, {
      contentType: "text/html; charset=utf-8",
    });

    const urlHTML = publicUrl(filePath);

    await db.collection("clients").doc(clientId).update({
      contrat: {
        urlHTML,
        statut:   "en_attente",
        genereLe: Timestamp.fromDate(now),
        forfait:  c.forfait ?? "Essentiel",
      },
    });

    return { urlHTML };
  },
);
