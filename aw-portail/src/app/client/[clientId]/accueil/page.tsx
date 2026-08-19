"use client";

import { use } from "react";
import { useClientData } from "@/hooks/useClientData";
import { AccueilOnboarding }   from "@/components/accueil/AccueilOnboarding";
import { AccueilConstruction } from "@/components/accueil/AccueilConstruction";
import { AccueilActif }        from "@/components/accueil/AccueilActif";
import type { OnboardingEtape } from "@/hooks/useClientData";

// ─── Détection d'état ────────────────────────────────────────────────────────

/**
 * État 1 — Onboarding en cours
 *   Les étapes client (contrat, paiement, branding) ne sont pas toutes complétées.
 *
 * État 2 — Onboarding terminé, app en construction
 *   Les étapes client sont complétées mais l'étape "Lancement" ne l'est pas.
 *
 * État 3 — App lancée
 *   L'étape "Lancement" est complétée.
 */
type Etat = 1 | 2 | 3;

// IDs des étapes client (pas AW Solution) — doit correspondre aux IDs de roadmap/main
const CLIENT_STEP_IDS = new Set(["signature", "paiement", "branding"]);

function detectEtat(etapes: OnboardingEtape[]): Etat {
  if (etapes.length === 0) return 1;

  // État 3 : l'étape "lancement" est complète
  if (etapes.some((e) => e.id === "lancement" && e.statut === "complete")) return 3;

  // État 2 : les étapes client (signature + paiement + branding) sont toutes complètes
  const clientEtapes = etapes.filter((e) => CLIENT_STEP_IDS.has(e.id));
  const allClientDone =
    clientEtapes.length > 0 && clientEtapes.every((e) => e.statut === "complete");

  return allClientDone ? 2 : 1;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AccueilPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const { client, etapes, activite, messages, loading } = useClientData(clientId);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "#9CA3AF" }}>Client introuvable.</p>
      </div>
    );
  }

  const etat = detectEtat(etapes);
  const props = { clientId, client, etapes, activite, messages };

  if (etat === 3) return <AccueilActif        {...props} />;
  if (etat === 2) return <AccueilConstruction {...props} />;
  return                  <AccueilOnboarding  {...props} />;
}
