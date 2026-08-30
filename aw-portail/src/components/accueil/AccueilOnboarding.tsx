"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Zap, Check, Clock } from "lucide-react";
import { CardMessages }      from "./CardMessages";
import { CardNotifications } from "./CardNotifications";
import { CardForfait }        from "./CardForfait";
import { LigneEtapes }        from "./LigneEtapes";
import type { ClientData, OnboardingEtape, ActiviteItem, MessageItem } from "@/hooks/useClientData";
import { TourSectionButton } from "@/components/tour/TourSectionButton";

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function prenom(c: string) { return c.split(" ")[0] ?? c; }

function todayFR() {
  return new Date().toLocaleDateString("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function moisAnneeFR(d: Date | null) {
  if (!d) return "—";
  const s = d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shadeColor(hex: string, factor = 0.28): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#060d1a";
  const r = Math.max(0, Math.round(parseInt(clean.substring(0, 2), 16) * (1 - factor)));
  const g = Math.max(0, Math.round(parseInt(clean.substring(2, 4), 16) * (1 - factor)));
  const b = Math.max(0, Math.round(parseInt(clean.substring(4, 6), 16) * (1 - factor)));
  return `rgb(${r},${g},${b})`;
}

// ─── Classification des étapes par ID (roadmap/main) ─────────────────────────

/** Étapes que le CLIENT doit compléter lui-même */
const CLIENT_STEP_IDS = new Set([
  "signature", "paiement", "branding", "rencontre", "formation", "config_succursale",
]);

/** Étapes prises en charge par AW Solution (affichées dans "Ce qui s'en vient") */
const AW_STEP_IDS = new Set([
  "design", "developpement", "ajustements", "tests", "soumission",
]);

// ─── Navigation par ID d'étape ────────────────────────────────────────────────

const SLUG_BY_ID: Record<string, string> = {
  signature:         "contrat",
  paiement:          "paiement",
  branding:          "branding",
  rencontre:         "roadmap",
  formation:         "documentation",
  config_succursale: "roadmap",
};

function getSlug(id: string) {
  return SLUG_BY_ID[id] ?? "roadmap";
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #F3F4F6",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AccueilOnboardingProps {
  clientId: string;
  client:   ClientData;
  etapes:   OnboardingEtape[];
  activite: ActiviteItem[];
  messages: MessageItem[];
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({
  client, hasActionRequired,
}: {
  client: ClientData;
  hasActionRequired: boolean;
}) {
  const couleur    = client.couleurPortail || "#0A1628";
  const couleurFin = shadeColor(couleur);
  const gradient   = `linear-gradient(135deg, ${couleur}, ${couleurFin})`;

  return (
    <div
      data-tour-id="accueil-hero"
      style={{
        background: gradient,
        borderRadius: 16,
        padding: "24px 32px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
        <TourSectionButton section="accueil" />
      </div>

      {/* Gauche */}
      <div style={{ flex: 1 }}>
        {client.logo_url && (
          <img
            src={client.logo_url}
            alt={client.restaurant}
            style={{ height: 52, objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: 16, display: "block" }}
          />
        )}
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: "0 0 6px" }}>
          Bienvenue, {prenom(client.contact)} 👋
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", margin: "0 0 14px", lineHeight: 1.15 }}>
          {client.restaurant}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 20, padding: "4px 12px" }}>
            {client.forfait === "Prestige" ? "★ Prestige" : "Essentiel"}
          </span>
          {hasActionRequired ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#DC2626", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 12px" }}>
              Action requise
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#166534", borderRadius: 20, padding: "4px 12px" }}>
              Onboarding complété ✓
            </span>
          )}
        </div>
      </div>

      {/* Droite — lancement estimé */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <Clock size={20} color="rgba(255,255,255,0.7)" />
        <div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: "0 0 3px" }}>Lancement estimé</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>
            {moisAnneeFR(client.dateEstimeLancement)}
          </p>
        </div>
      </div>

      {/* Date du jour */}
      <p style={{ position: "absolute", bottom: 12, right: 28, fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, textTransform: "capitalize" }}>
        {todayFR()}
      </p>
    </div>
  );
}

// ─── Message personnalisé ────────────────────────────────────────────────────

function CardMessagePersonnalise({ texte }: { texte: string }) {
  if (!texte) return null;
  return (
    <div style={{ ...CARD, marginBottom: 16, borderLeft: "3px solid #0362E3", borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}>
      <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.7 }}>{texte}</p>
    </div>
  );
}

// ─── Bannière action requise ──────────────────────────────────────────────────

function BanniereAction({
  etapes, couleur, clientId,
}: {
  etapes: OnboardingEtape[];
  couleur: string;
  clientId: string;
}) {
  // Première étape CLIENT non complète
  const incompleteClientEtape = etapes.find(
    (e) => CLIENT_STEP_IDS.has(e.id) && e.statut !== "complete"
  );

  if (!incompleteClientEtape) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "14px 20px", marginBottom: 16 }}>
        <Check size={15} color="#22C55E" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 14, color: "#15803D", margin: 0, fontWeight: 500 }}>
          Toutes vos étapes sont complétées — AW Solution s&apos;occupe du reste ✓
        </p>
      </div>
    );
  }

  const slug = getSlug(incompleteClientEtape.id);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      background: "#fff",
      borderRadius: 14,
      border: `1.5px solid ${couleur}`,
      boxShadow: `0 4px 16px ${couleur}22`,
      padding: "14px 20px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${couleur}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={16} color={couleur} strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: couleur, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Action requise
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>
            {incompleteClientEtape.nom}
          </p>
        </div>
      </div>
      <Link
        href={`/client/${clientId}/${slug}`}
        style={{
          flexShrink: 0, fontSize: 13, fontWeight: 600,
          color: "#fff", background: couleur,
          borderRadius: 9, padding: "9px 18px",
          textDecoration: "none", whiteSpace: "nowrap",
          boxShadow: `0 2px 8px ${couleur}40`,
        }}
      >
        Compléter →
      </Link>
    </div>
  );
}

