import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ALWAYS_ACCESSIBLE_SECTIONS, type AdminSectionKey, type AdminPermission } from "@/config/adminSections";

export type AdminAuthResult =
  | { ok: true; uid: string }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Version détaillée de requireAdmin — distingue 401 (aucune session valide)
 * de 403 (session valide mais rôle non-admin), avec un message par cas.
 * À utiliser pour toute nouvelle route qui doit renvoyer un code précis.
 */
export async function requireAdminDetailed(req: NextRequest): Promise<AdminAuthResult> {
  const session = req.cookies.get("session_admin")?.value;
  if (!session) return { ok: false, status: 401, error: "Non authentifié" };
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== "admin") {
      return { ok: false, status: 403, error: "Accès réservé aux administrateurs" };
    }
    return { ok: true, uid: decoded.uid };
  } catch {
    return { ok: false, status: 401, error: "Session invalide" };
  }
}

/**
 * Vérifie que la requête provient d'un admin authentifié (cookie session_admin).
 * Retourne l'uid si valide, sinon null. Ne lève jamais — laisse l'appelant
 * décider du code de statut (401/403) et du message renvoyé.
 *
 * Conservée telle quelle pour compatibilité avec les appelants existants.
 * Pour un code d'erreur 401/403 distinct, utiliser requireAdminDetailed.
 */
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const result = await requireAdminDetailed(req);
  return result.ok ? result.uid : null;
}

export type StaffRole = "admin" | "employe";

export type StaffAuthResult =
  | { ok: true; uid: string; role: StaffRole }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Vérifie que la requête provient d'un membre du personnel authentifié —
 * admin ou employé (cookie session_admin, même espace de session que l'admin).
 * Réservée aux routes internes (ex. /api/admin/taches) où les deux rôles
 * doivent pouvoir agir, à charge pour l'appelant d'appliquer ses propres
 * restrictions selon le rôle retourné.
 *
 * Note : /api/auth/session ne pose actuellement le cookie session_admin que
 * pour role === "admin" — un compte "employe" ne peut donc pas encore
 * s'authentifier ici tant que ce point n'est pas corrigé séparément.
 */
export async function requireStaff(req: NextRequest): Promise<StaffAuthResult> {
  const session = req.cookies.get("session_admin")?.value;
  if (!session) return { ok: false, status: 401, error: "Non authentifié" };
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const role = userSnap.data()?.role;
    if (!userSnap.exists || (role !== "admin" && role !== "employe")) {
      return { ok: false, status: 403, error: "Accès réservé au personnel AW Solution" };
    }
    return { ok: true, uid: decoded.uid, role };
  } catch {
    return { ok: false, status: 401, error: "Session invalide" };
  }
}

/**
 * Vérifie qu'une requête a le droit d'agir sur `section` (une des 9 clés de
 * config/adminSections.ts) :
 * - role === "admin" : toujours autorisé, sans condition, comme aujourd'hui.
 * - role === "employe" : autorisé seulement si users/{uid}.permissions[section]
 *   atteint au moins `minLevel` ("lecture" par défaut ; passer "ecriture"
 *   pour les gestionnaires de mutation — POST/PATCH/DELETE).
 *
 * Toute la logique de vérification par section vit ici, à un seul endroit —
 * chaque route ne fait qu'indiquer QUELLE section elle protège.
 *
 * Ne remplace pas requireStaff : ce dernier reste approprié pour les
 * endpoints transversaux qui ne correspondent à aucune section unique
 * (ex. /api/admin/staff, l'annuaire du personnel).
 */
export async function requireSection(
  req: NextRequest,
  section: AdminSectionKey,
  minLevel: AdminPermission = "lecture",
): Promise<StaffAuthResult> {
  const session = req.cookies.get("session_admin")?.value;
  if (!session) return { ok: false, status: 401, error: "Non authentifié" };
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists) {
      return { ok: false, status: 403, error: "Accès réservé au personnel AW Solution" };
    }
    const data = userSnap.data()!;
    const role = data.role as StaffRole | undefined;

    if (role === "admin") {
      return { ok: true, uid: decoded.uid, role: "admin" };
    }

    if (role !== "employe") {
      return { ok: false, status: 403, error: "Accès réservé au personnel AW Solution" };
    }

    if (ALWAYS_ACCESSIBLE_SECTIONS.has(section)) {
      return { ok: true, uid: decoded.uid, role: "employe" };
    }

    const permissions = (data.permissions ?? {}) as Record<AdminSectionKey, AdminPermission>;
    const level = permissions[section] ?? null;
    const hasAccess = minLevel === "ecriture" ? level === "ecriture" : level !== null;

    if (!hasAccess) {
      return { ok: false, status: 403, error: `Accès à la section "${section}" non autorisé` };
    }
    return { ok: true, uid: decoded.uid, role: "employe" };
  } catch {
    return { ok: false, status: 401, error: "Session invalide" };
  }
}
