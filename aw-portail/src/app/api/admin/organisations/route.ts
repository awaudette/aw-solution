import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireStaff } from "@/lib/requireAdmin";
import { serializeOrganisation, isValidStaffUid, computeAutoDates } from "@/lib/organisations";
import { ETAPE_VALUES, RECUPERABLE_VALUES, DATE_FIELDS, type Etape, type Recuperable } from "@/config/organisations";

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    if (auth.role === "admin") {
      const snap = await adminDb.collection("organisations").orderBy("createdAt", "desc").get();
      return NextResponse.json({ organisations: snap.docs.map(d => serializeOrganisation(d.id, d.data())) });
    }

    // Employé : uniquement les dossiers dont il est propriétaire.
    const snap = await adminDb.collection("organisations").where("proprietaire", "==", auth.uid).get();
    const organisations = snap.docs
      .map(d => serializeOrganisation(d.id, d.data()))
      .sort((a, b) => {
        const aMs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bMs - aMs;
      });

    return NextResponse.json({ organisations });
  } catch (err) {
    console.error("[organisations GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json() as Record<string, unknown>;

    const nom = body.nom;
    if (!nom || typeof nom !== "string" || !nom.trim()) {
      return NextResponse.json({ error: "nom requis" }, { status: 400 });
    }

    const etapeInput = body.etape as Etape | undefined;
    const finalEtape: Etape = etapeInput && ETAPE_VALUES.includes(etapeInput) ? etapeInput : "nouveau";

    // Un employé ne peut jamais choisir le propriétaire — le dossier lui
    // revient automatiquement, imposé ici, pas seulement caché côté client.
    const proprietaireInput = body.proprietaire;
    const finalProprietaire = auth.role === "admin" && typeof proprietaireInput === "string" && proprietaireInput
      ? proprietaireInput
      : auth.uid;
    if (!(await isValidStaffUid(finalProprietaire))) {
      return NextResponse.json({ error: "proprietaire invalide — doit être un uid admin ou employé existant" }, { status: 400 });
    }

    if ("recuperable" in body && body.recuperable !== null && !RECUPERABLE_VALUES.includes(body.recuperable as Recuperable)) {
      return NextResponse.json({ error: "recuperable invalide" }, { status: 400 });
    }

    // Dates explicitement fournies — jamais écrasées par le remplissage auto.
    const explicit = new Set<string>();
    const parsedDates: Record<string, Timestamp | null> = {};
    for (const field of DATE_FIELDS) {
      if (field in body) {
        explicit.add(field);
        const raw = body[field];
        if (raw === null || raw === undefined || raw === "") {
          parsedDates[field] = null;
        } else {
          const d = new Date(raw as string);
          if (Number.isNaN(d.getTime())) {
            return NextResponse.json({ error: `${field} invalide` }, { status: 400 });
          }
          parsedDates[field] = Timestamp.fromDate(d);
        }
      }
    }

    const now = Timestamp.now();
    const docData: Record<string, unknown> = {
      nom: nom.trim(),
      secteur: (body.secteur as string) || null,
      siteWeb: (body.siteWeb as string) || null,
      adresse: (body.adresse as string) || null,
      nombreSuccursales: typeof body.nombreSuccursales === "number" ? body.nombreSuccursales : 1,
      groupeId: (body.groupeId as string) || null,
      etape: finalEtape,
      proprietaire: finalProprietaire,
      source: (body.source as string) || null,
      forfaitPressenti: (body.forfaitPressenti as string) || null,
      valeurMensuelleEstimee: typeof body.valeurMensuelleEstimee === "number" ? body.valeurMensuelleEstimee : null,
      concurrentEnPlace: (body.concurrentEnPlace as string) || null,
      prochaineAction: (body.prochaineAction as string) || null,
      motifPerte: (body.motifPerte as string) || null,
      motifPerteDetail: (body.motifPerteDetail as string) || null,
      recuperable: (body.recuperable as Recuperable) ?? null,
      clientId: null,
      derniereInteraction: null,
      createdAt: now,
      createdBy: auth.uid,
      // Toutes les dates par défaut à null, puis écrasées par celles fournies explicitement.
      dateProchaineAction: null,
      datePremierContact: null,
      dateDemo: null,
      datePropositionEnvoyee: null,
      dateSignature: null,
      dateLancement: null,
      dateChurn: null,
      dateRelanceSuggeree: null,
      ...parsedDates,
    };

    // Remplissage auto de la date correspondant à l'étape initiale (ex. créer
    // directement un dossier à "signe" pour une donnée historique), sauf si
    // déjà fournie explicitement ci-dessus.
    Object.assign(docData, computeAutoDates(finalEtape, docData, explicit));

    const docRef = await adminDb.collection("organisations").add(docData);

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (err) {
    console.error("[organisations POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
