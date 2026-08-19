"use client";

import { useState, useEffect } from "react";
import {
  doc, updateDoc, addDoc, collection, getDoc, setDoc, onSnapshot, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification, markActionCompleteFor } from "@/lib/notifications";
import { useRoadmapData } from "@/hooks/useRoadmapData";
import type { StatutEtape, RencontreValidation } from "@/types/roadmap";
import { CheckCircle2, HelpCircle, Save, Send } from "lucide-react";
import { AdminJournalManager } from "@/components/journal/AdminJournalManager";

/* ── Constants ─────────────────────────────────────────────────────────── */

const STATUT_OPTIONS: { value: StatutEtape; label: string }[] = [
  { value: "a_venir",  label: "À venir" },
  { value: "a_faire",  label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "complete", label: "Complété" },
  { value: "bloque",   label: "Bloqué" },
];

const STATUT_CFG: Record<StatutEtape, { color: string; bg: string; border: string }> = {
  a_venir:  { color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB" },
  a_faire:  { color: "#C2410C", bg: "#FFF7ED", border: "#FED7AA" },
  en_cours: { color: "#0362E3", bg: "#EFF6FF", border: "#BFDBFE" },
  complete: { color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" },
  bloque:   { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
};

/* Steps that become "À faire" when auto-cascaded (client action required).
   All others become "En cours" (AW is working on it). */
const CLIENT_ACTION_STEPS = new Set(["paiement", "branding"]);

const TOOLTIPS: Record<string, string> = {
  signature:         "Signature du contrat de service AW Solution. Une fois signé, votre projet est officiellement lancé.",
  paiement:          "Mise en place de votre méthode de paiement. L'activation de votre abonnement mensuel se fera lors du lancement de votre application.",
  branding:          "Remplissage du formulaire d'informations, dépôt des fichiers et choix des templates. C'est à cette étape que vous nous transmettez l'identité visuelle de votre restaurant.",
  design:            "Notre équipe conçoit les écrans de votre application selon vos couleurs, votre logo et vos templates choisis.",
  developpement:     "Construction technique de l'application : récompenses, programme de fidélité, notifications, CRM, alertes automatisées, intégration POS si applicable.",
  rencontre:         "Rencontre vidéo où on vous présente l'application afin d'avoir vos commentaires et votre avis sur ce qu'on a fait.",
  ajustements:       "Corrections et modifications suite à votre retour lors de la rencontre de validation.",
  tests:             "Tests complets avant soumission : fonctionnalités, notifications, validation de points, récompenses.",
  soumission:        "La soumission prend généralement entre 1 à 2 semaines à être validée par l'App Store et Google Play.",
  formation:         "Remise des vidéos tutorielles et guides d'utilisation. Formation de votre équipe sur la validation de factures et le tableau de bord.",
  config_succursale: "Configuration de l'application dans vos succursales. Inclut : test de scan, ajout de points, réclamation de récompenses et configuration du compte gérant.",
  materiel:          "Création de vos affiches, cartes de table et vidéo promotionnelle pour annoncer l'app à vos clients.",
  lancement:         "Votre application est disponible en téléchargement sur l'App Store et Google Play. Félicitations !",
  suivi:             "4 semaines après le lancement : premier rapport de performance, ajustements si nécessaire et rencontre bilan.",
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function tsToDateStr(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  return ts.toDate().toISOString().slice(0, 10);
}

function dateStrToTs(str: string): Timestamp | null {
  if (!str) return null;
  return Timestamp.fromDate(new Date(str + "T12:00:00"));
}

function formatDateFr(ts: Timestamp | null): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateStrFr(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatCreneauFr(date: string, heure: string): string {
  return formatDateStrFr(date) + " à " + heure;
}

/* ── Component ─────────────────────────────────────────────────────────── */

interface LocalEtape { statut: StatutEtape; dateEstimee: string; blocageRaison: string; }

export function AdminRoadmapViewer({ clientId }: { clientId: string }) {
  const { roadmap, loading } = useRoadmapData(clientId);

  const [subTab,          setSubTab]          = useState<"progression" | "journal">("progression");
  const [localEtapes,     setLocalEtapes]     = useState<Record<string, LocalEtape>>({});
  const [localLancement,  setLocalLancement]  = useState("");
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [tooltip,         setTooltip]         = useState<string | null>(null);
  const [rencontreDoc,    setRencontreDoc]    = useState<RencontreValidation | null>(null);
  const [creneaux,        setCreneaux]        = useState([
    { date: "", heure: "" }, { date: "", heure: "" }, { date: "", heure: "" },
  ]);
  const [sendingCreneaux, setSendingCreneaux] = useState(false);
  const [confirmingDate,  setConfirmingDate]  = useState(false);

  /* Sync local state from roadmap */
  useEffect(() => {
    if (!roadmap) return;
    const local: Record<string, LocalEtape> = {};
    for (const e of roadmap.etapes) {
      local[e.id] = {
        statut:        e.statut,
        dateEstimee:   tsToDateStr(e.dateEstimee),
        blocageRaison: e.blocageRaison ?? "",
      };
    }
    setLocalEtapes(local);
    setLocalLancement(tsToDateStr(roadmap.dateLancementEstimee));
  }, [roadmap]);

  /* Listen to rencontreValidation */
  useEffect(() => {
    return onSnapshot(
      doc(db, "clients", clientId, "roadmap", "rencontreValidation"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as RencontreValidation;
          setRencontreDoc(data);
          if (data.creneaux?.length) {
            setCreneaux(data.creneaux.map(c => ({ date: c.date || "", heure: c.heure || "" })));
          }
        } else {
          setRencontreDoc(null);
        }
      },
    );
  }, [clientId]);

  async function handleSave() {
    if (!roadmap) return;
    setSaving(true); setSaved(false);
    try {
      const now = Timestamp.now();

      /* Detect which steps changed status */
      const changed: Array<{ id: string; nom: string; newStatut: StatutEtape; idx: number }> = [];
      for (let i = 0; i < roadmap.etapes.length; i++) {
        const e     = roadmap.etapes[i];
        const local = localEtapes[e.id];
        if (local && local.statut !== e.statut) {
          changed.push({ id: e.id, nom: e.nom, newStatut: local.statut, idx: i });
        }
      }

      /* Auto-cascade: when a step becomes "complete", advance the next step */
      const autoTransitions: Record<string, StatutEtape> = {};
      for (const ch of changed) {
        if (ch.newStatut !== "complete") continue;
        const nextIdx = ch.idx + 1;
        if (nextIdx >= roadmap.etapes.length) continue;
        const nextId    = roadmap.etapes[nextIdx].id;
        const nextLocal = localEtapes[nextId];
        if (nextLocal && nextLocal.statut === "a_venir") {
          autoTransitions[nextId] = CLIENT_ACTION_STEPS.has(nextId) ? "a_faire" : "en_cours";
        }
      }

      /* Build updated etapes array */
      const updatedEtapes = roadmap.etapes.map(e => {
        const local = localEtapes[e.id];
        if (!local) return e;
        const newStatut  = autoTransitions[e.id] ?? local.statut;
        const newEstimee = dateStrToTs(local.dateEstimee);
        let { completedAt, dateDebut } = e;
        if (newStatut === "complete" && e.statut !== "complete" && !completedAt) completedAt = now;
        if (newStatut === "en_cours" && e.statut !== "en_cours" && !dateDebut)   dateDebut   = now;
        return { ...e, statut: newStatut, dateEstimee: newEstimee, blocageRaison: local.blocageRaison || null, completedAt, dateDebut };
      });

      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNom  = clientSnap.data()?.nom ?? "";

      await updateDoc(doc(db, "clients", clientId, "roadmap", "main"), {
        etapes: updatedEtapes,
        dateLancementEstimee: dateStrToTs(localLancement),
      });

      /* Update local state with auto-transitions */
      if (Object.keys(autoTransitions).length > 0) {
        setLocalEtapes(prev => {
          const next = { ...prev };
          for (const [id, statut] of Object.entries(autoTransitions)) {
            next[id] = { ...next[id], statut };
          }
          return next;
        });
      }

      /* Notifications pour les étapes modifiées */
      for (const ch of changed) {
        const statutLabel = STATUT_OPTIONS.find(o => o.value === ch.newStatut)?.label ?? ch.newStatut;
        const desc = `Étape «${ch.nom}» passée à : ${statutLabel}`;
        const type = ch.newStatut === "bloque" ? "etape_bloquee" : "etape_completee";
        // Notifier le client quand une étape avance (pas pour "a_venir")
        if (ch.newStatut !== "a_venir") {
          await createNotification({
            type, destinataire: "client",
            clientId, clientNom, auteurRole: "admin",
            description: `${desc}`,
            lien: `/client/${clientId}/roadmap`,
          });
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  async function handleEnvoyerCreneaux() {
    if (!roadmap) return;
    const valid = creneaux.filter(c => c.date && c.heure);
    if (valid.length < 3) return;
    setSendingCreneaux(true);
    try {
      const now = Timestamp.now();

      /* Save creneaux doc */
      await setDoc(doc(db, "clients", clientId, "roadmap", "rencontreValidation"), {
        creneaux, creneauChoisi: null, envoye: true,
        statutClient: null, dateClientProposee: null, messageClientPropose: null,
      });

      /* Advance rencontre step to "à faire" in roadmap/main */
      const updatedEtapes = roadmap.etapes.map(e =>
        e.id === "rencontre" && e.statut !== "complete"
          ? { ...e, statut: "a_faire" as StatutEtape }
          : e,
      );
      await updateDoc(doc(db, "clients", clientId, "roadmap", "main"), { etapes: updatedEtapes });
      setLocalEtapes(prev => ({
        ...prev,
        rencontre: { ...prev.rencontre, statut: "a_faire" },
      }));

      /* Auto-message to client */
      const creneauxText = creneaux
        .map((c, i) => `${i + 1}. ${formatCreneauFr(c.date, c.heure)}`)
        .join("\n");
      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: `Nous sommes prêts pour votre rencontre de validation ! Voici 3 disponibilités — choisissez celle qui vous convient le mieux :\n\n${creneauxText}`,
        auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
      });

      /* Cas 5 : créneaux envoyés → demande_rencontre admin passe à actionCompletee */
      await markActionCompleteFor({ clientId, type: "demande_rencontre", destinataire: "admin" });

      /* Notification client : créneaux disponibles à choisir */
      const clientSnap = await getDoc(doc(db, "clients", clientId));
      const clientNomLocal = clientSnap.data()?.nom ?? "";
      await createNotification({
        type: "demande_rencontre", destinataire: "client",
        clientId, clientNom: clientNomLocal, auteurRole: "admin",
        description: `3 créneaux disponibles pour votre rencontre de validation — choisissez le vôtre.`,
        lien: `/client/${clientId}/support`,
        actionRequise: true,
      });
    } finally { setSendingCreneaux(false); }
  }

  async function handleConfirmerDateClient() {
    if (!roadmap || !rencontreDoc?.dateClientProposee) return;
    setConfirmingDate(true);
    try {
      const now       = Timestamp.now();
      const dateLabel = formatDateStrFr(rencontreDoc.dateClientProposee);

      await setDoc(doc(db, "clients", clientId, "roadmap", "rencontreValidation"), {
        creneauChoisi: -1, statutClient: null,
      }, { merge: true });

      /* Mark rencontre as complete */
      const updatedEtapes = roadmap.etapes.map(e =>
        e.id === "rencontre" ? { ...e, statut: "complete" as StatutEtape, completedAt: now } : e,
      );
      await updateDoc(doc(db, "clients", clientId, "roadmap", "main"), { etapes: updatedEtapes });
      setLocalEtapes(prev => ({ ...prev, rencontre: { ...prev.rencontre, statut: "complete" } }));

      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: `Parfait ! Votre rencontre de validation est confirmée pour le ${dateLabel}. Vous recevrez un lien de connexion sous peu.`,
        auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
      });
    } finally { setConfirmingDate(false); }
  }

  async function handleRefuserDateClient() {
    if (!roadmap) return;
    const now = Timestamp.now();

    await setDoc(doc(db, "clients", clientId, "roadmap", "rencontreValidation"), {
      statutClient: null, dateClientProposee: null, messageClientPropose: null,
    }, { merge: true });

    /* Reset rencontre to "à faire" so client can pick again */
    const updatedEtapes = roadmap.etapes.map(e =>
      e.id === "rencontre" ? { ...e, statut: "a_faire" as StatutEtape } : e,
    );
    await updateDoc(doc(db, "clients", clientId, "roadmap", "main"), { etapes: updatedEtapes });
    setLocalEtapes(prev => ({ ...prev, rencontre: { ...prev.rencontre, statut: "a_faire" } }));

    await addDoc(collection(db, "clients", clientId, "messages"), {
      texte: "Malheureusement, la date que vous avez proposée n'est pas disponible. Veuillez choisir l'un des créneaux proposés.",
      auteur: "AW Solution", auteurRole: "admin", date: now, lu: false,
    });
  }

  if (loading) return (
    <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
      <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
  if (!roadmap) return null;

  const etapes         = roadmap.etapes ?? [];
  const completedCount = etapes.filter(e => e.statut === "complete").length;
  const pct            = etapes.length === 0 ? 0 : Math.round((completedCount / etapes.length) * 100);
  const rencontreLocal = localEtapes["rencontre"];
  const showCreneauxSection =
    rencontreLocal?.statut === "a_faire" ||
    rencontreLocal?.statut === "en_cours" && rencontreDoc?.statutClient === "propose" ||
    !!rencontreDoc?.envoye;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #F3F4F6", marginBottom: 24 }}>
        {(["progression", "journal"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            style={{
              padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, position: "relative",
              color: subTab === tab ? "#0362E3" : "#6B7280",
            }}
          >
            {tab === "progression" ? "Progression" : "Journal"}
            {subTab === tab && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#0362E3", borderRadius: "1px 1px 0 0" }} />
            )}
          </button>
        ))}
      </div>

      {subTab === "journal" && (
        <AdminJournalManager clientId={clientId} />
      )}

      {subTab === "progression" && (
        <div>
          {/* Controls header */}
          <div style={{
            background: "#fff", border: "1px solid #F3F4F6", borderRadius: 12,
            padding: "20px 24px", marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#0362E3", borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", flexShrink: 0 }}>
                  {pct}% — {completedCount}/{etapes.length}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Date de lancement estimée
                </label>
                <input
                  type="date" value={localLancement}
                  onChange={e => setLocalLancement(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" }}
                />
              </div>
              <button
                onClick={handleSave} disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: 10, border: "none",
                  background: saved ? "#22C55E" : saving ? "#9CA3AF" : "#0362E3",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                <Save size={14} />
                {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Sauvegarder"}
              </button>
            </div>
          </div>

          {/* Steps list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {etapes.map((etape, i) => {
              const local      = localEtapes[etape.id] ?? { statut: etape.statut, dateEstimee: "", blocageRaison: "" };
              const cfg        = STATUT_CFG[local.statut] ?? STATUT_CFG.a_venir;
              const isComplete = local.statut === "complete";
              const isBloque   = local.statut === "bloque";
              const isRencontre = etape.id === "rencontre";

              return (
                <div key={etape.id}>
                  {/* Step row */}
                  <div style={{
                    background: "#fff",
                    border: `1px solid ${local.statut === "en_cours" ? "#BFDBFE" : local.statut === "a_faire" ? "#FED7AA" : "#F3F4F6"}`,
                    borderRadius: 10, padding: "12px 18px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                  }}>
                    {/* Number circle */}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isComplete
                        ? <CheckCircle2 size={13} color={cfg.color} strokeWidth={2.5} />
                        : <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{i + 1}</span>
                      }
                    </div>

                    {/* Name + tooltip */}
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{etape.nom}</span>
                        <div
                          style={{ position: "relative" }}
                          onMouseEnter={() => setTooltip(etape.id)}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <HelpCircle size={13} color="#D1D5DB" style={{ cursor: "help", display: "block" }} />
                          {tooltip === etape.id && TOOLTIPS[etape.id] && (
                            <div style={{
                              position: "absolute", left: 0, bottom: "calc(100% + 8px)",
                              width: 240, background: "#1A1A2E", color: "#E5E7EB",
                              fontSize: 12, lineHeight: 1.7, padding: "10px 14px",
                              borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
                              zIndex: 30, pointerEvents: "none",
                            }}>
                              {TOOLTIPS[etape.id]}
                            </div>
                          )}
                        </div>
                      </div>
                      {isComplete && etape.completedAt && (
                        <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                          Complété le {formatDateFr(etape.completedAt)}
                        </p>
                      )}
                    </div>

                    {/* Status dropdown */}
                    <select
                      value={local.statut}
                      onChange={e => setLocalEtapes(prev => ({
                        ...prev,
                        [etape.id]: { ...prev[etape.id], statut: e.target.value as StatutEtape },
                      }))}
                      style={{
                        padding: "6px 10px", borderRadius: 8,
                        border: `1px solid ${cfg.border}`, background: cfg.bg,
                        color: cfg.color, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", outline: "none", fontFamily: "inherit",
                      }}
                    >
                      {STATUT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    {/* Date estimée */}
                    <div>
                      <label style={{ display: "block", fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                        Date estimée
                      </label>
                      <input
                        type="date" value={local.dateEstimee}
                        onChange={e => setLocalEtapes(prev => ({
                          ...prev,
                          [etape.id]: { ...prev[etape.id], dateEstimee: e.target.value },
                        }))}
                        style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #E5E7EB", fontSize: 12, color: "#374151", outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                  </div>

                  {/* Blocage reason */}
                  {isBloque && (
                    <div style={{ margin: "4px 0 0 44px" }}>
                      <input
                        type="text"
                        value={local.blocageRaison}
                        onChange={e => setLocalEtapes(prev => ({
                          ...prev,
                          [etape.id]: { ...prev[etape.id], blocageRaison: e.target.value },
                        }))}
                        placeholder="Raison du blocage (visible par le client au survol du badge)…"
                        style={{
                          width: "100%", padding: "7px 12px", borderRadius: 8,
                          border: "1px solid #FECACA", background: "#FEF2F2",
                          fontSize: 12, color: "#991B1B", outline: "none", fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}

                  {/* Rencontre creneaux section */}
                  {isRencontre && showCreneauxSection && (
                    <div style={{
                      margin: "6px 0 0 44px",
                      background: "#F9FAFB", border: "1px solid #E5E7EB",
                      borderRadius: 10, padding: "14px 16px",
                    }}>
                      {/* Client proposed a custom date */}
                      {rencontreDoc?.statutClient === "propose" && (
                        <div style={{
                          background: "#FFF7ED", border: "1px solid #FED7AA",
                          borderRadius: 9, padding: "12px 14px", marginBottom: 14,
                        }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "#C2410C", margin: "0 0 6px" }}>
                            📅 Le client propose une date alternative
                          </p>
                          <p style={{ fontSize: 13, color: "#374151", margin: "0 0 4px" }}>
                            Date proposée : <strong>{rencontreDoc.dateClientProposee ? formatDateStrFr(rencontreDoc.dateClientProposee) : "—"}</strong>
                          </p>
                          {rencontreDoc.messageClientPropose && (
                            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px", fontStyle: "italic" }}>
                              « {rencontreDoc.messageClientPropose} »
                            </p>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={handleConfirmerDateClient}
                              disabled={confirmingDate}
                              style={{
                                padding: "7px 14px", borderRadius: 8, border: "none",
                                background: "#22C55E", color: "#fff",
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              ✓ Confirmer cette date
                            </button>
                            <button
                              onClick={handleRefuserDateClient}
                              style={{
                                padding: "7px 14px", borderRadius: 8,
                                border: "1px solid #FECACA", background: "#FEF2F2",
                                color: "#991B1B", fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              ✗ Refuser
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Confirmed state */}
                      {rencontreDoc?.creneauChoisi != null && (
                        <p style={{ fontSize: 12, color: "#166534", fontWeight: 600, margin: "0 0 12px" }}>
                          ✓ Rencontre confirmée — {
                            rencontreDoc.creneauChoisi === -1 && rencontreDoc.dateClientProposee
                              ? formatDateStrFr(rencontreDoc.dateClientProposee)
                              : rencontreDoc.creneauChoisi >= 0
                              ? formatCreneauFr(rencontreDoc.creneaux[rencontreDoc.creneauChoisi].date, rencontreDoc.creneaux[rencontreDoc.creneauChoisi].heure)
                              : "—"
                          }
                        </p>
                      )}

                      {/* Waiting for client */}
                      {rencontreDoc?.envoye && rencontreDoc.creneauChoisi == null && rencontreDoc.statutClient !== "propose" && (
                        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px", fontStyle: "italic" }}>
                          En attente de la confirmation du client…
                        </p>
                      )}

                      {/* Creneaux form — show when not yet confirmed */}
                      {rencontreDoc?.creneauChoisi == null && rencontreDoc?.statutClient !== "propose" && (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 10px" }}>
                            {rencontreDoc?.envoye ? "Modifier les créneaux proposés" : "Proposer 3 créneaux au client"}
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                            {creneaux.map((c, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, color: "#9CA3AF", width: 14, flexShrink: 0 }}>{idx + 1}.</span>
                                <input
                                  type="date" value={c.date}
                                  onChange={e => setCreneaux(prev => prev.map((x, i) => i === idx ? { ...x, date: e.target.value } : x))}
                                  style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid #E5E7EB", fontSize: 12, color: "#374151", outline: "none", fontFamily: "inherit" }}
                                />
                                <input
                                  type="time" value={c.heure}
                                  onChange={e => setCreneaux(prev => prev.map((x, i) => i === idx ? { ...x, heure: e.target.value } : x))}
                                  style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid #E5E7EB", fontSize: 12, color: "#374151", outline: "none", fontFamily: "inherit" }}
                                />
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={handleEnvoyerCreneaux}
                            disabled={sendingCreneaux || creneaux.some(c => !c.date || !c.heure)}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "8px 16px", borderRadius: 8, border: "none",
                              background: creneaux.every(c => c.date && c.heure) ? "#0362E3" : "#E5E7EB",
                              color: creneaux.every(c => c.date && c.heure) ? "#fff" : "#9CA3AF",
                              fontSize: 12, fontWeight: 600, cursor: sendingCreneaux ? "not-allowed" : "pointer",
                            }}
                          >
                            <Send size={12} />
                            {rencontreDoc?.envoye ? "Renvoyer les disponibilités" : "Envoyer les disponibilités au client"}
                          </button>
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
  );
}
