"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, FileText, Download } from "lucide-react";
import { TourSectionButton } from "@/components/tour/TourSectionButton";

interface Nouveaute {
  id: string;
  titre: string;
  contenu: string;
  type: "nouveaute" | "mise_a_jour";
  destinataires: "tous" | string[];
  date: number;
  fichierUrl: string | null;
  fichierNom: string | null;
  fichierType: string | null;
}

const CSS = `@keyframes spin { to { transform: rotate(360deg); } }`;

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("fr-CA", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function TypeTag({ type }: { type: "nouveaute" | "mise_a_jour" }) {
  return type === "nouveaute"
    ? (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
        background: "#FDF4FF", color: "#9333EA", border: "1px solid #E9D5FF",
      }}>
        Nouveauté
      </span>
    ) : (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
        background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE",
      }}>
        Mise à jour
      </span>
    );
}

function FichierBloc({
  url, nom, type,
}: {
  url: string; nom: string | null; type: string | null;
}) {
  const isImage = type?.startsWith("image/");
  return isImage ? (
    <div style={{ marginTop: 14 }}>
      <img
        src={url}
        alt={nom ?? "Image"}
        style={{ maxWidth: "100%", borderRadius: 10, border: "1px solid #F3F4F6" }}
      />
    </div>
  ) : (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14,
        padding: "9px 14px", borderRadius: 9,
        background: "#F8FAFF", border: "1px solid #BFDBFE",
        color: "#1D4ED8", textDecoration: "none", fontSize: 13, fontWeight: 600,
      }}
    >
      <FileText size={14} />
      {nom ?? "Fichier joint"}
      <Download size={13} />
    </a>
  );
}

function NouveauteCard({ item, clientId }: { item: Nouveaute; clientId: string }) {
  useEffect(() => {
    fetch("/api/client/nouveautes/vue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nouveauteId: item.id, clientId }),
    }).catch(() => {});
  }, [item.id, clientId]);

  return (
    <div style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 14,
      padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10,
      }}>
        <TypeTag type={item.type} />
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{formatDate(item.date)}</span>
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: "0 0 8px" }}>
        {item.titre}
      </p>
      <p style={{
        fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.75, whiteSpace: "pre-line",
      }}>
        {item.contenu}
      </p>
      {item.fichierUrl && (
        <FichierBloc url={item.fichierUrl} nom={item.fichierNom} type={item.fichierType} />
      )}
    </div>
  );
}

export default function NouveautesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [tab,     setTab]     = useState<"nouveaute" | "mise_a_jour">("nouveaute");
  const [items,   setItems]   = useState<Nouveaute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    fetch(`/api/client/nouveautes/${clientId}`)
      .then(r => r.json())
      .then(data => { setItems(data.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId]);

  const filtered = items.filter(i => i.type === tab);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <style>{CSS}</style>
      <div data-tour-id="nouveautes-fil" style={{ maxWidth: 720, margin: "0 auto", padding: "0 32px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px" }}>
              Mises à jour & Nouveautés
            </h1>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
              Les dernières améliorations et fonctionnalités de votre plateforme AW Solution
            </p>
          </div>
          <TourSectionButton section="nouveautes" />
        </div>

        {/* Onglets */}
        <div style={{
          display: "flex", gap: 4, background: "#F3F4F6",
          borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content",
        }}>
          {([
            { key: "nouveaute",   label: "Nouveautés",   color: "#9333EA", activeBg: "#FDF4FF" },
            { key: "mise_a_jour", label: "Mises à jour", color: "#1D4ED8", activeBg: "#EFF6FF" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 150ms",
                background: tab === t.key ? "#fff" : "transparent",
                color: tab === t.key ? t.color : "#6B7280",
                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div style={{
              width: 20, height: 20, border: "2px solid #0362E3",
              borderTopColor: "transparent", borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: "#fff", border: "1px solid #F3F4F6",
            borderRadius: 14, padding: "40px 24px", textAlign: "center",
          }}>
            {tab === "nouveaute"
              ? <Sparkles size={28} color="#E9D5FF" style={{ margin: "0 auto 12px" }} />
              : <RefreshCw size={28} color="#BFDBFE" style={{ margin: "0 auto 12px" }} />
            }
            <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>
              {tab === "nouveaute"
                ? "Aucune nouveauté pour le moment"
                : "Aucune mise à jour pour le moment"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(item => (
              <NouveauteCard key={item.id} item={item} clientId={clientId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
