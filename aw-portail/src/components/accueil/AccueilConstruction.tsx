"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  doc, collection, onSnapshot, query, orderBy, limit,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CheckCircle2, Circle, Clock, Map, ExternalLink,
  ChevronDown, ChevronUp, Bell, BookOpen, Zap,
} from "lucide-react";
import { LigneEtapes }        from "./LigneEtapes";
import { CardMessages }       from "./CardMessages";
import { CardNotifications }  from "./CardNotifications";
import { CardForfait }        from "./CardForfait";
import type { ClientData, OnboardingEtape, ActiviteItem, MessageItem } from "@/hooks/useClientData";

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  titre: string;
  date: Date;
  etapeNom: string;
  images: string[];
  statutApprobation: "en_attente" | "approuve" | "rejete" | null;
}

interface DocItem {
  id: string;
  titre: string;
  url: string;
  type: string;
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
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

function calcSemaines(date: Date | null): number | null {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #F3F4F6",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AccueilConstructionProps {
  clientId: string;
  client:   ClientData;
  etapes:   OnboardingEtape[];
  activite: ActiviteItem[];
  messages: MessageItem[];
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ client, couleur }: { client: ClientData; couleur: string }) {
  const gradient = `linear-gradient(135deg, ${couleur}, ${shadeColor(couleur)})`;
  const semaines = calcSemaines(client.dateEstimeLancement);

  return (
    <div style={{
      background: gradient, borderRadius: 16, padding: "24px 32px", marginBottom: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 24, position: "relative",
    }}>
      <div style={{ flex: 1 }}>
        {client.logo_url && (
          <img src={client.logo_url} alt={client.restaurant}
            style={{ height: 52, objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: 16, display: "block" }} />
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
          <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#1D4ED8", borderRadius: 20, padding: "4px 12px" }}>
            En cours de développement
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <Clock size={20} color="rgba(255,255,255,0.7)" />
        <div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: "0 0 3px" }}>
            {semaines !== null ? "Lancement dans" : "Lancement estimé"}
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>
            {semaines !== null
              ? semaines === 0 ? "Imminent 🚀" : `${semaines} sem.`
              : "À déterminer"}
          </p>
        </div>
      </div>
      <p style={{ position: "absolute", bottom: 12, right: 28, fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0, textTransform: "capitalize" }}>
        {todayFR()}
      </p>
    </div>
  );
}

// ─── Compte à rebours ─────────────────────────────────────────────────────────

function CardCompteARebours({
  client, etapes, couleur,
}: { client: ClientData; etapes: OnboardingEtape[]; couleur: string }) {
  const lancementEtape = etapes.find((e) => e.id === "lancement");
  const dateLancement  = lancementEtape?.dateEstimee?.toDate() ?? client.dateEstimeLancement;
  const semaines       = calcSemaines(dateLancement);

  // Progression temporelle : ratio étapes complétées / total
  const completed = etapes.filter((e) => e.statut === "complete").length;
  const pct       = etapes.length ? Math.round((completed / etapes.length) * 100) : 0;

  // Étapes AW restantes (non client)
  const CLIENT_IDS = new Set(["signature", "paiement", "branding"]);
  const awRestantes = etapes.filter(
    (e) => !CLIENT_IDS.has(e.id) && e.statut !== "complete",
  ).length;

  return (
    <div style={{ ...CARD, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 4px" }}>
            {semaines !== null && semaines > 0
              ? `Plus que ${semaines} semaine${semaines > 1 ? "s" : ""} avant le lancement estimé`
              : semaines === 0
              ? "Lancement imminent 🚀"
              : "Date de lancement à déterminer"}
          </p>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
            {awRestantes > 0
              ? `${awRestantes} étape${awRestantes > 1 ? "s" : ""} en cours — notre équipe avance`
              : "Toutes les étapes sont complétées"}
          </p>
        </div>
        {dateLancement && (
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, whiteSpace: "nowrap" }}>
            {dateLancement.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })
              .replace(/^./, c => c.toUpperCase())}
          </p>
        )}
      </div>

      {/* Barre de progression */}
      <div style={{ height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${couleur}, ${couleur}cc)`,
          borderRadius: 4, transition: "width 0.6s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Début du projet</p>
        <p style={{ fontSize: 11, fontWeight: 600, color: couleur, margin: 0 }}>{pct} % complété</p>
        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Lancement</p>
      </div>
    </div>
  );
}

// ─── Étape en cours ───────────────────────────────────────────────────────────

function CardEtapeActuelle({ etapes, clientId, couleur }: {
  etapes: OnboardingEtape[]; clientId: string; couleur: string;
}) {
  const courante = etapes.find((e) => e.statut === "en_cours");
  if (!courante) {
    // Aucune étape en cours — afficher la prochaine à_faire
    const suivante = etapes.find((e) => e.statut === "a_faire");
    if (!suivante) return null;
    return (
      <div style={{ ...CARD, borderLeft: `3px solid #9CA3AF`, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>
          Prochaine étape
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 12px" }}>{suivante.nom}</p>
        <Link href={`/client/${clientId}/roadmap`}
          style={{ fontSize: 13, color: "#0362E3", fontWeight: 500, textDecoration: "none" }}>
          Voir la feuille de route →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ ...CARD, borderLeft: `3px solid ${couleur}`, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: couleur, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>
            Étape en cours
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 8px" }}>{courante.nom}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: couleur, display: "inline-block", animation: "pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Notre équipe travaille sur cette étape</p>
          </div>
          {courante.dateEstimee && (
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "6px 0 0" }}>
              Estimé : {dateCourteFR(courante.dateEstimee.toDate())}
            </p>
          )}
        </div>
        <Link href={`/client/${clientId}/roadmap`}
          style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: couleur, background: `${couleur}12`, borderRadius: 9, padding: "8px 14px", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          <Map size={14} />
          Voir la feuille de route
        </Link>
      </div>
    </div>
  );
}

