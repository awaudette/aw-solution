import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireStaff } from "@/lib/requireAdmin";

/**
 * Annuaire du personnel AW Solution (users/{uid}.role in [admin, employe]).
 * Sert au sélecteur d'assignation et aux filtres par employé de /admin/a-faire.
 * Lecture ouverte à tout membre du personnel authentifié — nécessaire pour
 * qu'un employé puisse voir à qui il peut assigner une tâche.
 */
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const snap = await adminDb.collection("users").where("role", "in", ["admin", "employe"]).get();
    const staff = snap.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        prenom: data.prenom ?? "",
        nom: data.nom ?? "",
        courriel: data.courriel ?? "",
        role: data.role as "admin" | "employe",
      };
    });
    return NextResponse.json({ staff });
  } catch (err) {
    console.error("[staff GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
