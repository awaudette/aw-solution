"use client";

/**
 * Conversions entre les <input type="date"/"time"> (valeurs en heure locale
 * du navigateur, format YYYY-MM-DD / HH:mm) et les instants ISO échangés
 * avec l'API (UTC, toujours avec suffixe Z).
 *
 * Piège à ne jamais réintroduire : dériver une date calendrier en tranchant
 * les 10 premiers caractères d'un ISO UTC (`iso.slice(0, 10)`), ou construire
 * "aujourd'hui" via `new Date().toISOString().slice(0, 10)`. Les deux
 * basculent au jour suivant dès qu'il est plus tard qu'environ 20h/19h
 * (EDT/EST) — l'UTC a déjà changé de date alors que l'heure locale non.
 * Toujours passer par les accesseurs locaux (getFullYear/getMonth/getDate/
 * getHours/getMinutes), jamais par les équivalents UTC ou une sous-chaîne.
 */

function formatLocalDate(d: Date): string {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Date du jour, en heure locale, au format attendu par <input type="date">. */
export function todayInputValue(): string {
  return formatLocalDate(new Date());
}

/** Instant ISO → valeur <input type="date"> en heure locale (jamais un slice de l'ISO). */
export function toDateInputValue(iso: string | null): string {
  return iso ? formatLocalDate(new Date(iso)) : "";
}

/** Instant ISO → valeur <input type="time"> en heure locale. */
export function toTimeInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hours   = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Combine une valeur <input type="date"> (+ heure optionnelle) en instant
 * ISO UTC. La chaîne "YYYY-MM-DDTHH:mm" sans heure est interprétée par le
 * moteur JS comme une heure LOCALE (contrairement à "YYYY-MM-DD" seul, qui
 * serait UTC) — c'est ce qui permet la conversion correcte ici.
 */
export function combineDateTimeToIso(date: string, time: string): string | null {
  if (!date) return null;
  return time ? new Date(`${date}T${time}`).toISOString() : new Date(`${date}T12:00`).toISOString();
}
