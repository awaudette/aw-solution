"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  Timestamp, getDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { createNotification, markActionCompleteFor } from "@/lib/notifications";
import type { JournalEntry, JournalMessage, JournalStatut } from "@/types/journal";
import { ETAPES_INIT } from "@/hooks/useRoadmapData";
import { Plus, Send, X, Upload, ChevronDown, ChevronUp } from "lucide-react";

const CSS = `@keyframes spin { to { transform: rotate(360deg); } }`;

const STATUT_CFG: Record<JournalStatut, { label: string; color: string; bg: string; border: string }> = {
  en_attente:            { label: "En attente",            color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" },
  approuve:              { label: "Approuvé",              color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" },
  refuse:                { label: "Refusé",                color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
  modification_demandee: { label: "Modification demandée", color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
};

const ETAPE_LABELS: Record<string, string> = {
  signature:         "Signature",
  paiement:          "Configuration paiement",
  branding:          "Branding",
  design:            "Design",
  developpement:     "Développement",
  rencontre:         "Rencontre de validation",
  ajustements:       "Ajustements",
  tests:             "Tests & Validation",
  soumission:        "Soumission App Store et Google Play",
  formation:         "Formation",
  config_succursale: "Configuration succursale",
  materiel:          "Conception matériel de lancement",
  lancement:         "Lancement",
  suivi:             "Suivi post-lancement",
};

function formatDateFr(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

function formatTimeFr(ts: Timestamp): string {
  return ts.toDate().toLocaleString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ── New entry form ─────────────────────────────────────────────────────── */

function NewEntryForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [titre,       setTitre]       = useState("");
  const [description, setDescription] = useState("");
  const [etape,       setEtape]       = useState(ETAPES_INIT[4].id);
  const [images,      setImages]      = useState<File[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePublish() {
    if (!titre.trim() || !description.trim() || uploading) return;
    setUploading(true);
    try {
      const now = Timestamp.now();

      const imageUrls: string[] = [];
      for (const file of images) {
        const sRef = storageRef(storage, `clients/${clientId}/journal/${now.seconds}_${file.name}`);
        const snap = await uploadBytes(sRef, file);
        imageUrls.push(await getDownloadURL(snap.ref));
      }

      await addDoc(collection(db, "clients", clientId, "journal"), {
        titre:             titre.trim(),
        description:       description.trim(),
        etape,
        images:            imageUrls,
        publishedAt:       now,
        statut:            "en_attente",
        raisonClient:      null,
        commentaireClient: null,
        reponseAdmin:      null,
        lu:                false,
        version:           1,
      });

      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: `Une nouvelle mise à jour est disponible dans votre journal de développement : "${titre.trim()}"`,
        auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
      });

      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      await createNotification({
        type: "nouveau_rapport", destinataire: "client",
        clientId, clientNom, auteurRole: "admin",
        description: `Nouvelle mise à jour dans votre journal : "${titre.trim()}" — veuillez l'approuver.`,
        lien: `/client/${clientId}/accueil`,
        actionRequise: true,   // client doit approuver / refuser / demander modification
      });

      onClose();
    } finally { setUploading(false); }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Nouvelle mise à jour</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <X size={16} color="#9CA3AF" />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Titre
          </label>
          <input
            type="text" value={titre} onChange={e => setTitre(e.target.value)}
            placeholder="Ex : Système de récompenses complété"
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 9,
              border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
              outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Description
          </label>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez ce qui a été fait, les fonctionnalités ajoutées, etc."
            rows={4}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 9,
              border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
              outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Étape associée
          </label>
          <select
            value={etape} onChange={e => setEtape(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 9,
              border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
              outline: "none", fontFamily: "inherit", background: "#fff", boxSizing: "border-box",
            }}
          >
            {ETAPES_INIT.map(e => (
              <option key={e.id} value={e.id}>{e.nom}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Images (max 5)
          </label>
          <input
            ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={e => setImages(Array.from(e.target.files ?? []).slice(0, 5))}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9,
              border: "1px dashed #D1D5DB", background: "#F9FAFB",
              color: "#6B7280", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}
          >
            <Upload size={13} />
            {images.length > 0 ? `${images.length} image(s) sélectionnée(s)` : "Choisir des images"}
          </button>
          {images.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {images.map((f, idx) => (
                <div key={idx} style={{ position: "relative", width: 60, height: 60, borderRadius: 8, overflow: "hidden", background: "#F3F4F6", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                    style={{
                      position: "absolute", top: 2, right: 2,
                      background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
                      width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", padding: 0,
                    }}
                  >
                    <X size={10} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handlePublish}
          disabled={!titre.trim() || !description.trim() || uploading}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none", alignSelf: "flex-start",
            background: titre.trim() && description.trim() ? "#0362E3" : "#E5E7EB",
            color: titre.trim() && description.trim() ? "#fff" : "#9CA3AF",
            fontSize: 13, fontWeight: 600,
            cursor: titre.trim() && description.trim() && !uploading ? "pointer" : "not-allowed",
          }}
        >
          {uploading ? "Publication…" : "Publier la mise à jour"}
        </button>
      </div>
    </div>
  );
}

/* ── Admin entry card ────────────────────────────────────────────────────── */

function AdminJournalEntry({ entry, clientId }: { entry: JournalEntry; clientId: string }) {
  const [conversation,      setConversation]      = useState<JournalMessage[]>([]);
  const [adminMsg,          setAdminMsg]          = useState("");
  const [sending,           setSending]           = useState(false);
  const [showRepublishForm, setShowRepublishForm] = useState(false);
  const [republishDesc,     setRepublishDesc]     = useState(entry.description);
  const [republishImages,   setRepublishImages]   = useState<File[]>([]);
  const [republishing,      setRepublishing]      = useState(false);
  const [convOpen,          setConvOpen]          = useState(false);
  const [lightbox,          setLightbox]          = useState<string | null>(null);
  const [isExpanded,        setIsExpanded]        = useState(entry.statut !== "approuve");
  const republishFileRef = useRef<HTMLInputElement>(null);
  const prevConvLen      = useRef(0);
  const prevStatut       = useRef(entry.statut);
  const cfg = STATUT_CFG[entry.statut];
  const needsAttention = entry.statut === "refuse" || entry.statut === "modification_demandee";

  useEffect(() => {
    const q = query(
      collection(db, "clients", clientId, "journal", entry.id, "conversation"),
      orderBy("timestamp", "asc"),
    );
    return onSnapshot(q, snap => {
      setConversation(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalMessage)));
    });
  }, [clientId, entry.id]);

  /* Auto-expand conversation when new messages arrive */
  useEffect(() => {
    if (conversation.length > prevConvLen.current && conversation.length > 0) {
      setConvOpen(true);
    }
    prevConvLen.current = conversation.length;
  }, [conversation.length]);

  /* Auto-collapse card when entry gets approved */
  useEffect(() => {
    if (prevStatut.current !== "approuve" && entry.statut === "approuve") {
      setIsExpanded(false);
    }
    prevStatut.current = entry.statut;
  }, [entry.statut]);

  async function handleSendMessage() {
    if (!adminMsg.trim() || sending) return;
    setSending(true);
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, "clients", clientId, "journal", entry.id, "conversation"), {
        auteur: "admin", message: adminMsg.trim(), timestamp: now,
      });
      // Cas 4 : admin pose une question → notification client actionRequise
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      await createNotification({
        type: "question_journal", destinataire: "client",
        clientId, clientNom, auteurRole: "admin",
        description: `Question dans votre journal : "${entry.titre}" — veuillez répondre.`,
        lien: `/client/${clientId}/accueil`,
        actionRequise: true,
      });
      setAdminMsg("");
      setConvOpen(true);
    } finally { setSending(false); }
  }

  async function handleRepublish() {
    if (!republishDesc.trim() || republishing) return;
    setRepublishing(true);
    try {
      const now = Timestamp.now();
      let imageUrls = [...entry.images];

      if (republishImages.length > 0) {
        imageUrls = [];
        for (const file of republishImages) {
          const sRef = storageRef(storage, `clients/${clientId}/journal/${now.seconds}_${file.name}`);
          const snap = await uploadBytes(sRef, file);
          imageUrls.push(await getDownloadURL(snap.ref));
        }
      }

      await updateDoc(doc(db, "clients", clientId, "journal", entry.id), {
        description:       republishDesc.trim(),
        images:            imageUrls,
        statut:            "en_attente",
        raisonClient:      null,
        commentaireClient: null,
        lu:                false,
        version:           entry.version + 1,
        publishedAt:       now,
      });

      await addDoc(collection(db, "clients", clientId, "journal", entry.id, "conversation"), {
        auteur: "admin",
        message: `Mise à jour republiée — version ${entry.version + 1}.`,
        timestamp: now,
      });

      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: `Votre journal de développement a été mis à jour : "${entry.titre}" — version ${entry.version + 1}`,
        auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
      });

      setShowRepublishForm(false);
      setRepublishImages([]);
    } finally { setRepublishing(false); }
  }

  /* ── Collapsed approved view ── */
  if (entry.statut === "approuve" && !isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          background: "#fff", border: "1px solid #F0FDF4", borderRadius: 10,
          padding: "11px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
            {ETAPE_LABELS[entry.etape] ?? entry.etape}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
            v{entry.version}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}>
            Approuvé ✓
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{entry.titre}</span>
        </div>
        <ChevronDown size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff",
      border: needsAttention ? `1.5px solid ${cfg.border}` : "1px solid #F3F4F6",
      borderRadius: 12, overflow: "hidden",
    }}>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 999, cursor: "pointer",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}

      {/* Green strip + Réduire when approved+expanded */}
      {entry.statut === "approuve" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 18px", background: "#F0FDF4", borderBottom: "1px solid #BBF7D0" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>Approuvé ✓</span>
          <button
            onClick={() => setIsExpanded(false)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#166534", fontSize: 11, fontWeight: 500, opacity: 0.7 }}
          >
            <ChevronUp size={12} />
            Réduire
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "14px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
            {ETAPE_LABELS[entry.etape] ?? entry.etape}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
            v{entry.version}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
          {!entry.lu && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#F9FAFB", color: "#9CA3AF", border: "1px solid #F3F4F6" }}>
              Non lu
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: "0 0 2px" }}>{entry.titre}</p>
        <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 10px" }}>{formatDateFr(entry.publishedAt)}</p>

        {/* Description */}
        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
          {entry.description}
        </p>

        {/* Images */}
        {entry.images.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: entry.images.length === 1 ? "1fr" : "1fr 1fr",
            gap: 6,
            marginBottom: 14,
            padding: needsAttention ? "10px" : "0",
            background: needsAttention ? cfg.bg : "transparent",
            borderRadius: needsAttention ? 10 : 0,
            border: needsAttention ? `1px dashed ${cfg.border}` : "none",
          }}>
            {needsAttention && (
              <p style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 700, color: cfg.color, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {entry.statut === "refuse" ? "Image refusée — à modifier" : "Image à modifier selon le retour client"}
              </p>
            )}
            {entry.images.slice(0, 4).map((url, idx) => (
              <div
                key={idx}
                onClick={() => setLightbox(url)}
                style={{
                  position: "relative", background: "#F9FAFB", borderRadius: 8,
                  overflow: "hidden", display: "flex", alignItems: "center",
                  justifyContent: "center", minHeight: 80, cursor: "pointer",
                  border: "1px solid #E5E7EB",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block" }} />
                {idx === 3 && entry.images.length > 4 && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 16, fontWeight: 700,
                  }}>
                    +{entry.images.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client reason */}
      {entry.raisonClient && (
        <div style={{ margin: "0 18px 14px", padding: "10px 14px", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 9 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: cfg.color, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            💬 Retour client
          </p>
          <p style={{ fontSize: 13, color: "#374151", margin: 0, whiteSpace: "pre-wrap" }}>{entry.raisonClient}</p>
        </div>
      )}

      {/* ── Conversation accordion ── */}
      <div style={{ borderTop: "1px solid #F3F4F6" }}>
        <button
          onClick={() => setConvOpen(o => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 18px", border: "none", background: "none", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Conversation{conversation.length > 0 ? ` (${conversation.length})` : ""}
          </span>
          {convOpen
            ? <ChevronUp size={13} color="#9CA3AF" />
            : <ChevronDown size={13} color="#9CA3AF" />}
        </button>

        {convOpen && (
          <div style={{ padding: "0 18px 12px" }}>
            {conversation.length === 0 ? (
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 10px" }}>Aucun message pour l'instant.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {conversation.map(msg => (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.auteur === "admin" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%", padding: "7px 11px", borderRadius: 10,
                      background: msg.auteur === "admin" ? "#EFF6FF" : "#F9FAFB",
                      border: `1px solid ${msg.auteur === "admin" ? "#BFDBFE" : "#E5E7EB"}`,
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: msg.auteur === "admin" ? "#1D4ED8" : "#374151", margin: "0 0 3px" }}>
                        {msg.auteur === "admin" ? "AW Solution" : "Client"}
                      </p>
                      <p style={{ fontSize: 12, color: "#374151", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.message}</p>
                      <p style={{ fontSize: 10, color: "#9CA3AF", margin: "4px 0 0", textAlign: msg.auteur === "admin" ? "right" : "left" }}>
                        {formatTimeFr(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Send message input — only visible when accordion is open */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text" value={adminMsg} onChange={e => setAdminMsg(e.target.value)}
                placeholder="Envoyer un message au client…"
                onKeyDown={e => { if (e.key === "Enter") handleSendMessage(); }}
                style={{
                  flex: 1, padding: "7px 10px", borderRadius: 8,
                  border: "1px solid #E5E7EB", fontSize: 12, color: "#374151",
                  outline: "none", fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!adminMsg.trim() || sending}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "7px 12px", borderRadius: 8, border: "none",
                  background: adminMsg.trim() ? "#0362E3" : "#E5E7EB",
                  color: adminMsg.trim() ? "#fff" : "#9CA3AF",
                  cursor: adminMsg.trim() ? "pointer" : "not-allowed", flexShrink: 0,
                }}
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ borderTop: "1px solid #F3F4F6", padding: "12px 18px" }}>
        {/* Republish form */}
        {showRepublishForm && (
          <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 9, padding: "12px 14px", marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
              Republier — v{entry.version + 1}
            </p>
            <textarea
              value={republishDesc} onChange={e => setRepublishDesc(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 8,
                border: "1px solid #E5E7EB", fontSize: 12, color: "#374151",
                outline: "none", fontFamily: "inherit", resize: "vertical",
                boxSizing: "border-box", marginBottom: 8,
              }}
            />
            <input
              ref={republishFileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={e => setRepublishImages(Array.from(e.target.files ?? []).slice(0, 5))}
            />
            <button
              onClick={() => republishFileRef.current?.click()}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 7,
                border: "1px dashed #D1D5DB", background: "#fff",
                color: "#6B7280", fontSize: 11, fontWeight: 500, cursor: "pointer", marginBottom: 10,
              }}
            >
              <Upload size={11} />
              {republishImages.length > 0 ? `${republishImages.length} image(s)` : "Remplacer les images (optionnel)"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setShowRepublishForm(false); setRepublishImages([]); setRepublishDesc(entry.description); }}
                style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #E5E7EB", background: "#fff", color: "#6B7280", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={handleRepublish}
                disabled={!republishDesc.trim() || republishing}
                style={{
                  padding: "6px 12px", borderRadius: 7, border: "none",
                  background: "#0362E3", color: "#fff",
                  fontSize: 11, fontWeight: 600, cursor: !republishing ? "pointer" : "not-allowed",
                }}
              >
                {republishing ? "Publication…" : "Republier"}
              </button>
            </div>
          </div>
        )}

        {/* Republish button */}
        {!showRepublishForm && (
          <button
            onClick={() => setShowRepublishForm(true)}
            style={{
              padding: "6px 12px", borderRadius: 7,
              border: "1px solid #E5E7EB", background: "#F9FAFB",
              color: "#374151", fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}
          >
            ↑ Republier v{entry.version + 1}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function AdminJournalManager({ clientId }: { clientId: string }) {
  const [entries,  setEntries]  = useState<JournalEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "clients", clientId, "journal"),
      orderBy("publishedAt", "desc"),
    );
    return onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
      setLoading(false);
    });
  }, [clientId]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <style>{CSS}</style>
      <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div>
      {showForm ? (
        <NewEntryForm clientId={clientId} onClose={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "#0362E3", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            marginBottom: 20,
          }}
        >
          <Plus size={15} />
          Nouvelle mise à jour
        </button>
      )}

      {entries.length === 0 && !showForm && (
        <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "40px 24px", textAlign: "center", border: "1px solid #F3F4F6" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Aucune mise à jour publiée.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map(entry => (
          <AdminJournalEntry key={entry.id} entry={entry} clientId={clientId} />
        ))}
      </div>
    </div>
  );
}
