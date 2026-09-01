"use client";

import { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc,
  Timestamp, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification, markActionCompleteFor } from "@/lib/notifications";
import type { RendezVous, RdvStatut } from "@/types/calendrier";
import { Plus, X, Check, Ban, RefreshCw, Link as LinkIcon } from "lucide-react";

const STATUT_CFG: Record<RdvStatut, { label: string; color: string; bg: string; border: string }> = {
  en_attente: { label: "En attente",  color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  accepte:    { label: "Confirmé ✓",  color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" },
  refuse:     { label: "Refusé",      color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
  modifie:    { label: "Modifié",     color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
};

function formatDateCourt(date: string) {
  return new Date(date + "T12:00").toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
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


function lienBlock(lien: string | null | undefined) {
  if (!lien) return "";
  return `<p style="margin-top:12px">
    <a href="${lien}" style="display:inline-block;padding:8px 16px;background:#0362E3;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      🔗 Rejoindre la rencontre
    </a>
  </p>
  <p style="font-size:12px;color:#6B7280;margin-top:4px">Ou copiez ce lien : <a href="${lien}">${lien}</a></p>`;
}

export function AdminCalendrierClient({ clientId }: { clientId: string }) {
  const [rdvs,     setRdvs]     = useState<RendezVous[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "clients", clientId, "rendezvous"),
      orderBy("date", "desc"),
    );
    return onSnapshot(q, snap => {
      setRdvs(snap.docs.map(d => ({ id: d.id, ...d.data() } as RendezVous)));
      setLoading(false);
    });
  }, [clientId]);

  if (loading) return <p style={{ fontSize: 13, color: "#9CA3AF", padding: 20 }}>Chargement…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Bouton nouvelle demande */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
            padding: "9px 16px", borderRadius: 10, border: "none",
            background: "#0362E3", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Plus size={14} />
          Planifier une rencontre
        </button>
      )}

      {/* Formulaire */}
      {showForm && (
        <AdminRdvForm clientId={clientId} onClose={() => setShowForm(false)} />
      )}

      {/* Liste */}
      {rdvs.length === 0 && !showForm ? (
        <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "32px 24px", textAlign: "center", border: "1px solid #F3F4F6" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Aucune rencontre planifiée avec ce client.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rdvs.map(rdv => (
            <AdminRdvCard key={rdv.id} rdv={rdv} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Formulaire création RDV (admin → client) ── */
function AdminRdvForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [titre,        setTitre]        = useState("");
  const [description,  setDescription]  = useState("");
  const [date,         setDate]         = useState("");
  const [heure,        setHeure]        = useState("10:00");
  const [lienRencontre, setLienRencontre] = useState("");
  const [submitting,   setSubmitting]   = useState(false);

  const minDate = new Date().toISOString().slice(0, 10);

  async function handleSubmit() {
    if (!titre.trim() || !date || submitting) return;
    setSubmitting(true);
    try {
      const now = Timestamp.now();
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      const courriel   = clientSnap.data()?.courriel ?? "";
      const lien       = lienRencontre.trim() || null;

      await addDoc(collection(db, "clients", clientId, "rendezvous"), {
        titre: titre.trim(), description: description.trim(),
        date, heure, statut: "en_attente", initiateur: "admin",
        raisonRefus: null, nouvelleDate: null, nouvelleHeure: null,
        lienRencontre: lien,
        createdAt: now, updatedAt: now,
      });

      await createNotification({
        type: "rendez_vous_confirme", destinataire: "client",
        clientId, clientNom, auteurRole: "admin",
        description: `Rencontre planifiée : "${titre.trim()}" — ${formatDateCourt(date)} à ${heure}`,
        lien: `/client/${clientId}/calendrier`,
      });

      await sendEmail(courriel,
        `📅 Rencontre planifiée — AW Solution`,
        `<p>Bonjour,</p>
         <p>L'équipe AW Solution vous propose une rencontre.</p>
         <p><strong>Sujet :</strong> ${titre.trim()}</p>
         <p><strong>Date :</strong> ${formatDateCourt(date)} à ${heure}</p>
         ${description.trim() ? `<p><strong>Description :</strong> ${description.trim()}</p>` : ""}
         ${lien ? lienBlock(lien) : ""}
         <p>Veuillez vous connecter à votre portail client pour accepter, modifier ou refuser cette rencontre.</p>`,
      );

      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: `Une rencontre a été planifiée : "${titre.trim()}" — ${formatDateCourt(date)} à ${heure}. Connectez-vous à votre calendrier pour confirmer.`,
        auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
      });

      onClose();
    } finally { setSubmitting(false); }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Nouvelle rencontre</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={15} color="#9CA3AF" /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Titre / Sujet">
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex : Point d'avancement design" style={inputStyle} />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ordre du jour, objectifs…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Date">
            <input type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Heure">
            <input type="time" value={heure} onChange={e => setHeure(e.target.value)} style={inputStyle} />
          </Field>
        </div>
        <Field label="Lien de rencontre (Zoom / Google Meet / Teams)">
          <input
            type="url"
            value={lienRencontre}
            onChange={e => setLienRencontre(e.target.value)}
            placeholder="https://meet.google.com/..."
            style={inputStyle}
          />
        </Field>
        <button
          onClick={handleSubmit}
          disabled={!titre.trim() || !date || submitting}
          style={{
            padding: "9px 18px", borderRadius: 9, border: "none", alignSelf: "flex-start",
            background: titre.trim() && date ? "#0362E3" : "#E5E7EB",
            color: titre.trim() && date ? "#fff" : "#9CA3AF",
            fontSize: 13, fontWeight: 600, cursor: titre.trim() && date && !submitting ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Envoi…" : "Envoyer au client"}
        </button>
      </div>
    </div>
  );
}

/* ── Carte RDV admin ── */
function AdminRdvCard({ rdv, clientId }: { rdv: RendezVous; clientId: string }) {
  const [submitting,   setSubmitting]   = useState(false);
  const [lienInput,    setLienInput]    = useState("");
  const cfg = STATUT_CFG[rdv.statut];
  const isClientDemande = rdv.initiateur === "client";
  const canRespond  = rdv.statut === "en_attente" && isClientDemande;
  const hasModification = rdv.statut === "modifie" && rdv.nouvelleDate;

  async function accepterModification() {
    if (submitting || !rdv.nouvelleDate) return;
    setSubmitting(true);
    try {
      const now = Timestamp.now();
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      const courriel   = clientSnap.data()?.courriel ?? "";

      await updateDoc(doc(db, "clients", clientId, "rendezvous", rdv.id), {
        date: rdv.nouvelleDate, heure: rdv.nouvelleHeure ?? rdv.heure,
        statut: "accepte", nouvelleDate: null, nouvelleHeure: null, updatedAt: now,
      });

      await createNotification({
        type: "rendez_vous_confirme", destinataire: "client",
        clientId, clientNom, auteurRole: "admin",
        description: `Modification acceptée : "${rdv.titre}" → ${formatDateCourt(rdv.nouvelleDate!)} à ${rdv.nouvelleHeure}`,
        lien: `/client/${clientId}/calendrier`,
      });

      await sendEmail(courriel, `✅ Rencontre confirmée — AW Solution`,
        `<p>La modification de votre rencontre "<strong>${rdv.titre}</strong>" a été acceptée.</p>
         <p><strong>Nouvelle date confirmée :</strong> ${formatDateCourt(rdv.nouvelleDate!)} à ${rdv.nouvelleHeure}</p>
         ${rdv.lienRencontre ? lienBlock(rdv.lienRencontre) : ""}`);
    } finally { setSubmitting(false); }
  }

  async function handleClientDemande(action: "accepte" | "refuse") {
    if (submitting) return;
    setSubmitting(true);
    try {
      const now = Timestamp.now();
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      const courriel   = clientSnap.data()?.courriel ?? "";
      const lien       = lienInput.trim() || null;

      await updateDoc(doc(db, "clients", clientId, "rendezvous", rdv.id), {
        statut: action,
        ...(action === "accepte" && lien ? { lienRencontre: lien } : {}),
        updatedAt: now,
      });

      const label = action === "accepte" ? "acceptée" : "refusée";
      await createNotification({
        type: action === "accepte" ? "rendez_vous_confirme" : "etape_bloquee",
        destinataire: "client",
        clientId, clientNom, auteurRole: "admin",
        description: `Demande de rencontre ${label} : "${rdv.titre}"`,
        lien: `/client/${clientId}/calendrier`,
      });
      // Cas 2b : admin a répondu → nouveau_rendez_vous admin passe à actionCompletee
      await markActionCompleteFor({ clientId, type: "nouveau_rendez_vous", destinataire: "admin" });

      await sendEmail(courriel,
        action === "accepte" ? `✅ Rencontre confirmée — AW Solution` : `❌ Rencontre refusée — AW Solution`,
        action === "accepte"
          ? `<p>Votre demande de rencontre "<strong>${rdv.titre}</strong>" a été acceptée.</p>
             <p><strong>Date :</strong> ${formatDateCourt(rdv.date)} à ${rdv.heure}</p>
             ${lien ? lienBlock(lien) : ""}`
          : `<p>Votre demande de rencontre "<strong>${rdv.titre}</strong>" n'a pas pu être confirmée pour le moment.</p>`);
    } finally { setSubmitting(false); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const isPast = rdv.date < today && rdv.statut === "accepte";

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${hasModification ? "#BFDBFE" : cfg.border}`,
      borderRadius: 10, overflow: "hidden",
      opacity: isPast ? 0.65 : 1,
    }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
            {isClientDemande && (
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>— Demandé par le client</span>
            )}
            {isPast && (
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>— Passée</span>
            )}
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: "0 0 2px" }}>{rdv.titre}</p>
          <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
            {formatDateCourt(rdv.date)} à {rdv.heure}
          </p>
          {rdv.description && (
            <p style={{ fontSize: 11, color: "#6B7280", margin: "4px 0 0", lineHeight: 1.5 }}>{rdv.description}</p>
          )}

          {/* Lien de rencontre */}
          {rdv.lienRencontre && rdv.statut === "accepte" && (
            <a
              href={rdv.lienRencontre}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
                padding: "5px 10px", borderRadius: 7, border: "1.5px solid #0362E3",
                color: "#0362E3", fontSize: 11, fontWeight: 600, textDecoration: "none",
                background: "#EFF6FF",
              }}
            >
              <LinkIcon size={11} /> Rejoindre la rencontre
            </a>
          )}

          {/* Modification proposée par le client */}
          {hasModification && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", margin: "0 0 4px" }}>
                ✎ Le client propose une nouvelle date
              </p>
              <p style={{ fontSize: 12, color: "#1D4ED8", margin: 0 }}>
                {formatDateCourt(rdv.nouvelleDate!)} à {rdv.nouvelleHeure}
              </p>
              <button
                onClick={accepterModification}
                disabled={submitting}
                style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "none", background: "#0362E3", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
              >
                <Check size={11} /> Accepter la nouvelle date
              </button>
            </div>
          )}

          {/* Refus avec raison */}
          {rdv.statut === "refuse" && rdv.raisonRefus && (
            <p style={{ fontSize: 11, color: "#991B1B", margin: "6px 0 0" }}>Raison : {rdv.raisonRefus}</p>
          )}
        </div>
      </div>

      {/* Actions si demande client en attente */}
      {canRespond && (
        <div style={{ borderTop: "1px solid #F3F4F6", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Champ lien optionnel */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LinkIcon size={12} color="#9CA3AF" />
            <input
              type="url"
              value={lienInput}
              onChange={e => setLienInput(e.target.value)}
              placeholder="Lien de rencontre (optionnel — Zoom / Meet / Teams)"
              style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleClientDemande("accepte")}
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 7, border: "1.5px solid #16A34A", background: "#fff", color: "#166534", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            >
              <Check size={12} /> Accepter
            </button>
            <button
              onClick={() => handleClientDemande("refuse")}
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 7, border: "1.5px solid #DC2626", background: "#fff", color: "#991B1B", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            >
              <Ban size={12} /> Refuser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
