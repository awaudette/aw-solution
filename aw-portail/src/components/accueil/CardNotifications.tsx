"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markNotificationRead, getNotifStyle } from "@/lib/notifications";
import type { ActiviteItem } from "@/hooks/useClientData";

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateRelative(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)     return "à l'instant";
  if (s < 3600)   return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400)  return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

const PAGE_SIZE = 5;

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #F3F4F6",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

// ─── Composant ──────────────────────────────────────────────────────────────

interface CardNotificationsProps {
  clientId: string;
  activite: ActiviteItem[];
}

export function CardNotifications({ clientId, activite }: CardNotificationsProps) {
  const router = useRouter();
  const [page, setPage] = useState(0);

  const unread = activite.filter((n) => !n.lu).length;
  const pages  = Math.ceil(activite.length / PAGE_SIZE);
  const paged  = activite.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={CARD}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Notifications</p>
        {unread > 0 && (
          <span style={{ padding: "2px 8px", background: "#EFF6FF", color: "#0362E3", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
            {unread} non lu{unread > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Liste */}
      {activite.length === 0 ? (
        <p style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", padding: "20px 0", margin: 0 }}>
          Aucune notification
        </p>
      ) : (
        <>
          {paged.map((item, i) => {
            const cfg = getNotifStyle(item.type);
            const canDismiss = !item.actionRequise || item.actionCompletee;
            return (
              <div key={item.id}>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
                  opacity: item.lu ? 0.5 : 1,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{cfg.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.45 }}>
                      {item.description}
                    </p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                      {dateRelative(item.date)}
                      {item.actionRequise && !item.actionCompletee && (
                        <span style={{ marginLeft: 6, color: "#C2410C", fontWeight: 600 }}>· Action requise</span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {item.lien && (
                      <button
                        onClick={() => router.push(item.lien)}
                        style={{
                          padding: "3px 10px", fontSize: 11, fontWeight: 600,
                          background: cfg.bg, color: cfg.text,
                          border: `1px solid ${cfg.border}`, borderRadius: 6, cursor: "pointer",
                        }}
                      >
                        Voir
                      </button>
                    )}
                    <button
                      onClick={() => canDismiss ? markNotificationRead(item.id, clientId) : undefined}
                      disabled={!canDismiss}
                      title={canDismiss ? "Marquer comme lu" : "Complétez l'action avant de fermer"}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        border: `1px solid ${item.actionCompletee ? "#BBF7D0" : canDismiss ? cfg.border : "#E5E7EB"}`,
                        background: item.actionCompletee ? "#F0FDF4" : "#fff",
                        color: item.actionCompletee ? "#166534" : canDismiss ? cfg.text : "#9CA3AF",
                        cursor: canDismiss ? "pointer" : "not-allowed",
                        opacity: canDismiss ? 1 : 0.4,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13,
                      }}
                    >
                      ✓
                    </button>
                  </div>
                </div>
                {i < paged.length - 1 && <div style={{ height: 1, background: "#F3F4F6" }} />}
              </div>
            );
          })}

          {/* Pagination + Voir tout */}
          {(pages > 1 || activite.length > PAGE_SIZE) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #F3F4F6", marginTop: 4 }}>
              <div style={{ display: "flex", gap: 2 }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ padding: "2px 8px", fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.3 : 1 }}
                >←</button>
                <span style={{ fontSize: 12, color: "#9CA3AF", alignSelf: "center" }}>{page + 1} / {pages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={page >= pages - 1}
                  style={{ padding: "2px 8px", fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: page >= pages - 1 ? "default" : "pointer", opacity: page >= pages - 1 ? 0.3 : 1 }}
                >→</button>
              </div>
              <Link
                href={`/client/${clientId}/support`}
                style={{ fontSize: 12, color: "#0362E3", textDecoration: "none", fontWeight: 500 }}
              >
                Voir tout →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
