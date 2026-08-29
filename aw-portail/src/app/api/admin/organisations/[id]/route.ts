import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireStaff } from "@/lib/requireAdmin";
import {
  loadOrganisationForAccess, serializeOrganisation, isValidStaffUid,
  computeAutoDates, logChangementEtape, logChangementProprietaire,
  logReactivation, upsertRelanceTache,
} from "@/lib/organisations";
import { ETAPE_VALUES, RECUPERABLE_VALUES, DATE_FIELDS, type Etape, type Recuperable } from "@/config/organisations";

// Champs texte/nombre simples — copiés tels quels s'ils sont présents dans le body.
const CHAMPS_TEXTE = [
  "secteur", "siteWeb", "adresse", "groupeId", "source", "forfaitPressenti",
  "concurrentEnPlace", "prochaineAction", "motifPerte", "motifPerteDetail", "clientId",
] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadOrganisationForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json({ organisation: serializeOrganisation(id, access.data) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadOrganisationForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { ref, data } = access;

  try {
    const body = await req.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    if (typeof body.nom === "string") {
      if (!body.nom.trim()) {
        return NextResponse.json({ error: "nom ne peut pas être vide" }, { status: 400 });
      }
      update.nom = body.nom.trim();
    }

    for (const champ of CHAMPS_TEXTE) {
      if (champ in body) update[champ] = (body[champ] as string) || null;
    }

    if ("nombreSuccursales" in body) {
      update.nombreSuccursales = typeof body.nombreSuccursales === "number" ? body.nombreSuccursales : 1;
    }
    if ("valeurMensuelleEstimee" in body) {
      update.valeurMensuelleEstimee = typeof body.valeurMensuelleEstimee === "number" ? body.valeurMensuelleEstimee : null;
    }
    if ("recuperable" in body) {
      if (body.recuperable !== null && !RECUPERABLE_VALUES.includes(body.recuperable as Recuperable)) {
        return NextResponse.json({ error: "recuperable invalide" }, { status: 400 });
      }
      update.recuperable = body.recuperable ?? null;
    }
    // Réattribution réservée à l'admin — un employé ne peut jamais changer
    // le propriétaire d'un dossier, même le sien.
    let proprietaireChange: { ancien: string; nouveau: string } | null = null;
    if ("proprietaire" in body) {
      if (auth.role !== "admin") {
        return NextResponse.json({ error: "Seul un administrateur peut réattribuer un dossier" }, { status: 403 });
      }
      if (typeof body.proprietaire !== "string" || !(await isValidStaffUid(body.proprietaire))) {
        return NextResponse.json({ error: "proprietaire invalide — doit être un uid admin ou employé existant" }, { status: 400 });
      }
      if (body.proprietaire !== data.proprietaire) {
        proprietaireChange = { ancien: data.proprietaire, nouveau: body.proprietaire };
        update.proprietaire = body.proprietaire;
      }
    }

    // Dates — toujours modifiables directement à la main, peu importe l'étape.
    const explicitDateFields = new Set<string>();
    for (const field of DATE_FIELDS) {
      if (field in body) {
        explicitDateFields.add(field);
        const raw = body[field];
        if (raw === null || raw === undefined || raw === "") {
          update[field] = null;
        } else {
          const d = new Date(raw as string);
          if (Number.isNaN(d.getTime())) {
            return NextResponse.json({ error: `${field} invalide` }, { status: 400 });
          }
          update[field] = Timestamp.fromDate(d);
        }
      }
    }

    // Étape — déclenche le remplissage auto de date + l'interaction de traçabilité.
    let etapeChangee = false;
    const ancienneEtape = data.etape as Etape;
    let nouvelleEtape: Etape = ancienneEtape;
    if ("etape" in body) {
      if (!ETAPE_VALUES.includes(body.etape as Etape)) {
        return NextResponse.json({ error: "etape invalide" }, { status: 400 });
      }
      nouvelleEtape = body.etape as Etape;
      if (nouvelleEtape !== ancienneEtape) {
        update.etape = nouvelleEtape;
        etapeChangee = true;

        // "modifiable à la main" : une date déjà explicitement fournie dans
        // cette même requête, ou déjà posée sur le document, n'est jamais
        // écrasée par le remplissage automatique.
        const donneesPourVerif = { ...data, ...update };
        Object.assign(update, computeAutoDates(nouvelleEtape, donneesPourVerif, explicitDateFields));

        // Passage à "perdu" : enregistre l'étape de départ (distingue prospect
        // vs ancien client qui annule) et la date de perte générique. dateChurn
        // n'est rempli que pour un ancien client (venait de "signe"), et
        // seulement si pas déjà fourni explicitement dans cette même requête.
        if (nouvelleEtape === "perdu") {
          update.etapeAvantPerte = ancienneEtape;
          update.dateEtapePerdu = Timestamp.now();
          if (ancienneEtape === "signe" && !explicitDateFields.has("dateChurn")) {
            update.dateChurn = Timestamp.now();
          }
        }

        // Réactivation (le dossier quitte "perdu") : efface tous les champs
        // de perte, sauf ceux déjà fournis explicitement dans cette requête.
        if (ancienneEtape === "perdu") {
          const champsPerte: Record<string, unknown> = {
            motifPerte: null, motifPerteDetail: null, recuperable: null,
            dateRelanceSuggeree: null, dateChurn: null, etapeAvantPerte: null,
            dateEtapePerdu: null, tacheRelanceId: null,
          };
          for (const [champ, valeur] of Object.entries(champsPerte)) {
            if (!(champ in update)) update[champ] = valeur;
          }
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 });
    }

    // Détermine, avant l'écriture, si une tâche de relance doit être créée ou
    // mise à jour — seulement quand dateRelanceSuggeree est explicitement
    // fournie dans cette requête (création initiale ou modification ultérieure).
    const relanceDemandee = "dateRelanceSuggeree" in update;
    const finalRecuperable = "recuperable" in update ? update.recuperable : data.recuperable;
    const finalDateRelance = update.dateRelanceSuggeree as Timestamp | null | undefined;
    const relanceEligible = relanceDemandee
      && (finalRecuperable === "oui" || finalRecuperable === "peut_etre")
      && finalDateRelance != null;
    const tacheRelanceIdActuel: string | null = "tacheRelanceId" in update
      ? (update.tacheRelanceId as string | null)
      : (data.tacheRelanceId ?? null);

    await ref.update(update);

    // derniereInteraction juste avant cette écriture — sert de référence pour
    // ne jamais faire reculer ce champ (voir addInteractionAndTouch).
    const derniereInteractionActuelle = data.derniereInteraction ?? null;

    if (etapeChangee) {
      // Ne doit jamais faire échouer la modification elle-même si ça échoue.
      try {
        await logChangementEtape(ref, ancienneEtape, nouvelleEtape, auth.uid, derniereInteractionActuelle);
      } catch (err) {
        console.error("[organisations PATCH] journalisation du changement d'étape échouée", err);
      }

      if (ancienneEtape === "perdu" && nouvelleEtape !== "perdu") {
        try {
          await logReactivation(ref, auth.uid, derniereInteractionActuelle);
        } catch (err) {
          console.error("[organisations PATCH] journalisation de la réactivation échouée", err);
        }
      }
    }

    if (proprietaireChange) {
      try {
        await logChangementProprietaire(
          ref, proprietaireChange.ancien, proprietaireChange.nouveau, auth.uid, derniereInteractionActuelle
        );
      } catch (err) {
        console.error("[organisations PATCH] journalisation de la réattribution échouée", err);
      }
    }

    if (relanceEligible) {
      try {
        const finalProprietaire = ("proprietaire" in update ? update.proprietaire : data.proprietaire) as string;
        const finalClientId = ("clientId" in update ? update.clientId : (data.clientId ?? null)) as string | null;
        const finalNom = (update.nom as string) ?? data.nom;
        const nouvelleTacheId = await upsertRelanceTache(
          { id, nom: finalNom, proprietaire: finalProprietaire, clientId: finalClientId },
          finalDateRelance as Timestamp,
          tacheRelanceIdActuel,
          auth.uid
        );
        if (nouvelleTacheId !== tacheRelanceIdActuel) {
          await ref.update({ tacheRelanceId: nouvelleTacheId });
        }
      } catch (err) {
        console.error("[organisations PATCH] tâche de relance échouée", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[organisations PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadOrganisationForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { ref } = access;

  try {
    const [contactsSnap, interactionsSnap] = await Promise.all([
      ref.collection("contacts").get(),
      ref.collection("interactions").get(),
    ]);
    const batch = adminDb.batch();
    contactsSnap.docs.forEach(d => batch.delete(d.ref));
    interactionsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(ref);
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[organisations DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
