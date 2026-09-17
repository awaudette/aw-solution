"use client";

import { useRef } from "react";
import { Paperclip, X, FileText } from "lucide-react";
import { MAX_FICHIER_TAILLE } from "@/lib/attachments";

/**
 * Sélecteur de fichiers à joindre — tout type, aucune limite de nombre.
 * Rejette immédiatement (avec message clair) tout fichier dépassant 25 Mo ;
 * les fichiers valides restent "en attente" (chips avec ✕) jusqu'à l'envoi.
 */
export function FichierPicker({
  files, onChange, error, onErrorChange, dark = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  error: string | null;
  onErrorChange: (err: string | null) => void;
  dark?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const incoming = Array.from(selected);
    const tropGros = incoming.filter(f => f.size > MAX_FICHIER_TAILLE);
    const ok       = incoming.filter(f => f.size <= MAX_FICHIER_TAILLE);
    onErrorChange(
      tropGros.length > 0
        ? `Fichier${tropGros.length > 1 ? "s" : ""} trop volumineux (25 Mo maximum) : ${tropGros.map(f => f.name).join(", ")}`
        : null,
    );
    if (ok.length > 0) onChange([...files, ...ok]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef} type="file" multiple style={{ display: "none" }}
        onChange={e => handleSelect(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Joindre des fichiers"
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: dark ? "rgba(255,255,255,0.85)" : "#6B7280", flexShrink: 0,
        }}
      >
        <Paperclip size={16} />
      </button>
      {error && (
        <p style={{ fontSize: 11, color: "#DC2626", margin: "4px 0 0", fontWeight: 500 }}>{error}</p>
      )}
      {files.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 8px", borderRadius: 7,
                background: dark ? "rgba(255,255,255,0.15)" : "#F3F4F6",
                fontSize: 11, color: dark ? "#fff" : "#374151",
              }}
            >
              <FileText size={11} />
              <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name}
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
              >
                <X size={11} color={dark ? "#fff" : "#9CA3AF"} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