// ─── Prochaine action attendue ─────────────────────────────────────────────────

function CardProchaineAction({ activite, clientId, couleur }: {
  activite: ActiviteItem[]; clientId: string; couleur: string;
}) {
  const action = activite.find((a) => a.actionRequise && !a.actionCompletee);

  if (!action) {
    return (
      <div style={{ ...CARD, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CheckCircle2 size={16} color="#22C55E" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: "0 0 4px" }}>Aucune action requise</p>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
            Rien n&apos;est requis de votre part pour l&apos;instant. Nous vous contacterons dès que nous aurons besoin de vous.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...CARD, borderLeft: `3px solid ${couleur}`, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${couleur}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Zap size={16} color={couleur} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: couleur, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>
            Action requise
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: "0 0 8px" }}>{action.description}</p>
          {action.lien && (
            <Link href={`/client/${clientId}/${action.lien}`}
              style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: couleur, borderRadius: 8, padding: "7px 14px", textDecoration: "none", display: "inline-block" }}>
              Compléter →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dernières mises à jour du journal ────────────────────────────────────────

function CardJournal({ entries, clientId }: { entries: JournalEntry[]; clientId: string }) {
  const BADGE: Record<string, { label: string; color: string; bg: string }> = {
    en_attente: { label: "Approbation requise", color: "#92400E", bg: "#FEF3C7" },
    approuve:   { label: "Approuvé",            color: "#166534", bg: "#F0FDF4" },
    rejete:     { label: "Révision demandée",   color: "#991B1B", bg: "#FEF2F2" },
  };

  return (
    <div style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Dernières mises à jour</p>
        <Link href={`/client/${clientId}/roadmap?tab=journal`}
          style={{ fontSize: 12, color: "#0362E3", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          Voir le journal <ExternalLink size={12} />
        </Link>
      </div>

      {entries.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
          Aucune mise à jour pour l&apos;instant — votre équipe publiera ses avancées ici.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((e, i) => {
            const badge = e.statutApprobation ? BADGE[e.statutApprobation] : null;
            return (
              <div key={e.id}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {e.images[0] ? (
                    <img src={e.images[0]} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 40, background: "#F3F4F6", borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <BookOpen size={14} color="#D1D5DB" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                        {e.titre}
                      </p>
                      {badge && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: badge.color, background: badge.bg, borderRadius: 4, padding: "2px 6px" }}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {e.etapeNom && (
                        <span style={{ fontSize: 11, color: "#6B7280" }}>{e.etapeNom}</span>
                      )}
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{dateCourteFR(e.date)}</span>
                    </div>
                  </div>
                </div>
                {i < entries.length - 1 && <div style={{ height: 1, background: "#F3F4F6", marginTop: 12 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Préparez votre lancement (accordéon) ────────────────────────────────────

const PREP_ITEMS = [
  {
    titre: "Formez votre équipe",
    corps: "Vos employés seront les premiers ambassadeurs de votre application. Prévoyez une courte rencontre d'équipe avant le lancement pour leur expliquer le fonctionnement. Un guide de formation complet vous sera remis dans votre section Documentation.",
  },
  {
    titre: "Préparez votre annonce",
    corps: "Pensez à la façon dont vous allez annoncer l'application à vos clients : publication sur vos réseaux sociaux, affiche en succursale, mention au comptoir. Nous vous fournirons du matériel de lancement prêt à utiliser, incluant une vidéo promotionnelle à diffuser sur les télévisions de vos succursales.",
  },
  {
    titre: "Identifiez vos meilleurs clients",
    corps: "Vos clients réguliers sont ceux qui téléchargeront l'application en premier. Dressez une liste mentale de vos habitués, ce sont eux qui feront décoller votre programme dès la première semaine.",
  },
  {
    titre: "Prévoyez votre offre de lancement",
    corps: "Une offre spéciale au lancement accélère considérablement les téléchargements. Réfléchissez à ce que vous pourriez offrir : une récompense gratuite à l'inscription, un rabais important pour les premiers membres, ou un tirage parmi tous ceux qui installent l'application dans les deux premières semaines.",
  },
];

function CardPreparation() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={CARD}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 4px" }}>
        Préparez votre lancement
      </p>
      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 16px" }}>
        Profitez du temps de développement pour préparer votre équipe.
      </p>
      {PREP_ITEMS.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>
              {i + 1}. {item.titre}
            </span>
            {open === i
              ? <ChevronUp size={14} color="#9CA3AF" />
              : <ChevronDown size={14} color="#9CA3AF" />
            }
          </button>
          {open === i && (
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "0 0 12px", padding: "0 4px" }}>
              {item.corps}
            </p>
          )}
          {i < PREP_ITEMS.length - 1 && <div style={{ height: 1, background: "#F3F4F6" }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Documentation disponible ────────────────────────────────────────────────

function CardDocumentation({ docs, clientId }: { docs: DocItem[]; clientId: string }) {
  return (
    <div style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Documentation et formations</p>
        <Link href={`/client/${clientId}/documentation`}
          style={{ fontSize: 12, color: "#0362E3", fontWeight: 500, textDecoration: "none" }}>
          Tout voir →
        </Link>
      </div>
      {docs.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>
          Vos guides et formations seront disponibles une fois votre application terminée. En attendant, consultez notre FAQ dans la section{" "}
          <Link href={`/client/${clientId}/documentation`} style={{ color: "#0362E3" }}>Documentation</Link>.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map((d) => (
            <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", textDecoration: "none", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BookOpen size={14} color="#0362E3" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.titre}
                </p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, textTransform: "uppercase" }}>{d.type}</p>
              </div>
              <ExternalLink size={12} color="#9CA3AF" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function AccueilConstruction({ clientId, client, etapes, activite, messages }: AccueilConstructionProps) {
  const [couleur, setCouleur]         = useState(client.couleurPortail || "#0A1628");
  const [journal, setJournal]         = useState<JournalEntry[]>([]);
  const [docs, setDocs]               = useState<DocItem[]>([]);

  // Couleur : branding/main.couleurPrincipale → couleurPortail
  useEffect(() => {
    return onSnapshot(doc(db, "clients", clientId, "branding", "main"), (snap) => {
      const cp = snap.exists() ? (snap.data().couleurPrincipale ?? "") : "";
      setCouleur(cp || client.couleurPortail || "#0A1628");
    });
  }, [clientId, client.couleurPortail]);

  // Journal — 3 dernières entrées
  useEffect(() => {
    const q = query(
      collection(db, "clients", clientId, "journal"),
      orderBy("date", "desc"),
      limit(3),
    );
    return onSnapshot(q, (snap) => {
      setJournal(snap.docs.map((d) => {
        const data = d.data();
        return {
          id:                 d.id,
          titre:              data.titre             ?? "Mise à jour",
          date:               data.date instanceof Object && "toDate" in data.date
                                ? (data.date as Timestamp).toDate() : new Date(),
          etapeNom:           data.etapeNom          ?? data.etapeId ?? "",
          images:             Array.isArray(data.images) ? data.images as string[] : [],
          statutApprobation:  data.statutApprobation ?? null,
        };
      }));
    });
  }, [clientId]);

  // Documentation disponible
  useEffect(() => {
    return onSnapshot(collection(db, "clients", clientId, "documentation"), (snap) => {
      setDocs(snap.docs.map((d) => {
        const data = d.data();
        return {
          id:    d.id,
          titre: data.titre ?? "Document",
          url:   data.url   ?? "#",
          type:  data.type  ?? "Guide",
        };
      }));
    });
  }, [clientId]);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 48px 80px" }}>

        {/* Hero */}
        <Hero client={client} couleur={couleur} />

        {/* Compte à rebours */}
        <CardCompteARebours client={client} etapes={etapes} couleur={couleur} />

        {/* Ligne horizontale de déploiement */}
        <div style={{ marginBottom: 24 }}>
          <LigneEtapes clientId={clientId} etapes={etapes} couleur={couleur} />
        </div>

        {/* Grille principale 3:2 */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>

          {/* Colonne gauche */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CardEtapeActuelle  etapes={etapes} clientId={clientId} couleur={couleur} />
            <CardProchaineAction activite={activite} clientId={clientId} couleur={couleur} />
            <CardMessages       clientId={clientId} messages={messages} />
            <CardNotifications  clientId={clientId} activite={activite} />
          </div>

          {/* Colonne droite */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CardJournal      entries={journal} clientId={clientId} />
            <CardPreparation />
            <CardDocumentation docs={docs} clientId={clientId} />
            <CardForfait      client={client} />
          </div>
        </div>
      </div>
    </div>
  );
}
