/**
 * syncToken.ts — Jetons d'authentification de portailSyncJob
 *
 * Chaque client a son propre jeton, stocké hashé (SHA-256) dans
 * clients/{clientId}/syncConfig/token. On ne conserve jamais le jeton en
 * clair — seul son hash est écrit en base. Régénérer un jeton écrase le
 * hash existant, ce qui révoque immédiatement l'ancien jeton sans toucher
 * aux autres clients (chacun a son propre document syncConfig).
 */

import { randomBytes, createHash, timingSafeEqual } from "crypto";

/** Préfixe visible — permet de reconnaître un jeton AW Solution dans un log
 *  ou une variable d'environnement sans révéler sa valeur. */
const TOKEN_PREFIX = "awsync_";

export interface GeneratedSyncToken {
  /** Jeton en clair — à transmettre au client une seule fois, jamais stocké. */
  token: string;
  /** SHA-256 du jeton — c'est la seule forme conservée dans Firestore. */
  tokenHash: string;
  /** 6 derniers caractères — pour identifier le jeton dans l'admin sans l'exposer. */
  tokenSuffix: string;
}

export function generateSyncToken(): GeneratedSyncToken {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
  return { token, tokenHash: hashSyncToken(token), tokenSuffix: token.slice(-6) };
}

export function hashSyncToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Comparaison en temps constant — évite qu'un écart de latence laisse deviner
 *  le hash stocké caractère par caractère (attaque par timing). */
export function safeCompareHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
