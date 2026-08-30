"use client";

/**
 * Documentation interne — base de connaissances AW Solution.
 * Réservée au personnel : les fichiers ne sont jamais publics dans Storage,
 * ils transitent uniquement par /api/admin/documentation-interne/*,
 * protégées par requireSection(req, "documentation") — admin toujours, un
 * employé seulement avec la permission "documentation" (voir
 * src/lib/requireAdmin.ts). Aucun compte client n'a de route ni d'accès à
 * cette section.
 */

import { useEffect, useRef, useState } from "react";
import {
  Upload, Search, Plus, Pencil, Trash2, Check, X, Download,
  FileText, FileSpreadsheet, FileCode, Image, Video, File as FileIcon,
  BookOpen, Loader2,
} from "lucide-react";
import { useRequireSection } from "@/components/admin/AdminAccessProvider";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DocumentInterne {
  id: string;
  nom: string;
  extension: string;
  categorieId: string;
  categorieLabel: string;
  mimeType: string;
  taille: number;
  uploadedByNom: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Categorie { id: string; nom: string }

type PreviewKind = "image" | "video" | "pdf" | "html" | "text" | "none";

const SANS_CATEGORIE = "__sans__";
const TOUTES = "__toutes__";

// ─── Styles ─────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #E5E7EB", fontSize: 13, color: "#1F2937",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const BTN_BLUE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "10px 18px", borderRadius: 10, border: "none",
  background: "#0362E3", color: "#fff", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};
const BTN_GHOST: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 9, textDecoration: "none",
  border: "1px solid #E5E7EB", background: "#fff",
  color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (!bytes) return "0 o";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

function getPreviewKind(mimeType: string, extension: string): PreviewKind {
  const ext = extension.toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (mimeType === "text/html" || ext === "html" || ext === "htm") return "html";
  if (mimeType.startsWith("text/") || ["txt", "md", "csv", "json", "log"].includes(ext)) return "text";
  return "none";
}

function DocIcon({ mimeType, extension }: { mimeType: string; extension: string }) {
  const kind = getPreviewKind(mimeType, extension);
  const ext = extension.toLowerCase();
  if (kind === "image") return <Image size={16} color="#0891B2" />;
  if (kind === "video") return <Video size={16} color="#7C3AED" />;
  if (kind === "pdf")   return <FileText size={16} color="#DC2626" />;
  if (kind === "html")  return <FileCode size={16} color="#0362E3" />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet size={16} color="#15803D" />;
  if (["doc", "docx"].includes(ext))        return <FileText size={16} color="#1D4ED8" />;
  if (["ppt", "pptx"].includes(ext))        return <FileText size={16} color="#C2410C" />;
  if (kind === "text") return <FileText size={16} color="#6B7280" />;
  return <FileIcon size={16} color="#9CA3AF" />;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json", ...(init.headers ?? {}) }
      : init?.headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Une erreur est survenue.");
  }
  return res.json();
}

// ─── Modale d'aperçu ────────────────────────────────────────────────────────

