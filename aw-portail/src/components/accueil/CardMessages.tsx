"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MessageItem } from "@/hooks/useClientData";

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateRelative(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)     return "à l'instant";
  if (s < 3600)   return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400)  return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

function truncate(s: string, n = 80) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

const PALETTE: [string, string][] = [
  ["#EFF6FF", "#1D4ED8"], ["#F0FDF4", "#166534"],
  ["#FFF7ED", "#9A3412"], ["#FAF5FF", "#6B21A8"], ["#FFF1F2", "#9F1239"],
];
function avatarColor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function initiales(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Composant ──────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #F3F4F6",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

interface CardMessagesProps {
  clientId: string;
  messages: MessageItem[];
}

export function CardMessages({ clientId, messages }: CardMessagesProps) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Tous les messages admin, non cachés localement
  const visible = messages.filter(
    (m) => (m.auteurRole as string) === "admin" && !hidden.has(m.id)
  );
  const nonLus = visible.filter((m) => !m.lu).length;

  function handleVoir(m: MessageItem) {
    // Voir = navigation seulement, sans marquer comme lu
    const dest = m.lien ? `/client/${clientId}/${m.lien}` : `/client/${clientId}/support`;
    router.push(dest);
  }

  async function handleMarquerLu(m: MessageItem) {
    // Crochet = marquer comme lu + masquer de la card, sans naviguer
    await updateDoc(doc(db, "clients", clientId, "messages", m.id), { lu: true });
    setHidden((prev) => new Set([...prev, m.id]));
  }

  function typeTag(typeMsg?: string) {
    if (typeMsg === "nouveaute")   return { color: "#9333EA", bg: "#FDF4FF", label: "Nouveauté" };
    if (typeMsg === "mise_a_jour") return { color: "#1D4ED8", bg: "#EFF6FF", label: "Mise à jour" };
    return null;
  }

  return (
    <div style={CARD}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Messages</p>
        {nonLus > 0 && (
          <span style={{ minWidth: 20, height: 20, padding: "0 6px", background: "#EF4444", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {nonLus}
          </span>
        )}
      </div>

      {/* Liste */}
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <MessageSquare size={26} color="#E5E7EB" style={{ margin: "0 auto 8px" }} />
          <p style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 0 }}>Aucun message non lu</p>
        </div>
      ) : (
        visible.map((m, i) => {
          const [bg, fg] = avatarColor(m.auteur);
          const tag = typeTag(m.typeMsg);
          return (
            <div key={m.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0" }}>
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, color: fg, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {initiales(m.auteur)}
                </div>
                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>{m.auteur}</p>
                    {!m.lu && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0362E3", display: "inline-block", flexShrink: 0 }} />}
                    {tag && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: tag.bg, color: tag.color, flexShrink: 0 }}>
                        {tag.label}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "#6B7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {truncate(m.texte)}
                  </p>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, whiteSpace: "nowrap" }}>{dateRelative(m.date)}</p>
                  <button
                    onClick={() => handleVoir(m)}
                    style={{ fontSize: 11, fontWeight: 500, color: "#0362E3", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "3px 9px", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Voir
                  </button>
                  <button
                    onClick={() => handleMarquerLu(m)}
                    title="Marquer comme lu"
                    style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", color: "#9CA3AF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                  >
                    ✓
                  </button>
                </div>
              </div>
              {i < visible.length - 1 && <div style={{ height: 1, background: "#F3F4F6" }} />}
            </div>
          );
        })
      )}

      {/* Bouton envoyer — toujours visible */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #F3F4F6", textAlign: "center" }}>
        <Link
          href={`/client/${clientId}/support`}
          style={{ fontSize: 13, color: "#0362E3", border: "1px solid #0362E3", borderRadius: 8, padding: "7px 16px", fontWeight: 500, display: "inline-block", textDecoration: "none" }}
        >
          Envoyer un message
        </Link>
      </div>
    </div>
  );
}
