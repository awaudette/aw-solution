/**
 * Conversions entre l'heure de Montréal (stockée sous forme de chaînes dans
 * Firestore, ex. date "YYYY-MM-DD" + heure "HH:MM") et l'instant UTC réel —
 * gère EDT/EST automatiquement. Extrait de l'ancien cron rdv-reminder (seule
 * copie de cette logique jusqu'ici) pour être réutilisé partout où le
 * serveur (souvent en UTC sur Vercel) doit comparer une échéance/heure de
 * rencontre à "maintenant".
 */

/** Convertit une date+heure de Montréal (ex. "2026-09-01" + "14:00") en instant UTC. */
export function montrealVersUTC(dateStr: string, heureStr: string): Date {
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

/** Date du jour ("YYYY-MM-DD") en heure de Montréal, peu importe le fuseau du serveur. */
export function aujourdhuiMontreal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

/** Fin de journée (23:59:59.999) du jour donné (heure de Montréal), en instant UTC. */
export function finDeJourneeMontreal(dateStr: string): Date {
  const debut23h59 = montrealVersUTC(dateStr, "23:59");
  return new Date(debut23h59.getTime() + 59_999); // + 59s999ms → 23:59:59.999
}
