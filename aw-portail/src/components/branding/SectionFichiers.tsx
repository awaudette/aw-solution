"use client";

import { useState, useEffect, useRef } from "react";
import {
  doc, setDoc, arrayUnion,
  collection, onSnapshot, addDoc, deleteDoc, Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { FichierBranding, StatutFichier } from "@/types/branding";
import { Paperclip, CheckCircle2, Upload, ExternalLink, Trash2 } from "lucide-react";

const STATUT_STYLE: Record<StatutFichier, { label: string; color: string; bg: string; border: string }> = {
  recu:          { label: "Reçu",          color: "#374151", bg: "#F3F4F6", border: "#E5E7EB" },
  en_traitement: { label: "En traitement", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  approuve:      { label: "Approuvé ✓",    color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" },
  a_refaire:     { label: "À refaire",     color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function formatDate(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  clientId: string;
  isComplete: boolean;
}

export function SectionFichiers({ clientId, isComplete }: Props) {
  const [fichiers, setFichiers] = useState<FichierBranding[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [marking, setMarking] = useState(false);
  const [savedFiles, setSavedFiles] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "clients", clientId, "branding", "main", "fichiers"),
      (snap) => setFichiers(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as FichierBranding))
          .sort((a, b) => b.uploadedAt?.seconds - a.uploadedAt?.seconds)
      )
    );
    return unsub;
  }, [clientId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fileArray = Array.from(files);
    setUploadProgress(fileArray.map(f => f.name));
    try {
      for (const file of fileArray) {
        const now = Date.now();
        const storageRef = ref(storage, `clients/${clientId}/branding/fichiers/${now}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        const now_ts = Timestamp.now();
        await addDoc(
          collection(db, "clients", clientId, "branding", "main", "fichiers"),
          {
            nom: file.name,
            url,
            storageRef: storageRef.fullPath,
            taille: file.size,
            statut: "recu" as StatutFichier,
            commentaireAdmin: "",
            uploadedAt: now_ts,
            updatedAt: now_ts,
          }
        );
        setUploadProgress(prev => prev.filter(n => n !== file.name));
      }
    } finally {
      setUploading(false);
      setUploadProgress([]);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(f: FichierBranding) {
    try {
      if (f.storageRef) await deleteObject(ref(storage, f.storageRef));
      await deleteDoc(doc(db, "clients", clientId, "branding", "main", "fichiers", f.id));
    } catch {}
  }

  async function markSectionComplete() {
    setMarking(true);
    try {
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { completedSections: arrayUnion("fichiers") },
        { merge: true }
      );
      setSavedFiles(true);
    } finally {
      setMarking(false);
    }
  }

  return (
    <div id="section-fichiers" style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#F5F3FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Paperclip size={20} color="#7C3AED" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Section 7 — Fichiers et ressources</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Logos, photos, polices et tout autre fichier visuel</p>
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

      {/* Note descriptive */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#EFF6FF", borderLeft: "3px solid #0362E3", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "#1E40AF", margin: 0, lineHeight: 1.6 }}>
          Déposez ici tout fichier qui peut nous aider à personnaliser votre application : logos, photos du restaurant, photos de vos plats, vidéos, menu PDF, polices, ou tout autre élément visuel. Plus vous partagez, plus votre app sera personnalisée.
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
          borderRadius: 12, padding: "32px 20px", textAlign: "center", cursor: "pointer",
          background: dragOver ? "#EFF6FF" : "#F9FAFB", transition: "all 150ms", marginBottom: 20,
        }}
      >
        <input
          ref={inputRef} type="file" multiple
          style={{ display: "none" }}
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div>
            <p style={{ fontSize: 14, color: "#0362E3", fontWeight: 500, margin: "0 0 8px" }}>Envoi en cours…</p>
            {uploadProgress.map(name => (
              <p key={name} style={{ fontSize: 12, color: "#6B7280", margin: "2px 0" }}>{name}</p>
            ))}
          </div>
        ) : (
          <>
            <Upload size={28} color="#9CA3AF" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "#374151", margin: "0 0 4px" }}>Cliquez ou glissez vos fichiers ici</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Images, vidéos, PDF, polices — tous types acceptés · Plusieurs fichiers à la fois</p>
          </>
        )}
      </div>

      {/* Liste des fichiers */}
      {fichiers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {fichiers.map((f) => {
            const s = STATUT_STYLE[f.statut] ?? STATUT_STYLE.recu;
            return (
              <div key={f.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", background: "#F9FAFB",
                borderRadius: 10, border: "1px solid #F3F4F6",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.nom}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
                    <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{formatSize(f.taille)}</p>
                    <span style={{ width: 3, height: 3, background: "#D1D5DB", borderRadius: "50%", flexShrink: 0 }} />
                    <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{formatDate(f.uploadedAt)}</p>
                  </div>
                  {f.commentaireAdmin && (
                    <p style={{ fontSize: 12, color: "#EF4444", margin: "4px 0 0" }}>Note AW : {f.commentaireAdmin}</p>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>
                  {s.label}
                </span>
                <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#0362E3", display: "flex", flexShrink: 0 }}>
                  <ExternalLink size={15} />
                </a>
                <button
                  onClick={() => handleDelete(f)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#EF4444", display: "flex", flexShrink: 0 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {fichiers.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={markSectionComplete} disabled={marking} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            cursor: marking ? "not-allowed" : "pointer",
            background: savedFiles ? "#22C55E" : "#0362E3",
            color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 200ms",
          }}>
            {marking ? "Enregistrement…" : savedFiles ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}