function PreviewModal({ doc, onClose }: { doc: DocumentInterne; onClose: () => void }) {
  const kind = getPreviewKind(doc.mimeType, doc.extension);
  const src = `/api/admin/documentation-interne/${doc.id}/fichier`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, width: "min(960px, 100%)",
          maxHeight: "88vh", display: "flex", flexDirection: "column",
          overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid #F3F4F6", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <DocIcon mimeType={doc.mimeType} extension={doc.extension} />
            <p style={{
              fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {doc.nom}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <a href={`${src}?telecharger=1`} style={BTN_GHOST}>
              <Download size={13} /> Télécharger
            </a>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={18} color="#9CA3AF" />
            </button>
          </div>
        </div>

        <div style={{
          flex: 1, overflow: "auto", background: "#F9FAFB",
          display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320,
        }}>
          {kind === "image" && (
            <img src={src} alt={doc.nom} style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain" }} />
          )}
          {kind === "video" && (
            <video src={src} controls style={{ maxWidth: "100%", maxHeight: "78vh" }} />
          )}
          {kind === "pdf" && (
            <iframe src={src} title={doc.nom} style={{ width: "100%", height: "78vh", border: "none" }} />
          )}
          {kind === "html" && (
            <iframe src={src} title={doc.nom} sandbox="" style={{ width: "100%", height: "78vh", border: "none", background: "#fff" }} />
          )}
          {kind === "text" && (
            <iframe src={src} title={doc.nom} style={{ width: "100%", height: "78vh", border: "none", background: "#fff" }} />
          )}
          {kind === "none" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <FileIcon size={32} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 14px" }}>
                Aperçu non disponible pour ce type de fichier.
              </p>
              <a href={`${src}?telecharger=1`} style={BTN_BLUE}>
                <Download size={13} /> Télécharger le fichier
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ligne de document ──────────────────────────────────────────────────────

function DocRow({
  document, categories, onRename, onMove, onDelete, onPreview,
}: {
  document: DocumentInterne;
  categories: Categorie[];
  onRename: (id: string, nom: string) => Promise<void>;
  onMove: (id: string, categorieId: string) => Promise<void>;
  onDelete: (id: string, nom: string) => void;
  onPreview: (d: DocumentInterne) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nomDraft, setNomDraft] = useState(document.nom);
  const [busy, setBusy] = useState(false);
  const previewable = getPreviewKind(document.mimeType, document.extension) !== "none";

  async function saveNom() {
    const trimmed = nomDraft.trim();
    if (!trimmed || trimmed === document.nom) { setEditing(false); setNomDraft(document.nom); return; }
    setBusy(true);
    try { await onRename(document.id, trimmed); } finally { setBusy(false); setEditing(false); }
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0,1fr) 180px 90px 80px 120px auto",
      alignItems: "center", gap: 12, padding: "11px 16px",
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 10, marginBottom: 6,
    }}>
      {/* Nom */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ flexShrink: 0 }}><DocIcon mimeType={document.mimeType} extension={document.extension} /></span>
        {editing ? (
          <>
            <input
              autoFocus value={nomDraft} onChange={e => setNomDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") saveNom();
                if (e.key === "Escape") { setEditing(false); setNomDraft(document.nom); }
              }}
              style={{ ...INPUT, padding: "5px 8px", fontSize: 13 }}
            />
            <button onClick={saveNom} disabled={busy} style={{ background: "none", border: "none", cursor: "pointer", color: "#16A34A", padding: 2, flexShrink: 0 }}>
              <Check size={14} />
            </button>
            <button onClick={() => { setEditing(false); setNomDraft(document.nom); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2, flexShrink: 0 }}>
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => previewable && onPreview(document)}
              title={previewable ? "Aperçu" : document.nom}
              style={{
                background: "none", border: "none", padding: 0, textAlign: "left",
                cursor: previewable ? "pointer" : "default",
                fontSize: 13, fontWeight: 600,
                color: previewable ? "#0362E3" : "#0A0A0A",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
              }}
            >
              {document.nom}
            </button>
            <button onClick={() => setEditing(true)} title="Renommer" style={{ background: "none", border: "none", cursor: "pointer", color: "#D1D5DB", padding: 2, flexShrink: 0 }}>
              <Pencil size={12} />
            </button>
          </>
        )}
      </div>

      {/* Catégorie */}
      <select
        value={document.categorieId}
        onChange={e => onMove(document.id, e.target.value)}
        style={{
          fontSize: 12, padding: "5px 8px", borderRadius: 7,
          border: "1px solid #E5E7EB", color: "#6B7280", background: "#F9FAFB", cursor: "pointer",
        }}
      >
        <option value="">Sans catégorie</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
      </select>

      {/* Taille */}
      <span style={{ fontSize: 12, color: "#9CA3AF" }}>{formatSize(document.taille)}</span>

      {/* Type */}
      <span style={{
        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
        background: "#F3F4F6", color: "#6B7280", textAlign: "center", width: "fit-content",
      }}>
        {(document.extension || "fichier").toUpperCase()}
      </span>

      {/* Date */}
      <span style={{ fontSize: 12, color: "#9CA3AF" }}>{formatDate(document.createdAt)}</span>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, justifySelf: "end" }}>
        <a
          href={`/api/admin/documentation-interne/${document.id}/fichier?telecharger=1`}
          title="Télécharger"
          style={{ display: "flex", padding: 6, borderRadius: 7, color: "#6B7280" }}
        >
          <Download size={14} />
        </a>
        <button onClick={() => onDelete(document.id, document.nom)} title="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 6, borderRadius: 7 }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ────────────────────────────────────────────────────────