// ─── Checklist des étapes client ──────────────────────────────────────────────

function CardChecklistClient({
  etapes, clientId,
}: {
  etapes: OnboardingEtape[];
  clientId: string;
}) {
  const clientEtapes = etapes.filter((e) => CLIENT_STEP_IDS.has(e.id));
  if (clientEtapes.length === 0) return null;

  return (
    <div style={CARD}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 18px" }}>Vos étapes</p>
      {clientEtapes.map((e, i) => {
        const done    = e.statut === "complete";
        const current = e.statut === "a_faire" || e.statut === "en_cours";
        const slug    = getSlug(e.id);
        return (
          <div key={e.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
              {done
                ? <CheckCircle2 size={16} color="#22C55E" strokeWidth={2} style={{ flexShrink: 0 }} />
                : <Circle size={16} color="#E5E7EB" strokeWidth={2} style={{ flexShrink: 0 }} />
              }
              <p style={{ flex: 1, fontSize: 13, color: done ? "#374151" : current ? "#0A0A0A" : "#6B7280", margin: 0, fontWeight: current ? 600 : 400 }}>
                {e.nom}
              </p>
              {done ? (
                <span style={{ fontSize: 11, color: "#166534", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "2px 8px", fontWeight: 500 }}>
                  Complété
                </span>
              ) : current ? (
                <Link
                  href={`/client/${clientId}/${slug}`}
                  style={{ fontSize: 11, color: "#0362E3", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "2px 8px", fontWeight: 500, textDecoration: "none" }}
                >
                  {e.statut === "a_faire" ? "À compléter →" : "En cours →"}
                </Link>
              ) : (
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>À venir</span>
              )}
            </div>
            {i < clientEtapes.length - 1 && <div style={{ height: 1, background: "#F3F4F6" }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Ce qui s'en vient (étapes AW) ───────────────────────────────────────────

function CardCeQuiSenVient({ etapes }: { etapes: OnboardingEtape[] }) {
  const awEtapes = etapes.filter((e) => AW_STEP_IDS.has(e.id));
  if (awEtapes.length === 0) return null;

  return (
    <div style={CARD}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 6px" }}>Ce qui s&apos;en vient</p>
      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 16px", lineHeight: 1.5 }}>
        Pendant que vous complétez vos étapes, voici ce que notre équipe prépare de son côté.
      </p>
      {awEtapes.map((e, i) => {
        const done    = e.statut === "complete";
        const current = e.statut === "en_cours";
        const dateStr = e.dateEstimee
          ? e.dateEstimee.toDate().toLocaleDateString("fr-CA", { month: "short", year: "numeric" })
          : null;

        return (
          <div key={e.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
              {done
                ? <CheckCircle2 size={14} color="#22C55E" strokeWidth={2} style={{ flexShrink: 0 }} />
                : (
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${current ? "#0362E3" : "#D1D5DB"}`,
                    background: current ? "#EFF6FF" : "transparent",
                  }} />
                )
              }
              <p style={{ flex: 1, fontSize: 13, color: done ? "#9CA3AF" : "#374151", margin: 0, textDecoration: done ? "line-through" : "none" }}>
                {e.nom}
              </p>
              {dateStr && !done && (
                <span style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" }}>Est. {dateStr}</span>
              )}
              {current && (
                <span style={{ fontSize: 11, color: "#1D4ED8", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                  En cours
                </span>
              )}
            </div>
            {i < awEtapes.length - 1 && <div style={{ height: 1, background: "#F3F4F6" }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function AccueilOnboarding({ clientId, client, etapes, activite, messages }: AccueilOnboardingProps) {
  const couleur = client.couleurPortail || "#0A1628";

  // Badge rouge si au moins une étape CLIENT n'est pas complète
  const hasActionRequired = etapes
    .filter((e) => CLIENT_STEP_IDS.has(e.id))
    .some((e) => e.statut !== "complete");

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 48px 80px" }}>

        {/* Hero */}
        <Hero client={client} hasActionRequired={hasActionRequired} />

        {/* Message personnalisé */}
        <CardMessagePersonnalise texte={client.messagePersonnalise} />

        {/* Bannière action requise */}
        <div data-tour-id="accueil-banniere">
          <BanniereAction etapes={etapes} couleur={couleur} clientId={clientId} />
        </div>

        {/* Ligne horizontale — lit roadmap/main via useClientData (etapes) */}
        <div data-tour-id="accueil-etapes" style={{ marginBottom: 24 }}>
          <LigneEtapes clientId={clientId} etapes={etapes} couleur={couleur} />
        </div>

        {/* Grille principale */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>

          {/* Colonne gauche */}
          <div data-tour-id="accueil-messages" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CardMessages      clientId={clientId} messages={messages} />
            <CardNotifications clientId={clientId} activite={activite} />
          </div>

          {/* Colonne droite */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CardChecklistClient etapes={etapes} clientId={clientId} />
            <CardCeQuiSenVient  etapes={etapes} />
            <div data-tour-id="accueil-forfait">
              <CardForfait client={client} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
