import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { requireStaff } from "@/lib/requireAdmin";
import { resolveAssignes, serializeTache, notifyStaffOfTache } from "@/lib/taches";
import { PORTEE_VALUES, PRIORITE_VALUES, type Portee, type Priorite } from "@/config/taches";

/**
 * Sérialise une liste de docs taches en résolvant le nombre de commentaires
 * de chacun via une requête count() (agrégation — un seul read facturé, pas
 * un fetch de toute la sous-collection), en parallèle. Évite qu'un client
 * doive faire une requête par tâche pour afficher ce compte.
 */
async function serializeWithCommentCounts(docs: QueryDocumentSnapshot[]) {
  return Promise.all(docs.map(async d => {
    const countSnap = await d.ref.collection("commentaires").count().get();
    return serializeTache(d.id, d.data(), countSnap.data().count);
  }));
}

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Filtre optionnel par lien (ex. tâches liées à une organisation du CRM)
    // — rétrocompatible, absent = comportement inchangé ci-dessous. Filtré
    // par égalité seule (pas de orderBy combiné) pour n'exiger aucun index
    // composite ; le tri se fait en JS comme pour la branche employé.
    const lienType = req.nextUrl.searchParams.get("lienType");
    const lienId = req.nextUrl.searchParams.get("lienId");
    if (lienType && lienId) {
      const snap = await adminDb.collection("taches")
        .where("lienType", "==", lienType)
        .where("lienId", "==", lienId)
        .get();
      let docs = snap.docs;
      if (auth.role !== "admin") {
        docs = docs.filter(d => {
          const data = d.data();
          return (data.assignes ?? []).includes(auth.uid) || data.creePar === auth.uid;
        });
      }
      const taches = (await serializeWithCommentCounts(docs)).sort((a, b) => {
        const aMs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bMs - aMs;
      });
      return NextResponse.json({ taches });
    }

    if (auth.role === "admin") {
      const snap = await adminDb.collection("taches").orderBy("createdAt", "desc").get();
      const taches = await serializeWithCommentCounts(snap.docs);
      return NextResponse.json({ taches });
    }

    // Employé : tâches assignées OU créées par lui. Deux requêtes simples
    // fusionnées côté serveur plutôt qu'un filtre OR composite (évite tout
    // besoin d'index composite et reste portable).
    const [assigneesSnap, creeParSnap] = await Promise.all([
      adminDb.collection("taches").where("assignes", "array-contains", auth.uid).get(),
      adminDb.collection("taches").where("creePar", "==", auth.uid).get(),
    ]);
    const byId = new Map<string, QueryDocumentSnapshot>();
    for (const d of [...assigneesSnap.docs, ...creeParSnap.docs]) {
      byId.set(d.id, d);
    }
    const taches = (await serializeWithCommentCounts(Array.from(byId.values()))).sort((a, b) => {
      const aMs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bMs - aMs;
    });

    return NextResponse.json({ taches });
  } catch (err) {
    console.error("[taches GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const {
      titre, description, portee, assignes, priorite,
      dateEcheance, heureEcheance, clientId, lienType, lienId,
    } = body as {
      titre?: string; description?: string | null; portee?: Portee; assignes?: unknown;
      priorite?: Priorite; dateEcheance?: string | null; heureEcheance?: boolean;
      clientId?: string | null; lienType?: string | null; lienId?: string | null;
    };

    if (!titre || !titre.trim()) {
      return NextResponse.json({ error: "titre requis" }, { status: 400 });
    }
    if (!portee || !PORTEE_VALUES.includes(portee)) {
      return NextResponse.json({ error: "portee invalide" }, { status: 400 });
    }
    const finalPriorite: Priorite = priorite && PRIORITE_VALUES.includes(priorite) ? priorite : "normale";

    const resolved = await resolveAssignes(portee, assignes);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

    let dateEcheanceTs: Timestamp | null = null;
    if (dateEcheance) {
      const d = new Date(dateEcheance);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "dateEcheance invalide" }, { status: 400 });
      }
      dateEcheanceTs = Timestamp.fromDate(d);
    }

    const finalClientId = clientId || null;
    const docRef = await adminDb.collection("taches").add({
      titre: titre.trim(),
      description: (description ?? "").trim() || null,
      assignes: resolved.assignes,
      portee,
      creePar: auth.uid,
      statut: "a_faire",
      priorite: finalPriorite,
      dateEcheance: dateEcheanceTs,
      heureEcheance: heureEcheance === true,
      clientId: finalClientId,
      lienType: lienType || null,
      lienId: lienId || null,
      createdAt: Timestamp.now(),
      completedAt: null,
      completePar: null,
    });

    // Notification + courriel à chaque assigné (sauf le créateur) — ne doit
    // jamais faire échouer la création elle-même si ça échoue.
    try {
      await notifyStaffOfTache({
        tacheId: docRef.id,
        titre: titre.trim(),
        description: (description ?? "").trim() || null,
        priorite: finalPriorite,
        dateEcheance: dateEcheanceTs ? dateEcheanceTs.toDate().toISOString() : null,
        heureEcheance: heureEcheance === true,
        clientId: finalClientId,
        actorUid: auth.uid,
        recipientUids: resolved.assignes,
      });
    } catch (err) {
      console.error("[taches POST] notification échouée", err);
    }

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (err) {
    console.error("[taches POST]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
