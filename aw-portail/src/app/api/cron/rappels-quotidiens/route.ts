import { NextRequest, NextResponse } from "next/server";
import { reconcilierRappels, programmerRappels } from "@/lib/rendezvousReminders";
import { sendEcheanceDigest } from "@/lib/taches";

/**
 * Cron unique quotidien (0 8 * * *, America/Toronto) — plan Vercel Hobby
 * n'autorise qu'un seul cron/jour, donc tout ce qui doit tourner chaque jour
 * se greffe ici plutôt que sur des routes séparées. Trois passes
 * indépendantes, chacune isolée par son propre try/catch pour qu'un échec
 * complet d'une passe n'empêche jamais les autres de tourner :
 *   1. reconcilierRappels   — annule les rappels de rencontre programmés
 *      dont l'état a changé depuis (voir le commentaire dans
 *      src/lib/rendezvousReminders.ts pour la portée réelle de cette garantie).
 *   2. programmerRappels    — programme (scheduledAt Resend) le rappel 2h
 *      avant chaque rencontre acceptée aujourd'hui.
 *   3. sendEcheanceDigest   — un courriel résumé par personne pour les
 *      tâches "à faire" en retard ou dues aujourd'hui.
 */
export async function GET(request: NextRequest) {
  // Sécurité — Vercel envoie le header Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];

  const reconciliation = await reconcilierRappels().catch((e) => {
    errors.push(`reconciliation: ${String(e)}`);
    return { annulees: 0, errors: [] as string[] };
  });

  const programmation = await programmerRappels().catch((e) => {
    errors.push(`programmation: ${String(e)}`);
    return { programmees: 0, envoyesImmediat: 0, errors: [] as string[] };
  });

  const digest = await sendEcheanceDigest().catch((e) => {
    errors.push(`digest: ${String(e)}`);
    return { courriels: 0, taches: 0, errors: [] as string[] };
  });

  return NextResponse.json({
    ok: true,
    reconciliation,
    programmation,
    digest,
    errors: [...errors, ...reconciliation.errors, ...programmation.errors, ...digest.errors],
  });
}
