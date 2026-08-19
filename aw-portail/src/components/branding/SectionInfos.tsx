"use client";

import { useState, useEffect } from "react";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandingMain } from "@/types/branding";
import { Building2, CheckCircle2 } from "lucide-react";

const FIELD: React.CSSProperties = {
  width: "100%", border: "1px solid #E5E7EB", borderRadius: 8,
  padding: "10px 14px", fontSize: 14, color: "#1F2937",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const LABEL: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6, display: "block",
};

interface Props {
  clientId: string;
  main: Partial<BrandingMain>;
  isComplete: boolean;
}

export function SectionInfos({ clientId, main, isComplete }: Props) {
  const [form, setForm] = useState({
    nomLegal: "", adresse: "", neq: "",
    nomContactPrincipal: "", roleContactPrincipal: "",
    telephoneEntreprise: "", telephoneContact: "",
    courrielEntreprise: "", courrielContact: "",
    slogan: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      nomLegal:             main.nomLegal ?? "",
      adresse:              main.adresse ?? "",
      neq:                  main.neq ?? "",
      nomContactPrincipal:  main.nomContactPrincipal ?? "",
      roleContactPrincipal: main.roleContactPrincipal ?? "",
      telephoneEntreprise:  main.telephoneEntreprise ?? "",
      telephoneContact:     main.telephoneContact ?? "",
      courrielEntreprise:   main.courrielEntreprise ?? "",
      courrielContact:      main.courrielContact ?? "",
      slogan:               main.slogan ?? "",
    });
  }, [main]);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(f => ({ ...f, [key]: e.target.value }));
        setSaved(false);
      },
    };
  }

  const canSave = !!(
    form.nomLegal.trim() && form.adresse.trim() &&
    form.telephoneEntreprise.trim() && form.telephoneContact.trim() &&
    form.courrielEntreprise.trim() && form.courrielContact.trim() &&
    form.nomContactPrincipal.trim() && form.roleContactPrincipal.trim()
  );

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { ...form, completedSections: arrayUnion("infos") },
        { merge: true }
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="section-infos" style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EFF6FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building2 size={20} color="#0362E3" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Section 1 — Informations de l'entreprise</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Coordonnées légales et contacts</p>
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

      {/* Informations légales */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>Informations légales</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={LABEL}>Nom légal de l'entreprise</label>
          <input {...field("nomLegal")} style={FIELD} placeholder="Les Restaurants ABC inc." />
        </div>
        <div>
          <label style={LABEL}>NEQ (Numéro d'entreprise du Québec)</label>
          <input {...field("neq")} style={FIELD} placeholder="1234567890" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={LABEL}>Adresse</label>
          <input {...field("adresse")} style={FIELD} placeholder="123 rue Exemple, Montréal, QC H1A 2B3" />
        </div>
      </div>

      {/* Contact principal */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>Contact principal</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={LABEL}>Nom du contact principal</label>
          <input {...field("nomContactPrincipal")} style={FIELD} placeholder="Marie Tremblay" />
        </div>
        <div>
          <label style={LABEL}>Rôle</label>
          <input {...field("roleContactPrincipal")} style={FIELD} placeholder="Propriétaire, Directeur général…" />
        </div>
        <div>
          <label style={LABEL}>Téléphone de l'entreprise</label>
          <input {...field("telephoneEntreprise")} style={FIELD} placeholder="514-555-0000" />
        </div>
        <div>
          <label style={LABEL}>Téléphone du contact</label>
          <input {...field("telephoneContact")} style={FIELD} placeholder="438-555-0000" />
        </div>
        <div>
          <label style={LABEL}>Courriel de l'entreprise</label>
          <input type="email" {...field("courrielEntreprise")} style={FIELD} placeholder="info@restaurant.ca" />
        </div>
        <div>
          <label style={LABEL}>Courriel du contact</label>
          <input type="email" {...field("courrielContact")} style={FIELD} placeholder="marie@restaurant.ca" />
        </div>
      </div>

      {/* Slogan */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>Identité de marque</p>
      <div>
        <label style={LABEL}>Slogan</label>
        <input {...field("slogan")} style={FIELD} placeholder="Chaque visite compte. Chaque client aussi." />
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
