/**
 * dateToronto.ts — Utilitaires de fuseau horaire America/Toronto.
 *
 * Toutes les dates du calcul (bornes de période, clé "jour" pour les visites
 * distinctes) doivent être exprimées dans le fuseau du club de golf, pas en
 * UTC — sinon une facture soumise à 21 h locale (1 h UTC le lendemain) se
 * ferait compter sur le mauvais jour. Implémenté avec Intl seulement (Node
 * embarque l'ICU complet) — pas de dépendance externe.
 */

const TZ = "America/Toronto";

/** Instant UTC → "YYYY-MM-DD" dans le fuseau de Toronto. */
export function torontoDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * "YYYY-MM-DD" (minuit à Toronto, EDT ou EST selon la saison) → instant UTC.
 * Toronto n'a que deux décalages possibles (-4 l'été, -5 l'hiver) : on essaie
 * les deux et on garde celui qui reformate vers la même date locale.
 */
export function torontoMidnightUTC(dateStr: string): Date {
  for (const offsetHours of [4, 5]) {
    const guess = new Date(`${dateStr}T00:00:00.000Z`);
    guess.setUTCHours(guess.getUTCHours() + offsetHours);
    if (torontoDateString(guess) === dateStr) return guess;
  }
  throw new Error(`torontoMidnightUTC: impossible de résoudre ${dateStr}`);
}

/** Décale une date "YYYY-MM-DD" de n jours (calendrier, pas d'heures). */
export function shiftDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" du jour courant à Toronto. */
export function todayToronto(): string {
  return torontoDateString(new Date());
}

/** Nom du jour de la semaine en français, capitalisé ("Lundi" … "Dimanche"), à Toronto. */
export function torontoWeekday(date: Date): string {
  const w = new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, weekday: "long" }).format(date);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** Heure locale (0-23) à Toronto. */
export function torontoHour(date: Date): number {
  const h = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(date);
  return parseInt(h, 10);
}
