"use client";

import { use, useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FileText, Video, ExternalLink, ChevronDown, ChevronUp,
  Clock, Layers, Sparkles,
} from "lucide-react";
import { TourSectionButton } from "@/components/tour/TourSectionButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocItem {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  sousSection: string;
  type: "pdf" | "video" | "lien" | "fonctionnalite";
  url: string;
  prestige: boolean;
  postLancement: boolean;
  publishedAt: Date;
  nouveauJusquau?: Date;
  statut?: string;
}

interface FaqItem { id: string; question: string; reponse: string; ordre: number }
interface CustomSub { id: string; nom: string }
interface CustomCat { id: string; nom: string; soussections: CustomSub[] }

// ─── Définition statique des catégories ───────────────────────────────────────

const EMPTY_APP = "Ce guide sera disponible dès que votre application sera terminée.";

const STATIC_STRUCTURE = [
  {
    id: "demarrage",
    label: "Démarrage",
    icon: <Sparkles size={16} color="#0362E3" />,
    iconBg: "#EFF6FF",
    soussections: [
      { id: "tour",     label: "Tour de l'application",          emptyMsg: "Ce guide personnalisé avec les captures d'écran de votre application sera disponible dès que votre app sera terminée." },
      { id: "script",   label: "Script de lancement au comptoir", emptyMsg: "Votre script personnalisé sera disponible dès que votre application sera terminée." },
      { id: "materiel", label: "Matériel de lancement",           emptyMsg: "Vos affiches, cartes de table et vidéo promotionnelle seront disponibles dès que votre application sera terminée." },
    ],
  },
  {
    id: "guides",
    label: "Guides d'utilisation",
    icon: <FileText size={16} color="#059669" />,
    iconBg: "#F0FDF4",
    soussections: [
      { id: "validation_facture",  label: "Validation de facture",               emptyMsg: EMPTY_APP, prestige: false },
      { id: "tableau_bord",        label: "Tableau de bord admin",                emptyMsg: EMPTY_APP, prestige: false },
      { id: "centre_controle",     label: "Centre de contrôle et alertes",        emptyMsg: EMPTY_APP, prestige: true },
      { id: "tableau_analytique",  label: "Lecture du tableau analytique",         emptyMsg: EMPTY_APP, prestige: true },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNouveauBadge(d: DocItem): boolean {
  if (d.nouveauJusquau && d.nouveauJusquau > new Date()) return true;
  if (!d.nouveauJusquau) {
    const diff = Date.now() - d.publishedAt.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }
  return false;
}

function statutColor(s: string): { bg: string; color: string } {
  if (s === "Bientôt disponible") return { bg: "#F0FDF4", color: "#166534" };
  if (s === "En développement")   return { bg: "#EFF6FF", color: "#1D4ED8" };
  return { bg: "#F9FAFB", color: "#374151" };
}

// ─── Badge "Nouveau" ──────────────────────────────────────────────────────────

function NouveauBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: "#FEF9C3", color: "#854D0E", border: "1px solid #FDE68A",
      flexShrink: 0,
    }}>
      Nouveau
    </span>
  );
}

// ─── Rendu d'un document ──────────────────────────────────────────────────────

