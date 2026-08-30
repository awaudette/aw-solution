"use client";

import { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  Timestamp, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import type { RendezVous, RdvStatut } from "@/types/calendrier";
import { CalendarDays, Plus, X, Check, Pencil, Ban, Link as LinkIcon } from "lucide-react";
import { TourSectionButton } from "@/components/tour/TourSectionButton";

const CSS = `@keyframes spin { to { transform: rotate(360deg); } }`;

const STATUT_CFG: Record<RdvStatut, { label: string; color: string; bg: string; border: string }> = {
  en_attente: { label: "En attente",  color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  accepte:    { label: "Confirmé ✓",  color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" },
  refuse:     { label: "Refusé",      color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
  modifie:    { label: "Modifié",     color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
};

function formatDateHeure(date: string, heure: string) {
  const d = new Date(`${date}T${heure}`);
  return d.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    + " à " + heure;
}

function formatDateCourt(date: string) {
  return new Date(date + "T12:00").toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch {}
}


export function ClientCalendrier({ clientId }: { clientId: string }) {
  const [rdvs,    setRdvs]    = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "clients", clientId, "rendezvous"),
      orderBy("date", "asc"),
    );
    return onSnapshot(q, snap => {
      setRdvs(snap.docs.map(d => ({ id: d.id, ...d.data() } as RendezVous)));
      setLoading(false);
    });
  }, [clientId]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rdvs.filter(r => r.date >= today || r.statut === "en_attente");
  const past     = rdvs.filter(r => r.date < today && r.statut !== "en_attente");

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <style>{CSS}</style>
      <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Calendrier</h2>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>Vos rencontres avec l'équipe AW Solution</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10, border: "none",
              background: "#0362E3", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Demande de rencontre
          </button>
          <TourSectionButton section="calendrier" />
        </div>
      </div>

      {/* Formulaire de demande */}
      {showForm && (
        <DemandeForm clientId={clientId} onClose={() => setShowForm(false)} />
      )}

      {/* Rencontres à venir */}
      <section>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
          À venir ({upcoming.length})
        </p>
        {upcoming.length === 0 ? (
          <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "32px 24px", textAlign: "center", border: "1px solid #F3F4F6" }}>
            <CalendarDays size={24} color="#D1D5DB" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Aucune rencontre prévue</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map(rdv => (
              <RdvCard key={rdv.id} rdv={rdv} clientId={clientId} />
            ))}
          </div>
        )}
      </section>

      {/* Rencontres passées */}
      {past.length > 0 && (
        <section>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
            Passées
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {past.slice(0, 5).map(rdv => (
              <div
                key={rdv.id}
                style={{
                  background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 10,
                  padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  opacity: 0.7,
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{rdv.titre}</p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>{formatDateCourt(rdv.date)} à {rdv.heure}</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                  background: STATUT_CFG[rdv.statut].bg, color: STATUT_CFG[rdv.statut].color,
                  border: `1px solid ${STATUT_CFG[rdv.statut].border}`,
                }}>
                  {STATUT_CFG[rdv.statut].label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Formulaire demande client ── */
function DemandeForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [titre,       setTitre]       = useState("");
  const [description, setDescription] = useState("");
  const [date,        setDate]        = useState("");
  const [heure,       setHeure]       = useState("09:00");
  const [submitting,  setSubmitting]  = useState(false);

  const minDate = new Date().toISOString().slice(0, 10);

  async function handleSubmit() {
    if (!titre.trim() || !date || !heure || submitting) return;
    setSubmitting(true);
    try {
      const now = Timestamp.now();
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      const courriel   = clientSnap.data()?.courriel ?? "";

      await addDoc(collection(db, "clients", clientId, "rendezvous"), {
        titre: titre.trim(), description: description.trim(),
        date, heure, statut: "en_attente", initiateur: "client",
        raisonRefus: null, nouvelleDate: null, nouvelleHeure: null,
        createdAt: now, updatedAt: now,
      });

      await createNotification({
        type: "nouveau_rendez_vous", destinataire: "admin",
        clientId, clientNom, auteurRole: "client",
        description: `${clientNom} demande une rencontre : "${titre.trim()}" — ${formatDateCourt(date)} à ${heure}`,
        lien: `/admin/calendrier`,
        actionRequise: true,
      });

      await sendEmail(
        "alex@awsolution.ca",
        `📅 Demande de rencontre — ${clientNom}`,
        `<p><strong>${clientNom}</strong> a soumis une demande de rencontre.</p>
         <p><strong>Titre :</strong> ${titre.trim()}</p>
         <p><strong>Date souhaitée :</strong> ${formatDateCourt(date)} à ${heure}</p>
         ${description.trim() ? `<p><strong>Raison :</strong> ${description.trim()}</p>` : ""}`,
      );

      onClose();
    } finally { setSubmitting(false); }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Demande de rencontre</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <X size={16} color="#9CA3AF" />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Titre / Sujet">
          <input
            type="text" value={titre} onChange={e => setTitre(e.target.value)}
            placeholder="Ex : Révision des maquettes de design"
            style={inputStyle}
          />
        </Field>
        <Field label="Description (optionnel)">
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Décrivez la raison de la rencontre…"
            rows={2} style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date souhaitée">
            <input type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Heure souhaitée">
            <input type="time" value={heure} onChange={e => setHeure(e.target.value)} style={inputStyle} />
          </Field>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!titre.trim() || !date || submitting}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none", alignSelf: "flex-start",
            background: titre.trim() && date ? "#0362E3" : "#E5E7EB",
            color: titre.trim() && date ? "#fff" : "#9CA3AF",
            fontSize: 13, fontWeight: 600, cursor: titre.trim() && date && !submitting ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Envoi…" : "Envoyer la demande"}
        </button>
      </div>
    </div>
  );
}

/* ── Carte RDV côté client ── */
function RdvCard({ rdv, clientId }: { rdv: RendezVous; clientId: string }) {
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [nouvelleDate,   setNouvelleDate]   = useState(rdv.date);
  const [nouvelleHeure,  setNouvelleHeure]  = useState(rdv.heure);
  const [raison,         setRaison]         = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const cfg = STATUT_CFG[rdv.statut];

  const isFromAdmin  = rdv.initiateur === "admin";
  const canRespond   = rdv.statut === "en_attente" && isFromAdmin;

  const minDate = new Date().toISOString().slice(0, 10);

  async function handleResponse(action: "accepte" | "refuse" | "modifie") {
    if (submitting) return;
    setSubmitting(true);
    try {
      const now = Timestamp.now();
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";

      await updateDoc(doc(db, "clients", clientId, "rendezvous", rdv.id), {
        statut:        action,
        raisonRefus:   action === "refuse" ? raison.trim() || null : null,
        nouvelleDate:  action === "modifie" ? nouvelleDate : null,
        nouvelleHeure: action === "modifie" ? nouvelleHeure : null,
        updatedAt:     now,
      });

      const label = action === "accepte" ? "accepté" : action === "refuse" ? "refusé" : "demande de modification";
      await createNotification({
        type: action === "accepte" ? "creneau_accepte" : action === "refuse" ? "creneau_refuse" : "nouveau_rendez_vous",
        destinataire: "admin",
        clientId, clientNom, auteurRole: "client",
        description: `${clientNom} a ${label} la rencontre : "${rdv.titre}"`,
        lien: `/admin/calendrier`,
        actionRequise: action !== "accepte",
      });

      const emailHtml =
        action === "accepte"
          ? `<p><strong>${clientNom}</strong> a accepté la rencontre "<strong>${rdv.titre}</strong>" prévue le ${formatDateCourt(rdv.date)} à ${rdv.heure}.</p>`
          : action === "refuse"
          ? `<p><strong>${clientNom}</strong> a refusé la rencontre "<strong>${rdv.titre}</strong>"${raison.trim() ? ` : ${raison.trim()}` : ""}.</p>`
          : `<p><strong>${clientNom}</strong> demande de modifier la rencontre "<strong>${rdv.titre}</strong>".<br/>Nouvelle date proposée : ${formatDateCourt(nouvelleDate)} à ${nouvelleHeure}.</p>`;

      await sendEmail("alex@awsolution.ca",
        `📅 Rencontre ${label} — ${clientNom}`, emailHtml);

      setShowModifyForm(false);
    } finally { setSubmitting(false); }
  }

  return (
    <div style={{
      background: "#fff", border: `1px solid ${rdv.statut === "en_attente" ? "#BFDBFE" : cfg.border}`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: rdv.statut === "en_attente" && isFromAdmin ? "0 0 0 3px rgba(3,98,227,0.08)" : "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      {/* En-tête */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            }}>
              {cfg.label}
            </span>
            {rdv.initiateur === "client" && (
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>Votre demande</span>
            )}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: "0 0 3px" }}>{rdv.titre}</p>
          <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
            📅 {formatDateHeure(rdv.date, rdv.heure)}
          </p>
          {rdv.description && (
            <p style={{ fontSize: 12, color: "#374151", margin: "6px 0 0", lineHeight: 1.6 }}>{rdv.description}</p>
          )}
          {rdv.statut === "modifie" && rdv.nouvelleDate && (
            <p style={{ fontSize: 12, color: "#1D4ED8", margin: "6px 0 0", fontWeight: 500 }}>
              ✎ Nouvelle date proposée : {formatDateCourt(rdv.nouvelleDate)} à {rdv.nouvelleHeure}
            </p>
          )}
          {rdv.statut === "refuse" && rdv.raisonRefus && (
            <p style={{ fontSize: 12, color: "#991B1B", margin: "6px 0 0" }}>Raison : {rdv.raisonRefus}</p>
          )}
          {/* Lien de rencontre — visible uniquement quand accepté */}
          {rdv.statut === "accepte" && rdv.lienRencontre && (
            <a
              href={rdv.lienRencontre}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
                padding: "8px 14px", borderRadius: 9,
                background: "#0362E3", color: "#fff",
                fontSize: 12, fontWeight: 600, textDecoration: "none",
              }}
            >
              <LinkIcon size={12} /> Rejoindre la rencontre
            </a>
          )}
        </div>
      </div>

      {/* Actions client (seulement si en attente et initié par admin) */}
      {canRespond && !showModifyForm && (
        <div style={{ borderTop: "1px solid #F3F4F6", padding: "10px 18px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => handleResponse("accepte")}
            disabled={submitting}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #16A34A", background: "#fff", color: "#166534", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <Check size={13} /> Accepter
          </button>
          <button
            onClick={() => setShowModifyForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #D97706", background: "#fff", color: "#92400E", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <Pencil size={13} /> Modifier la date
          </button>
          <button
            onClick={() => handleResponse("refuse")}
            disabled={submitting}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #DC2626", background: "#fff", color: "#991B1B", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <Ban size={13} /> Refuser
          </button>
        </div>
      )}

      {/* Formulaire modification */}
      {canRespond && showModifyForm && (
        <div style={{ borderTop: "1px solid #F3F4F6", padding: "12px 18px", background: "#FFFBEB" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#92400E", margin: "0 0 10px" }}>Proposer une nouvelle date</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input type="date" value={nouvelleDate} min={new Date().toISOString().slice(0, 10)} onChange={e => setNouvelleDate(e.target.value)} style={inputStyle} />
            <input type="time" value={nouvelleHeure} onChange={e => setNouvelleHeure(e.target.value)} style={inputStyle} />
          </div>
          <textarea
            value={raison} onChange={e => setRaison(e.target.value)}
            placeholder="Raison du changement (optionnel)…"
            rows={2} style={{ ...inputStyle, resize: "vertical", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleResponse("modifie")}
              disabled={submitting}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#D97706", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {submitting ? "Envoi…" : "Envoyer la proposition"}
            </button>
            <button
              onClick={() => setShowModifyForm(false)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", color: "#6B7280", fontSize: 12, cursor: "pointer" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers UI ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 9,
  border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