export default function AdminDocumentationInternePage() {
  const { ready } = useRequireSection("documentation");
  const [documents, setDocuments]   = useState<DocumentInterne[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const [search, setSearch]         = useState("");
  const [activeCat, setActiveCat]   = useState<string>(TOUTES);
  const [previewDoc, setPreviewDoc] = useState<DocumentInterne | null>(null);

  const [uploadCat, setUploadCat]   = useState<string>("");
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [addingCat, setAddingCat]     = useState(false);
  const [newCatName, setNewCatName]   = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [catBusy, setCatBusy]         = useState(false);

  function refresh() {
    return Promise.all([
      api("/api/admin/documentation-interne"),
      api("/api/admin/documentation-interne/categories"),
    ])
      .then(([docsRes, catsRes]) => {
        setDocuments(docsRes.documents);
        setCategories(catsRes.categories);
        setError("");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  function categorieLabelFor(id: string): string {
    if (!id) return "Sans catégorie";
    return categories.find(c => c.id === id)?.nom ?? "Sans catégorie";
  }

  // ── Upload ──────────────────────────────────────────────────────────────
  async function handleUpload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true); setError("");
    try {
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("categorieId", uploadCat);
        fd.append("categorieLabel", categorieLabelFor(uploadCat));
        await api("/api/admin/documentation-interne", { method: "POST", body: fd });
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Documents ────────────────────────────────────────────────────────────
  async function handleRenameDoc(id: string, nom: string) {
    await api(`/api/admin/documentation-interne/${id}`, { method: "PATCH", body: JSON.stringify({ nom }) });
    await refresh();
  }
  async function handleMoveDoc(id: string, categorieId: string) {
    await api(`/api/admin/documentation-interne/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ categorieId, categorieLabel: categorieLabelFor(categorieId) }),
    });
    await refresh();
  }
  async function handleDeleteDoc(id: string, nom: string) {
    if (!confirm(`Supprimer « ${nom} » ? Cette action est irréversible.`)) return;
    await api(`/api/admin/documentation-interne/${id}`, { method: "DELETE" });
    await refresh();
  }

  // ── Catégories ───────────────────────────────────────────────────────────
  async function handleAddCategorie() {
    if (!newCatName.trim() || catBusy) return;
    setCatBusy(true);
    try {
      await api("/api/admin/documentation-interne/categories", { method: "POST", body: JSON.stringify({ nom: newCatName.trim() }) });
      setNewCatName(""); setAddingCat(false);
      await refresh();
    } catch (e) { setError((e as Error).message); } finally { setCatBusy(false); }
  }
  async function handleRenameCategorie(id: string) {
    if (!editingCatName.trim() || catBusy) return;
    setCatBusy(true);
    try {
      await api("/api/admin/documentation-interne/categories", { method: "PATCH", body: JSON.stringify({ id, nom: editingCatName.trim() }) });
      setEditingCatId(null);
      await refresh();
    } catch (e) { setError((e as Error).message); } finally { setCatBusy(false); }
  }
  async function handleDeleteCategorie(id: string, nom: string) {
    if (!confirm(`Supprimer la catégorie « ${nom} » ?`)) return;
    try {
      await api("/api/admin/documentation-interne/categories", { method: "DELETE", body: JSON.stringify({ id }) });
      if (activeCat === id) setActiveCat(TOUTES);
      await refresh();
    } catch (e) { setError((e as Error).message); }
  }

  // ── Filtrage ─────────────────────────────────────────────────────────────
  const sansCategorieCount = documents.filter(d => !d.categorieId).length;
  const filtered = documents.filter(d => {
    const matchCat = activeCat === TOUTES
      || (activeCat === SANS_CATEGORIE ? !d.categorieId : d.categorieId === activeCat);
    const matchSearch = !search.trim() || d.nom.toLowerCase().includes(search.trim().toLowerCase());
    return matchCat && matchSearch;
  });

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 20,
    border: `1.5px solid ${active ? "#0362E3" : "#E5E7EB"}`,
    background: active ? "#0362E3" : "#fff",
    color: active ? "#fff" : "#6B7280",
    cursor: "pointer", whiteSpace: "nowrap",
  });

  if (!ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", padding: "32px 48px 80px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <BookOpen size={20} color="#0362E3" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Documentation interne</h1>
        </div>
        <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 24px" }}>
          Base de connaissances AW Solution — visible par vous et votre équipe uniquement, jamais par les clients.
        </p>

        {error && (
          <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 9, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 13, color: "#DC2626" }}>
            {error}
          </div>
        )}

        {/* Zone d'upload */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false);
            if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files);
          }}
          style={{
            background: "#fff", border: `1.5px dashed ${dragOver ? "#0362E3" : "#E5E7EB"}`,
            borderRadius: 14, padding: "20px 22px", marginBottom: 22,
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            transition: "border-color 150ms",
          }}
        >
          <input ref={fileRef} type="file" multiple accept="*/*" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.length) handleUpload(e.target.files); }} />

          <div
            onClick={() => !uploading && fileRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: uploading ? "default" : "pointer", flex: 1, minWidth: 220 }}
          >
            {uploading ? <Loader2 size={20} color="#0362E3" className="animate-spin" /> : <Upload size={20} color="#9CA3AF" />}
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 2px" }}>
                {uploading ? "Téléversement en cours…" : "Glissez-déposez un fichier ou cliquez pour parcourir"}
              </p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                Tous types acceptés — PDF, Word, Excel, PowerPoint, vidéo, image, HTML, texte
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Vers
            </label>
            <select
              value={uploadCat}
              onChange={e => setUploadCat(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E7EB", color: "#374151", background: "#F9FAFB", cursor: "pointer" }}
            >
              <option value="">Sans catégorie</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        </div>

        {/* Barre catégories + recherche */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 260 }}>
            <button onClick={() => setActiveCat(TOUTES)} style={pillStyle(activeCat === TOUTES)}>
              Toutes <span style={{ opacity: 0.7 }}>{documents.length}</span>
            </button>

            {categories.map(c => (
              editingCatId === c.id ? (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff", border: "1.5px solid #0362E3", borderRadius: 20, padding: "3px 6px 3px 12px" }}>
                  <input
                    autoFocus value={editingCatName} onChange={e => setEditingCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleRenameCategorie(c.id); if (e.key === "Escape") setEditingCatId(null); }}
                    style={{ border: "none", outline: "none", fontSize: 12, width: 110, fontFamily: "inherit" }}
                  />
                  <button onClick={() => handleRenameCategorie(c.id)} disabled={catBusy} style={{ background: "none", border: "none", cursor: "pointer", color: "#16A34A", padding: 2 }}><Check size={13} /></button>
                  <button onClick={() => setEditingCatId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2 }}><X size={13} /></button>
                </div>
              ) : (
                <div key={c.id} style={{ ...pillStyle(activeCat === c.id), padding: "6px 8px 6px 12px" }} onClick={() => setActiveCat(c.id)}>
                  <span>{c.nom}</span>
                  <span style={{ opacity: 0.7 }}>{documents.filter(d => d.categorieId === c.id).length}</span>
                  <span
                    onClick={e => { e.stopPropagation(); setEditingCatId(c.id); setEditingCatName(c.nom); }}
                    style={{ display: "flex", opacity: 0.75, marginLeft: 2 }}
                  >
                    <Pencil size={11} />
                  </span>
                  <span
                    onClick={e => { e.stopPropagation(); handleDeleteCategorie(c.id, c.nom); }}
                    style={{ display: "flex", opacity: 0.75 }}
                  >
                    <Trash2 size={11} />
                  </span>
                </div>
              )
            ))}

            {sansCategorieCount > 0 && (
              <button onClick={() => setActiveCat(SANS_CATEGORIE)} style={pillStyle(activeCat === SANS_CATEGORIE)}>
                Sans catégorie <span style={{ opacity: 0.7 }}>{sansCategorieCount}</span>
              </button>
            )}

            {addingCat ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff", border: "1.5px solid #0362E3", borderRadius: 20, padding: "3px 6px 3px 12px" }}>
                <input
                  autoFocus placeholder="Nom de la catégorie" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddCategorie(); if (e.key === "Escape") setAddingCat(false); }}
                  style={{ border: "none", outline: "none", fontSize: 12, width: 130, fontFamily: "inherit" }}
                />
                <button onClick={handleAddCategorie} disabled={catBusy} style={{ background: "none", border: "none", cursor: "pointer", color: "#16A34A", padding: 2 }}><Check size={13} /></button>
                <button onClick={() => { setAddingCat(false); setNewCatName(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2 }}><X size={13} /></button>
              </div>
            ) : (
              <button onClick={() => setAddingCat(true)} style={{ ...pillStyle(false), borderStyle: "dashed" }}>
                <Plus size={12} /> Nouvelle catégorie
              </button>
            )}
          </div>

          <div style={{ position: "relative", width: 240, flexShrink: 0 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
            <input
              placeholder="Rechercher un fichier…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...INPUT, padding: "8px 10px 8px 30px" }}
            />
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: 40 }}>Chargement…</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
            <BookOpen size={28} color="#DBEAFE" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>
              {documents.length === 0
                ? "Aucun document — commencez par en téléverser un."
                : "Aucun résultat pour ce filtre."}
            </p>
          </div>
        ) : (
          <>
            <div style={{
              display: "grid", gridTemplateColumns: "minmax(0,1fr) 180px 90px 80px 120px auto",
              gap: 12, padding: "0 16px 6px",
            }}>
              {["Nom", "Catégorie", "Taille", "Type", "Ajouté le", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>
            {filtered.map(d => (
              <DocRow
                key={d.id}
                document={d}
                categories={categories}
                onRename={handleRenameDoc}
                onMove={handleMoveDoc}
                onDelete={handleDeleteDoc}
                onPreview={setPreviewDoc}
              />
            ))}
          </>
        )}
      </div>

      {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}
