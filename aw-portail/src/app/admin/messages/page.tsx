"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  collection, onSnapshot, query, orderBy, where,
  addDoc, Timestamp, doc, getDoc, writeBatch, getDocs, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markActionCompleteFor } from "@/lib/notifications";
import {
  Search, MessageSquare, Send, ExternalLink, ChevronDown,
  CheckCircle, Bell, CalendarDays,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientDoc { id: string; nom: string; courriel: string; forfait: string; }

interface Msg {
  id: string; texte: string; auteur: string;
  auteurRole: "client" | "admin"; date: Date; lu: boolean;
  lien?: string; typeMsg?: string;
}

interface ConvMeta { lastMessage: Msg | null; unreadCount: number; }

interface DemandeSupport {
  id: string; categorie: string; raisonAutre?: string;
  description: string; images: string[];
  statut: "ouvert" | "en_cours" | "resolu"; createdAt: Date;
}

interface Creneau { date: string; heure: string; }
interface RencontreItem {
  id: string; type: "Validation" | "Mensuelle"; statut: string;
  creneaux?: Creneau[]; creneauChoisi?: Creneau;
  envoye?: boolean; createdAt?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
}

function avatarColor(name: string): string {
  const palette = ["#0362E3","#7C3AED","#059669","#DC2626","#D97706","#0891B2","#4F46E5","#0E7490"];
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function msgTime(d: Date): string {
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

function ForfaitBadge({ f }: { f: string }) {
  const p = f.toLowerCase() === "prestige";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
      background: p ? "#EFF6FF" : "#F3F4F6", color: p ? "#1D4ED8" : "#6B7280" }}>
      {p ? "Prestige" : "Essentiel"}
    </span>
  );
}

function StatutDemandeBadge({ s }: { s: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ouvert:   { bg: "#EFF6FF", color: "#1D4ED8", label: "Ouvert"   },
    en_cours: { bg: "#FFFBEB", color: "#B45309", label: "En cours" },
    resolu:   { bg: "#F0FDF4", color: "#166534", label: "Résolu"   },
  };
  const st = map[s] ?? { bg: "#F3F4F6", color: "#374151", label: s };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: st.bg, color: st.color }}>
      {st.label}
    </span>
  );
}

// ─── Tab : Messages ───────────────────────────────────────────────────────────

