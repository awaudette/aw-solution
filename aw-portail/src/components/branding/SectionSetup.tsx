"use client";

import { useState, useEffect } from "react";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandingMain } from "@/types/branding";
import { Settings, CheckCircle2, Info } from "lucide-react";

const FIELD: React.CSSProperties = {
  width: "100%", border: "1px solid #E5E7EB", borderRadius: 8,
  padding: "10px 14px", fontSize: 14, color: "#1F2937",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const LABEL: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6, display: "block",
};

const POS_OPTIONS = ["Square", "Lightspeed", "Toast", "Clover", "Maitre'D", "Aloha", "Aucun", "Autre"];

interface Props {
  clientId: string;
  main: Partial<BrandingMain>;
  isComplete: boolean;
}

export function SectionSetup({ clientId, main, isComplete }: Props) {
  const [form, setForm] = useState({
    posUtilise: "", posAutre: "", iPad: false, cleAPI: "", descriptionSetup: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      posUtilise:     main.posUtilise ?? "",
      posAutre:       main.posAutre ?? "",
      iPad:           main.iPad ?? false,
      cleAPI:         main.cleAPI ?? "",
      descriptionSetup: main.descriptionSetup ?? "",
    });
  }, [main]);

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  const canSave = !!form.posUtilise;

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { ...form, completedSections: arrayUnion("setup") },
        { merge: true }
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="section-setup" style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F0FDF4", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Settings size={20} color="#16A34A" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Section 4 — Setup technique</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Point de vente et accès système</p>
          </div>
        </div>
        <span style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
          color: isComplete ? "#166534" : "#6B7280",
          background: isComplete ? "#F0FDF4" : "#F9FAFB",
          border: `1px solid ${isComplete ? "#BBF7D0" : "#E5E7EB"}`,
          borderRadius: 8, padding: "4px 10px", flexShrink: 0,
        }}>
          {isComplete && <CheckCircle2 size={12} />}
          {isComplete ? "Complété" : "À compléter"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={LABEL}>Système de point de vente (POS)</label>
          <select
            value={form.posUtilise}
            onChange={e => set("posUtilise", e.target.value)}
            style={{ ...FIELD, background: "#fff" }}
          >
            <option value="">— Sélectionner —</option>
            {POS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {form.posUtilise === "Autre" && (
            <div style={{ marginTop: 12 }}>
              <label style={LABEL}>Quel est votre système POS ?</label>
              <input
                value={form.posAutre}
                onChange={e => set("posAutre", e.target.value)}
                style={FIELD}
                placeholder="Nom du système…"
              />
            </div>
          )}
        </div>

        <div>
          <label style={LABEL}>iPad en caisse</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: 42, marginTop: 2 }}>
            <button
              type="button"
              onClick={() => set("iPad", !form.iPad)}
              style={{
                width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
                background: form.iPad ? "#0362E3" : "#D1D5DB", transition: "background 200ms",
                position: "relative", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: form.iPad ? 23 : 3,
                width: 22, height: 22, background: "#fff", borderRadius: "50%",
                transition: "left 200ms", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
            <span style={{ fontSize: 14, color: "#374151" }}>{form.iPad ? "Oui" : "Non"}</span>
          </div>
        </div>

        <div>
          <label style={LABEL}>Clé API du POS (si applicable)</label>
          <input
            value={form.cleAPI}
            onChange={e => set("cleAPI", e.target.value)}
            style={FIELD}
            placeholder="sk_live_xxxxxxxxxxxx"
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={LABEL}>Notes supplémentaires</label>
          <textarea
            value={form.descriptionSetup}
            onChange={e => set("descriptionSetup", e.target.value)}
            rows={3}
            style={{ ...FIELD, resize: "vertical" }}
            placeholder="Décrivez votre configuration actuelle, vos contraintes techniques, etc. Si vous avez déjà créé notre accès à votre POS, veuillez inscrire les identifiants de connexion ici."
          />
        </div>
      </div>

      {/* Note POS */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#FFFBEB", borderLeft: "3px solid #F59E0B", borderRadius: 8, padding: "12px 16px", marginTop: 20 }}>
        <Info size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: "#78350F", margin: 0, lineHeight: 1.5 }}>
          Si vous souhaitez une liaison avec votre système POS, vous devrez nous donner un accès à votre système afin que nous puissions débuter l'intégration. Nous vous contacterons à ce sujet.
        </p>
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSave} disabled={saving || !canSave} style={{
          padding: "10px 24px", borderRadius: 10, border: "none",
          cursor: saving || !canSave ? "not-allowed" : "pointer",
          background: !canSave ? "#E5E7EB" : saved ? "#22C55E" : "#0362E3",
          color: !canSave ? "#9CA3AF" : "#fff", fontSize: 14, fontWeight: 600, transition: "background 200ms",
        }}>
          {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
