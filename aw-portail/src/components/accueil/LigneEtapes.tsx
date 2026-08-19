"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import type { OnboardingEtape } from "@/hooks/useClientData";

// ─── Navigation par ID d'étape ────────────────────────────────────────────────
// Correspondance exacte : ID roadmap/main → slug de page client

const SLUG_BY_ID: Record<string, string> = {
  signature:         "contrat",
  paiement:          "paiement",
  branding:          "branding",
  design:            "roadmap",
  developpement:     "roadmap",
  rencontre:         "roadmap",
  ajustements:       "roadmap",
  tests:             "roadmap",
  soumission:        "roadmap",
  formation:         "documentation", // formation + materiel → même lien
  materiel:          "documentation",
  config_succursale: "roadmap",
  lancement:         "roadmap",
  suivi:             "roadmap",
};

function getSlug(id: string): string {
  return SLUG_BY_ID[id] ?? "roadmap";
}

// ─── Fusion formation + materiel ──────────────────────────────────────────────

/**
 * Construit la liste de display : formation et materiel sont fusionnées
 * en une seule étape "Formation et matériel de lancement".
 * Le statut combiné : complete seulement si les deux sont complete ;
 * sinon en_cours si l'un est en_cours ; sinon bloque si l'un est bloque ;
 * sinon a_faire si l'un est a_faire ; sinon a_venir.
 */
function buildDisplayEtapes(etapes: OnboardingEtape[]): {
  id: string; ordre: number; nom: string; statut: OnboardingEtape["statut"];
}[] {
  const result: { id: string; ordre: number; nom: string; statut: OnboardingEtape["statut"] }[] = [];
  let displayOrdre = 1;

  for (const e of etapes) {
    if (e.id === "materiel") continue; // absorbé dans formation

    if (e.id === "formation") {
      // Chercher materiel dans les etapes
      const materiel = etapes.find((x) => x.id === "materiel");
      let statut = e.statut;
      if (materiel) {
        const both: OnboardingEtape["statut"][] = [e.statut, materiel.statut];
        if (both.every((s) => s === "complete")) statut = "complete";
        else if (both.some((s) => s === "en_cours")) statut = "en_cours";
        else if (both.some((s) => s === "bloque")) statut = "bloque";
        else if (both.some((s) => s === "a_faire")) statut = "a_faire";
        else statut = "a_venir";
      }
      result.push({ id: "formation", ordre: displayOrdre++, nom: "Formation et matériel de lancement", statut });
      continue;
    }

    result.push({ id: e.id, ordre: displayOrdre++, nom: e.nom, statut: e.statut });
  }

  return result;
}

// ─── Composant ──────────────────────────────────────────────────────────────

interface LigneEtapesProps {
  clientId: string;
  etapes: OnboardingEtape[];
  couleur: string;
}

export function LigneEtapes({ clientId, etapes, couleur }: LigneEtapesProps) {
  if (etapes.length === 0) return null;

  const display = buildDisplayEtapes(etapes);
  const completedCount = display.filter((e) => e.statut === "complete").length;

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #F3F4F6",
      borderRadius: 16,
      padding: "24px 28px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>
          Déploiement de votre application
        </p>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
          {completedCount} / {display.length} étapes
        </p>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 5, background: "#F3F4F6", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${Math.round(completedCount / display.length * 100)}%`,
          background: couleur,
          borderRadius: 3,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Étapes horizontales */}
      <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 4 }}>
        {display.map((etape, i) => {
          const done    = etape.statut === "complete";
          const current = etape.statut === "en_cours";
          const blocked = etape.statut === "bloque";
          const slug    = getSlug(etape.id);

          const leftColor  = i === 0 ? "transparent" : (done ? couleur : "#E5E7EB");
          const rightColor = i === display.length - 1 ? "transparent"
            : (display[i + 1]?.statut === "complete" ? couleur : "#E5E7EB");

          const circleStyle: React.CSSProperties = {
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: done ? couleur : current ? "#fff" : blocked ? "#FEF2F2" : "#F3F4F6",
            border: `2px solid ${done ? couleur : current ? couleur : blocked ? "#FCA5A5" : "#E5E7EB"}`,
            cursor: "pointer",
          };

          return (
            <Link
              key={etape.id}
              href={`/client/${clientId}/${slug}`}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none", minWidth: 60 }}
              title={etape.nom}
            >
              {/* Cercle + connecteurs */}
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                <div style={{ flex: 1, height: 2, background: leftColor }} />
                <div style={circleStyle}>
                  {done    && <Check size={12} color="#fff" strokeWidth={2.5} />}
                  {current && <span style={{ width: 7, height: 7, borderRadius: "50%", background: couleur, animation: "pulse 1.4s ease-in-out infinite" }} />}
                  {blocked && <X size={12} color="#EF4444" strokeWidth={2} />}
                  {!done && !current && !blocked && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF" }}>{etape.ordre}</span>
                  )}
                </div>
                <div style={{ flex: 1, height: 2, background: rightColor }} />
              </div>

              {/* Label */}
              <p style={{
                fontSize: 9.5,
                textAlign: "center",
                margin: "5px 0 0",
                color: done ? "#166534" : current ? couleur : "#9CA3AF",
                fontWeight: done || current ? 600 : 400,
                lineHeight: 1.3,
                maxWidth: "90%",
                wordBreak: "break-word",
              }}>
                {etape.nom}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
