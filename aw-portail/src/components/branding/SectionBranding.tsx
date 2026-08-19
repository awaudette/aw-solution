"use client";

import { useState, useEffect, useRef } from "react";
import {
  doc, setDoc, arrayUnion,
  collection, onSnapshot, addDoc, deleteDoc, Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { BrandingMain, LogoBranding } from "@/types/branding";
import { Palette, CheckCircle2, Upload, X, ImageIcon } from "lucide-react";

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

export function SectionBranding({ clientId, main, isComplete }: Props) {
  const [colors, setColors] = useState({ couleurPrincipale: "#0362E3", couleurSecondaire: "#0245A3" });
  const [logos, setLogos] = useState<LogoBranding[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingLogos, setSavingLogos] = useState(false);
  const [savedLogos, setSavedLogos] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setColors({
      couleurPrincipale: main.couleurPrincipale ?? "#0362E3",
      couleurSecondaire: main.couleurSecondaire ?? "#0245A3",
    });
  }, [main]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "clients", clientId, "branding", "main", "logos"),
      (snap) => setLogos(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogoBranding)))
    );
    return unsub;
  }, [clientId]);

  function setColor(key: string, value: string) {
    setColors(c => ({ ...c, [key]: value }));
    setSaved(false);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const storageRef = ref(storage, `clients/${clientId}/branding/logos/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await addDoc(collection(db, "clients", clientId, "branding", "main", "logos"), {
          url,
          nom: file.name,
          storageRef: storageRef.fullPath,
          uploadedAt: Timestamp.now(),
        });
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(logo: LogoBranding) {
    try {
      if (logo.storageRef) {
        await deleteObject(ref(storage, logo.storageRef));
      }
      await deleteDoc(doc(db, "clients", clientId, "branding", "main", "logos", logo.id));
    } catch {}
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { ...colors, completedSections: arrayUnion("branding") },
        { merge: true }
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLogos() {
    setSavingLogos(true);
    try {
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { logosEnregistres: true, completedSections: arrayUnion("branding") },
        { merge: true }
      );
      setSavedLogos(true);
    } finally {
      setSavingLogos(false);
    }
  }

  return (
    <div id="section-branding" style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#FDF4FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Palette size={20} color="#9333EA" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Section 2 — Branding visuel</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Couleurs et logos de votre application</p>
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

      {/* Couleurs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div>
          <label style={LABEL}>Couleur principale</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="color" value={colors.couleurPrincipale}
              onChange={e => setColor("couleurPrincipale", e.target.value)}
              style={{ width: 44, height: 40, border: "1px solid #E5E7EB", borderRadius: 8, cursor: "pointer", padding: 2, flexShrink: 0 }}
            />
            <input
              value={colors.couleurPrincipale}
              onChange={e => setColor("couleurPrincipale", e.target.value)}
              style={{ ...FIELD, width: "auto", flex: 1 }}
            />
          </div>
        </div>
        <div>
          <label style={LABEL}>Couleur secondaire</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="color" value={colors.couleurSecondaire}
              onChange={e => setColor("couleurSecondaire", e.target.value)}
              style={{ width: 44, height: 40, border: "1px solid #E5E7EB", borderRadius: 8, cursor: "pointer", padding: 2, flexShrink: 0 }}
            />
            <input
              value={colors.couleurSecondaire}
              onChange={e => setColor("couleurSecondaire", e.target.value)}
              style={{ ...FIELD, width: "auto", flex: 1 }}
            />
          </div>
        </div>
      </div>

      {/* Gradient preview */}
      <div style={{ height: 44, borderRadius: 10, marginBottom: 24, background: `linear-gradient(135deg, ${colors.couleurPrincipale}, ${colors.couleurSecondaire})` }} />

      <div style={{ marginBottom: 24, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSave} disabled={saving} style={{
          padding: "10px 24px", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer",
          background: saved ? "#22C55E" : "#0362E3", color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 200ms",
        }}>
          {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer les couleurs"}
        </button>
      </div>

      {/* Logos upload */}
      <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 24 }}>
        <label style={{ ...LABEL, fontSize: 14, marginBottom: 10 }}>Logos</label>

        {/* Note */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#EFF6FF", borderLeft: "3px solid #0362E3", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#1E40AF", margin: 0, lineHeight: 1.5 }}>
            Vous pouvez déposer plusieurs versions de votre logo — fond blanc, fond noir, fond transparent, différents formats. Plus vous en fournissez, mieux c'est.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          style={{
            border: `2px dashed ${dragOver ? "#0362E3" : "#D1D5DB"}`,
            borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer",
            background: dragOver ? "#EFF6FF" : "#F9FAFB", transition: "all 150ms", marginBottom: 16,
          }}
        >
          <input
            ref={inputRef} type="file" multiple
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={e => handleFiles(e.target.files)}
          />
          {uploading ? (
            <p style={{ fontSize: 14, color: "#0362E3", margin: 0, fontWeight: 500 }}>Envoi en cours…</p>
          ) : (
            <>
              <Upload size={24} color="#9CA3AF" style={{ margin: "0 auto 10px" }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#374151", margin: "0 0 4px" }}>Cliquez ou glissez vos fichiers ici</p>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>PNG, SVG, JPG acceptés</p>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {logos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12, marginBottom: 16 }}>
            {logos.map(logo => (
              <div key={logo.id} style={{ position: "relative", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}>
                  {logo.url ? (
                    <img src={logo.url} alt={logo.nom} style={{ maxWidth: "100%", maxHeight: 70, objectFit: "contain" }} />
                  ) : (
                    <ImageIcon size={28} color="#D1D5DB" />
                  )}
                </div>
                <div style={{ padding: "6px 10px", borderTop: "1px solid #F3F4F6" }}>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{logo.nom}</p>
                </div>
                <button
                  onClick={() => handleDelete(logo)}
                  style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#EF4444", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSaveLogos} disabled={savingLogos || logos.length === 0} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            cursor: savingLogos || logos.length === 0 ? "not-allowed" : "pointer",
            background: logos.length === 0 ? "#E5E7EB" : savedLogos ? "#22C55E" : "#0362E3",
            color: logos.length === 0 ? "#9CA3AF" : "#fff", fontSize: 14, fontWeight: 600, transition: "background 200ms",
          }}>
            {savingLogos ? "Enregistrement…" : savedLogos ? "✓ Logos enregistrés" : "Enregistrer les logos"}
          </button>
        </div>
      </div>
    </div>
  );
}
