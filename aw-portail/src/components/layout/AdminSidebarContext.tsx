"use client";

/**
 * AdminSidebarContext.tsx
 *
 * Publie l'état ouvert/fermé (survol) d'AdminSidebar aux pages qui en ont
 * besoin pour décaler leur contenu plutôt que de le laisser caché dessous —
 * voir /admin/messages (Partie 2D). Les autres pages admin (marge statique
 * ml-14 dans AdminLayout) ne consomment pas ce contexte et ne sont donc pas
 * affectées.
 */

import { createContext, useContext, useState } from "react";

const AdminSidebarContext = createContext<{ expanded: boolean; setExpanded: (v: boolean) => void }>({
  expanded: false,
  setExpanded: () => {},
});

export function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <AdminSidebarContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

/** Lecture seule — pour les pages qui doivent réagir à l'état de la barre latérale. */
export function useAdminSidebarExpanded(): boolean {
  return useContext(AdminSidebarContext).expanded;
}

/** Interne à AdminSidebar.tsx — publie son propre état d'expansion. */
export function useAdminSidebarExpandedSetter(): (v: boolean) => void {
  return useContext(AdminSidebarContext).setExpanded;
}
