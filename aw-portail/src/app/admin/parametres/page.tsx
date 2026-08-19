"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, Save } from "lucide-react";

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 20, overflow: "hidden",
};
const CARD_HEADER: React.CSSProperties = {
  padding: "18px 24px", borderBottom: "1px solid #F3F4F6",
};
const CARD_BODY: React.CSSProperties = { padding: "22px 24px" };
const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 9,
  border: "1px solid #E5E7EB", fontSize: 14, color: "#1F2937",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#6B7280",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};
const BTN_BLUE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "10px 20px", borderRadius: 9, border: "none",
  background: "#0362E3", color: "#fff", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};

type StatutType = "operational" | "maintenance" | "incident";

interface StatutConfig {
  statut: StatutType;
  message: string;
  updatedAt?: Date;
}

const STATUT_OPTIONS: { value: StatutType; label: string; dot: string; bg: string; color: string }[] = [
  { value: "operational", label: "Opérationnel",     dot: "#16A34A", bg: "#F0FDF4", color: "#166534" },
  { value: "maintenance", label: "Maintenance",       dot: "#D97706", bg: "#FFFBEB", color: "#B45309" },
  { value: "incident",    label: "Incident en cours", dot: "#DC2626", bg: "#FEF2F2", color: "#DC2626" },
];

// ─── Bloc Statut de la plateforme ─────────────────────────────────────────────

function StatutPlatformeSection() {
  const [statut,   setStatut]   = useState<StatutType>("operational");
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [lastSave, setLastSave] = useState<Date | null>(null);
  const [initData, setInitData] = useState<StatutConfig | null>(null);

  useEffect(() => {
    getDoc(doc(db, "admin_config", "statut_plateforme")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        const cfg: StatutConfig = {
          statut:    d.statut ?? "operational",
          message:   d.message ?? "",
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : undefined,
        };
        setStatut(cfg.statut);
        setMessage(cfg.message);
        setLastSave(cfg.updatedAt ?? null);
        setInitData({ statut: cfg.statut, message: cfg.message });
      } else {
        setInitData({ statut: "operational", message: "" });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const isDirty = initData !== null && (statut !== initData.statut || message !== initData.message);

  async function handleSave() {
    setSaving(true);
    try {
      const now = Timestamp.now();
      await setDoc(doc(db, "admin_config", "statut_plateforme"), {
        statut, message: message.trim(), updatedAt: now,
      });
      setLastSave(now.toDate());
      setInitData({ statut, message: message.trim() });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const selectedOpt = STATUT_OPTIONS.find(o => o.value === statut)!;

  if (loading) {
    return <p style={{ fontSize: 13, color: "#9CA3AF" }}>Chargement…</p>;
  }

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Statut de la plateforme</p>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>
          Visible par tous les clients en bas de la page Support.
        </p>
      </div>
      <div style={CARD_BODY}>

        {/* Aperçu actuel */}
        <div style={{ padding: "12px 16px", borderRadius: 10, background: selectedOpt.bg, border: `1px solid ${statut === "operational" ? "#BBF7D0" : statut === "maintenance" ? "#FDE68A" : "#FECACA"}`, fontSize: 13, color: selectedOpt.color, display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: selectedOpt.dot, flexShrink: 0 }} />
          <span>
            {statut === "operational"
              ? "Tous les systèmes sont opérationnels"
              : `${selectedOpt.label}${message.trim() ? ` — ${message.trim()}` : ""}`}
          </span>
          {lastSave && (
            <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto", whiteSpace: "nowrap" }}>
              Mis à jour {lastSave.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })} le {lastSave.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>

        {/* Sélection du statut */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>Statut *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STATUT_OPTIONS.map(opt => {
              const sel = statut === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatut(opt.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "13px 16px", borderRadius: 11,
                    border: `2px solid ${sel ? (opt.value === "operational" ? "#16A34A" : opt.value === "maintenance" ? "#D97706" : "#DC2626") : "#E5E7EB"}`,
                    background: sel ? opt.bg : "#fff", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `2px solid ${sel ? (opt.value === "operational" ? "#16A34A" : opt.value === "maintenance" ? "#D97706" : "#DC2626") : "#D1D5DB"}`,
                    background: sel ? (opt.value === "operational" ? "#16A34A" : opt.value === "maintenance" ? "#D97706" : "#DC2626") : "transparent",
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {sel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: opt.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? opt.color : "#374151" }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message optionnel (caché si operational) */}
        {statut !== "operational" && (
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Message affiché aux clients (optionnel)</label>
            <input
              style={INPUT}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={statut === "maintenance"
                ? "Ex. : Mise à jour planifiée de 2h à 4h du matin"
                : "Ex. : Lenteurs signalées sur le tableau de bord — équipe mobilisée"}
            />
          </div>
        )}

        {saved && (
          <div style={{ marginBottom: 14, padding: "9px 13px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 13, color: "#166534", display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={14} /> Statut mis à jour avec succès.
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          style={{ ...BTN_BLUE, opacity: saving || !isDirty ? 0.4 : 1, cursor: saving || !isDirty ? "not-allowed" : "pointer" }}
        >
          <Save size={14} /> {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>

        {!isDirty && !saved && (
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>Aucun changement en attente</p>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function ParametresAdminPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px" }}>Paramètres</h1>
        <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Configuration globale de la plateforme.</p>
      </div>

      <StatutPlatformeSection />

      {/* Espace pour futurs blocs */}
    </div>
  );
}
