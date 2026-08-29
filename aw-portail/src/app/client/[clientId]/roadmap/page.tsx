"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  doc, getDoc, updateDoc, onSnapshot, addDoc, setDoc, Timestamp, collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import { useRoadmapData } from "@/hooks/useRoadmapData";
import type { StatutEtape, RencontreValidation } from "@/types/roadmap";
import { CheckCircle2, ChevronRight, HelpCircle, Calendar } from "lucide-react";
import { ClientJournalFeed } from "@/components/journal/ClientJournalFeed";

/* ── Tooltips ───────────────────────────────────────────────────────────── */
const TOOLTIPS: Record<string, string> = {
  signature:         "Signature du contrat de service AW Solution. Une fois signé, votre projet est officiellement lancé.",
  paiement:          "Mise en place de votre méthode de paiement. L'activation de votre abonnement mensuel se fera lors du lancement de votre application.",
  branding:          "Remplissage du formulaire d'informations, dépôt des fichiers et choix des templates. C'est à cette étape que vous nous transmettez l'identité visuelle de votre restaurant. Il est important de bien remplir cette section et de fournir le plus d'informations possible — plus vous êtes précis, plus votre application sera fidèle à votre image.",
  design:            "Notre équipe conçoit les écrans de votre application selon vos couleurs, votre logo et vos templates choisis.",
  developpement:     "Construction technique de l'application : récompenses, programme de fidélité, notifications, CRM, alertes automatisées, intégration POS si applicable.",
  rencontre:         "Rencontre vidéo où on vous présente l'application afin d'avoir vos commentaires et votre avis sur ce qu'on a fait. C'est le moment de nous dire ce que vous aimez et ce que vous souhaitez ajuster.",
  ajustements:       "Corrections et modifications suite à votre retour lors de la rencontre de validation.",
  tests:             "Tests complets avant soumission : fonctionnalités, notifications, validation de points, récompenses.",
  soumission:        "La soumission prend généralement entre 1 à 2 semaines à être validée par l'App Store et Google Play. Ce délai est hors de notre contrôle.",
  formation:         "Remise des vidéos tutorielles et guides d'utilisation. Formation de votre équipe sur la validation de factures et le tableau de bord.",
  config_succursale: "Configuration de l'application dans vos succursales selon le POS et la méthode utilisée. Inclut : test de scan de code-barres, ajout de points, réclamation de récompenses et configuration du compte gérant.",
  materiel:          "Création de vos affiches, cartes de table et vidéo promotionnelle pour annoncer l'app à vos clients.",
  lancement:         "Votre application est disponible en téléchargement sur l'App Store et Google Play. Félicitations !",
  suivi:             "4 semaines après le lancement : premier rapport de performance, ajustements si nécessaire et rencontre bilan.",
};