function MessagesTab({ clientId, client }: { clientId: string; client: ClientDoc }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [texte,    setTexte]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "clients", clientId, "messages"), orderBy("date", "asc"));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({
        id: d.id, texte: d.data().texte ?? "", auteur: d.data().auteur ?? "",
        auteurRole: d.data().auteurRole ?? "admin",
        date: d.data().date instanceof Timestamp ? d.data().date.toDate() : new Date(),
        lu: d.data().lu ?? true,
        lien: d.data().lien, typeMsg: d.data().typeMsg,
      })));
    });
  }, [clientId]);

  // Mark client messages as read when tab opens
  useEffect(() => {
    async function mark() {
      const q = query(
        collection(db, "clients", clientId, "messages"),
        where("auteurRole", "==", "client"), where("lu", "==", false)
      );
      const snap = await getDocs(q);
      if (!snap.size) return;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { lu: true }));
      await batch.commit();
    }
    mark();
  }, [clientId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!texte.trim() || sending) return;
    setSending(true);
    const msg = texte.trim(); const now = Timestamp.now();
    try {
      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: msg, auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
      });
      if (client.courriel) {
        fetch("/api/email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: client.courriel,
            subject: "Nouveau message de AW Solution",
            html: `<p>Bonjour <strong>${client.nom}</strong>,</p><p>Vous avez reçu un nouveau message de votre équipe AW Solution :</p><div style="background:#f5f5f5;padding:14px;border-radius:8px;margin:12px 0">${msg}</div><p><a href="https://portail.awsolution.ca/client/${clientId}/support" style="color:#0362E3">Répondre dans votre portail →</a></p>`,
          }),
        }).catch(() => {});
      }
      setTexte("");
    } finally { setSending(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, margin: "60px 0" }}>
            Aucun message pour l'instant.
          </p>
        )}
        {messages.map(m => {
          const isAdmin = m.auteurRole === "admin";
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isAdmin ? "flex-end" : "flex-start" }}>
              {!isAdmin && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 3px 4px" }}>{m.auteur}</p>}
              {isAdmin && <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 3px" }}>Vous (AW Solution)</p>}
              <div style={{
                maxWidth: "70%",
                background: isAdmin ? "#0362E3" : "#F3F4F6",
                color: isAdmin ? "#fff" : "#1F2937",
                borderRadius: isAdmin ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
              }}>
                {m.texte}
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "3px 0 0", padding: "0 4px" }}>{msgTime(m.date)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ borderTop: "1px solid #E5E7EB", padding: "12px 24px", display: "flex", gap: 10, alignItems: "flex-end", background: "#fff", flexShrink: 0 }}>
        <textarea
          value={texte}
          onChange={e => setTexte(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Répondre… (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"
          rows={2}
          style={{ flex: 1, resize: "none", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1F2937", outline: "none", fontFamily: "inherit" }}
          onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = "#0362E3"; }}
          onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = "#E5E7EB"; }}
        />
        <button
          onClick={send} disabled={!texte.trim() || sending}
          style={{ width: 42, height: 42, borderRadius: 10, border: "none", background: !texte.trim() || sending ? "#E5E7EB" : "#0362E3", color: "#fff", cursor: !texte.trim() || sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Tab : Demandes support ───────────────────────────────────────────────────

function DemandesSupportTab({ clientId }: { clientId: string }) {
  const [demandes,  setDemandes]  = useState<DemandeSupport[]>([]);
  const [expanded,  setExpanded]  = useState<string | null>(null);

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

  async function changeStatut(id: string, statut: string) {
    await updateDoc(doc(db, "clients", clientId, "demandesSupport", id), { statut });
    // Cas 6 : admin passe la demande à "resolu" ou "en_cours" → demande_support actionCompletee
    if (statut === "resolu" || statut === "en_cours") {
      await markActionCompleteFor({ clientId, type: "demande_support", destinataire: "admin" });
    }
  }

  if (demandes.length === 0) {
    return <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "60px 24px" }}>Aucune demande de support.</p>;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {demandes.map(d => {
          const isExp    = expanded === d.id;
          const catLabel = d.categorie === "Autre" && d.raisonAutre ? `Autre — ${d.raisonAutre}` : d.categorie;
          return (
            <div key={d.id} style={{ border: "1px solid #F3F4F6", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px" }}>
                <button
                  onClick={() => setExpanded(isExp ? null : d.id)}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left", minWidth: 0 }}
                >
                  <span style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>
                    {d.createdAt.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {catLabel}
                  </span>
                  <StatutDemandeBadge s={d.statut} />
                </button>
                <select
                  value={d.statut}
                  onChange={e => changeStatut(d.id, e.target.value)}
                  style={{ fontSize: 11, padding: "5px 8px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB", color: "#374151", cursor: "pointer", outline: "none", flexShrink: 0 }}
                >
                  <option value="ouvert">Ouvert</option>
                  <option value="en_cours">En cours</option>
                  <option value="resolu">Résolu</option>
                </select>
                <button
                  onClick={() => setExpanded(isExp ? null : d.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4, flexShrink: 0 }}
                >
                  <ChevronDown size={14} style={{ transform: isExp ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                </button>
              </div>
              {isExp && (
                <div style={{ padding: "12px 14px", borderTop: "1px solid #F3F4F6", background: "#FAFAFA" }}>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{d.description}</p>
                  {d.images.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {d.images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 7, border: "1px solid #E5E7EB" }} />
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
  );
}

// ─── Tab : Rencontres ─────────────────────────────────────────────────────────

function RencontresTab({ clientId, client }: { clientId: string; client: ClientDoc }) {
  const [rencontres, setRencontres] = useState<RencontreItem[]>([]);
  const [rappelSent, setRappelSent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Rencontres mensuelles (temps réel)
    const q = query(collection(db, "clients", clientId, "rencontresMensuelles"), orderBy("createdAt", "desc"));
    const unsubM = onSnapshot(q, snap => {
      const monthly: RencontreItem[] = snap.docs.map(d => ({
        id: d.id, type: "Mensuelle" as const,
        statut: d.data().statut ?? "demandee",
        creneaux: d.data().creneaux ?? [],
        creneauChoisi: d.data().creneauChoisi ?? undefined,
        envoye: d.data().envoye ?? false,
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
      }));
      setRencontres(prev => {
        const validations = prev.filter(r => r.type === "Validation");
        return [...monthly, ...validations].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      });
    });

    // Rencontre de validation (one-time read)
    getDoc(doc(db, "clients", clientId, "roadmap", "rencontreValidation")).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      const item: RencontreItem = {
        id: "validation", type: "Validation",
        statut: d.statut ?? "en_attente",
        creneaux: d.creneaux ?? [],
        creneauChoisi: d.creneauChoisi ?? undefined,
        envoye: d.envoye ?? false,
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(0),
      };
      setRencontres(prev => {
        const others = prev.filter(r => r.type !== "Validation");
        return [item, ...others].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      });
    }).catch(() => {});

    return () => { unsubM(); };
  }, [clientId]);

  async function rappelerClient(r: RencontreItem) {
    const now = Timestamp.now();
    const label = r.type === "Validation" ? "rencontre de validation" : "rencontre mensuelle";
    await addDoc(collection(db, "clients", clientId, "messages"), {
      texte: `Rappel : Nous vous avons envoyé des créneaux pour votre ${label}. Merci de sélectionner votre disponibilité depuis votre portail, section Support.`,
      auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
    });
    if (client.courriel) {
      fetch("/api/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: client.courriel,
          subject: `Rappel — Choisissez votre créneau pour votre ${label}`,
          html: `<p>Bonjour <strong>${client.nom}</strong>,</p><p>Des créneaux vous ont été proposés pour votre <strong>${label}</strong>. Merci de sélectionner celui qui vous convient depuis votre portail.</p><p><a href="https://portail.awsolution.ca/client/${clientId}/support" style="color:#0362E3">Accéder à mon portail →</a></p>`,
        }),
      }).catch(() => {});
    }
    setRappelSent(prev => ({ ...prev, [r.id]: true }));
    setTimeout(() => setRappelSent(prev => ({ ...prev, [r.id]: false })), 3000);
  }

  if (rencontres.length === 0) {
    return <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "60px 24px" }}>Aucune rencontre planifiée.</p>;
  }

  const statutMap: Record<string, { label: string; bg: string; color: string }> = {
    demandee:         { label: "Demandée",         bg: "#EFF6FF", color: "#1D4ED8" },
    creneaux_envoyes: { label: "Créneaux envoyés", bg: "#FFFBEB", color: "#B45309" },
    confirmee:        { label: "Confirmée",        bg: "#F0FDF4", color: "#166534" },
    resolue:          { label: "Terminée",         bg: "#F3F4F6", color: "#6B7280" },
    en_attente:       { label: "En attente",       bg: "#EFF6FF", color: "#1D4ED8" },
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rencontres.map(r => {
          const st            = statutMap[r.statut] ?? { label: r.statut, bg: "#F3F4F6", color: "#374151" };
          const isDemandee    = r.statut === "demandee" || r.statut === "en_attente";
          const needsRappel   = r.statut === "creneaux_envoyes";
          const isConfirmed   = r.statut === "confirmee";
          const isTerminee    = r.statut === "resolue";
          const creneauDate   = r.creneauChoisi
            ? new Date(`${r.creneauChoisi.date}T${r.creneauChoisi.heure}:00`)
            : null;
          const typeBadgeBg    = r.type === "Validation" ? "#F0FDF4" : "#FAF5FF";
          const typeBadgeColor = r.type === "Validation" ? "#166534" : "#7C3AED";
          const typeLabel      = r.type === "Validation" ? "Validation" : "Mensuelle";

          // ── Carte : Rencontre confirmée (prévue) ──────────────────────
          if (isConfirmed && creneauDate) {
            return (
              <div key={r.id} style={{
                border: "1.5px solid #BBF7D0", borderRadius: 14, overflow: "hidden", background: "#fff",
              }}>
                <div style={{ padding: "10px 16px", background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)", borderBottom: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", flex: 1 }}>Rencontre prévue</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: typeBadgeBg, color: typeBadgeColor }}>{typeLabel}</span>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", margin: "0 0 3px", textTransform: "capitalize" }}>
                    {creneauDate.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>
                    à {r.creneauChoisi?.heure}
                  </p>
                </div>
              </div>
            );
          }

          // ── Carte : Terminée ──────────────────────────────────────────
          if (isTerminee) {
            return (
              <div key={r.id} style={{ border: "1px solid #F3F4F6", borderRadius: 12, background: "#FAFAFA", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: typeBadgeBg, color: typeBadgeColor }}>{typeLabel}</span>
                <span style={{ fontSize: 12, color: "#9CA3AF", flex: 1 }}>
                  {r.creneauChoisi
                    ? `${new Date(`${r.creneauChoisi.date}T${r.creneauChoisi.heure}:00`).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })} à ${r.creneauChoisi.heure}`
                    : r.createdAt?.toLocaleDateString("fr-CA", { day: "numeric", month: "short" }) ?? ""}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#F3F4F6", color: "#6B7280" }}>Terminée</span>
              </div>
            );
          }

          // ── Carte : Demandée — action requise ─────────────────────────
          if (isDemandee) {
            return (
              <div key={r.id} style={{
                border: "1.5px solid #BFDBFE", borderRadius: 14, overflow: "hidden", background: "#fff",
              }}>
                <div style={{ padding: "10px 16px", background: "linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)", borderBottom: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", flex: 1 }}>Demande de rencontre reçue</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: typeBadgeBg, color: typeBadgeColor }}>{typeLabel}</span>
                </div>
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, color: "#374151", margin: "0 0 2px" }}>
                      Le client a demandé une rencontre.
                    </p>
                    {r.createdAt && (
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                        Reçue le {r.createdAt.toLocaleDateString("fr-CA", { day: "numeric", month: "long" })}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/admin/clients/${clientId}?tab=rencontres`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 12, fontWeight: 700, padding: "9px 14px", borderRadius: 9,
                      background: "#0362E3", color: "#fff", textDecoration: "none",
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    <CalendarDays size={13} />
                    Céduler la rencontre
                  </Link>
                </div>
              </div>
            );
          }

          // ── Carte : Créneaux envoyés ───────────────────────────────────
          return (
            <div key={r.id} style={{ border: "1px solid #FDE68A", borderRadius: 12, background: "#fff", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: typeBadgeBg, color: typeBadgeColor }}>{typeLabel}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#B45309", margin: "0 0 6px", fontWeight: 500 }}>
                    {r.creneaux?.length ?? 0} créneau{(r.creneaux?.length ?? 0) > 1 ? "x" : ""} proposé{(r.creneaux?.length ?? 0) > 1 ? "s" : ""} — en attente du client
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {r.creneaux?.map((c, i) => (
                      <p key={i} style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
                        · {new Date(`${c.date}T${c.heure}:00`).toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" })} à {c.heure}
                      </p>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => rappelerClient(r)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "7px 12px", borderRadius: 8,
                    border: `1px solid ${rappelSent[r.id] ? "#BBF7D0" : "#FDE68A"}`,
                    background: rappelSent[r.id] ? "#F0FDF4" : "#FFFBEB",
                    color: rappelSent[r.id] ? "#166534" : "#B45309",
                    cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  {rappelSent[r.id] ? <><CheckCircle size={11} /> Envoyé</> : <><Bell size={11} /> Rappeler le client</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Panneau droit — conversation active ──────────────────────────────────────

function ConversationPanel({ clientId, client, initialTab }: { clientId: string; client: ClientDoc; initialTab?: "messages" | "demandes" | "rencontres" }) {
  const [activeTab, setActiveTab] = useState<"messages" | "demandes" | "rencontres">(initialTab ?? "messages");

  const tabs = [
    { id: "messages",   label: "Messages"         },
    { id: "demandes",   label: "Demandes support" },
    { id: "rencontres", label: "Rencontres"       },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* En-tête */}
      <div style={{ padding: "14px 24px 0", borderBottom: "1px solid #E5E7EB", background: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor(client.nom), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{getInitials(client.nom)}</span>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A" }}>{client.nom}</span>
                <ForfaitBadge f={client.forfait} />
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{client.courriel}</span>
            </div>
          </div>
          <Link
            href={`/admin/clients/${clientId}`}
            target="_blank"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#0362E3", textDecoration: "none", padding: "7px 12px", borderRadius: 8, border: "1px solid #DBEAFE", background: "#EFF6FF", flexShrink: 0 }}
          >
            Voir la fiche <ExternalLink size={12} />
          </Link>
        </div>
        {/* Onglets */}
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 16px", fontSize: 13, fontWeight: 600,
                border: "none", background: "none", cursor: "pointer",
                color:       activeTab === t.id ? "#0362E3" : "#6B7280",
                borderBottom: activeTab === t.id ? "2px solid #0362E3" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {/* Contenu */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F9FAFB" }}>
        {activeTab === "messages"   && <MessagesTab         clientId={clientId} client={client} />}
        {activeTab === "demandes"   && <DemandesSupportTab  clientId={clientId} />}
        {activeTab === "rencontres" && <RencontresTab        clientId={clientId} client={client} />}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

function AdminMessagesContent() {
  const searchParams = useSearchParams();

  const [clients,       setClients]       = useState<ClientDoc[]>([]);
  const [convMeta,      setConvMeta]      = useState<Record<string, ConvMeta>>({});
  const [demandeCounts, setDemandeCounts] = useState<Record<string, number>>({});
  const [rencontreCounts, setRencontreCounts] = useState<Record<string, number>>({});
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState<"tous" | "nonlus" | "demandes">("tous");

  const msgUnsubs = useRef<Record<string, () => void>>({});
  const demUnsubs = useRef<Record<string, () => void>>({});
  const renUnsubs = useRef<Record<string, () => void>>({});

  // Sélection initiale depuis l'URL (?clientId=&tab=) — une seule fois, pour
  // ne pas reforcer selectedId si l'admin choisit ensuite une autre
  // conversation manuellement. Si clientId ne correspond à aucun client
  // chargé, on ne fait rien : le comportement par défaut (aucune conversation
  // sélectionnée) s'applique tel quel.
  const initFromUrlRef = useRef(false);
  useEffect(() => {
    if (initFromUrlRef.current || !clients.length) return;
    const cid = searchParams.get("clientId");
    if (cid && clients.some(c => c.id === cid)) setSelectedId(cid);
    initFromUrlRef.current = true;
  }, [clients, searchParams]);

  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "messages" || tabParam === "demandes" || tabParam === "rencontres" ? tabParam : undefined;

  // Charger tous les clients (temps réel)
  useEffect(() => {
    return onSnapshot(collection(db, "clients"), snap => {
      setClients(snap.docs.map(d => ({
        id: d.id,
        nom:      d.data().nom ?? d.data().restaurant ?? "Client",
        courriel: d.data().courriel ?? "",
        forfait:  d.data().forfait ?? "Essentiel",
      })));
    });
  }, []);

  // Par client : abonnements messages + demandes + rencontres (temps réel)
  useEffect(() => {
    if (!clients.length) return;
    const existingIds = new Set(clients.map(c => c.id));

    // Nettoyer abonnements clients retirés
    [msgUnsubs, demUnsubs, renUnsubs].forEach(ref => {
      Object.keys(ref.current).forEach(id => {
        if (!existingIds.has(id)) { ref.current[id]?.(); delete ref.current[id]; }
      });
    });

    clients.forEach(client => {
      const cid = client.id;

      // Messages
      if (!msgUnsubs.current[cid]) {
        const q = query(collection(db, "clients", cid, "messages"), orderBy("date", "desc"));
        msgUnsubs.current[cid] = onSnapshot(q, snap => {
          const msgs = snap.docs.map(d => ({
            id: d.id, texte: d.data().texte ?? "", auteur: d.data().auteur ?? "",
            auteurRole: d.data().auteurRole ?? "admin",
            date: d.data().date instanceof Timestamp ? d.data().date.toDate() : new Date(),
            lu: d.data().lu ?? true,
          }));
          setConvMeta(prev => ({
            ...prev,
            [cid]: {
              lastMessage:  msgs[0] ?? null,
              unreadCount:  msgs.filter(m => m.auteurRole === "client" && !m.lu).length,
            },
          }));
        });
      }

      // Demandes ouvertes
      if (!demUnsubs.current[cid]) {
        const q = query(collection(db, "clients", cid, "demandesSupport"), where("statut", "==", "ouvert"));
        demUnsubs.current[cid] = onSnapshot(q, snap => {
          setDemandeCounts(prev => ({ ...prev, [cid]: snap.size }));
        });
      }

      // Rencontres en attente de choix client
      if (!renUnsubs.current[cid]) {
        const q = query(collection(db, "clients", cid, "rencontresMensuelles"), where("statut", "==", "creneaux_envoyes"));
        renUnsubs.current[cid] = onSnapshot(q, snap => {
          setRencontreCounts(prev => ({ ...prev, [cid]: snap.size }));
        });
      }
    });

    return () => {
      [msgUnsubs, demUnsubs, renUnsubs].forEach(ref => {
        Object.values(ref.current).forEach(u => u());
        ref.current = {};
      });
    };
  }, [clients]);

  // Construction + tri de la liste de conversations
  const conversations = clients
    .filter(c => {
      const meta     = convMeta[c.id];
      const hasMsgs  = !!meta?.lastMessage;
      const hasDem   = (demandeCounts[c.id] ?? 0) > 0;
      const hasRen   = (rencontreCounts[c.id] ?? 0) > 0;
      if (!hasMsgs && !hasDem && !hasRen) return false;
      if (filter === "nonlus"  && (meta?.unreadCount ?? 0) === 0) return false;
      if (filter === "demandes" && (demandeCounts[c.id] ?? 0) === 0) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.nom.toLowerCase().includes(q) && !c.courriel.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const ta = convMeta[a.id]?.lastMessage?.date?.getTime() ?? 0;
      const tb = convMeta[b.id]?.lastMessage?.date?.getTime() ?? 0;
      return tb - ta;
    });

  // Compteurs globaux
  const totalUnread    = Object.values(convMeta).reduce((s, m) => s + (m.unreadCount ?? 0), 0);
  const totalDemandes  = Object.values(demandeCounts).reduce((s, n) => s + n, 0);
  const totalRencontres = Object.values(rencontreCounts).reduce((s, n) => s + n, 0);

  const selectedClient = clients.find(c => c.id === selectedId) ?? null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 56, right: 0, bottom: 0,
      display: "flex", zIndex: 20,
    }}>
      {/* ──── Colonne gauche (30%) ──── */}
      <div style={{ width: "30%", minWidth: 270, maxWidth: 360, borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column", background: "#fff" }}>

        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: "0 0 12px" }}>Messages</p>

          {/* Recherche */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
            <input
              placeholder="Rechercher un client…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: "#1F2937", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {/* Filtres pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(["tous", "nonlus", "demandes"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer",
                background: filter === f ? "#0362E3" : "#F3F4F6",
                color:      filter === f ? "#fff"    : "#6B7280",
              }}>
                {f === "tous" ? "Tous" : f === "nonlus" ? "Non lus" : "Demandes"}
              </button>
            ))}
          </div>

          {/* Compteurs rapides */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {totalUnread > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#DC2626" }}>
                {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
              </span>
            )}
            {totalUnread > 0 && (totalDemandes > 0 || totalRencontres > 0) && (
              <span style={{ fontSize: 11, color: "#D1D5DB" }}>·</span>
            )}
            {totalDemandes > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#D97706" }}>
                {totalDemandes} demande{totalDemandes > 1 ? "s" : ""} ouverte{totalDemandes > 1 ? "s" : ""}
              </span>
            )}
            {totalDemandes > 0 && totalRencontres > 0 && (
              <span style={{ fontSize: 11, color: "#D1D5DB" }}>·</span>
            )}
            {totalRencontres > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED" }}>
                {totalRencontres} rencontre{totalRencontres > 1 ? "s" : ""} en attente
              </span>
            )}
          </div>
        </div>

        {/* Liste des conversations */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 && (
            <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "40px 16px" }}>
              {search ? "Aucun résultat" : "Aucune conversation"}
            </p>
          )}
          {conversations.map(client => {
            const meta       = convMeta[client.id] ?? { lastMessage: null, unreadCount: 0 };
            const isSelected = selectedId === client.id;
            const hasDem     = (demandeCounts[client.id] ?? 0) > 0;
            const hasRen     = (rencontreCounts[client.id] ?? 0) > 0;

            return (
              <button
                key={client.id}
                onClick={() => setSelectedId(client.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "12px 14px", border: "none",
                  borderBottom: "1px solid #F9FAFB",
                  background: isSelected ? "#EFF6FF" : "transparent",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarColor(client.nom), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{getInitials(client.nom)}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {client.nom}
                    </span>
                    <ForfaitBadge f={client.forfait} />
                  </div>
                  {meta.lastMessage ? (
                    <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {meta.lastMessage.auteurRole === "admin" ? "Vous : " : ""}
                      {meta.lastMessage.texte}
                    </p>
                  ) : (
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontStyle: "italic" }}>Aucun message</p>
                  )}
                  {/* Indicateurs secondaires */}
                  <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    {hasDem && (
                      <span style={{ fontSize: 10, color: "#D97706", fontWeight: 600 }}>
                        {demandeCounts[client.id]} demande{demandeCounts[client.id] > 1 ? "s" : ""}
                      </span>
                    )}
                    {hasRen && (
                      <span style={{ fontSize: 10, color: "#7C3AED", fontWeight: 600 }}>
                        {rencontreCounts[client.id]} rencontre{rencontreCounts[client.id] > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta droite */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {meta.lastMessage && (
                    <span style={{ fontSize: 10, color: "#9CA3AF" }}>{msgTime(meta.lastMessage.date)}</span>
                  )}
                  {meta.unreadCount > 0 && (
                    <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                      {meta.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ──── Colonne droite (70%) ──── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F9FAFB" }}>
        {!selectedClient ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#9CA3AF" }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={26} color="#D1D5DB" />
            </div>
            <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>
              Sélectionnez une conversation pour commencer
            </p>
          </div>
        ) : (
          <ConversationPanel clientId={selectedId!} client={selectedClient} initialTab={initialTab} />
        )}
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense>
      <AdminMessagesContent />
    </Suspense>
  );
}
