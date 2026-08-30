"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, query, orderBy, onSnapshot, getDocs, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RendezVous, RdvStatut } from "@/types/calendrier";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useRequireSection } from "@/components/admin/AdminAccessProvider";

const STATUT_CFG: Record<RdvStatut, { label: string; color: string; bg: string; border: string }> = {
  en_attente: { label: "En attente",  color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  accepte:    { label: "Confirmé ✓",  color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" },
  refuse:     { label: "Refusé",      color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
  modifie:    { label: "Modifié",     color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
};

function formatDateCourt(date: string) {
  return new Date(date + "T12:00").toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" });
}

interface RdvAvecClient extends RendezVous {
  clientId: string;
  clientNom: string;
}

export default function AdminCalendrierPage() {
  const { ready } = useRequireSection("calendrier");
  const router = useRouter();
  const [rdvs,    setRdvs]    = useState<RdvAvecClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre,  setFiltre]  = useState<"tous" | "a_venir" | "en_attente">("a_venir");

  useEffect(() => {
    // Écoute la liste des clients, puis agrège leurs RDV
    const unsubClients = onSnapshot(collection(db, "clients"), async (clientsSnap) => {
      const all: RdvAvecClient[] = [];

      await Promise.all(
        clientsSnap.docs.map(async (clientDoc) => {
          const clientId  = clientDoc.id;
          const clientNom = clientDoc.data().nom ?? "";
          const rdvSnap   = await getDocs(
            query(collection(db, "clients", clientId, "rendezvous"), orderBy("date", "asc"))
          );
          rdvSnap.docs.forEach(d => {
            all.push({ id: d.id, ...d.data(), clientId, clientNom } as RdvAvecClient);
          });
        })
      );

      all.sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));
      setRdvs(all);
      setLoading(false);
    });

    return () => unsubClients();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = rdvs.filter(r => {
    if (filtre === "a_venir")   return r.date >= today;
    if (filtre === "en_attente") return r.statut === "en_attente";
    return true;
  });

  // Grouper par date
  const grouped = filtered.reduce<Record<string, RdvAvecClient[]>>((acc, rdv) => {
    (acc[rdv.date] ??= []).push(rdv);
    return acc;
  }, {});

  const countEnAttente = rdvs.filter(r => r.statut === "en_attente").length;
  const countAVenir    = rdvs.filter(r => r.date >= today).length;

  if (!ready) return null;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendrier</h1>
          <p className="text-sm text-gray-500 mt-0.5">Toutes vos rencontres avec vos clients</p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "À venir", count: countAVenir,    color: "#0362E3", bg: "#EFF6FF" },
          { label: "En attente", count: countEnAttente, color: "#92400E", bg: "#FFFBEB" },
          { label: "Total",   count: rdvs.length,    color: "#374151", bg: "#F9FAFB" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: "1px solid #F3F4F6", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: s.color, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0 }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["a_venir", "en_attente", "tous"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid",
              borderColor: filtre === f ? "#0362E3" : "#E5E7EB",
              background: filtre === f ? "#EFF6FF" : "#fff",
              color: filtre === f ? "#0362E3" : "#6B7280",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {f === "a_venir" ? "À venir" : f === "en_attente" ? "En attente" : "Tous"}
          </button>
        ))}
      </div>

      {/* Liste groupée par date */}
      {loading ? (
        <p style={{ fontSize: 13, color: "#9CA3AF" }}>Chargement…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "48px 32px", textAlign: "center", border: "1px solid #F3F4F6" }}>
          <CalendarDays size={28} color="#D1D5DB" style={{ margin: "0 auto 10px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>Aucune rencontre</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Planifiez des rencontres depuis les fiches client.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.entries(grouped).map(([date, rdvsOfDay]) => (
            <div key={date}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: date === today ? "#0362E3" : "#9CA3AF",
                textTransform: "uppercase", letterSpacing: "0.07em",
                margin: "0 0 8px", paddingBottom: 6,
                borderBottom: `1px solid ${date === today ? "#BFDBFE" : "#F3F4F6"}`,
              }}>
                {date === today ? "Aujourd'hui — " : ""}{formatDateCourt(date)}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rdvsOfDay.map(rdv => {
                  const cfg = STATUT_CFG[rdv.statut];
                  return (
                    <div
                      key={rdv.id}
                      onClick={() => router.push(`/admin/clients/${rdv.clientId}?tab=calendrier`)}
                      style={{
                        background: "#fff", border: `1px solid ${cfg.border}`,
                        borderRadius: 10, padding: "12px 16px",
                        display: "flex", alignItems: "center", gap: 12,
                        cursor: "pointer", transition: "box-shadow 0.12s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                    >
                      {/* Heure */}
                      <div style={{ width: 44, flexShrink: 0, textAlign: "center" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: 0 }}>{rdv.heure}</p>
                      </div>

                      {/* Séparateur */}
                      <div style={{ width: 2, height: 36, background: cfg.border, borderRadius: 2, flexShrink: 0 }} />

                      {/* Infos */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {rdv.titre}
                        </p>
                        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{rdv.clientNom}</p>
                      </div>

                      {/* Statut */}
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                        flexShrink: 0,
                      }}>
                        {cfg.label}
                      </span>

                      <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