/* ── Status config ──────────────────────────────────────────────────────── */
const STATUT_CFG: Record<StatutEtape, {
  label: string; badgeColor: string; badgeBg: string; badgeBorder: string;
  circleColor: string; circleBg: string; circleBorder: string;
}> = {
  a_venir:  { label: "À venir",  badgeColor: "#6B7280", badgeBg: "#F3F4F6", badgeBorder: "#E5E7EB", circleColor: "#9CA3AF", circleBg: "#F3F4F6",  circleBorder: "#E5E7EB" },
  a_faire:  { label: "À faire",  badgeColor: "#C2410C", badgeBg: "#FFF7ED", badgeBorder: "#FED7AA", circleColor: "#fff",    circleBg: "#F97316",  circleBorder: "#F97316" },
  en_cours: { label: "En cours", badgeColor: "#1D4ED8", badgeBg: "#EFF6FF", badgeBorder: "#BFDBFE", circleColor: "#fff",    circleBg: "#0362E3",  circleBorder: "#0362E3" },
  complete: { label: "Complété", badgeColor: "#166534", badgeBg: "#F0FDF4", badgeBorder: "#BBF7D0", circleColor: "#fff",    circleBg: "#22C55E",  circleBorder: "#22C55E" },
  bloque:   { label: "Bloqué",   badgeColor: "#991B1B", badgeBg: "#FEF2F2", badgeBorder: "#FECACA", circleColor: "#fff",    circleBg: "#EF4444",  circleBorder: "#EF4444" },
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function formatDateFr(ts: Timestamp | null): string {
  if (!ts) return "À déterminer";
  return ts.toDate().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

function formatCreneauFr(date: string, heure: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " à " + heure;
}

function formatDateStrFr(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function genICS(date: string, heure: string): string {
  const [y, m, dy] = date.split("-").map(Number);
  const [h, min]   = heure.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dtStart = `${y}${pad(m)}${pad(dy)}T${pad(h)}${pad(min)}00`;
  const dtEnd   = `${y}${pad(m)}${pad(dy)}T${pad(h + 1)}${pad(min)}00`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AW Solution//Rencontre//FR",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
    "SUMMARY:Rencontre de validation — AW Solution",
    "DESCRIPTION:Rencontre vidéo de présentation de votre application de fidélité",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(date: string, heure: string) {
  const blob = new Blob([genICS(date, heure)], { type: "text/calendar;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "rencontre-validation-aw-solution.ics"; a.click();
  URL.revokeObjectURL(url);
}

const CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-blue {
    0%,100% { box-shadow: 0 0 0 0 rgba(3,98,227,0.45); }
    60%     { box-shadow: 0 0 0 9px rgba(3,98,227,0); }
  }
  @keyframes pulse-orange {
    0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.45); }
    60%     { box-shadow: 0 0 0 9px rgba(249,115,22,0); }
  }
  @keyframes dot-pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%     { opacity: 0.5; transform: scale(0.75); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function RoadmapPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const { roadmap, loading } = useRoadmapData(clientId);
  const router = useRouter();

  const [activeTab,      setActiveTab]      = useState<"progression" | "journal">("progression");
  const [tooltip,        setTooltip]        = useState<string | null>(null);
  const [blocageHover,   setBlocageHover]   = useState<string | null>(null);
  const [disabledHover,  setDisabledHover]  = useState<string | null>(null);
  const [rencontreVal,   setRencontreVal]   = useState<RencontreValidation | null>(null);
  const [slotChoisi,     setSlotChoisi]     = useState<number | null>(null);
  const [confirming,     setConfirming]     = useState(false);
  const [showCustomDate,   setShowCustomDate]   = useState(false);
  const [customDate,       setCustomDate]       = useState("");
  const [customMessage,    setCustomMessage]    = useState("");
  const [submittingCustom, setSubmittingCustom] = useState(false);
  const [brandingPct,      setBrandingPct]      = useState<number | null>(null);
  const [journalUnread,    setJournalUnread]    = useState(0);
  const autoSyncDone = useRef(false);

  const BRANDING_TOTAL = 7;

  /* Listen to branding/main for live progress */
  useEffect(() => {
    return onSnapshot(
      doc(db, "clients", clientId, "branding", "main"),
      (snap) => {
        const completed: string[] = snap.exists() ? (snap.data().completedSections ?? []) : [];
        setBrandingPct(Math.round((completed.length / BRANDING_TOTAL) * 100));
      },
    );
  }, [clientId]);

  /* Journal unread badge */
  useEffect(() => {
    return onSnapshot(
      collection(db, "clients", clientId, "journal"),
      (snap) => {
        setJournalUnread(snap.docs.filter(d => !d.data().lu).length);
      },
    );
  }, [clientId]);

  /* Listen to rencontreValidation */
  useEffect(() => {
    return onSnapshot(
      doc(db, "clients", clientId, "roadmap", "rencontreValidation"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as RencontreValidation;
          setRencontreVal(data);
          if (data.creneauChoisi != null) setSlotChoisi(data.creneauChoisi);
        } else {
          setRencontreVal(null);
        }
      },
    );
  }, [clientId]);

  /* Auto-sync completed steps + cascade */
  useEffect(() => {
    if (!roadmap || autoSyncDone.current) return;
    autoSyncDone.current = true;

    async function autoSync() {
      const [clientSnap, brandingSnap] = await Promise.all([
        getDoc(doc(db, "clients", clientId)),
        getDoc(doc(db, "clients", clientId, "branding", "main")),
      ]);
      const cd = clientSnap.data();
      const bd = brandingSnap.data();

      let updated = roadmap!.etapes.map(e => {
        if (e.id === "signature" && e.statut !== "complete" && cd?.contrat?.statut === "signe")
          return { ...e, statut: "complete" as StatutEtape, completedAt: cd.contrat.dateSignature ?? Timestamp.now() };
        if (e.id === "branding" && e.statut !== "complete" && bd?.brandingCompletedAt)
          return { ...e, statut: "complete" as StatutEtape, completedAt: bd.brandingCompletedAt };
        return e;
      });

      /* Cascade: if signature complete → paiement à_faire; if branding complete → design en_cours */
      const sigComplete  = updated.find(e => e.id === "signature")?.statut === "complete";
      const brandComplete = updated.find(e => e.id === "branding")?.statut === "complete";
      updated = updated.map(e => {
        if (e.id === "paiement"  && e.statut === "a_venir" && sigComplete)   return { ...e, statut: "a_faire" as StatutEtape };
        if (e.id === "design"    && e.statut === "a_venir" && brandComplete) return { ...e, statut: "en_cours" as StatutEtape };
        return e;
      });

      if (updated.some((e, i) => e.statut !== roadmap!.etapes[i].statut))
        await updateDoc(doc(db, "clients", clientId, "roadmap", "main"), { etapes: updated });
    }

    autoSync().catch(() => {});
  }, [roadmap, clientId]);

  /* Confirm a proposed slot */
  async function handleConfirmSlot() {
    if (slotChoisi === null || !rencontreVal || !roadmap) return;
    setConfirming(true);
    try {
      const creneau = rencontreVal.creneaux[slotChoisi];
      const label   = formatCreneauFr(creneau.date, creneau.heure);
      const now     = Timestamp.now();

      await setDoc(doc(db, "clients", clientId, "roadmap", "rencontreValidation"), { creneauChoisi: slotChoisi }, { merge: true });

      /* Mark rencontre as complete */
      const updatedEtapes = roadmap.etapes.map(e =>
        e.id === "rencontre" ? { ...e, statut: "complete" as StatutEtape, completedAt: now } : e,
      );
      await updateDoc(doc(db, "clients", clientId, "roadmap", "main"), { etapes: updatedEtapes });

      /* Auto-messages */
      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: `Rencontre confirmée pour le ${label}. Vous recevrez un lien de connexion sous peu.`,
        auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
      });
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      await createNotification({
        type: "creneau_accepte", destinataire: "admin",
        clientId, clientNom, auteurRole: "client",
        description: `${clientNom} — Rencontre de validation confirmée — ${label}`,
        lien: `/admin/messages?clientId=${clientId}&tab=rencontres`,
      });
    } finally { setConfirming(false); }
  }

  /* Propose a custom date */
  async function handleProposeCustomDate() {
    if (!customDate || !roadmap) return;
    setSubmittingCustom(true);
    try {
      const now = Timestamp.now();

      await setDoc(doc(db, "clients", clientId, "roadmap", "rencontreValidation"), {
        statutClient: "propose",
        dateClientProposee: customDate,
        messageClientPropose: customMessage || null,
      }, { merge: true });

      /* Set rencontre back to "en_cours" while admin evaluates */
      const updatedEtapes = roadmap.etapes.map(e =>
        e.id === "rencontre" ? { ...e, statut: "en_cours" as StatutEtape } : e,
      );
      await updateDoc(doc(db, "clients", clientId, "roadmap", "main"), { etapes: updatedEtapes });

      /* Auto-message + admin alerte */
      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: "Votre demande de date alternative a été reçue. Nous vous confirmons sous peu.",
        auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
      });
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";
      const dateLabel  = formatDateStrFr(customDate);
      await createNotification({
        type: "creneau_refuse", destinataire: "admin",
        clientId, clientNom, auteurRole: "client",
        description: `${clientNom} — Propose une date alternative : ${dateLabel}${customMessage ? ` — "${customMessage}"` : ""}`,
        lien: `/admin/messages?clientId=${clientId}&tab=rencontres`,
        actionRequise: true,
      });

      setShowCustomDate(false);
      setCustomDate("");
      setCustomMessage("");
    } finally { setSubmittingCustom(false); }
  }

  /* Helpers for confirmed rencontre display */
  function getConfirmedLabel(): string {
    if (!rencontreVal || rencontreVal.creneauChoisi == null) return "";
    if (rencontreVal.creneauChoisi === -1 && rencontreVal.dateClientProposee)
      return formatDateStrFr(rencontreVal.dateClientProposee);
    const c = rencontreVal.creneaux[rencontreVal.creneauChoisi];
    return c ? formatCreneauFr(c.date, c.heure) : "";
  }

  function getConfirmedICS(): { date: string; heure: string } | null {
    if (!rencontreVal || rencontreVal.creneauChoisi == null) return null;
    if (rencontreVal.creneauChoisi === -1 && rencontreVal.dateClientProposee)
      return { date: rencontreVal.dateClientProposee, heure: "12:00" };
    return rencontreVal.creneaux[rencontreVal.creneauChoisi] ?? null;
  }

  /* Loading */
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 22, height: 22, border: "2.5px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
  if (!roadmap) return null;

  const etapes         = roadmap.etapes ?? [];
  const completedCount = etapes.filter(e => e.statut === "complete").length;
  const pct            = etapes.length === 0 ? 0 : Math.round((completedCount / etapes.length) * 100);
  const lastActiveIdx  = etapes.reduce((last, e, i) => (e.statut !== "a_venir" ? i : last), -1);
  const lineStop       = lastActiveIdx < 0 ? 0 : Math.min(96, Math.round(((lastActiveIdx + 1) / etapes.length) * 100));

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 32px 80px" }}>

        {/* ── Header card ── */}
        <div style={{
          background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
          padding: 24, marginBottom: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          animation: "fadeUp 350ms ease both",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px" }}>Feuille de route</p>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
                Suivez l'avancement de votre application en temps réel
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Date de lancement estimée
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: roadmap.dateLancementEstimee ? "#0A0A0A" : "#C4C9D4", margin: 0 }}>
                {formatDateFr(roadmap.dateLancementEstimee)}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#0362E3", borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: pct === 100 ? "#166534" : "#374151", flexShrink: 0 }}>
              {pct}%
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
            {completedCount} sur {etapes.length} étapes complétées
          </p>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid #E5E7EB" }}>
          {(["progression", "journal"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, position: "relative",
                color: activeTab === tab ? "#0362E3" : "#6B7280",
                transition: "color 0.15s",
              }}
            >
              {tab === "progression" ? "Progression" : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Journal de développement
                  {journalUnread > 0 && activeTab !== "journal" && (
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9, padding: "0 5px",
                      background: "#0362E3", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {journalUnread}
                    </span>
                  )}
                </span>
              )}
              {activeTab === tab && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#0362E3", borderRadius: "1px 1px 0 0" }} />
              )}
            </button>
          ))}
        </div>

        {/* ── Journal tab ── */}
        {activeTab === "journal" && (
          <ClientJournalFeed clientId={clientId} />
        )}

        {/* ── Progression tab ── */}
        {activeTab === "progression" && (
          <div style={{ position: "relative" }}>

            {/* Vertical line */}
            <div style={{
              position: "absolute", left: 19, top: 20, bottom: 20, width: 2, borderRadius: 1,
              background: `linear-gradient(to bottom,
                #0362E3 0%,
                #0362E3 ${lineStop}%,
                #DBEAFE ${Math.min(lineStop + 10, 100)}%,
                #E5E7EB 100%)`,
            }} />

            {etapes.map((etape, i) => {
              const cfg        = STATUT_CFG[etape.statut] ?? STATUT_CFG.a_venir;
              const isComplete = etape.statut === "complete";
              const isEnCours  = etape.statut === "en_cours";
              const isAFaire   = etape.statut === "a_faire";
              const isBloque   = etape.statut === "bloque";
              const isHighlit  = isEnCours || isAFaire;
              const isNavActive = isEnCours || isComplete;

              const pulseAnim = isEnCours ? "pulse-blue 2.2s ease infinite"
                : isAFaire ? "pulse-orange 2.2s ease infinite" : "none";

              /* ── Rencontre phases ── */
              const isRencontre = etape.id === "rencontre";
              // Phase 1: en_cours, admin hasn't sent creneaux yet
              const showPhase1 = isRencontre && isEnCours && !rencontreVal?.envoye;
              // Phase 2: a_faire, creneaux sent, not yet confirmed, client didn't propose custom date
              const showPhase2 = isRencontre && isAFaire && !!rencontreVal?.envoye && rencontreVal.creneauChoisi == null && rencontreVal.statutClient !== "propose";
              // Phase 2b: client proposed custom date, waiting for admin
              const showPhase2b = isRencontre && isEnCours && rencontreVal?.envoye && rencontreVal.statutClient === "propose";
              // Phase 3: complete
              const showPhase3 = isRencontre && isComplete && rencontreVal?.creneauChoisi != null;

              return (
                <div
                  key={etape.id}
                  style={{
                    display: "flex", gap: 16,
                    marginBottom: i < etapes.length - 1 ? 10 : 0,
                    animation: `fadeUp 400ms ${60 + i * 45}ms ease both`,
                  }}
                >
                  {/* Circle */}
                  <div style={{ flexShrink: 0, width: 40, display: "flex", justifyContent: "center", paddingTop: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: cfg.circleBg, border: `2px solid ${cfg.circleBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", zIndex: 1, flexShrink: 0,
                      animation: pulseAnim,
                    }}>
                      {isComplete
                        ? <CheckCircle2 size={18} color="#fff" strokeWidth={2.5} />
                        : <span style={{ fontSize: 12, fontWeight: 700, color: cfg.circleColor }}>{i + 1}</span>
                      }
                    </div>
                  </div>

                  {/* Card */}
                  <div style={{
                    flex: 1,
                    background: "#fff",
                    border: `1px solid ${isEnCours ? "#BFDBFE" : isAFaire ? "#FED7AA" : "#F3F4F6"}`,
                    borderRadius: 12,
                    padding: isHighlit ? "16px 20px" : "12px 18px",
                    boxShadow: isEnCours
                      ? "0 4px 20px rgba(3,98,227,0.09), 0 1px 4px rgba(0,0,0,0.04)"
                      : isAFaire
                      ? "0 4px 20px rgba(249,115,22,0.09), 0 1px 4px rgba(0,0,0,0.04)"
                      : "0 1px 3px rgba(0,0,0,0.04)",
                  }}>

                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>

                      {/* Left: name + badge + date */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontSize: isHighlit ? 15 : 14, fontWeight: 600, color: "#0A0A0A" }}>
                            {etape.nom}
                          </span>

                          {/* Status badge */}
                          <div style={{ position: "relative" }}>
                            <span
                              style={{
                                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                                color: cfg.badgeColor, background: cfg.badgeBg, border: `1px solid ${cfg.badgeBorder}`,
                                display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                                cursor: isBloque && etape.blocageRaison ? "help" : "default",
                              }}
                              onMouseEnter={() => { if (isBloque && etape.blocageRaison) setBlocageHover(etape.id); }}
                              onMouseLeave={() => setBlocageHover(null)}
                            >
                              {isHighlit && (
                                <span style={{
                                  width: 5, height: 5, borderRadius: "50%",
                                  background: isEnCours ? "#0362E3" : "#F97316",
                                  display: "inline-block", animation: "dot-pulse 1.4s ease infinite",
                                }} />
                              )}
                              {cfg.label}
                            </span>
                            {/* Blocage tooltip */}
                            {isBloque && blocageHover === etape.id && etape.blocageRaison && (
                              <div style={{
                                position: "absolute", left: 0, bottom: "calc(100% + 8px)",
                                width: 240, background: "#1A1A2E", color: "#E5E7EB",
                                fontSize: 12, lineHeight: 1.7, padding: "10px 14px",
                                borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.3)",
                                zIndex: 30, pointerEvents: "none",
                              }}>
                                <strong style={{ display: "block", marginBottom: 4, color: "#FECACA" }}>Raison du blocage :</strong>
                                {etape.blocageRaison}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Branding mini progress bar */}
                        {etape.id === "branding" && brandingPct !== null && (
                          <div style={{ marginTop: 6, marginBottom: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 120, flexShrink: 0, height: 4, background: "#D1D5DB", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{
                                  height: "100%",
                                  width: `${brandingPct}%`,
                                  background: brandingPct === 100 ? "#22C55E" : "#0362E3",
                                  borderRadius: 2,
                                  transition: "width 0.5s ease",
                                }} />
                              </div>
                              <span style={{
                                fontSize: 11, fontWeight: 600, flexShrink: 0,
                                color: brandingPct === 100 ? "#166534" : brandingPct === 0 ? "#9CA3AF" : "#0362E3",
                              }}>
                                {brandingPct === 0 ? "Non débuté" : brandingPct === 100 ? "Complété ✓" : `${brandingPct}%`}
                              </span>
                            </div>
                          </div>
                        )}

                        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, minHeight: 16 }}>
                          {isComplete && etape.completedAt
                            ? `Complété le ${formatDateFr(etape.completedAt)}`
                            : etape.dateEstimee
                            ? `Estimé : ${formatDateFr(etape.dateEstimee)}`
                            : null}
                        </p>
                      </div>

                      {/* Right: action button + tooltip (tooltip always rightmost) */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingTop: 2 }}>

                        {/* Signature */}
                        {etape.id === "signature" && !isComplete && (
                          <ActionBtn label="Voir le contrat" onClick={() => router.push(`/client/${clientId}/contrat`)} primary />
                        )}

                        {/* Paiement — always blue */}
                        {etape.id === "paiement" && (
                          <ActionBtn label="Configurer le paiement" onClick={() => router.push(`/client/${clientId}/paiement`)} primary />
                        )}

                        {/* Branding — always blue */}
                        {etape.id === "branding" && (
                          <ActionBtn label="Remplir le branding" onClick={() => router.push(`/client/${clientId}/branding`)} primary />
                        )}

                        {/* Développement — blue only when active */}
                        {etape.id === "developpement" && (
                          <div
                            style={{ position: "relative" }}
                            onMouseEnter={() => { if (!isNavActive) setDisabledHover("developpement"); }}
                            onMouseLeave={() => setDisabledHover(null)}
                          >
                            <ActionBtn
                              label="Voir le journal"
                              onClick={() => { if (isNavActive) setActiveTab("journal"); }}
                              primary={isNavActive}
                              disabled={!isNavActive}
                            />
                            {disabledHover === "developpement" && (
                              <div style={{
                                position: "absolute", right: 0, bottom: "calc(100% + 8px)",
                                width: 220, background: "#1A1A2E", color: "#E5E7EB",
                                fontSize: 11, lineHeight: 1.6, padding: "8px 12px",
                                borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                                zIndex: 20, pointerEvents: "none",
                              }}>
                                Disponible lorsque le développement sera débuté
                              </div>
                            )}
                          </div>
                        )}

                        {/* Formation — blue only when active */}
                        {etape.id === "formation" && (
                          <div
                            style={{ position: "relative" }}
                            onMouseEnter={() => { if (!isNavActive) setDisabledHover("formation"); }}
                            onMouseLeave={() => setDisabledHover(null)}
                          >
                            <ActionBtn
                              label="Voir la formation"
                              onClick={() => { if (isNavActive) router.push(`/client/${clientId}/documentation`); }}
                              primary={isNavActive}
                              disabled={!isNavActive}
                            />
                            {disabledHover === "formation" && (
                              <div style={{
                                position: "absolute", right: 0, bottom: "calc(100% + 8px)",
                                width: 220, background: "#1A1A2E", color: "#E5E7EB",
                                fontSize: 11, lineHeight: 1.6, padding: "8px 12px",
                                borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                                zIndex: 20, pointerEvents: "none",
                              }}>
                                Disponible lorsque la formation sera débutée
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tooltip — always rightmost */}
                        {TOOLTIPS[etape.id] && (
                          <div
                            style={{ position: "relative" }}
                            onMouseEnter={() => setTooltip(etape.id)}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <HelpCircle size={15} color="#C4C9D4" style={{ cursor: "help", display: "block" }} />
                            {tooltip === etape.id && (
                              <div style={{
                                position: "absolute", right: 0, bottom: "calc(100% + 8px)",
                                width: 270, background: "#1A1A2E", color: "#E5E7EB",
                                fontSize: 12, lineHeight: 1.75, padding: "10px 14px",
                                borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.3)",
                                zIndex: 20, pointerEvents: "none",
                              }}>
                                {TOOLTIPS[etape.id]}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Rencontre validation sections ── */}

                    {/* Phase 1: en_cours, waiting for creneaux */}
                    {showPhase1 && (
                      <div style={{
                        marginTop: 12, padding: "10px 14px",
                        background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8,
                      }}>
                        <p style={{ fontSize: 12, color: "#1D4ED8", margin: 0, lineHeight: 1.6 }}>
                          AW Solution va vous envoyer des plages horaires pour céduler votre rencontre de validation. Vous serez notifié dès qu'elles seront disponibles.
                        </p>
                      </div>
                    )}

                    {/* Phase 2b: client proposed custom date, waiting for admin */}
                    {showPhase2b && (
                      <div style={{
                        marginTop: 12, padding: "10px 14px",
                        background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8,
                      }}>
                        <p style={{ fontSize: 12, color: "#C2410C", margin: 0, lineHeight: 1.6 }}>
                          Votre demande de date alternative a été reçue. Nous vous confirmons sous peu.
                        </p>
                      </div>
                    )}

                    {/* Phase 2: choose a slot */}
                    {showPhase2 && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F3F4F6" }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 10px" }}>
                          Choisissez un créneau pour notre rencontre :
                        </p>

                        {/* Slot cards */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                          {rencontreVal!.creneaux.filter(c => c.date && c.heure).map((creneau, idx) => {
                            const chosen = slotChoisi === idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => { setSlotChoisi(idx); setShowCustomDate(false); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "10px 14px", borderRadius: 10,
                                  border: chosen ? "2px solid #0362E3" : "1.5px solid #E5E7EB",
                                  background: chosen ? "#EFF6FF" : "#F9FAFB",
                                  cursor: "pointer", textAlign: "left",
                                }}
                              >
                                <div style={{
                                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                                  border: chosen ? "none" : "2px solid #D1D5DB",
                                  background: chosen ? "#0362E3" : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  {chosen && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: chosen ? 600 : 500, color: chosen ? "#0362E3" : "#374151" }}>
                                  {formatCreneauFr(creneau.date, creneau.heure)}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom date toggle */}
                        {!showCustomDate && (
                          <button
                            onClick={() => { setShowCustomDate(true); setSlotChoisi(null); }}
                            style={{
                              padding: "0 0 12px", border: "none", background: "none",
                              color: "#6B7280", fontSize: 12, cursor: "pointer",
                              textDecoration: "underline", textDecorationStyle: "dotted",
                            }}
                          >
                            Aucune de ces dates ne me convient
                          </button>
                        )}

                        {/* Custom date form */}
                        {showCustomDate && (
                          <div style={{
                            background: "#F9FAFB", border: "1px solid #E5E7EB",
                            borderRadius: 10, padding: "14px 16px", marginBottom: 12,
                          }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 10px" }}>
                              Proposez une date qui vous convient :
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                              <input
                                type="date"
                                value={customDate}
                                onChange={e => setCustomDate(e.target.value)}
                                style={{
                                  padding: "8px 10px", borderRadius: 8,
                                  border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
                                  outline: "none", fontFamily: "inherit",
                                }}
                              />
                              <textarea
                                value={customMessage}
                                onChange={e => setCustomMessage(e.target.value)}
                                placeholder="Message optionnel (disponibilités, contraintes, etc.)"
                                rows={2}
                                style={{
                                  padding: "8px 10px", borderRadius: 8,
                                  border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
                                  outline: "none", fontFamily: "inherit", resize: "vertical",
                                }}
                              />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => { setShowCustomDate(false); setCustomDate(""); setCustomMessage(""); }}
                                style={{
                                  padding: "7px 14px", borderRadius: 8,
                                  border: "1px solid #E5E7EB", background: "#fff",
                                  color: "#6B7280", fontSize: 12, fontWeight: 500, cursor: "pointer",
                                }}
                              >
                                Annuler
                              </button>
                              <button
                                onClick={handleProposeCustomDate}
                                disabled={!customDate || submittingCustom}
                                style={{
                                  padding: "7px 14px", borderRadius: 8, border: "none",
                                  background: customDate ? "#0362E3" : "#E5E7EB",
                                  color: customDate ? "#fff" : "#9CA3AF",
                                  fontSize: 12, fontWeight: 600,
                                  cursor: customDate && !submittingCustom ? "pointer" : "not-allowed",
                                }}
                              >
                                {submittingCustom ? "Envoi…" : "Confirmer ma demande"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Confirm button */}
                        {!showCustomDate && (
                          <button
                            onClick={handleConfirmSlot}
                            disabled={slotChoisi === null || confirming}
                            style={{
                              padding: "9px 20px", borderRadius: 9, border: "none",
                              background: slotChoisi !== null ? "#0362E3" : "#E5E7EB",
                              color: slotChoisi !== null ? "#fff" : "#9CA3AF",
                              fontSize: 13, fontWeight: 600,
                              cursor: slotChoisi !== null && !confirming ? "pointer" : "not-allowed",
                            }}
                          >
                            {confirming ? "Confirmation…" : "Confirmer ce créneau"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Phase 3: confirmed */}
                    {showPhase3 && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F3F4F6" }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10,
                          background: "#F0FDF4", border: "1px solid #BBF7D0",
                          borderRadius: 10, padding: "10px 14px", marginBottom: 10,
                        }}>
                          <CheckCircle2 size={15} color="#22C55E" />
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#166534", margin: 0 }}>Rencontre confirmée</p>
                            <p style={{ fontSize: 12, color: "#166534", margin: "2px 0 0", opacity: 0.85 }}>
                              {getConfirmedLabel()}
                            </p>
                          </div>
                        </div>
                        {(() => {
                          const ics = getConfirmedICS();
                          return ics ? (
                            <button
                              onClick={() => downloadICS(ics.date, ics.heure)}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "7px 14px", borderRadius: 8,
                                border: "1px solid #E5E7EB", background: "#F9FAFB",
                                color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer",
                              }}
                            >
                              <Calendar size={13} />
                              Ajouter à mon calendrier
                            </button>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ActionBtn ──────────────────────────────────────────────────────────── */
function ActionBtn({ label, onClick, primary = false, disabled = false }: {
  label: string; onClick?: () => void; primary?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "6px 12px", borderRadius: 8,
        border: primary && !disabled ? "none" : "1px solid #E5E7EB",
        background: primary && !disabled ? "#0362E3" : "#F3F4F6",
        color: primary && !disabled ? "#fff" : "#9CA3AF",
        fontSize: 12, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {!disabled && <ChevronRight size={11} />}
    </button>
  );
}
