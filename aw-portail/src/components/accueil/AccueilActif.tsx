"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  doc, collection, onSnapshot, query, orderBy, limit,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  TrendingUp, TrendingDown, Users, DollarSign, Activity,
  AlertTriangle, CheckCircle2, Info, Mail, Phone,
  Star, ChevronRight, ExternalLink, Gift, Megaphone, CalendarDays,
} from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  LineElement, PointElement, Tooltip, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { CardMessages }      from "./CardMessages";
import { CardNotifications } from "./CardNotifications";
import { CardForfait }       from "./CardForfait";
import { getMockAnalytics, fmtNombre, fmtArgent } from "@/lib/mockAnalytics";
import type { AlerteDoc as Alerte } from "@/types/analytics";
import type { ClientData, OnboardingEtape, ActiviteItem, MessageItem } from "@/hooks/useClientData";

// ─── Enregistrement Chart.js ──────────────────────────────────────────────────
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler);

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface Annonce {
  id: string;
  titre: string;
  description: string;
  date: Date;
}

interface Rencontre {
  id: string;
  date: Date;
  heure: string;
  lien?: string;
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function prenom(c: string) { return c.split(" ")[0] ?? c; }

function shadeColor(hex: string, factor = 0.28): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#060d1a";
  const r = Math.max(0, Math.round(parseInt(clean.substring(0, 2), 16) * (1 - factor)));
  const g = Math.max(0, Math.round(parseInt(clean.substring(2, 4), 16) * (1 - factor)));
  const b = Math.max(0, Math.round(parseInt(clean.substring(4, 6), 16) * (1 - factor)));
  return `rgb(${r},${g},${b})`;
}

