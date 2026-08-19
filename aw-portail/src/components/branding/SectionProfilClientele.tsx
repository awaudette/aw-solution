"use client";

import { useState, useEffect } from "react";
import {
  doc, setDoc, getDoc, arrayUnion,
  addDoc, collection, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import { Users, CheckCircle2 } from "lucide-react";

/* ─── CSS sliders ─── */
const SLIDER_CSS = `
  input[type=range].profil-slider {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 6px; border-radius: 3px;
    background: #E5E7EB; outline: none; cursor: pointer;
  }
  input[type=range].profil-slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 20px; height: 20px; border-radius: 50%;
    background: #0362E3; cursor: pointer;
    border: 2px solid #fff; box-shadow: 0 1px 4px rgba(3,98,227,0.35);
  }
  input[type=range].profil-slider::-moz-range-thumb {
    width: 20px; height: 20px; border-radius: 50%;
    background: #0362E3; cursor: pointer; border: 2px solid #fff;
  }
`;

/* ─── Types ─── */
interface ProfilData {
  vipVisitesParMois:        number;
  vipDepenseParVisite:      number;
  regulierVisitesParMois:   number;
  regulierDepenseParVisite: number;
  seuilARisqueJours:        number;
  seuilInactifJours:        number;
  seuilPerduJours:          number;
}

const DEFAULTS: ProfilData = {
  vipVisitesParMois: 3,
  vipDepenseParVisite: 40,
  regulierVisitesParMois: 2,
  regulierDepenseParVisite: 25,
  seuilARisqueJours: 60,
  seuilInactifJours: 180,
  seuilPerduJours: 365,
};

/* ─── Helpers ─── */
function joursLabel(n: number): string {
  if (n < 60) return `${n} jours`;
  if (n === 90)  return "3 mois";
  if (n === 180) return "6 mois";
  if (n === 270) return "9 mois";
  if (n === 365) return "1 an";
  if (n === 730) return "2 ans";
  return `${n} jours`;
}

/* ─── Sub-components ─── */
function Bloc({
  numero, titre, couleur, bg, description, children,
}: {
  numero: string; titre: string; couleur: string; bg: string;
  description: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", marginBottom: 20,
    }}>
      <div style={{ background: bg, borderBottom: "1px solid #E5E7EB", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 24, height: 24, borderRadius: 6, background: couleur, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {numero}
        </span>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>{titre}</p>
      </div>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.65 }}>{description}</p>
        {children}
      </div>
    </div>
  );
}

function SliderField({
  label, value, min, max, step = 1, format, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; format: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</label>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0362E3" }}>{format(value)}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, height: 6, width: `${pct}%`, background: "#0362E3", borderRadius: "3px 0 0 3px", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          type="range" className="profil-slider"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "relative", zIndex: 1 }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{format(min)}</span>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{format(max)}</span>
      </div>
    </div>
  );
}

