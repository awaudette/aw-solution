import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireStaff } from "@/lib/requireAdmin";
import { loadTacheForAccess, resolveAssignes, serializeTache, notifyStaffOfTache } from "@/lib/taches";
import { PORTEE_VALUES, PRIORITE_VALUES, type Portee, type Priorite } from "@/config/taches";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadTacheForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json({ tache: serializeTache(id, access.data) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const access = await loadTacheForAccess(id, auth.uid, auth.role);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { ref, data } = access;

  try {
    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof body.titre === "string") {
      if (!body.titre.trim()) {
        return NextResponse.json({ error: "titre ne peut pas être vide" }, { status: 400 });
      }
      update.titre = body.titre.trim();
    }
    if ("description" in body) {
      update.description = typeof body.description === "string" ? (body.description.trim() || null) : null;
    }
    if ("priorite" in body) {
      if (!PRIORITE_VALUES.includes(body.priorite)) {
        return NextResponse.json({ error: "priorite invalide" }, { status: 400 });
      }
      update.priorite = body.priorite as Priorite;
    }
    if ("clientId" in body) update.clientId = body.clientId || null;
    if ("lienType" in body) update.lienType = body.lienType || null;
    if ("lienId" in body) update.lienId = body.lienId || null;
    if ("heureEcheance" in body) update.heureEcheance = body.heureEcheance === true;
    if ("dateEcheance" in body) {
      if (body.dateEcheance === null) {
        update.dateEcheance = null;
      } else {
        const d = new Date(body.dateEcheance);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: "dateEcheance invalide" }, { status: 400 });
        }
        update.dateEcheance = Timestamp.fromDate(d);
      }
    }

    // portee / assignes sont recalculés ensemble dès que l'un des deux est
    // touché, pour rester cohérents avec le personnel actuel.
    let newlyAssignedUids: string[] = [];
    if ("portee" in body || "assignes" in body) {
      const portee: Portee = "portee" in body ? body.portee : data.portee;
      if (!PORTEE_VALUES.includes(portee)) {
        return NextResponse.json({ error: "portee invalide" }, { status: 400 });
      }
      const resolved = await resolveAssignes(portee, "assignes" in body ? body.assignes : data.assignes);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      update.portee = portee;
      update.assignes = resolved.assignes;

      // Ne notifier que les personnes nouvellement ajoutées — jamais celles
      // qui étaient déjà assignées, sinon un simple changement de titre qui
      // touche incidemment portee renotifierait tout le monde.
      const ancienAssignes: string[] = data.assignes ?? [];
      newlyAssignedUids = resolved.assignes.filter(uid => !ancienAssignes.includes(uid));
    }

    // statut/completedAt/completePar ne passent jamais par ce endpoint —
    // voir /complete et /reopen, qui garantissent la cohérence des trois
    // champs ensemble. Toute valeur reçue ici est simplement ignorée.

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 });
    }

    await ref.update(update);

    if (newlyAssignedUids.length > 0) {
      // Ne doit jamais faire échouer la modification elle-même si ça échoue.
      try {
        const dateEcheanceVal = "dateEcheance" in update ? update.dateEcheance : data.dateEcheance;
        await notifyStaffOfTache({
          tacheId: id,
          titre: (update.titre as string | undefined) ?? data.titre,
          description: "description" in update ? (update.description as string | null) : (data.description ?? null),
          priorite: (update.priorite as Priorite | undefined) ?? data.priorite,
          dateEcheance: dateEcheanceVal?.toDate ? dateEcheanceVal.toDate().toISOString() : null,
          heureEcheance: "heureEcheance" in update ? (update.heureEcheance as boolean) : (data.heureEcheance === true),
          clientId: "clientId" in update ? (update.clientId as string | null) : (data.clientId ?? null),
          actorUid: auth.uid,
          recipientUids: newlyAssignedUids,
        });
      } catch (err) {
        console.error("[taches PATCH] notification échouée", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[taches PATCH]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const ref = adminDb.collection("taches").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  }

  // Suppression réservée à l'admin ou au créateur — plus stricte que la
  // visibilité générale (un simple assigné ne peut pas supprimer).
  const data = snap.data()!;
  if (auth.role !== "admin" && data.creePar !== auth.uid) {
    return NextResponse.json({ error: "Seul l'admin ou le créateur peut supprimer cette tâche" }, { status: 403 });
  }

  try {
    const commentsSnap = await ref.collection("commentaires").get();
    const batch = adminDb.batch();
    commentsSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(ref);
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[taches DELETE]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
