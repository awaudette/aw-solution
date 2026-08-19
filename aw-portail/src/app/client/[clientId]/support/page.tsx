"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  Timestamp, where, getDocs, writeBatch, doc, getDoc,
  setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification, markActionCompleteFor } from "@/lib/notifications";
import { useClientData } from "@/hooks/useClientData";
import {
  Send, Phone, Mail, Calendar, ChevronDown, ChevronUp,
  CheckCircle, Clock, FileText, Plus, X, Paperclip,
  Video, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string; texte: string; auteur: string;
  auteurRole: "client" | "admin"; date: Date;
  lu: boolean; lien?: string; typeMsg?: string;
}

interface DemandeSupport {
  id: string; categorie: string; raisonAutre?: string;
  description: string; images: string[];
  statut: "ouvert" | "en_cours" | "resolu"; createdAt: Date;
}

interface Creneau { date: string; heure: string }

interface RencontreMensuelle {
  id: string; statut: "demandee" | "creneaux_envoyes" | "confirmee" | "resolue";
  creneaux?: Creneau[]; creneauChoisi?: Creneau; envoye?: boolean;
  createdAt: Date; notes?: string;
}

interface StatutPlateforme {
  statut: "operational" | "maintenance" | "incident";
  message: string; updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function generateICS(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(date.getTime() + 30 * 60 * 1000);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AW Solution//Support//FR",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(date)}`,
    `DTEND:${fmt(end)}`,
    "SUMMARY:Rencontre stratégique mensuelle — AW Solution",
    "DESCRIPTION:Rencontre vidéo de 30 minutes avec l'équipe AW Solution.",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(date: Date) {
  const blob = new Blob([generateICS(date)], { type: "text/calendar" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "rencontre-aw-solution.ics"; a.click();
  URL.revokeObjectURL(url);
}

function parseCreneauDate(c: Creneau): Date {
  // date: "2026-09-15", heure: "14:00"
  return new Date(`${c.date}T${c.heure}:00`);
}

// ─── Styles partagés ──────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 16, overflow: "hidden",
};
const CARD_HEADER: React.CSSProperties = {
  padding: "18px 24px", borderBottom: "1px solid #F3F4F6",
};
const CARD_BODY: React.CSSProperties = { padding: "20px 24px" };
const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 9,
  border: "1px solid #E5E7EB", fontSize: 14, color: "#1F2937",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#6B7280",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};
const BTN_BLUE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "10px 20px", borderRadius: 9, border: "none",
  background: "#0362E3", color: "#fff", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};

const LOGO_URL =
  "https://firebasestorage.googleapis.com/v0/b/aw-portail.firebasestorage.app/o/logos%2FlogoAW.png?alt=media&token=84805ab1-6e47-4c82-a30c-fefb3343d4ee";

// ─── Bloc 1 — En-tête SupportCard ────────────────────────────────────────────

function SupportHeader() {
  return (
    <div style={{ ...CARD, marginBottom: 16 }}>
      <div style={{ padding: "22px 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
          {/* Logo */}
          <img
            src={LOGO_URL}
            alt="AW Solution"
            style={{ width: 52, height: 52, borderRadius: 14, objectFit: "contain", flexShrink: 0, border: "1px solid #F3F4F6" }}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", margin: "0 0 2px" }}>AW Solution</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#6B7280", margin: "0 0 14px" }}>Équipe Support</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href="mailto:alex@awsolution.ca" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0362E3", textDecoration: "none", padding: "6px 12px", borderRadius: 8, background: "#EFF6FF", fontWeight: 500 }}>
                <Mail size={13} /> alex@awsolution.ca
              </a>
              <a href="mailto:support@awsolution.ca" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0362E3", textDecoration: "none", padding: "6px 12px", borderRadius: 8, background: "#EFF6FF", fontWeight: 500 }}>
                <Mail size={13} /> support@awsolution.ca
              </a>
              <a href="tel:+18193840992" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#059669", textDecoration: "none", padding: "6px 12px", borderRadius: 8, background: "#F0FDF4", fontWeight: 500 }}>
                <Phone size={13} /> (819) 384-0992
              </a>
            </div>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "10px 0 0" }}>
              Nous répondons habituellement en moins de 24h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bloc 2 — Messagerie ──────────────────────────────────────────────────────

function MessagerieBloc({ clientId, client }: { clientId: string; client: { nom: string } | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte,    setTexte]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "clients", clientId, "messages"), orderBy("date", "asc"));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({
        id: d.id, texte: d.data().texte ?? "",
        auteur: d.data().auteur ?? "AW Solution",
        auteurRole: d.data().auteurRole ?? "admin",
        date: d.data().date instanceof Timestamp ? d.data().date.toDate() : new Date(),
        lu: d.data().lu ?? false,
        lien: d.data().lien ?? undefined, typeMsg: d.data().typeMsg ?? undefined,
      })));
    });
  }, [clientId]);

  useEffect(() => {
    async function mark() {
      const q    = query(collection(db, "clients", clientId, "messages"), where("auteurRole", "==", "admin"));
      const snap = await getDocs(q);
      const unread = snap.docs.filter(d => d.data().lu === false);
      if (!unread.length) return;
      const batch = writeBatch(db);
      unread.forEach(d => batch.update(d.ref, { lu: true }));
      await batch.commit();
    }
    mark();
  }, [clientId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend() {
    if (!texte.trim() || !client) return;
    setSending(true);
    const now = Timestamp.now(); const msg = texte.trim();
    try {
      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: msg, auteur: client.nom, auteurRole: "client", date: now, lu: false,
      });
      await createNotification({
        type: "nouveau_message", destinataire: "admin",
        clientId, clientNom: client.nom, auteurRole: "client",
        description: `Nouveau message de ${client.nom} : "${msg.slice(0, 80)}${msg.length > 80 ? "…" : ""}"`,
        lien: `/admin/messages`,
      });
      fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "support@awsolution.ca",
          subject: `Nouveau message de ${client.nom}`,
          html: `<p><strong>${client.nom}</strong> vous a envoyé un message :</p><p>${msg}</p>`,
        }),
      }).catch(() => {});
      setTexte("");
    } finally { setSending(false); }
  }

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Messagerie</p>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>Échangez directement avec notre équipe</p>
      </div>

      {/* Messages */}
      <div style={{ padding: "16px 24px", overflowY: "auto", maxHeight: 460, display: "flex", flexDirection: "column", gap: 10, minHeight: 180 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "40px 0", margin: 0 }}>
            Démarrez la conversation avec notre équipe
          </p>
        )}
        {messages.map(m => {
          const isClient   = m.auteurRole === "client";
          const isNouveaute = m.typeMsg === "nouveaute" || m.typeMsg === "mise_a_jour";
          if (isNouveaute && m.lien) {
            const isNv = m.typeMsg === "nouveaute";
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: "center" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 14, width: "100%",
                  background: isNv ? "#FDF4FF" : "#EFF6FF",
                  border: `1px solid ${isNv ? "#E9D5FF" : "#BFDBFE"}`,
                  borderRadius: 12, padding: "11px 16px",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, margin: "0 0 2px", color: isNv ? "#9333EA" : "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {isNv ? "Nouveauté" : "Mise à jour"} · {formatTime(m.date)}
                    </p>
                    <p style={{ fontSize: 13, color: "#374151", margin: 0, fontWeight: 500 }}>{m.texte}</p>
                  </div>
                  <Link href={`/client/${clientId}/${m.lien}`} style={{ fontSize: 12, fontWeight: 600, flexShrink: 0, color: isNv ? "#9333EA" : "#1D4ED8", textDecoration: "none", whiteSpace: "nowrap", background: "#fff", borderRadius: 8, border: `1px solid ${isNv ? "#E9D5FF" : "#BFDBFE"}`, padding: "6px 12px" }}>
                    Voir →
                  </Link>
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isClient ? "flex-end" : "flex-start" }}>
              {!isClient && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 4px 4px", fontWeight: 500 }}>AW Solution</p>}
              <div style={{ maxWidth: "75%", background: isClient ? "#0362E3" : "#F3F4F6", color: isClient ? "#fff" : "#1F2937", borderRadius: isClient ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.5 }}>
                {m.texte}
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0", padding: "0 4px" }}>{formatTime(m.date)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid #F3F4F6", padding: "14px 24px", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          value={texte}
          onChange={e => setTexte(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Écrivez votre message… (Entrée pour envoyer)"
          rows={2}
          style={{ flex: 1, resize: "none", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1F2937", outline: "none", fontFamily: "inherit" }}
          onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "#0362E3"; }}
          onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "#E5E7EB"; }}
        />
        <button
          onClick={handleSend}
          disabled={!texte.trim() || sending}
          style={{ width: 42, height: 42, borderRadius: 10, border: "none", background: !texte.trim() || sending ? "#E5E7EB" : "#0362E3", color: "#fff", cursor: !texte.trim() || sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 150ms" }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Badge statut demande ─────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    ouvert:   { label: "Ouvert",    bg: "#EFF6FF", color: "#1D4ED8" },
    en_cours: { label: "En cours",  bg: "#FFFBEB", color: "#B45309" },
    resolu:   { label: "Résolu",    bg: "#F0FDF4", color: "#166534" },
  };
  const s = map[statut] ?? { label: statut, bg: "#F3F4F6", color: "#374151" };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Bloc 3 — Demande de support structurée ───────────────────────────────────

const CATEGORIES = [
  "Bug technique", "Ajout de succursale", "Changement de design",
  "Modification de l'application", "Question générale", "Autre",
];

function DemandeSupportBloc({ clientId, client }: { clientId: string; client: { nom: string } | null }) {
  const [categorie,    setCategorie]    = useState("");
  const [raisonAutre,  setRaisonAutre]  = useState("");
  const [description,  setDescription]  = useState("");
  const [files,        setFiles]        = useState<File[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [err,          setErr]          = useState("");
  const [demandes,     setDemandes]     = useState<DemandeSupport[]>([]);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "clients", clientId, "demandesSupport"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setDemandes(snap.docs.map(d => ({
        id: d.id, categorie: d.data().categorie ?? "",
        raisonAutre: d.data().raisonAutre ?? undefined,
        description: d.data().description ?? "",
        images: d.data().images ?? [],
        statut: d.data().statut ?? "ouvert",
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
      })));
    });
  }, [clientId]);

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles(prev => [...prev, ...picked].slice(0, 5));
    e.target.value = "";
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  const canSubmit = !!categorie && !!description.trim() && (categorie !== "Autre" || !!raisonAutre.trim());

  async function handleSubmit() {
    if (!canSubmit || !client) return;
    setSaving(true); setErr("");
    try {
      // Upload images
      const imageUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", `clients/${clientId}/support`);
        const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Erreur upload image");
        const data = await res.json();
        imageUrls.push(data.url);
      }

      const catLabel = categorie === "Autre" ? `Autre — ${raisonAutre.trim()}` : categorie;
      const now      = Timestamp.now();

      // Sauvegarder la demande
      await addDoc(collection(db, "clients", clientId, "demandesSupport"), {
        categorie, raisonAutre: raisonAutre.trim() || null,
        description: description.trim(),
        images: imageUrls, statut: "ouvert", createdAt: now,
      });

      // Message automatique dans la messagerie
      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: `Votre demande de support a bien été reçue. Catégorie : ${catLabel}. Notre équipe vous revient sous peu.`,
        auteur: "AW Solution", auteurRole: "admin", date: now, lu: false, typeMsg: "support_confirm",
      });

      // Notification admin
      await createNotification({
        type: "demande_support", destinataire: "admin",
        clientId, clientNom: client.nom, auteurRole: "client",
        description: `${client.nom} — Demande de support (${categorie}) : ${description.trim().slice(0, 100)}`,
        lien: `/admin/clients/${clientId}?tab=support`,
        actionRequise: true,
      });

      setCategorie(""); setRaisonAutre(""); setDescription(""); setFiles([]);
      setSuccess(true); setTimeout(() => setSuccess(false), 4000);
    } catch (e: unknown) {
      setErr((e as Error).message ?? "Erreur");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ ...CARD, border: "1.5px solid #DBEAFE" }}>
      {/* Header distinctif — fond bleu très pâle */}
      <div style={{ padding: "18px 24px", background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)", borderBottom: "1px solid #DBEAFE" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "#0362E3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Soumettre une demande</p>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>
              Pour les demandes nécessitant un suivi formel, utilisez ce formulaire. Notre équipe vous répondra dans les plus brefs délais.
            </p>
          </div>
        </div>
      </div>

      <div style={CARD_BODY}>
        {/* Catégorie */}
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>Catégorie *</label>
          <select style={INPUT} value={categorie} onChange={e => { setCategorie(e.target.value); setRaisonAutre(""); }}>
            <option value="">— Choisir une catégorie —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Raison "Autre" */}
        {categorie === "Autre" && (
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Décrivez la nature de votre demande *</label>
            <input style={INPUT} value={raisonAutre} onChange={e => setRaisonAutre(e.target.value)} placeholder="Ex. : Demande de fonctionnalité personnalisée…" />
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>Description détaillée *</label>
          <textarea
            style={{ ...INPUT, minHeight: 100, resize: "vertical" }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez votre demande en détail…"
          />
        </div>

        {/* Upload images */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL}>Captures d'écran (optionnel, max 5)</label>
          {files.length < 5 && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px dashed #D1D5DB", background: "#F9FAFB", cursor: "pointer", fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
              <Paperclip size={13} />
              Ajouter une image
              <input type="file" accept="image/*" onChange={onFilesChange} style={{ display: "none" }} multiple />
            </label>
          )}
          {files.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: "#F3F4F6", fontSize: 12, color: "#374151" }}>
                  <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2, display: "flex" }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {err && <div style={{ marginBottom: 12, padding: "9px 13px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 13, color: "#DC2626" }}>{err}</div>}

        {success && (
          <div style={{ marginBottom: 12, padding: "9px 13px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 13, color: "#166534", display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={14} /> Demande soumise avec succès. Vous recevrez une réponse dans les plus brefs délais.
          </div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit || saving} style={{ ...BTN_BLUE, opacity: !canSubmit || saving ? 0.5 : 1, cursor: !canSubmit || saving ? "not-allowed" : "pointer" }}>
          {saving ? "Envoi en cours…" : "Soumettre la demande"}
        </button>

        {/* Historique des demandes */}
        {demandes.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 10px" }}>Historique des demandes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {demandes.map(d => {
                const isExp = expandedId === d.id;
                return (
                  <div key={d.id} style={{ border: "1px solid #F3F4F6", borderRadius: 11, overflow: "hidden" }}>
                    <button
                      onClick={() => setExpandedId(isExp ? null : d.id)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FAFAFA", border: "none", cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>
                          {d.createdAt.toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.categorie === "Autre" && d.raisonAutre ? `Autre — ${d.raisonAutre}` : d.categorie}
                        </span>
                        <StatutBadge statut={d.statut} />
                      </div>
                      {isExp ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
                    </button>
                    {isExp && (
                      <div style={{ padding: "12px 16px", borderTop: "1px solid #F3F4F6" }}>
                        <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{d.description}</p>
                        {d.images.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                            {d.images.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`capture ${i + 1}`} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 7, border: "1px solid #E5E7EB" }} />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bloc 4 — Rencontre stratégique mensuelle (Prestige) ─────────────────────

function RencontreMensuelleBloc({ clientId, client }: { clientId: string; client: { nom: string } | null }) {
  const [rencontre,        setRencontre]        = useState<RencontreMensuelle | null>(null);
  const [historique,       setHistorique]       = useState<RencontreMensuelle[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedCreneau,  setSelectedCreneau]  = useState<Creneau | null>(null);
  const [autreDate,        setAutreDate]        = useState("");
  const [autreHeure,       setAutreHeure]       = useState("");
  const [showAltForm,      setShowAltForm]      = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [statutPhase,      setStatutPhase]      = useState<"idle" | "demandee">("idle");

  useEffect(() => {
    const q = query(collection(db, "clients", clientId, "rencontresMensuelles"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({
        id: d.id, statut: d.data().statut ?? "demandee",
        creneaux: d.data().creneaux ?? [],
        creneauChoisi: d.data().creneauChoisi ?? undefined,
        envoye: d.data().envoye ?? false,
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
        notes: d.data().notes ?? undefined,
      }));
      const active = all.find(r => r.statut !== "resolue");
      setRencontre(active ?? null);
      setHistorique(all.filter(r => r.statut === "resolue"));
      setLoading(false);
      setStatutPhase("idle");
    });
  }, [clientId]);

  async function demanderRencontre() {
    if (!client) return;
    setSaving(true);
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, "clients", clientId, "rencontresMensuelles"), {
        statut: "demandee", creneaux: [], envoye: false, createdAt: now,
      });
      await createNotification({
        type: "demande_rencontre", destinataire: "admin",
        clientId, clientNom: client.nom, auteurRole: "client",
        description: `${client.nom} demande une rencontre mensuelle.`,
        lien: `/admin/clients/${clientId}?tab=rencontres`,
        actionRequise: true,
      });
      setStatutPhase("demandee");
    } finally { setSaving(false); }
  }

  async function confirmerCreneau() {
    if (!rencontre || !selectedCreneau) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "clients", clientId, "rencontresMensuelles", rencontre.id), {
        creneauChoisi: selectedCreneau, statut: "confirmee",
      });
      // Cas 2 : client a choisi un créneau → demande_rencontre admin passe à actionCompletee
      await markActionCompleteFor({ clientId, type: "demande_rencontre", destinataire: "admin" });
    } finally { setSaving(false); }
  }

  async function demanderDateAlternative() {
    if (!rencontre || !autreDate || !autreHeure || !client) return;
    setSaving(true);
    const now = Timestamp.now();
    try {
      await updateDoc(doc(db, "clients", clientId, "rencontresMensuelles", rencontre.id), {
        statut: "demandee", creneaux: [], envoye: false,
      });
      await createNotification({
        type: "creneau_refuse", destinataire: "admin",
        clientId, clientNom: client.nom, auteurRole: "client",
        description: `${client.nom} refuse les créneaux proposés et demande le ${autreDate} à ${autreHeure}.`,
        lien: `/admin/clients/${clientId}?tab=rencontres`,
        actionRequise: true,
      });
      setShowAltForm(false); setAutreDate(""); setAutreHeure("");
      setStatutPhase("demandee");
    } finally { setSaving(false); }
  }

  if (loading) return null;

  // Phase 1 : pas de rencontre active ou demandée
  const phase1 = !rencontre || (rencontre.statut === "demandee" && !rencontre.envoye);
  // Phase 2 : créneaux envoyés
  const phase2 = rencontre?.statut === "creneaux_envoyes" && (rencontre.envoye ?? false);
  // Phase 3 : confirmée
  const phase3 = rencontre?.statut === "confirmee";

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#FAF5FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Video size={16} color="#9333EA" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Rencontre stratégique mensuelle</p>
            <p style={{ fontSize: 11, color: "#9333EA", margin: "1px 0 0", fontWeight: 600 }}>Forfait Prestige</p>
          </div>
        </div>
      </div>

      <div style={CARD_BODY}>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.7 }}>
          Votre forfait Prestige inclut une rencontre vidéo de 30 minutes par mois avec notre équipe.{" "}
          <strong style={{ color: "#374151" }}>Ordre du jour suggéré :</strong>{" "}
          revue du rapport mensuel, prochaines campagnes, ajustements stratégiques.
        </p>

        {/* Phase 1 */}
        {phase1 && (
          <div>
            {statutPhase === "demandee" ? (
              <div style={{ padding: "16px 18px", borderRadius: 12, background: "#F0FDF4", border: "1px solid #BBF7D0", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Check size={16} color="#16A34A" style={{ marginTop: 1 }} />
                <p style={{ fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.6 }}>
                  Votre demande a été reçue. Notre équipe vous enverra des disponibilités sous peu.
                </p>
              </div>
            ) : (
              <div>
                {rencontre?.statut === "demandee" && (
                  <div style={{ padding: "14px 16px", borderRadius: 11, background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 13, color: "#B45309", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={14} /> En attente des disponibilités de notre équipe…
                  </div>
                )}
                <button onClick={demanderRencontre} disabled={saving || !!rencontre} style={{ ...BTN_BLUE, opacity: saving || !!rencontre ? 0.5 : 1, cursor: saving || !!rencontre ? "not-allowed" : "pointer" }}>
                  <Calendar size={14} />
                  {rencontre ? "Demande en cours…" : "Demander ma rencontre mensuelle"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase 2 — Créneaux */}
        {phase2 && rencontre && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 12px" }}>
              Choisissez un créneau qui vous convient :
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {(rencontre.creneaux ?? []).map((c, i) => {
                const isSelected = selectedCreneau?.date === c.date && selectedCreneau?.heure === c.heure;
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedCreneau(c); setShowAltForm(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 18px", borderRadius: 11, border: `2px solid ${isSelected ? "#0362E3" : "#E5E7EB"}`,
                      background: isSelected ? "#EFF6FF" : "#fff", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isSelected ? "#0362E3" : "#D1D5DB"}`, background: isSelected ? "#0362E3" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>
                        {new Date(`${c.date}T${c.heure}:00`).toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>{c.heure} — 30 minutes</p>
                    </div>
                  </button>
                );
              })}

              {/* Option date alternative */}
              <button
                onClick={() => { setShowAltForm(f => !f); setSelectedCreneau(null); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderRadius: 11, border: `2px solid ${showAltForm ? "#F59E0B" : "#E5E7EB"}`, background: showAltForm ? "#FFFBEB" : "#fff", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${showAltForm ? "#F59E0B" : "#D1D5DB"}`, background: showAltForm ? "#F59E0B" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {showAltForm && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", margin: 0 }}>Aucune de ces dates ne me convient</p>
              </button>
            </div>

            {/* Formulaire date alternative */}
            {showAltForm && (
              <div style={{ padding: "14px 16px", borderRadius: 11, background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#B45309", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Proposer une date alternative
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={LABEL}>Date</label>
                    <input type="date" style={INPUT} value={autreDate} onChange={e => setAutreDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={LABEL}>Heure</label>
                    <input type="time" style={INPUT} value={autreHeure} onChange={e => setAutreHeure(e.target.value)} />
                  </div>
                </div>
                <button
                  onClick={demanderDateAlternative}
                  disabled={!autreDate || !autreHeure || saving}
                  style={{ ...BTN_BLUE, marginTop: 12, background: "#D97706", opacity: !autreDate || !autreHeure ? 0.5 : 1 }}
                >
                  Envoyer ma proposition
                </button>
              </div>
            )}

            {!showAltForm && (
              <button
                onClick={confirmerCreneau}
                disabled={!selectedCreneau || saving}
                style={{ ...BTN_BLUE, opacity: !selectedCreneau || saving ? 0.5 : 1, cursor: !selectedCreneau || saving ? "not-allowed" : "pointer" }}
              >
                <CheckCircle size={14} /> Confirmer ce créneau
              </button>
            )}
          </div>
        )}

        {/* Phase 3 — Confirmée */}
        {phase3 && rencontre?.creneauChoisi && (
          <div>
            <div style={{ padding: "18px 20px", borderRadius: 13, background: "#F0FDF4", border: "1px solid #BBF7D0", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CheckCircle size={16} color="#16A34A" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Rencontre confirmée</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px" }}>
                {formatDate(parseCreneauDate(rencontre.creneauChoisi))}
              </p>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
                {rencontre.creneauChoisi.heure} — 30 minutes — Vidéo avec l'équipe AW Solution
              </p>
            </div>
            <button
              onClick={() => rencontre.creneauChoisi && downloadICS(parseCreneauDate(rencontre.creneauChoisi))}
              style={{ ...BTN_BLUE, background: "#fff", color: "#0362E3", border: "1.5px solid #0362E3" }}
            >
              <Calendar size={14} /> Ajouter à mon calendrier (.ics)
            </button>
          </div>
        )}

        {/* Historique rencontres passées */}
        {historique.length > 0 && (
          <div style={{ marginTop: 24, borderTop: "1px solid #F3F4F6", paddingTop: 18 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>Rencontres passées</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {historique.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
                  <CheckCircle size={14} color="#9CA3AF" />
                  <span style={{ fontSize: 13, color: "#6B7280" }}>
                    {r.creneauChoisi
                      ? formatDate(parseCreneauDate(r.creneauChoisi))
                      : r.createdAt.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#E5E7EB", color: "#6B7280", fontWeight: 600 }}>Terminée</span>
                  {r.notes && <span style={{ fontSize: 12, color: "#9CA3AF" }}>{r.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bloc 5 — Statut de la plateforme ────────────────────────────────────────

function StatutPlatformeBloc() {
  const [statut, setStatut] = useState<StatutPlateforme | null>(null);

  useEffect(() => {
    getDoc(doc(db, "admin_config", "statut_plateforme")).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setStatut({
        statut:    d.statut ?? "operational",
        message:   d.message ?? "",
        updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
      });
    }).catch(() => {});
  }, []);

  if (!statut) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 13, color: "#166534" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", flexShrink: 0 }} />
        Tous les systèmes sont opérationnels
      </div>
    );
  }

  const map = {
    operational: { dot: "#16A34A", text: "Tous les systèmes sont opérationnels", bg: "#F0FDF4", border: "#BBF7D0", color: "#166534" },
    maintenance:  { dot: "#D97706", text: `Maintenance en cours${statut.message ? ` — ${statut.message}` : ""}`, bg: "#FFFBEB", border: "#FDE68A", color: "#B45309" },
    incident:     { dot: "#DC2626", text: `Incident en cours${statut.message ? ` — ${statut.message}` : ""}`,    bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
  };
  const s = map[statut.statut] ?? map.operational;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, fontSize: 13, color: s.color }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      <span>{s.text}</span>
      {statut.statut !== "operational" && (
        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto", whiteSpace: "nowrap" }}>
          Mis à jour {formatTime(statut.updatedAt)}
        </span>
      )}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function SupportPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const { client }   = useClientData(clientId);
  const [forfait, setForfait] = useState("");

  useEffect(() => {
    getDoc(doc(db, "clients", clientId)).then(snap => {
      if (snap.exists()) setForfait((snap.data().forfait ?? "").toLowerCase());
    });
  }, [clientId]);

  const isPrestige = forfait === "prestige";

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 32px 80px" }}>

        {/* En-tête */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px" }}>Support</h1>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Contactez notre équipe ou soumettez une demande formelle.</p>
        </div>

        {/* Bloc 1 — Coordonnées */}
        <SupportHeader />

        {/* Bloc 2 — Messagerie */}
        <MessagerieBloc clientId={clientId} client={client} />

        {/* Bloc 3 — Demande de support */}
        <DemandeSupportBloc clientId={clientId} client={client} />

        {/* Bloc 4 — Rencontre mensuelle (Prestige) */}
        {isPrestige && <RencontreMensuelleBloc clientId={clientId} client={client} />}

        {/* Bloc 5 — Statut plateforme */}
        <StatutPlatformeBloc />

      </div>
    </div>
  );
}