function DropdownField({
  label, value, options, onChange, error,
}: {
  label: string; value: number;
  options: { label: string; value: number }[];
  onChange: (v: number) => void; error?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: error ? "#DC2626" : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 9,
          border: `1px solid ${error ? "#FCA5A5" : "#E5E7EB"}`,
          fontSize: 13, color: "#374151", outline: "none",
          fontFamily: "inherit", cursor: "pointer", background: error ? "#FEF2F2" : "#fff",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function PreviewRow({ emoji, label, text }: { emoji: string; label: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}>
      <span>{emoji}</span>
      <span style={{ fontWeight: 700, color: "#374151", minWidth: 70 }}>{label} —</span>
      <span style={{ color: "#6B7280" }}>{text}</span>
    </div>
  );
}

/* ─── Main component ─── */
interface Props {
  clientId: string;
  clientNom?: string;
  isComplete?: boolean;
}

export function SectionProfilClientele({ clientId, clientNom = "", isComplete = false }: Props) {
  const [data,   setData]   = useState<ProfilData>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "clients", clientId, "branding", "main")).then(snap => {
      if (snap.exists()) {
        const pc = snap.data().profilClientele;
        if (pc) setData({ ...DEFAULTS, ...pc });
      }
      setLoaded(true);
    });
  }, [clientId]);

  /* Validation */
  const inactifOk = data.seuilInactifJours > data.seuilARisqueJours;
  const perduOk   = data.seuilPerduJours   > data.seuilInactifJours;
  const isValid   = inactifOk && perduOk;

  function set<K extends keyof ProfilData>(key: K, value: ProfilData[K]) {
    setData(d => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const now = Timestamp.now();
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { profilClientele: data, completedSections: arrayUnion("profil") },
        { merge: true }
      );
      await createNotification({
        type: "profil_mis_a_jour", destinataire: "admin",
        clientId, clientNom, auteurRole: "client",
        description: `${clientNom} a complété son profil de clientèle`,
        lien: `/admin/clients/${clientId}?tab=branding`,
      });
      setSaved(true);
    } finally { setSaving(false); }
  }

  if (!loaded) return null;

  return (
    <div id="section-profil" style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <style>{SLIDER_CSS}</style>

      {/* En-tête section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EFF6FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={20} color="#0362E3" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Section 8 — Profil de votre clientèle</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Segmentation intelligente de vos membres</p>
          </div>
        </div>
        <span style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, flexShrink: 0,
          color: isComplete ? "#166534" : "#6B7280",
          background: isComplete ? "#F0FDF4" : "#F9FAFB",
          border: `1px solid ${isComplete ? "#BBF7D0" : "#E5E7EB"}`,
          borderRadius: 8, padding: "4px 10px",
        }}>
          {isComplete && <CheckCircle2 size={12} />}
          {isComplete ? "Complété" : "À compléter"}
        </span>
      </div>

      {/* Intro */}
      <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: "#0369A1", margin: 0, lineHeight: 1.75 }}>
          Ces informations nous permettent de configurer vos segments de membres intelligemment. Prenez le temps d'y réfléchir, des seuils mal calibrés peuvent faire en sorte que la majorité de vos clients soient mal classés. Si vous n'êtes pas certain, nous vous recommandons de choisir des seuils conservateurs.
        </p>
      </div>

      {/* ── Bloc 1 : VIP ── */}
      <Bloc
        numero="1" titre="Vos meilleurs clients"
        couleur="#9333EA" bg="#FDF4FF"
        description="Pensez à vos 20 à 30 clients les plus fidèles. À quelle fréquence viennent-ils? Combien dépensent-ils habituellement?"
      >
        <SliderField
          label="Visites par mois"
          value={data.vipVisitesParMois} min={1} max={20}
          format={v => `${v}x / mois`}
          onChange={v => set("vipVisitesParMois", v)}
        />
        <SliderField
          label="Dépense moyenne par visite"
          value={data.vipDepenseParVisite} min={10} max={200} step={5}
          format={v => `${v}$`}
          onChange={v => set("vipDepenseParVisite", v)}
        />
      </Bloc>

      {/* ── Bloc 2 : Régulier ── */}
      <Bloc
        numero="2" titre="Votre clientèle régulière"
        couleur="#0362E3" bg="#EFF6FF"
        description="Un client régulier c'est quelqu'un qui revient, mais pas nécessairement toutes les semaines. Soyez réaliste, si vos clients viennent en moyenne 1 à 2 fois par mois, c'est votre client régulier."
      >
        <SliderField
          label="Visites par mois"
          value={data.regulierVisitesParMois} min={1} max={10}
          format={v => `${v}x / mois`}
          onChange={v => set("regulierVisitesParMois", v)}
        />
        <SliderField
          label="Dépense moyenne par visite"
          value={data.regulierDepenseParVisite} min={10} max={200} step={5}
          format={v => `${v}$`}
          onChange={v => set("regulierDepenseParVisite", v)}
        />
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.6 }}>
            ⚠️ Attention, si vous fixez ce seuil trop haut, la majorité de vos membres seront classés à risque dès le départ.
          </p>
        </div>
      </Bloc>

      {/* ── Bloc 3 : Seuils ── */}
      <Bloc
        numero="3" titre="Clients à risque et inactifs"
        couleur="#DC2626" bg="#FEF2F2"
        description="Un client à risque c'est quelqu'un qui ne vient plus aussi souvent qu'avant. Basez-vous sur votre réalité, si vos clients viennent normalement 2 fois par mois, alors 45 jours sans visite devrait déclencher une alerte."
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <DropdownField
            label="À risque : sans visite depuis"
            value={data.seuilARisqueJours}
            options={[
              { label: "30 jours", value: 30 },
              { label: "45 jours", value: 45 },
              { label: "60 jours", value: 60 },
              { label: "90 jours", value: 90 },
            ]}
            onChange={v => set("seuilARisqueJours", v)}
          />
          <DropdownField
            label="Inactif : sans visite depuis"
            value={data.seuilInactifJours}
            options={[
              { label: "3 mois", value: 90  },
              { label: "6 mois", value: 180 },
              { label: "9 mois", value: 270 },
            ]}
            error={!inactifOk}
            onChange={v => set("seuilInactifJours", v)}
          />
          <DropdownField
            label="Perdu : sans visite depuis"
            value={data.seuilPerduJours}
            options={[
              { label: "6 mois", value: 180 },
              { label: "9 mois", value: 270 },
              { label: "1 an",   value: 365 },
              { label: "2 ans",  value: 730 },
            ]}
            error={!perduOk}
            onChange={v => set("seuilPerduJours", v)}
          />
        </div>
        {!inactifOk && (
          <p style={{ fontSize: 12, color: "#DC2626", margin: "10px 0 0", fontWeight: 600 }}>
            ⛔ Le seuil «Inactif» doit être supérieur au seuil «À risque».
          </p>
        )}
        {inactifOk && !perduOk && (
          <p style={{ fontSize: 12, color: "#DC2626", margin: "10px 0 0", fontWeight: 600 }}>
            ⛔ Le seuil «Perdu» doit être supérieur au seuil «Inactif».
          </p>
        )}
      </Bloc>

      {/* ── Aperçu temps réel ── */}
      <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 14px" }}>Aperçu en temps réel</p>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 10px" }}>Selon vos seuils :</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <PreviewRow emoji="🏆" label="VIP"
            text={`visite ${data.vipVisitesParMois}x ou plus par mois, ou dépense ${data.vipDepenseParVisite}$ ou plus par visite`}
          />
          <PreviewRow emoji="👤" label="Régulier"
            text={`visite ${data.regulierVisitesParMois} à ${Math.max(data.vipVisitesParMois - 1, data.regulierVisitesParMois)} fois par mois`}
          />
          <PreviewRow emoji="⚠️" label="À risque"
            text={`aucune visite depuis ${joursLabel(data.seuilARisqueJours)}`}
          />
          <PreviewRow emoji="💤" label="Inactif"
            text={`aucune visite depuis ${joursLabel(data.seuilInactifJours)}`}
          />
          <PreviewRow emoji="❌" label="Perdu"
            text={`aucune visite depuis ${joursLabel(data.seuilPerduJours)}`}
          />
        </div>
      </div>

      {/* Bouton enregistrer */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving || !isValid}
          style={{
            padding: "10px 28px", borderRadius: 10, border: "none",
            background: !isValid ? "#E5E7EB" : saved ? "#22C55E" : "#0362E3",
            color: !isValid ? "#9CA3AF" : "#fff",
            fontSize: 14, fontWeight: 600, transition: "background 200ms",
            cursor: saving || !isValid ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

/* ─── Read-only admin view ─── */
export function ProfilClienteleAdminView({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ProfilData | null>(null);

  useEffect(() => {
    getDoc(doc(db, "clients", clientId, "branding", "main")).then(snap => {
      if (snap.exists()) {
        const pc = snap.data().profilClientele;
        if (pc) setData({ ...DEFAULTS, ...pc });
      }
    });
  }, [clientId]);

  if (!data) return (
    <div style={{ padding: "20px 0", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Le client n'a pas encore rempli cette section.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* VIP + Régulier */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <AdminStatCard
          titre="🏆 VIP" couleur="#9333EA" bg="#FDF4FF"
          rows={[
            { label: "Visites / mois", value: `${data.vipVisitesParMois}x ou plus` },
            { label: "Dépense / visite", value: `${data.vipDepenseParVisite}$ ou plus` },
          ]}
        />
        <AdminStatCard
          titre="👤 Régulier" couleur="#0362E3" bg="#EFF6FF"
          rows={[
            { label: "Visites / mois", value: `${data.regulierVisitesParMois}x ou plus` },
            { label: "Dépense / visite", value: `${data.regulierDepenseParVisite}$ ou plus` },
          ]}
        />
      </div>

      {/* Seuils inactivité */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <AdminStatCard
          titre="⚠️ À risque" couleur="#D97706" bg="#FFFBEB"
          rows={[{ label: "Sans visite depuis", value: joursLabel(data.seuilARisqueJours) }]}
        />
        <AdminStatCard
          titre="💤 Inactif" couleur="#6B7280" bg="#F9FAFB"
          rows={[{ label: "Sans visite depuis", value: joursLabel(data.seuilInactifJours) }]}
        />
        <AdminStatCard
          titre="❌ Perdu" couleur="#DC2626" bg="#FEF2F2"
          rows={[{ label: "Sans visite depuis", value: joursLabel(data.seuilPerduJours) }]}
        />
      </div>
    </div>
  );
}

function AdminStatCard({ titre, couleur, bg, rows }: {
  titre: string; couleur: string; bg: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div style={{ background: bg, border: "1px solid #E5E7EB", borderRadius: 10, padding: "14px 16px" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: couleur, margin: "0 0 10px" }}>{titre}</p>
      {rows.map(r => (
        <div key={r.label} style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px" }}>{r.label}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{r.value}</p>
        </div>
      ))}
    </div>
  );
}
