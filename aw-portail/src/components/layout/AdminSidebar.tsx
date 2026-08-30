"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ADMIN_PORTAL_SECTIONS } from "@/config/adminSections";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";

export default function AdminSidebar() {
  const { hasAccess } = useAdminAccess();
  const [expanded,     setExpanded]     = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const pathname = usePathname();
  const router   = useRouter();

  // Un admin voit tout, sans changement. Un employé ne voit que les
  // sections où il a au moins un accès lecture — Dashboard reste toujours
  // visible (ALWAYS_ACCESSIBLE_SECTIONS, appliqué dans hasAccess).
  const visibleSections = ADMIN_PORTAL_SECTIONS.filter((s) => hasAccess(s.key));

  // Badge temps réel — messages non lus, via abonnements per-client
  useEffect(() => {
    const perClientUnsubs: Record<string, () => void> = {};
    const counts: Record<string, number> = {};

    function recalc() {
      setUnreadCount(Object.values(counts).reduce((s, n) => s + n, 0));
    }

    // 1. Observer la liste des clients
    const unsubClients = onSnapshot(collection(db, "clients"), snap => {
      const ids = new Set(snap.docs.map(d => d.id));

      // Supprimer les abonnements des clients retirés
      Object.keys(perClientUnsubs).forEach(id => {
        if (!ids.has(id)) {
          perClientUnsubs[id]();
          delete perClientUnsubs[id];
          delete counts[id];
        }
      });

      // Ajouter un abonnement par nouveau client
      snap.docs.forEach(clientDoc => {
        const cid = clientDoc.id;
        if (perClientUnsubs[cid]) return;
        const q = query(
          collection(db, "clients", cid, "messages"),
          where("auteurRole", "==", "client"),
          where("lu", "==", false)
        );
        perClientUnsubs[cid] = onSnapshot(q, msgSnap => {
          counts[cid] = msgSnap.size;
          recalc();
        });
      });
    });

    return () => {
      unsubClients();
      Object.values(perClientUnsubs).forEach(u => u());
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookieName: "session_admin" }),
    });
    router.push("/login");
  }

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col border-r border-gray-100 bg-white transition-all duration-200 ease-in-out overflow-hidden"
      style={{ width: expanded ? 220 : 56 }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3.5 gap-3 border-b border-gray-100 flex-shrink-0">
        <img src="/logo.png" alt="AW Solution" width={28} height={28} className="flex-shrink-0" />
        {expanded && (
          <span className="text-gray-900 font-semibold text-sm whitespace-nowrap overflow-hidden">
            AW Solution
          </span>
        )}
      </div>

      {/* Badge admin */}
      {expanded && (
        <div className="mx-3 mt-2 mb-1 px-2 py-1 rounded-md bg-blue-50 text-center">
          <span className="text-xs font-semibold text-blue-600 tracking-wide uppercase">Admin</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-hidden">
        {visibleSections.map(({ key, label, icon: Icon, href }) => {
          const active  = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          const isMsg   = href === "/admin/messages";
          const showBadge = isMsg && unreadCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm transition-colors group relative"
              style={{
                backgroundColor: active ? "#EFF6FF" : "transparent",
                color: active ? "#0362E3" : "#6B7280",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB";
                  (e.currentTarget as HTMLElement).style.color = "#111827";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#6B7280";
                }
              }}
            >
              {/* Icône + badge */}
              <div className="relative flex-shrink-0">
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                {showBadge && (
                  <span
                    style={{
                      position: "absolute", top: -5, right: -5,
                      minWidth: 14, height: 14, borderRadius: 7,
                      background: "#DC2626", color: "#fff",
                      fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px", lineHeight: 1,
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>

              {expanded && (
                <>
                  <span className="whitespace-nowrap font-medium overflow-hidden flex-1">{label}</span>
                  {showBadge && (
                    <span
                      style={{
                        minWidth: 18, height: 18, borderRadius: 9,
                        background: "#DC2626", color: "#fff",
                        fontSize: 10, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "0 4px", flexShrink: 0,
                      }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </>
              )}

              {!expanded && (
                <div className="absolute left-14 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {label}
                  {showBadge ? ` (${unreadCount})` : ""}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="py-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors w-[calc(100%-16px)] group relative"
        >
          <LogOut size={18} className="flex-shrink-0" strokeWidth={1.5} />
          {expanded && <span className="whitespace-nowrap font-medium">Déconnexion</span>}
          {!expanded && (
            <div className="absolute left-14 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Déconnexion
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
