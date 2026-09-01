import { adminDb } from "@/lib/firebase-admin";
import { resend } from "@/lib/resend";
import { montrealVersUTC, aujourdhuiMontreal } from "@/lib/tz";

const ADMIN_EMAIL = "alex@awsolution.ca";
const DEUX_HEURES_MS = 2 * 60 * 60 * 1000;

function formatDate(date: string) {
  return new Date(date + "T12:00").toLocaleDateString("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function lienBlock(lien: string) {
  return `
    <p style="margin-top:14px">
      <a href="${lien}" style="display:inline-block;padding:10px 20px;background:#0362E3;color:#fff;border-radius:9px;text-decoration:none;font-weight:600;font-size:14px">
        🔗 Rejoindre la rencontre
      </a>
    </p>
    <p style="font-size:12px;color:#6B7280;margin-top:6px">
      Ou copiez ce lien : <a href="${lien}">${lien}</a>
    </p>`;
}

function rappelHtml(params: {
  pourAdmin: boolean; clientNom: string; titre: string;
  dateStr: string; heure: string; description?: string; lien: string | null;
}) {
  const { pourAdmin, clientNom, titre, dateStr, heure, description, lien } = params;
  return `
    ${pourAdmin ? "" : `<p>Bonjour ${clientNom},</p>`}
    <p>${pourAdmin ? "Rappel automatique — votre rencontre" : "Votre rencontre avec AW Solution"} commence dans environ <strong>2 heures</strong>.</p>
    ${pourAdmin ? `<p><strong>Client :</strong> ${clientNom}</p>` : ""}
    <p><strong>Sujet :</strong> ${titre}</p>
    <p><strong>Date :</strong> ${dateStr} à ${heure}</p>
    ${description ? `<p><strong>Description :</strong> ${description}</p>` : ""}
    ${lien ? lienBlock(lien) : ""}
  `;
}

// ─── Réconciliation ───────────────────────────────────────────────────────────
// Annule les rappels déjà programmés (scheduledAt Resend) dont l'état ne
// correspond plus à ce pour quoi ils ont été programmés — rencontre plus
// "accepte", ou date/heure changées depuis. rappelPourDate/rappelPourHeure
// figent l'état au moment de la programmation (voir programmerRappels) ;
// leur divergence avec date/heure actuels signale un changement manuel
// (Firestore direct — aucun flux in-app ne permet de modifier une rencontre
// déjà acceptée aujourd'hui).
// N'annule effectivement le risque de "rappel fantôme" que si ce cron
// repasse AVANT l'heure programmée du rappel (donc seulement s'il tourne
// plus d'une fois par jour) — sinon, protège au minimum la reprogrammation
// propre d'une rencontre déplacée à un jour futur (voir sendEcheanceDigest
// pour le raisonnement équivalent côté tâches). Compromis accepté : un seul
// cron/jour, plan Vercel Hobby.
export interface ReconciliationResult { annulees: number; errors: string[] }

export async function reconcilierRappels(): Promise<ReconciliationResult> {
  let annulees = 0;
  const errors: string[] = [];

  const clientsSnap = await adminDb.collection("clients").get();

  for (const clientDoc of clientsSnap.docs) {
    const clientId = clientDoc.id;

    const rdvSnap = await adminDb
      .collection("clients").doc(clientId)
      .collection("rendezvous")
      .where("rappelPourDate", "!=", null)
      .get();

    for (const rdvDoc of rdvSnap.docs) {
      const rdv = rdvDoc.data();
      const perimee = rdv.statut !== "accepte"
        || rdv.date !== rdv.rappelPourDate
        || rdv.heure !== rdv.rappelPourHeure;
      if (!perimee) continue;

      try {
        // cancel() renvoie une erreur Resend (pas une exception) si le
        // rappel est déjà parti — sans conséquence : dans les deux cas, les
        // champs de suivi sont nettoyés ci-dessous, un envoi déjà parti ne
        // peut de toute façon plus être rappelé.
        if (rdv.rappelResendIdAdmin)  await resend.emails.cancel(rdv.rappelResendIdAdmin);
        if (rdv.rappelResendIdClient) await resend.emails.cancel(rdv.rappelResendIdClient);

        await rdvDoc.ref.update({
          rappelResendIdAdmin: null, rappelResendIdClient: null,
          rappelPourDate: null, rappelPourHeure: null,
        });
        annulees++;
      } catch (e) {
        errors.push(`reconciliation ${clientId}/${rdvDoc.id}: ${String(e)}`);
      }
    }
  }

  return { annulees, errors };
}

// ─── Programmation ────────────────────────────────────────────────────────────
// Programme (scheduledAt Resend) un rappel à heureRencontre - 2h pour chaque
// rencontre acceptée AUJOURD'HUI n'ayant pas déjà de rappel en cours. Si la
// fenêtre de 2h est déjà entamée (rencontre acceptée tard le matin même),
// envoi immédiat en repli — comme le faisait l'ancien cron avant scheduledAt.
export interface ProgrammationResult { programmees: number; envoyesImmediat: number; errors: string[] }

export async function programmerRappels(): Promise<ProgrammationResult> {
  let programmees = 0, envoyesImmediat = 0;
  const errors: string[] = [];

  const now      = new Date();
  const todayStr = aujourdhuiMontreal();

  const clientsSnap = await adminDb.collection("clients").get();

  for (const clientDoc of clientsSnap.docs) {
    const clientId   = clientDoc.id;
    const clientData = clientDoc.data();
    const clientNom  = clientData.nom ?? "Client";
    const courriel   = clientData.courriel ?? "";

    const rdvSnap = await adminDb
      .collection("clients").doc(clientId)
      .collection("rendezvous")
      .where("statut", "==", "accepte")
      .where("date", "==", todayStr)
      .get();

    for (const rdvDoc of rdvSnap.docs) {
      const rdv = rdvDoc.data();
      // Déjà programmé (ou déjà envoyé immédiatement plus tôt aujourd'hui) → skip.
      if (rdv.rappelResendIdAdmin || rdv.rappelResendIdClient) continue;

      const dateStr = formatDate(rdv.date);
      const lien: string | null = rdv.lienRencontre ?? null;
      const meetingMs  = montrealVersUTC(rdv.date, rdv.heure).getTime();
      const rappelMs   = meetingMs - DEUX_HEURES_MS;
      const dansLeFutur = rappelMs > now.getTime();
      const scheduledAt = dansLeFutur ? new Date(rappelMs).toISOString() : undefined;
      const subject     = `⏰ Rappel — Rencontre dans 2h : ${rdv.titre}`;

      try {
        const adminSend = await resend.emails.send({
          from: "support@awsolution.ca",
          to: ADMIN_EMAIL,
          subject,
          html: rappelHtml({ pourAdmin: true, clientNom, titre: rdv.titre, dateStr, heure: rdv.heure, description: rdv.description, lien }),
          ...(scheduledAt ? { scheduledAt } : {}),
        });

        let clientSendId: string | null = null;
        if (courriel) {
          const clientSend = await resend.emails.send({
            from: "support@awsolution.ca",
            to: courriel,
            subject,
            html: rappelHtml({ pourAdmin: false, clientNom, titre: rdv.titre, dateStr, heure: rdv.heure, description: rdv.description, lien }),
            ...(scheduledAt ? { scheduledAt } : {}),
          });
          clientSendId = clientSend.data?.id ?? null;
        }

        if (dansLeFutur) {
          await rdvDoc.ref.update({
            rappelResendIdAdmin:  adminSend.data?.id ?? null,
            rappelResendIdClient: clientSendId,
            rappelPourDate:  rdv.date,
            rappelPourHeure: rdv.heure,
          });
          programmees++;
        } else {
          envoyesImmediat++;
        }
      } catch (e) {
        errors.push(`programmation ${clientId}/${rdvDoc.id}: ${String(e)}`);
      }
    }
  }

  return { programmees, envoyesImmediat, errors };
}
