"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  writeBatch, Timestamp, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification, markActionCompleteFor } from "@/lib/notifications";
import type { JournalEntry, JournalMessage, JournalStatut } from "@/types/journal";
import { ChevronDown, ChevronUp } from "lucide-react";

const CSS = `@keyframes spin { to { transform: rotate(360deg); } }`;

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

const STATUT_CFG: Record<JournalStatut, { label: string; color: string; bg: string; border: string }> = {
  en_attente:            { label: "En attente",               color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" },
  approuve:              { label: "Approuvé ✓",               color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" },
  refuse:                { label: "Refusé ✗",                 color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
  modification_demandee: { label: "Modification demandée ✎",  color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
};

const ACTION_BTNS: Array<{
  key: Exclude<JournalStatut, "en_attente">;
  label: string;
  borderColor: string;
  selectedBg: string;
  unselectedText: string;
}> = [
  { key: "approuve",              label: "✓ Approuvé",              borderColor: "#16A34A", selectedBg: "#22C55E", unselectedText: "#166534" },
  { key: "refuse",                label: "✗ Refusé",                borderColor: "#DC2626", selectedBg: "#EF4444", unselectedText: "#991B1B" },
  { key: "modification_demandee", label: "✎ Modification demandée", borderColor: "#D97706", selectedBg: "#F59E0B", unselectedText: "#92400E" },
];

function formatDateFr(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

function formatTimeFr(ts: Timestamp): string {
  return ts.toDate().toLocaleString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ── Feed ───────────────────────────────────────────────────────────────── */

export function ClientJournalFeed({ clientId }: { clientId: string }) {
  const [entries,  setEntries]  = useState<JournalEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const markedRead = useRef(false);

  useEffect(() => {
    const q = query(
      collection(db, "clients", clientId, "journal"),
      orderBy("publishedAt", "desc"),
    );
    return onSnapshot(q, async (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry)));
      setLoading(false);

      if (!markedRead.current) {
        markedRead.current = true;
        const unread = snap.docs.filter(d => !d.data().lu);
        if (unread.length > 0) {
          const batch = writeBatch(db);
          for (const d of unread) {
            batch.update(doc(db, "clients", clientId, "journal", d.id), { lu: true });
          }
          await batch.commit();
        }
      }
    });
  }, [clientId]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <style>{CSS}</style>
      <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (entries.length === 0) return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "60px 40px", textAlign: "center", border: "1px solid #F3F4F6", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#0A0A0A", margin: "0 0 8px" }}>Aucune mise à jour pour l'instant</p>
      <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
        Les mises à jour de développement apparaîtront ici au fur et à mesure de l'avancement de votre projet.
      </p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
      {entries.map(entry => (
        <JournalCard key={entry.id} entry={entry} clientId={clientId} onImageClick={setLightbox} />
      ))}
    </div>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────── */

function JournalCard({ entry, clientId, onImageClick }: {
  entry: JournalEntry;
  clientId: string;
  onImageClick: (url: string) => void;
}) {
  const [conversation,   setConversation]   = useState<JournalMessage[]>([]);
  const [selectedAction, setSelectedAction] = useState<Exclude<JournalStatut, "en_attente"> | null>(null);
  const [reason,         setReason]         = useState("");
  const [showButtons,    setShowButtons]    = useState(entry.statut === "en_attente");
  const [submitting,     setSubmitting]     = useState(false);
  const [reply,          setReply]          = useState("");
  const [sendingReply,   setSendingReply]   = useState(false);
  const [convOpen,       setConvOpen]       = useState(false);
  const [isPortrait,     setIsPortrait]     = useState<boolean | null>(null);
  const [isExpanded,     setIsExpanded]     = useState(entry.statut !== "approuve");
  const prevConvLen = useRef(0);
  const prevStatut  = useRef(entry.statut);

  /* Detect portrait/landscape from first image */
  useEffect(() => {
    if (entry.images.length === 0) return;
    const img = new window.Image();
    img.onload = () => setIsPortrait(img.naturalHeight > img.naturalWidth);
    img.src = entry.images[0];
    if (img.complete && img.naturalWidth > 0) {
      setIsPortrait(img.naturalHeight > img.naturalWidth);
    }
  }, [entry.images]);

  /* Reset buttons when admin republishes */
  useEffect(() => {
    if (entry.statut === "en_attente") {
      setShowButtons(true);
      setSelectedAction(null);
      setReason("");
    }
  }, [entry.statut]);

  /* Auto-collapse when status becomes "approuve" */
  useEffect(() => {
    if (prevStatut.current !== "approuve" && entry.statut === "approuve" && !showButtons) {
      setIsExpanded(false);
    }
    prevStatut.current = entry.statut;
  }, [entry.statut, showButtons]);

  /* Listen to conversation */
  useEffect(() => {
    const q = query(
      collection(db, "clients", clientId, "journal", entry.id, "conversation"),
      orderBy("timestamp", "asc"),
    );
    return onSnapshot(q, snap => {
      setConversation(snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalMessage)));
    });
  }, [clientId, entry.id]);

  /* Auto-expand conversation on new messages */
  useEffect(() => {
    if (conversation.length > prevConvLen.current && conversation.length > 0) {
      setConvOpen(true);
    }
    prevConvLen.current = conversation.length;
  }, [conversation.length]);

  const needsReason        = selectedAction === "refuse" || selectedAction === "modification_demandee";
  const canSubmit          = selectedAction !== null && (!needsReason || reason.trim().length > 0);
  const wasAlreadyAnswered = entry.statut !== "en_attente";
  const usePortraitLayout  = isPortrait === true && entry.images.length > 0;

  async function handleSubmit() {
    if (!selectedAction || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const now = Timestamp.now();
      await updateDoc(doc(db, "clients", clientId, "journal", entry.id), {
        statut: selectedAction, raisonClient: reason.trim() || null, lu: true,
      });

      const msgText =
        selectedAction === "approuve"
          ? "J'approuve cette mise à jour."
          : selectedAction === "refuse"
          ? `Je refuse cette mise à jour.\nRaison : ${reason.trim()}`
          : `Je demande une modification.\nRaison : ${reason.trim()}`;

      await addDoc(collection(db, "clients", clientId, "journal", entry.id, "conversation"), {
        auteur: "client", message: msgText, timestamp: now,
      });

      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      const alerteType = wasAlreadyAnswered
        ? "journal_choix_modifie"
        : selectedAction === "approuve" ? "journal_approuve"
        : selectedAction === "refuse"   ? "journal_refuse"
        : "journal_modification";
      const journalType = wasAlreadyAnswered
        ? "journal_modification"
        : selectedAction === "approuve" ? "journal_approuve"
        : selectedAction === "refuse"   ? "journal_refuse"
        : "journal_modification";
      await createNotification({
        type: journalType, destinataire: "admin",
        clientId, clientNom, auteurRole: "client",
        description: `${clientNom} — ${STATUT_CFG[selectedAction].label} : "${entry.titre}"${reason.trim() ? ` — "${reason.trim()}"` : ""}`,
        lien: `/admin/clients/${clientId}?tab=journal`,
        actionRequise: journalType !== "journal_approuve",
      });
      // Cas 1 : client a répondu → la notification "nouveau_rapport" passe à actionCompletee
      await markActionCompleteFor({ clientId, type: "nouveau_rapport", destinataire: "client" });

      setShowButtons(false);
      setConvOpen(true);
    } finally { setSubmitting(false); }
  }

  async function handleSendReply() {
    if (!reply.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, "clients", clientId, "journal", entry.id, "conversation"), {
        auteur: "client", message: reply.trim(), timestamp: now,
      });
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      await createNotification({
        type: "journal_reponse", destinataire: "admin",
        clientId, clientNom, auteurRole: "client",
        description: `${clientNom} — Réponse dans le journal : "${entry.titre}"`,
        lien: `/admin/clients/${clientId}?tab=journal`,
      });
      // Cas 4 : client a répondu dans le fil → question_journal passe à actionCompletee
      await markActionCompleteFor({ clientId, type: "question_journal", destinataire: "client" });
      setReply("");
      setConvOpen(true);
    } finally { setSendingReply(false); }
  }

  const cfg        = STATUT_CFG[entry.statut];
  const etapeLabel = ETAPE_LABELS[entry.etape] ?? entry.etape;

  /* ── Collapsed approved view ────────────────────────────────────────── */
  if (entry.statut === "approuve" && !showButtons && !isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          background: "#fff", border: "1px solid #F0FDF4", borderRadius: 12,
          padding: "13px 20px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{entry.titre}</span>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{formatDateFr(entry.publishedAt)}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
            background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0",
          }}>
            Approuvé ✓
          </span>
        </div>
        <ChevronDown size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
      </div>
    );
  }

  /* ── Image helpers ──────────────────────────────────────────────────── */

  /* Landscape image grid (used in landscape mode, or for extra images in portrait mode) */
  function ImageGrid({ images }: { images: string[] }) {
    if (images.length === 0) return null;
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: images.length === 1 ? "1fr" : "1fr 1fr",
        gap: 6, marginBottom: 16,
      }}>
        {images.slice(0, 4).map((url, idx) => (
          <div
            key={idx}
            onClick={() => onImageClick(url)}
            style={{
              position: "relative", background: "#F9FAFB", borderRadius: 10,
              overflow: "hidden", display: "flex", alignItems: "center",
              justifyContent: "center", minHeight: 80, cursor: "pointer",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={{ width: "100%", maxHeight: 260, objectFit: "contain", display: "block" }} />
            {idx === 3 && images.length > 4 && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 18, fontWeight: 700,
              }}>
                +{images.length - 4}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  /* ── Full card view ─────────────────────────────────────────────────── */
  return (
    <div style={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

      {/* Green header strip when expanded+approved */}
      {entry.statut === "approuve" && !showButtons && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 20px",
          background: "#F0FDF4", borderBottom: "1px solid #BBF7D0",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>Approuvé ✓</span>
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              color: "#166534", fontSize: 11, fontWeight: 500, opacity: 0.7,
            }}
          >
            <ChevronUp size={12} />
            Réduire
          </button>
        </div>
      )}

      {/* ── Main content area ── */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch" }}>

        {/* Left column: all text + actions */}
        <div style={{ flex: 1, padding: "18px 20px 16px", minWidth: 0 }}>

          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
              {etapeLabel}
            </span>
            {!entry.lu && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#0362E3", color: "#fff" }}>
                Nouveau
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB", marginLeft: "auto" }}>
              v{entry.version}
            </span>
          </div>

          {/* Title + date */}
          <p style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", margin: "0 0 3px" }}>{entry.titre}</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 12px" }}>{formatDateFr(entry.publishedAt)}</p>

          {/* Description */}
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.75, margin: "0 0 14px", whiteSpace: "pre-wrap" }}>{entry.description}</p>

          {/* Images: landscape grid / extra portrait images */}
          {!usePortraitLayout && <ImageGrid images={entry.images} />}
          {usePortraitLayout && entry.images.length > 1 && <ImageGrid images={entry.images.slice(1)} />}

          {/* ── Action area ── */}
          {showButtons && (
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ACTION_BTNS.map(btn => {
                  const isSel = selectedAction === btn.key;
                  return (
                    <button
                      key={btn.key}
                      onClick={() => { setSelectedAction(btn.key); if (btn.key === "approuve") setReason(""); }}
                      style={{
                        padding: "8px 14px", borderRadius: 9,
                        border: `1.5px solid ${btn.borderColor}`,
                        background: isSel ? btn.selectedBg : "#fff",
                        color: isSel ? "#fff" : btn.unselectedText,
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        transition: "background 0.12s, color 0.12s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>

              {needsReason && (
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={selectedAction === "refuse" ? "Raison du refus…" : "Quelle modification souhaitez-vous ?"}
                  rows={2}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 8, marginTop: 10,
                    border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
                    outline: "none", fontFamily: "inherit", resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                style={{
                  marginTop: 12, padding: "9px 22px", borderRadius: 9, border: "none",
                  background: canSubmit ? "#0362E3" : "#E5E7EB",
                  color: canSubmit ? "#fff" : "#9CA3AF",
                  fontSize: 13, fontWeight: 600,
                  cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          )}

          {/* Status badge after action */}
          {!showButtons && entry.statut !== "en_attente" && (
            <div>
              <div style={{
                display: "flex", flexDirection: "column", gap: 5,
                padding: "10px 14px", borderRadius: 9,
                background: cfg.bg, border: `1px solid ${cfg.border}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                {entry.raisonClient && (
                  <span style={{ fontSize: 12, color: cfg.color, opacity: 0.85, lineHeight: 1.6 }}>{entry.raisonClient}</span>
                )}
              </div>
              <button
                onClick={() => { setShowButtons(true); setSelectedAction(null); setReason(""); }}
                style={{
                  background: "none", border: "none", padding: "6px 0 0",
                  color: "#9CA3AF", fontSize: 11, cursor: "pointer",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                }}
              >
                Modifier mon choix
              </button>
            </div>
          )}
        </div>

        {/* ── Right: portrait image ── */}
        {usePortraitLayout && (
          <div style={{
            width: 300, flexShrink: 0,
            borderLeft: "2px solid #F3F4F6",
            background: "#F8FAFC",
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            minHeight: 320,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.images[0]}
              alt=""
              onClick={() => onImageClick(entry.images[0])}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                cursor: "pointer",
              }}
            />
          </div>
        )}
      </div>

      {/* ── Conversation accordion ── */}
      <div style={{ borderTop: "1px solid #F3F4F6" }}>
        <button
          onClick={() => setConvOpen(o => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Conversation{conversation.length > 0 ? ` (${conversation.length})` : ""}
          </span>
          {convOpen ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
        </button>

        {convOpen && (
          <div style={{ padding: "0 20px 14px" }}>
            {conversation.length === 0 ? (
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Aucun message pour l'instant.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {conversation.map(msg => (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.auteur === "client" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "82%", padding: "9px 13px", borderRadius: 12,
                      background: msg.auteur === "client" ? "#EFF6FF" : "#F9FAFB",
                      border: `1px solid ${msg.auteur === "client" ? "#BFDBFE" : "#E5E7EB"}`,
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: msg.auteur === "client" ? "#1D4ED8" : "#374151", margin: "0 0 4px" }}>
                        {msg.auteur === "client" ? "Vous" : "AW Solution"}
                      </p>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{msg.message}</p>
                      <p style={{ fontSize: 10, color: "#9CA3AF", margin: "5px 0 0", textAlign: msg.auteur === "client" ? "right" : "left" }}>
                        {formatTimeFr(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply input — always visible */}
      <div style={{ borderTop: "1px solid #F3F4F6", padding: "12px 20px", display: "flex", gap: 8 }}>
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
          placeholder="Ajouter un commentaire…"
          rows={1}
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 8,
            border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
            outline: "none", fontFamily: "inherit", resize: "none",
          }}
        />
        <button
          onClick={handleSendReply}
          disabled={!reply.trim() || sendingReply}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: reply.trim() ? "#0362E3" : "#E5E7EB",
            color: reply.trim() ? "#fff" : "#9CA3AF",
            fontSize: 12, fontWeight: 600,
            cursor: reply.trim() && !sendingReply ? "pointer" : "not-allowed",
            flexShrink: 0,
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