function todayFR() {
  return new Date().toLocaleDateString("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function dateCourteFR(d: Date) {
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

function moisNomFR(n: number) {
  return ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"][n - 1] ?? "";
}

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #F3F4F6",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AccueilActifProps {
  clientId: string;
  client:   ClientData;
  etapes:   OnboardingEtape[];
  activite: ActiviteItem[];
  messages: MessageItem[];
}

// ─── Hero avec stats ──────────────────────────────────────────────────────────

function Hero({ client, couleur }: { client: ClientData; couleur: string }) {
  const analytics = getMockAnalytics();
  const { current } = analytics;
  const gradient  = `linear-gradient(135deg, ${couleur}, ${shadeColor(couleur)})`;

  const membresAddCeMois = Math.round(current.membresActifs * current.variations.membresActifs);
  const visitesAddCeMois = Math.round(current.visitesValidees * current.variations.visitesValidees);
  const revenusCeMois    = current.revenusAttribues;
  const revenusVar       = current.variations.revenusAttribues;

  const stats = [
    {
      label: "Membres",
      value: fmtNombre(current.membresTotal),
      sub: `${membresAddCeMois >= 0 ? "+" : ""}${fmtNombre(membresAddCeMois)} ce mois`,
      positive: membresAddCeMois >= 0,
      icon: Users,
    },
    {
      label: "Revenus attribués",
      value: fmtArgent(revenusCeMois),
      sub: `${revenusVar >= 0 ? "+" : ""}${Math.round(revenusVar * 100)} % vs mois préc.`,
      positive: revenusVar >= 0,
      icon: DollarSign,
    },
    {
      label: "Visites ce mois",
      value: fmtNombre(current.visitesValidees),
      sub: `${visitesAddCeMois >= 0 ? "+" : ""}${fmtNombre(visitesAddCeMois)} vs mois préc.`,
      positive: visitesAddCeMois >= 0,
      icon: Activity,
    },
  ];

  return (
    <div style={{ background: gradient, borderRadius: 16, padding: "24px 32px", marginBottom: 20, position: "relative" }}>
      {/* Ligne du haut */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          {client.logo_url && (
            <img src={client.logo_url} alt={client.restaurant}
              style={{ height: 48, objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: 14, display: "block" }} />
          )}
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: "0 0 4px" }}>
            Bonjour, {prenom(client.contact)} 👋
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px", margin: "0 0 12px", lineHeight: 1.15 }}>
            {client.restaurant}
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 20, padding: "4px 12px" }}>
              {client.forfait === "Prestige" ? "★ Prestige" : "Essentiel"}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#166534", borderRadius: 20, padding: "4px 12px" }}>
              ● Application active
            </span>
            {client.dateLancement && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", borderRadius: 20, padding: "4px 12px", border: "1px solid rgba(255,255,255,0.2)" }}>
                En ligne depuis {client.dateLancement.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, textTransform: "capitalize", flexShrink: 0 }}>
          {todayFR()}
        </p>
      </div>

      {/* 3 stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {stats.map(({ label, value, sub, positive, icon: Icon }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                {label}
              </p>
              <Icon size={14} color="rgba(255,255,255,0.5)" />
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 6px", lineHeight: 1 }}>
              {value}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {positive
                ? <TrendingUp size={11} color="#86EFAC" />
                : <TrendingDown size={11} color="#FCA5A5" />
              }
              <p style={{ fontSize: 11, color: positive ? "#86EFAC" : "#FCA5A5", margin: 0 }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alertes intelligentes ────────────────────────────────────────────────────

const SEVERITE_STYLE: Record<Alerte["severite"], { border: string; icon: React.ElementType; iconColor: string; badge: string; badgeBg: string }> = {
  critique: { border: "#EF4444", icon: AlertTriangle, iconColor: "#EF4444", badge: "Critique",  badgeBg: "#FEF2F2" },
  attention: { border: "#F59E0B", icon: Info,          iconColor: "#F59E0B", badge: "Attention", badgeBg: "#FFFBEB" },
  positive:  { border: "#22C55E", icon: CheckCircle2,  iconColor: "#22C55E", badge: "Positif",  badgeBg: "#F0FDF4" },
};

function CardAlertes({ clientId }: { clientId: string }) {
  const { alertes } = getMockAnalytics();

  const priorityOrder: Alerte["severite"][] = ["critique", "critique", "attention"];
  const visible = alertes
    .filter((a) => !a.lue)
    .sort((a, b) => {
      const order = { critique: 0, attention: 1, positive: 2 };
      return order[a.severite] - order[b.severite];
    })
    .slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div style={{ ...CARD, marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Alertes intelligentes</p>
        <Link href={`/client/${clientId}/donnees?tab=alertes`}
          style={{ fontSize: 12, color: "#0362E3", fontWeight: 500, textDecoration: "none" }}>
          Voir toutes les alertes →
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map((alerte) => {
          const s = SEVERITE_STYLE[alerte.severite];
          const Icon = s.icon;
          return (
            <div key={alerte.id} style={{
              display: "flex", gap: 12, padding: "14px 16px",
              borderLeft: `3px solid ${s.border}`,
              background: "#FAFAFA", borderRadius: "0 10px 10px 0",
            }}>
              <Icon size={16} color={s.iconColor} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>{alerte.titre}</p>
                  <span style={{ fontSize: 10, fontWeight: 600, color: s.iconColor, background: s.badgeBg, borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>
                    {s.badge}
                  </span>
                  {alerte.valeurEnJeu && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#991B1B", background: "#FEF2F2", borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>
                      {fmtArgent(alerte.valeurEnJeu)} en jeu
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 8px", lineHeight: 1.5 }}>
                  {alerte.description}
                </p>
                {alerte.actionLabel && (
                  <button style={{ fontSize: 12, fontWeight: 600, color: s.iconColor, background: "none", border: `1px solid ${s.border}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
                    {alerte.actionLabel} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Graphique de tendance ────────────────────────────────────────────────────

function CardGraphique() {
  const { series } = getMockAnalytics();
  const { visitesRevenus } = series;

  const data = {
    labels: visitesRevenus.map((v) => v.date),
    datasets: [
      {
        label: "Visites",
        data: visitesRevenus.map((v) => v.visites),
        borderColor: "#0362E3",
        backgroundColor: "rgba(3,98,227,0.08)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { mode: "index" as const, intersect: false }, legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#9CA3AF", maxTicksLimit: 7 } },
      y: { grid: { color: "#F3F4F6" }, ticks: { font: { size: 10 }, color: "#9CA3AF" }, beginAtZero: true },
    },
  };

  return (
    <div style={CARD}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 4px" }}>Tendance — visites (30 derniers jours)</p>
      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 16px" }}>Visites validées par l&apos;application</p>
      <div style={{ height: 180 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

// ─── Programme en un coup d'œil ───────────────────────────────────────────────

function CardProgramme({ clientId }: { clientId: string }) {
  const { recompenses, campagnes } = getMockAnalytics();
  const items = [
    { icon: Gift, label: "Récompenses actives", value: `${recompenses.length}`, color: "#7C3AED", bg: "#F5F3FF" },
    { icon: Megaphone, label: "Campagnes ce mois", value: `${campagnes.length}`, color: "#0362E3", bg: "#EFF6FF" },
    { icon: Star, label: "Prochaine campagne", value: "À planifier", color: "#F59E0B", bg: "#FFFBEB" },
  ];
  return (
    <div style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Votre programme</p>
        <Link href={`/client/${clientId}/donnees`}
          style={{ fontSize: 12, color: "#0362E3", fontWeight: 500, textDecoration: "none" }}>
          Données complètes →
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={15} color={color} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Nouveautés AW Solution ───────────────────────────────────────────────────

function CardNouveautes({ annonces }: { annonces: Annonce[] }) {
  if (annonces.length === 0) return null;
  return (
    <div style={CARD}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 14px" }}>Nouveautés AW Solution</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {annonces.map((a, i) => (
          <div key={a.id}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0362E3", flexShrink: 0, marginTop: 5 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: "0 0 2px" }}>{a.titre}</p>
                <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 3px", lineHeight: 1.5 }}>{a.description}</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{dateCourteFR(a.date)}</p>
              </div>
            </div>
            {i < annonces.length - 1 && <div style={{ height: 1, background: "#F3F4F6", marginTop: 14 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rapport du mois ──────────────────────────────────────────────────────────

function CardRapport({ client }: { client: ClientData }) {
  const { rapports } = getMockAnalytics();
  const dernierRapport = rapports[0]; // trié par date desc dans le mock

  if (!dernierRapport) return null;

  const bonsCoups = dernierRapport.analyseIA.bonsCoups.slice(0, 2);

  return (
    <div style={CARD}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 14px" }}>Rapport du mois</p>

      {/* En-tête du rapport */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: "0 0 2px" }}>
            Rapport de performance — {moisNomFR(dernierRapport.mois)} {dernierRapport.annee}
          </p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
            Généré le {dateCourteFR(dernierRapport.generatedAt)}
          </p>
        </div>
        {dernierRapport.pdfUrl ? (
          <a href={dernierRapport.pdfUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 600, color: "#0362E3", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "6px 12px", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <ExternalLink size={12} /> Télécharger PDF
          </a>
        ) : (
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>PDF à venir</span>
        )}
      </div>

      {/* Analyse IA — Prestige seulement */}
      {client.forfait === "Prestige" && bonsCoups.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={12} /> Vos bons coups ce mois
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bonsCoups.map((coup, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <CheckCircle2 size={13} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6 }}>{coup}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Prochaine rencontre stratégique (Prestige) ───────────────────────────────

function CardRencontre({ rencontre, clientId }: { rencontre: Rencontre | null; clientId: string }) {
  if (!rencontre) {
    return (
      <div style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CalendarDays size={16} color="#7C3AED" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: "0 0 2px" }}>Rencontre stratégique</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Aucune rencontre planifiée</p>
          </div>
        </div>
        <Link href={`/client/${clientId}/support`}
          style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, padding: "7px 14px", textDecoration: "none", whiteSpace: "nowrap" }}>
          Demander une rencontre →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ ...CARD, borderLeft: "3px solid #7C3AED", borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CalendarDays size={16} color="#7C3AED" />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>Rencontre stratégique</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: "0 0 2px" }}>
              {dateCourteFR(rencontre.date)} à {rencontre.heure}
            </p>
          </div>
        </div>
        {rencontre.lien && (
          <a href={rencontre.lien} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, padding: "7px 14px", textDecoration: "none", whiteSpace: "nowrap" }}>
            Rejoindre la réunion →
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Support ──────────────────────────────────────────────────────────────────

