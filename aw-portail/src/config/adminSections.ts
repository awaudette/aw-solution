// Configuration des sections du portail admin — pour les permissions par
// section des comptes employé (users/{uid}.permissions) ET pour la
// navigation d'AdminSidebar.tsx, qui importe désormais cette liste au lieu
// de sa propre NAV_ITEMS locale (étape 2 — résorbe la duplication laissée
// intentionnellement par l'étape 1).

import {
  LayoutDashboard, Kanban, Users, Inbox, CalendarDays,
  Sparkles, BookOpen, ListTodo, Settings,
} from "lucide-react";

export type AdminSectionKey =
  | "dashboard" | "pipeline" | "clients" | "messages" | "calendrier"
  | "nouveautes" | "documentation" | "aFaire" | "parametres";

export interface AdminPortalSection {
  key:   AdminSectionKey;
  label: string;
  href:  string;
  icon:  React.ElementType;
}

export const ADMIN_PORTAL_SECTIONS: AdminPortalSection[] = [
  { key: "dashboard",     label: "Dashboard",     href: "/admin",              icon: LayoutDashboard },
  { key: "pipeline",      label: "Pipeline",      href: "/admin/pipeline",     icon: Kanban },
  { key: "clients",       label: "Clients",       href: "/admin/clients",      icon: Users },
  { key: "messages",      label: "Messages",      href: "/admin/messages",     icon: Inbox },
  { key: "calendrier",    label: "Calendrier",    href: "/admin/calendrier",   icon: CalendarDays },
  { key: "nouveautes",    label: "Nouveautés",    href: "/admin/nouveautes",   icon: Sparkles },
  { key: "documentation", label: "Documentation", href: "/admin/documentation",icon: BookOpen },
  { key: "aFaire",        label: "À faire",       href: "/admin/a-faire",      icon: ListTodo },
  { key: "parametres",    label: "Paramètres",    href: "/admin/parametres",   icon: Settings },
];

/** Dashboard reste toujours accessible à tout employé, peu importe ses
 *  permissions — c'est la page d'atterrissage après connexion, elle ne
 *  peut pas être conditionnée sans créer une boucle de redirection. */
export const ALWAYS_ACCESSIBLE_SECTIONS = new Set<AdminSectionKey>(["dashboard"]);

export type AdminPermission  = "lecture" | "ecriture" | null;
export type AdminPermissions = Record<AdminSectionKey, AdminPermission>;

/** Refus par défaut, comme DEFAULT_PERMISSIONS côté client — aucune section
 *  accordée tant qu'elle n'est pas explicitement cochée. Rien n'applique
 *  encore cette valeur (étape 2), mais le schéma ne code pas de porte
 *  dérobée "champ absent = accès complet". */
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = Object.fromEntries(
  ADMIN_PORTAL_SECTIONS.map((s) => [s.key, null]),
) as AdminPermissions;
