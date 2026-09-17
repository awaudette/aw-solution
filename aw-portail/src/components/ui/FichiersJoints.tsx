"use client";

import { FileText, X } from "lucide-react";
import type { FichierJoint } from "@/lib/attachments";

function formatTaille(o: number): string {
  if (o < 1024) return `${o} o`;
  if (o < 1024 * 1024) return `${(o / 1024).toFixed(0)} Ko`;
  return `${(o / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Affiche une liste de fichiers joints déjà téléversés — nom, aperçu si
 * image, lien pour ouvrir. `canDelete`/`onDelete` optionnels ajoutent un ✕
 * par fichier (l'appelant décide qui peut supprimer quoi — auteur ou admin).
 */
export function FichiersJoints({
  fichiers, canDelete, onDelete, dark = false,
}: {
  fichiers: FichierJoint[] | undefined;
  canDelete?: (f: FichierJoint) => boolean;
  onDelete?: (f: FichierJoint) => void;
  dark?: boolean;
}) {
  if (!fichiers || fichiers.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      {fichiers.map((f, i) => {
        const isImage = f.type.startsWith("image/");
        return (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 8px", borderRadius: 8,
              background: dark ? "rgba(255,255,255,0.15)" : "#F9FAFB",
              border: dark ? "1px solid rgba(255,255,255,0.25)" : "1px solid #E5E7EB",
            }}
          >
            {isImage ? (
              <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, display: "flex" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.nom} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />
              </a>
            ) : (
              <FileText size={16} color={dark ? "#fff" : "#6B7280"} style={{ flexShrink: 0 }} />
            )}
            <a
              href={f.url} target="_blank" rel="noopener noreferrer"
              title={f.nom}
              style={{
                flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500,
                color: dark ? "#fff" : "#374151", textDecoration: "none",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {f.nom}
            </a>
            <span style={{ fontSize: 10, color: dark ? "rgba(255,255,255,0.75)" : "#9CA3AF", flexShrink: 0 }}>
              {formatTaille(f.taille)}
            </span>
            {canDelete?.(f) && (
              <button
                type="button"
                onClick={() => onDelete?.(f)}
                title="Supprimer ce fichier"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0, display: "flex" }}
              >
                <X size={13} color={dark ? "#fff" : "#9CA3AF"} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