function DocCard({ d }: { d: DocItem }) {
  const isNv = isNouveauBadge(d);

  if (d.type === "video") {
    // Détecter YouTube
    const ytMatch = d.url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
    return (
      <div style={{ marginBottom: 16, padding: "16px 18px", background: "#F9FAFB", borderRadius: 12, border: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Video size={14} color="#6B7280" />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>{d.titre}</p>
          {isNv && <NouveauBadge />}
        </div>
        {d.description && <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 12px" }}>{d.description}</p>}
        {ytMatch ? (
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytMatch[1]}`}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video controls src={d.url} style={{ width: "100%", borderRadius: 8, maxHeight: 320 }} />
        )}
      </div>
    );
  }

  if (d.type === "fonctionnalite") {
    const sc = statutColor(d.statut ?? "Planifié");
    return (
      <div style={{ marginBottom: 10, padding: "14px 18px", background: "#F9FAFB", borderRadius: 11, border: "1px solid #F3F4F6", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Clock size={16} color="#6B7280" style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>{d.titre}</p>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, ...sc }}>{d.statut ?? "Planifié"}</span>
          </div>
          {d.description && <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>{d.description}</p>}
        </div>
      </div>
    );
  }

  // PDF ou Lien
  return (
    <div style={{ marginBottom: 10, padding: "13px 18px", background: "#F9FAFB", borderRadius: 11, border: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 12 }}>
      {d.type === "pdf" ? <FileText size={16} color="#6B7280" style={{ flexShrink: 0 }} /> : <ExternalLink size={16} color="#6B7280" style={{ flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.titre}</p>
          {isNv && <NouveauBadge />}
        </div>
        {d.description && <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>{d.description}</p>}
      </div>
      <a
        href={d.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "#0362E3", color: "#fff", textDecoration: "none", flexShrink: 0,
        }}
      >
        {d.type === "pdf" ? "Télécharger" : "Ouvrir →"}
      </a>
    </div>
  );
}

// ─── Bloc sous-section ────────────────────────────────────────────────────────

function SubsectionBlock({ label, emptyMsg, docs }: { label: string; emptyMsg: string; docs: DocItem[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>
        {label}
      </p>
      {docs.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", lineHeight: 1.6 }}>{emptyMsg}</p>
      ) : (
        docs.map(d => <DocCard key={d.id} d={d} />)
      )}
    </div>
  );
}

// ─── Bloc catégorie (fermable, ouvert par défaut) ─────────────────────────────

function CatCard({
  label, icon, iconBg, count, children,
}: {
  label: string; icon: React.ReactNode; iconBg: string;
  count: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden",
    }}>
      {/* En-tête cliquable */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icon}
          </span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: "0 0 1px" }}>{label}</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
              {count} élément{count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp   size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
          : <ChevronDown size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />}
      </button>
      {/* Contenu */}
      {open && (
        <div style={{ padding: "0 24px 20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── FAQ Accordéon ────────────────────────────────────────────────────────────

function FaqAccordion({ questions }: { questions: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (questions.length === 0) {
    return <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>Aucune question fréquente pour l'instant.</p>;
  }

  return (
    <div>
      {questions.map(q => {
        const isOpen = openId === q.id;
        return (
          <div key={q.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
            <button
              onClick={() => setOpenId(isOpen ? null : q.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>{q.question}</p>
              {isOpen ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
            </button>
            {isOpen && (
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 14px", paddingRight: 24 }}>{q.reponse}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function DocumentationPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);

  const [docs,       setDocs]       = useState<DocItem[]>([]);
  const [faq,        setFaq]        = useState<FaqItem[]>([]);
  const [customCats, setCustomCats] = useState<CustomCat[]>([]);
  const [forfait,    setForfait]    = useState("");
  const [loading,    setLoading]    = useState(true);

  const isPrestige = forfait.toLowerCase() === "prestige";

  useEffect(() => {
    // Forfait du client
    getDoc(doc(db, "clients", clientId)).then(snap => {
      if (snap.exists()) setForfait(snap.data().forfait ?? "");
    });

    // Documents (sous-collection → accessible avec anon auth)
    const unsub = onSnapshot(collection(db, "clients", clientId, "documentation"), snap => {
      setDocs(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          titre:        data.titre ?? "",
          description:  data.description ?? "",
          categorie:    data.categorie ?? "",
          sousSection:  data.sousSection ?? "",
          type:         data.type ?? "pdf",
          url:          data.url ?? "",
          prestige:     data.prestige ?? false,
          postLancement:data.postLancement ?? false,
          publishedAt:  data.publishedAt instanceof Timestamp ? data.publishedAt.toDate() : new Date(),
          nouveauJusquau: data.nouveauJusquau instanceof Timestamp ? data.nouveauJusquau.toDate() : undefined,
          statut:       data.statut ?? undefined,
        };
      }));
      setLoading(false);
    });

    // FAQ & structure (root admin_config → API route)
    fetch("/api/client/faq").then(r => r.json()).then(({ questions }) => setFaq(questions ?? [])).catch(() => {});
    fetch("/api/client/doc-structure").then(r => r.json()).then(({ categories }) => setCustomCats(categories ?? [])).catch(() => {});

    return unsub;
  }, [clientId]);

  // Filtre : doc visible si prestige OK et postLancement OK (pour simplifier côté client, on affiche tout)
  function docsFor(cat: string, ss: string) {
    return docs.filter(d =>
      d.categorie === cat &&
      d.sousSection === ss &&
      (isPrestige || !d.prestige)
    );
  }
  function docsForCat(cat: string) {
    return docs.filter(d => d.categorie === cat && (isPrestige || !d.prestige));
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 48px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px" }}>Documentation</h1>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Guides, ressources et références pour votre application.</p>
          </div>
          <TourSectionButton section="documentation" />
        </div>

        {/* Catégorie 1 — Démarrage */}
        <div data-tour-id="documentation-categories">
          <CatCard label="Démarrage" icon={<Sparkles size={16} color="#0362E3" />} iconBg="#EFF6FF" count={docsForCat("demarrage").length}>
            {STATIC_STRUCTURE[0].soussections.map(ss => (
              <SubsectionBlock key={ss.id} label={ss.label} emptyMsg={ss.emptyMsg} docs={docsFor("demarrage", ss.id)} />
            ))}
            {customCats.find(c => c.id === "demarrage")?.soussections.map(ss => (
              <SubsectionBlock key={ss.id} label={ss.nom} emptyMsg="Aucun document disponible pour l'instant." docs={docsFor("demarrage", ss.id)} />
            ))}
          </CatCard>
        </div>

        {/* Catégorie 2 — Guides d'utilisation */}
        <CatCard label="Guides d'utilisation" icon={<FileText size={16} color="#059669" />} iconBg="#F0FDF4" count={docsForCat("guides").length}>
          {STATIC_STRUCTURE[1].soussections
            .filter(ss => isPrestige || !ss.prestige)
            .map(ss => (
              <SubsectionBlock key={ss.id} label={ss.label} emptyMsg={ss.emptyMsg} docs={docsFor("guides", ss.id)} />
            ))}
          {customCats.find(c => c.id === "guides")?.soussections.map(ss => (
            <SubsectionBlock key={ss.id} label={ss.nom} emptyMsg="Aucun document disponible pour l'instant." docs={docsFor("guides", ss.id)} />
          ))}
        </CatCard>

        {/* Catégorie 3 — Vidéos tutorielles */}
        <CatCard label="Vidéos tutorielles" icon={<Video size={16} color="#7C3AED" />} iconBg="#FAF5FF" count={docsForCat("videos").length}>
          {docsForCat("videos").length === 0 ? (
            <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", lineHeight: 1.6 }}>
              Les vidéos tutorielles seront disponibles dès que votre application sera terminée.
            </p>
          ) : (
            docsForCat("videos").map(d => <DocCard key={d.id} d={d} />)
          )}
        </CatCard>

        {/* Catégorie 4 — Fonctionnalités à venir */}
        <CatCard label="Fonctionnalités à venir" icon={<Layers size={16} color="#F59E0B" />} iconBg="#FFFBEB" count={docsForCat("fonctionnalites").length}>
          {docsForCat("fonctionnalites").length === 0 ? (
            <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>
              Aucune fonctionnalité à venir annoncée pour l'instant.
            </p>
          ) : (
            docsForCat("fonctionnalites").map(d => <DocCard key={d.id} d={d} />)
          )}
        </CatCard>

        {/* Catégorie 5 — FAQ */}
        <div data-tour-id="documentation-faq">
          <CatCard label="FAQ" icon={<span style={{ fontSize: 15, fontWeight: 700, color: "#6B7280" }}>?</span>} iconBg="#F9FAFB" count={faq.length}>
            <FaqAccordion questions={faq} />
          </CatCard>
        </div>

        {/* Catégories personnalisées (créées via "Autre") */}
        {customCats
          .filter(c => !["demarrage", "guides", "videos", "fonctionnalites"].includes(c.id))
          .map(cat => (
            <CatCard key={cat.id} label={cat.nom} icon={<FileText size={16} color="#6B7280" />} iconBg="#F9FAFB" count={docsForCat(cat.id).length}>
              {cat.soussections.length === 0 ? (
                docsForCat(cat.id).length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>Aucun document disponible pour l'instant.</p>
                ) : (
                  docsForCat(cat.id).map(d => <DocCard key={d.id} d={d} />)
                )
              ) : (
                cat.soussections.map(ss => (
                  <SubsectionBlock key={ss.id} label={ss.nom} emptyMsg="Aucun document disponible pour l'instant." docs={docsFor(cat.id, ss.id)} />
                ))
              )}
            </CatCard>
          ))}

      </div>
    </div>
  );
}
