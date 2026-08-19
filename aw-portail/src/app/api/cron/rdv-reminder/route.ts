import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { resend } from "@/lib/resend";

const ADMIN_EMAIL = "alex@awsolution.ca";

function formatDate(date: string) {
  return new Date(date + "T12:00").toLocaleDateString("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

/** Convertit une date+heure stockée en heure de Montréal vers UTC */
function meetingUTC(dateStr: string, heureStr: string): Date {
  const naiveUTC = new Date(`${dateStr}T${heureStr}:00Z`);
  // Trouver l'offset Eastern pour cette date (gère EDT/EST automatiquement)
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(naiveUTC);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "00";
  const easternOfNaive = new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`
  );
  const offsetMs = naiveUTC.getTime() - easternOfNaive.getTime(); // e.g. 4h pour EDT
  return new Date(naiveUTC.getTime() + offsetMs);
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

export async function GET(request: NextRequest) {
  // Sécurité — Vercel envoie le header Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Fenêtre : meetings dont l'heure UTC est entre maintenant+1h30 et maintenant+2h30
  const windowStart = now.getTime() + 1.5  * 60 * 60 * 1000;
  const windowEnd   = now.getTime() + 2.5  * 60 * 60 * 1000;

  let remindersSent = 0;
  const errors: string[] = [];

  try {
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
        .get();

      for (const rdvDoc of rdvSnap.docs) {
        const rdv = rdvDoc.data();

        // Déjà rappelé → skip
        if (rdv.reminderEnvoye === true) continue;

        const meetingMs = meetingUTC(rdv.date, rdv.heure).getTime();
        if (meetingMs < windowStart || meetingMs > windowEnd) continue;

        const dateStr  = formatDate(rdv.date);
        const lien: string | null = rdv.lienRencontre ?? null;

        try {
          // Email à l'admin
          await resend.emails.send({
            from: "support@awsolution.ca",
            to: ADMIN_EMAIL,
            subject: `⏰ Rappel — Rencontre dans 2h : ${rdv.titre}`,
            html: `
              <p>Rappel automatique — votre rencontre commence dans environ <strong>2 heures</strong>.</p>
              <p><strong>Client :</strong> ${clientNom}</p>
              <p><strong>Sujet :</strong> ${rdv.titre}</p>
              <p><strong>Date :</strong> ${dateStr} à ${rdv.heure}</p>
              ${rdv.description ? `<p><strong>Description :</strong> ${rdv.description}</p>` : ""}
              ${lien ? lienBlock(lien) : ""}
            `,
          });

          // Email au client
          if (courriel) {
            await resend.emails.send({
              from: "support@awsolution.ca",
              to: courriel,
              subject: `⏰ Rappel — Rencontre dans 2h : ${rdv.titre}`,
              html: `
                <p>Bonjour ${clientNom},</p>
                <p>Votre rencontre avec AW Solution commence dans environ <strong>2 heures</strong>.</p>
                <p><strong>Sujet :</strong> ${rdv.titre}</p>
                <p><strong>Date :</strong> ${dateStr} à ${rdv.heure}</p>
                ${rdv.description ? `<p><strong>Description :</strong> ${rdv.description}</p>` : ""}
                ${lien ? lienBlock(lien) : ""}
              `,
            });
          }

          // Marquer comme rappel envoyé
          await rdvDoc.ref.update({ reminderEnvoye: true });
          remindersSent++;
        } catch (e) {
          errors.push(`${clientId}/${rdvDoc.id}: ${String(e)}`);
        }
      }
    }

    return NextResponse.json({ ok: true, remindersSent, errors });
  } catch (err) {
    console.error("Cron rdv-reminder error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
