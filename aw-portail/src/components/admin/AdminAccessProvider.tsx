"use client";

/**
 * AdminAccessProvider.tsx
 *
 * Résout une seule fois le rôle et les permissions de l'utilisateur admin/
 * employé connecté, et les partage à AdminSidebar.tsx et à chaque page admin
 * via useAdminAccess() — même architecture que TourProvider côté portail
 * client (une résolution, plusieurs consommateurs).
 *
 * Admin/employé se connectent avec une vraie session Firebase Auth
 * (signInWithEmailAndPassword), pas la connexion anonyme du portail
 * client — auth.currentUser porte donc déjà le vrai uid après connexion.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ALWAYS_ACCESSIBLE_SECTIONS, type AdminSectionKey, type AdminPermission, type AdminPermissions } from "@/config/adminSections";

interface AdminAccessValue {
  /** null tant que non résolu, ou si aucune session valide. */
  role: "admin" | "employe" | null;
  permissions: AdminPermissions | null;
  loading: boolean;
  /** admin → toujours true. employe → au moins minLevel sur cette section. */
  hasAccess: (section: AdminSectionKey, minLevel?: AdminPermission) => boolean;
}

const AdminAccessContext = createContext<AdminAccessValue | null>(null);

export function useAdminAccess(): AdminAccessValue {
  const ctx = useContext(AdminAccessContext);
  if (!ctx) throw new Error("useAdminAccess() doit être utilisé sous <AdminAccessProvider>");
  return ctx;
}

export function AdminAccessProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole]               = useState<"admin" | "employe" | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }

      if (!user) {
        setRole(null);
        setPermissions(null);
        setLoading(false);
        return;
      }

      unsubDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setRole(data?.role === "admin" || data?.role === "employe" ? data.role : null);
        setPermissions(data?.permissions ?? null);
        setLoading(false);
      }, () => setLoading(false));
    });

    return () => { unsubAuth(); unsubDoc?.(); };
  }, []);

  const hasAccess = useCallback((section: AdminSectionKey, minLevel: AdminPermission = "lecture"): boolean => {
    if (role === "admin") return true;
    if (ALWAYS_ACCESSIBLE_SECTIONS.has(section)) return true;
    if (role !== "employe" || !permissions) return false;
    const level = permissions[section] ?? null;
    return minLevel === "ecriture" ? level === "ecriture" : level !== null;
  }, [role, permissions]);

  return (
    <AdminAccessContext.Provider value={{ role, permissions, loading, hasAccess }}>
      {children}
    </AdminAccessContext.Provider>
  );
}

/**
 * Garde de page — à appeler en tête de chaque page admin qui correspond à
 * une section précise (pas nécessaire pour /admin lui-même, toujours
 * accessible). Redirige vers /admin si l'accès manque, une fois la
 * résolution terminée. `ready` ne devient true qu'une fois l'accès confirmé
 * — la page peut s'en servir pour ne rien afficher avant.
 */
export function useRequireSection(section: AdminSectionKey, minLevel: AdminPermission = "lecture") {
  const { hasAccess, loading } = useAdminAccess();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!hasAccess(section, minLevel)) {
      router.replace("/admin");
      return;
    }
    setReady(true);
  }, [loading, section, minLevel, hasAccess, router]);

  return { ready, loading };
}
