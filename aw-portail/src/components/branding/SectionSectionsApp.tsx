"use client";

import { useState, useEffect } from "react";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandingMain } from "@/types/branding";
import { LayoutGrid, CheckCircle2 } from "lucide-react";

const SECTIONS_PAR_DEFAUT = [
  { key: "accueil",               label: "Accueil",                      desc: "Page d'accueil avec solde de points et offres" },
  { key: "recompenses",           label: "Récompenses",                  desc: "Catalogue de récompenses échangeables" },
  { key: "promotions",            label: "Promotions",                   desc: "Offres et promotions en cours" },
  { key: "bonus",                 label: "Bonus",                        desc: "Outil de gamification favorisant l'engagement quotidien de vos membres" },
  { key: "menu",                  label: "Menu",                         desc: "Menu complet du restaurant" },
  { key: "profilMembre",          label: "Profil membre",                desc: "Profil personnalisé avec historique et niveau de fidélité" },
  { key: "historiqueTransactions",label: "Historique des transactions",  desc: "Toutes les transactions et points accumulés" },
];

const SECTIONS_OPTIONNELLES = [
  { key: "galerie",        label: "Galerie photos",               desc: "Photos du restaurant et de vos plats" },
  { key: "reservation",    label: "Réservation (lien externe)",   desc: "Lien vers votre outil de réservation" },
  { key: "commandeEnLigne",label: "Commande en ligne (lien ext.)",desc: "Lien vers votre plateforme de commande" },
  { key: "evenements",     label: "Événements & activités",       desc: "Agenda des événements spéciaux" },
  { key: "carteSuccursales",label: "Carte des succursales",       desc: "Localisation de toutes vos adresses" },
  { key: "parrainage",     label: "Programme de parrainage",      desc: "Invitez des amis, gagnez des points" },
  { key: "filActualites",  label: "Fil d'actualités",             desc: "Nouvelles et annonces du restaurant" },
];

const DEFAULTS = SECTIONS_PAR_DEFAUT.map(s => s.key);

interface Props {
  clientId: string;
  main: Partial<BrandingMain>;
  isComplete: boolean;
}

export function SectionSectionsApp({ clientId, main, isComplete }: Props) {
  const [selected, setSelected] = useState<string[]>(DEFAULTS);
  const [autreChecked, setAutreChecked] = useState(false);
  const [autreTexte, setAutreTexte] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (Array.isArray(main.sectionsApp) && main.sectionsApp.length > 0) {
      const withoutAutre = main.sectionsApp.filter(k => k !== "autre");
      setSelected(withoutAutre);
      setAutreChecked(main.sectionsApp.includes("autre"));
    }
    setAutreTexte(main.sectionsAppAutre ?? "");
  }, [main]);

  function toggle(key: string) {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const sectionsApp = autreChecked ? [...selected, "autre"] : selected;
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { sectionsApp, sectionsAppAutre: autreTexte, completedSections: arrayUnion("sections") },
        { merge: true }
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function SectionRow({ sKey, label, desc, checked }: { sKey: string; label: string; desc: string; checked: boolean }) {
    return (
      <div
        onClick={() => { toggle(sKey); setSaved(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "13px 16px", borderRadius: 10, cursor: "pointer",
          border: `1px solid ${checked ? "#BFDBFE" : "#E5E7EB"}`,
          background: checked ? "#EFF6FF" : "#F9FAFB",
          transition: "all 150ms",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${checked ? "#0362E3" : "#D1D5DB"}`,
          background: checked ? "#0362E3" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 150ms",
        }}>
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: checked ? 600 : 400, color: "#0A0A0A", margin: 0 }}>{label}</p>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "1px 0 0" }}>{desc}</p>
        </div>
      </div>
    );
  }

  return (
    <div id="section-sections" style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F0F9FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LayoutGrid size={20} color="#0284C7" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Section 5 — Sections de l'application</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Choisissez les sections à inclure dans votre app</p>
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

      {/* Sections par défaut */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Incluses par défaut</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {SECTIONS_PAR_DEFAUT.map(({ key, label, desc }) => (
          <SectionRow key={key} sKey={key} label={label} desc={desc} checked={selected.includes(key)} />
        ))}
      </div>

      {/* Sections optionnelles */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Sections optionnelles</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {SECTIONS_OPTIONNELLES.map(({ key, label, desc }) => (
          <SectionRow key={key} sKey={key} label={label} desc={desc} checked={selected.includes(key)} />
        ))}

        {/* Autre */}
        <div style={{
          borderRadius: 10, border: `1px solid ${autreChecked ? "#BFDBFE" : "#E5E7EB"}`,
          background: autreChecked ? "#EFF6FF" : "#F9FAFB", overflow: "hidden",
        }}>
          <div
            onClick={() => { setAutreChecked(v => !v); setSaved(false); }}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", cursor: "pointer" }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
              border: `2px solid ${autreChecked ? "#0362E3" : "#D1D5DB"}`,
              background: autreChecked ? "#0362E3" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 150ms",
            }}>
              {autreChecked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: autreChecked ? 600 : 400, color: "#0A0A0A", margin: 0 }}>Autre</p>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "1px 0 0" }}>Une section qui ne figure pas dans la liste</p>
            </div>
          </div>
          {autreChecked && (
            <div style={{ padding: "0 16px 16px" }}>
              <textarea
                value={autreTexte}
                onChange={e => { setAutreTexte(e.target.value); setSaved(false); }}
                rows={2}
                style={{
                  width: "100%", border: "1px solid #E5E7EB", borderRadius: 8,
                  padding: "10px 14px", fontSize: 13, color: "#1F2937",
                  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  resize: "vertical", background: "#fff",
                }}
                placeholder="Décrivez la section souhaitée…"
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
          {selected.length + (autreChecked ? 1 : 0)} section{selected.length + (autreChecked ? 1 : 0) !== 1 ? "s" : ""} sélectionnée{selected.length + (autreChecked ? 1 : 0) !== 1 ? "s" : ""}
        </p>
        <button onClick={handleSave} disabled={saving} style={{
          padding: "10px 24px", borderRadius: 10, border: "none",
          cursor: saving ? "not-allowed" : "pointer",
          background: saved ? "#22C55E" : "#0362E3",
          color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 200ms",
        }}>
          {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