function CardSupport({ clientId }: { clientId: string }) {
  return (
    <div style={{ ...CARD, background: "#FAFAFA" }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", margin: "0 0 14px" }}>Besoin d&apos;aide ?</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginBottom: 16 }}>
        <a href="mailto:alex@awsolution.ca" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", textDecoration: "none" }}>
          <Mail size={13} color="#9CA3AF" /> alex@awsolution.ca
        </a>
        <a href="mailto:support@awsolution.ca" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", textDecoration: "none" }}>
          <Mail size={13} color="#9CA3AF" /> support@awsolution.ca
        </a>
        <a href="tel:+18193840992" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", textDecoration: "none" }}>
          <Phone size={13} color="#9CA3AF" /> (819) 384-0992
        </a>
      </div>
      <Link href={`/client/${clientId}/support`}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#0362E3", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 16px", textDecoration: "none" }}>
        <Mail size={13} /> Ouvrir la messagerie
        <ChevronRight size={13} />
      </Link>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function AccueilActif({ clientId, client, activite, messages }: AccueilActifProps) {
  const [couleur, setCouleur]     = useState(client.couleurPortail || "#0A1628");
  const [annonces, setAnnonces]   = useState<Annonce[]>([]);
  const [rencontre, setRencontre] = useState<Rencontre | null>(null);

  // Couleur : branding/main.couleurPrincipale → couleurPortail
  useEffect(() => {
    return onSnapshot(doc(db, "clients", clientId, "branding", "main"), (snap) => {
      const cp = snap.exists() ? (snap.data().couleurPrincipale ?? "") : "";
      setCouleur(cp || client.couleurPortail || "#0A1628");
    });
  }, [clientId, client.couleurPortail]);

  // Nouveautés — admin_config/annonces
  useEffect(() => {
    const q = query(
      collection(db, "admin_config", "annonces", "items"),
      orderBy("date", "desc"),
      limit(5),
    );
    return onSnapshot(q, (snap) => {
      setAnnonces(snap.docs.map((d) => {
        const data = d.data();
        return {
          id:          d.id,
          titre:       data.titre       ?? "",
          description: data.description ?? "",
          date:        data.date instanceof Object && "toDate" in data.date
                         ? (data.date as Timestamp).toDate() : new Date(),
        };
      }));
    });
  }, []);

  // Prochaine rencontre (Prestige seulement)
  useEffect(() => {
    if (client.forfait !== "Prestige") return;
    const q = query(
      collection(db, "clients", clientId, "rencontresMensuelles"),
      orderBy("date", "asc"),
      limit(1),
    );
    return onSnapshot(q, (snap) => {
      if (snap.empty) { setRencontre(null); return; }
      const d = snap.docs[0].data();
      const dateObj = d.date instanceof Object && "toDate" in d.date
        ? (d.date as Timestamp).toDate() : new Date();
      if (dateObj < new Date()) { setRencontre(null); return; }
      setRencontre({ id: snap.docs[0].id, date: dateObj, heure: d.heure ?? "à confirmer", lien: d.lien ?? undefined });
    });
  }, [clientId, client.forfait]);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 48px 80px" }}>

        {/* Hero avec stats */}
        <Hero client={client} couleur={couleur} />

        {/* Alertes intelligentes — Prestige seulement */}
        {client.forfait === "Prestige" && (
          <div style={{ marginBottom: 20 }}>
            <CardAlertes clientId={clientId} />
          </div>
        )}

        {/* Graphique de tendance */}
        <div style={{ marginBottom: 20 }}>
          <CardGraphique />
        </div>

        {/* Grille principale 3:2 */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>

          {/* Colonne gauche */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CardMessages      clientId={clientId} messages={messages} />
            <CardNotifications clientId={clientId} activite={activite} />
          </div>

          {/* Colonne droite */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CardProgramme  clientId={clientId} />
            <CardNouveautes annonces={annonces} />
            <CardRapport    client={client} />
            {client.forfait === "Prestige" && (
              <CardRencontre rencontre={rencontre} clientId={clientId} />
            )}
            <CardSupport clientId={clientId} />
            <CardForfait client={client} />
          </div>
        </div>
      </div>
    </div>
  );
}
