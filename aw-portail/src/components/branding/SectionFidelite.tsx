"use client";

import { useState, useEffect, useRef } from "react";
import {
  doc, setDoc, arrayUnion,
  collection, onSnapshot, query, orderBy,
  addDoc, deleteDoc, Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { BrandingMain, Recompense } from "@/types/branding";
import { Star, CheckCircle2, Plus, Trash2, ImageIcon } from "lucide-react";

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

const EMPTY_R = { nom: "", description: "", valeurPts: 100, imageFile: null as File | null };

export function SectionFidelite({ clientId, main, isComplete }: Props) {
  const [ratio, setRatio] = useState(5);
  const [recompenses, setRecompenses] = useState<Recompense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newR, setNewR] = useState(EMPTY_R);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingR, setAddingR] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRatio(main.ratioPointsParDollar ?? 5);
  }, [main]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(
        collection(db, "clients", clientId, "branding", "main", "recompenses"),
        orderBy("ordre")
      ),
      (snap) => setRecompenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Recompense)))
    );
    return unsub;
  }, [clientId]);

  function handleImageSelect(file: File) {
    setNewR(r => ({ ...r, imageFile: file }));
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { ratioPointsParDollar: ratio, completedSections: arrayUnion("fidelite") },
        { merge: true }
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRecompense() {
    if (!newR.nom.trim()) return;
    setAddingR(true);
    try {
      let imageUrl = "";
      let storageRefPath = "";
      if (newR.imageFile) {
        const storageRef = ref(storage, `clients/${clientId}/branding/recompenses/${Date.now()}_${newR.imageFile.name}`);
        await uploadBytes(storageRef, newR.imageFile);
        imageUrl = await getDownloadURL(storageRef);
        storageRefPath = storageRef.fullPath;
      }
      await addDoc(
        collection(db, "clients", clientId, "branding", "main", "recompenses"),
        {
          nom: newR.nom, description: newR.description,
          valeurPts: newR.valeurPts, imageUrl, storageRef: storageRefPath,
          ordre: recompenses.length + 1, createdAt: Timestamp.now(),
        }
      );
      setNewR(EMPTY_R);
      setImagePreview(null);
      setShowAdd(false);
    } finally {
      setAddingR(false);
    }
  }

  async function handleDeleteRecompense(id: string) {
    await deleteDoc(doc(db, "clients", clientId, "branding", "main", "recompenses", id));
  }

  // Dynamic spending calculation
  const dollarsPourRecompense = newR.valeurPts > 0 && ratio > 0
    ? Math.ceil(newR.valeurPts / ratio)
    : null;

  return (
    <div id="section-fidelite" style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#FFFBEB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Star size={20} color="#D97706" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Section 3 — Programme de fidélité</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Ratio de points et récompenses</p>
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

      {/* Ratio */}
      <div style={{ marginBottom: 6 }}>
        <label style={LABEL}>Points par dollar dépensé</label>
        <input
          type="number" min={1} step={1} value={ratio}
          onChange={e => { setRatio(Number(e.target.value)); setSaved(false); }}
          style={{ ...FIELD, maxWidth: 200 }}
        />
      </div>
      <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 24px" }}>La norme habituelle est de 5 pts par dollar dépensé</p>

      {/* Récompenses */}
      <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Récompenses ({recompenses.length})</p>
          <button
            onClick={() => setShowAdd(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #0362E3", background: "transparent", color: "#0362E3", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {recompenses.length === 0 && !showAdd && (
          <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "16px 0", margin: 0 }}>
            Aucune récompense — ajoutez-en une pour commencer
          </p>
        )}

        {recompenses.map((r) => (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", background: "#F9FAFB",
            borderRadius: 10, marginBottom: 8, border: "1px solid #F3F4F6",
          }}>
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.nom} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ImageIcon size={18} color="#9CA3AF" />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>{r.nom}</p>
              {r.description && <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>{r.description}</p>}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "3px 10px", display: "block" }}>
                {r.valeurPts} pts
              </span>
              {ratio > 0 && (
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
                  ≈ {Math.ceil(r.valeurPts / ratio)}$ à dépenser
                </p>
              )}
            </div>
            <button
              onClick={() => handleDeleteRecompense(r.id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#EF4444", display: "flex" }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {showAdd && (
          <div style={{ padding: 20, background: "#F9FAFB", borderRadius: 10, marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={LABEL}>Nom de la récompense</label>
                <input value={newR.nom} onChange={e => setNewR(r => ({ ...r, nom: e.target.value }))} style={FIELD} placeholder="Café gratuit" />
              </div>
              <div>
                <label style={LABEL}>Valeur en points</label>
                <input
                  type="number" min={1} value={newR.valeurPts}
                  onChange={e => setNewR(r => ({ ...r, valeurPts: Number(e.target.value) }))}
                  style={FIELD}
                />
                {dollarsPourRecompense && (
                  <p style={{ fontSize: 12, color: "#0362E3", margin: "6px 0 0" }}>
                    Le client doit dépenser {dollarsPourRecompense}$ pour atteindre cette récompense
                  </p>
                )}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL}>Description (optionnel)</label>
                <input value={newR.description} onChange={e => setNewR(r => ({ ...r, description: e.target.value }))} style={FIELD} placeholder="Un café au lait de votre choix" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL}>Image (optionnel)</label>
                <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
                {imagePreview ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={imagePreview} alt="Aperçu" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />
                    <button onClick={() => { setImagePreview(null); setNewR(r => ({ ...r, imageFile: null })); }} style={{ fontSize: 12, color: "#EF4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Retirer</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, border: "1px dashed #D1D5DB", background: "#fff", color: "#6B7280", fontSize: 13, cursor: "pointer", width: "100%" }}
                  >
                    <ImageIcon size={16} /> Choisir une image
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowAdd(false); setNewR(EMPTY_R); setImagePreview(null); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}>Annuler</button>
              <button onClick={handleAddRecompense} disabled={addingR || !newR.nom.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0362E3", color: "#fff", fontSize: 13, fontWeight: 600, cursor: addingR ? "not-allowed" : "pointer" }}>
                {addingR ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSave} disabled={saving || !ratio || recompenses.length === 0} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            cursor: saving || !ratio || recompenses.length === 0 ? "not-allowed" : "pointer",
            background: !ratio || recompenses.length === 0 ? "#E5E7EB" : saved ? "#22C55E" : "#0362E3",
            color: !ratio || recompenses.length === 0 ? "#9CA3AF" : "#fff",
            fontSize: 14, fontWeight: 600, transition: "background 200ms",
          }}>
            {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
