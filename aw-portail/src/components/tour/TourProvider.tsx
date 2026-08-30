"use client";

/**
 * TourProvider.tsx
 *
 * Source unique des données partagées par les trois déclencheurs de la
 * visite guidée (première connexion, bouton sidebar, bouton par section) :
 * forfait, état de l'accueil (pour filtrer les étapes section:"accueil"),
 * statut "déjà vue" du client courant, et les deux actions de démarrage.
 *
 * Une seule lecture combinée au montage (pas d'écoute live) — évite de
 * refaire ces requêtes dans chacune des pages qui posent un bouton de
 * section. TourEngine consomme ce contexte plutôt que de faire sa propre
 * résolution ; ClientSidebar et TourSectionButton aussi.
 *
 * Le moteur (TourEngine) enregistre ses vraies implémentations de
 * startFullTour/startSectionTour via registerActions() à son montage — le
 * contexte ne fait que les relayer, pour que des composants qui ne sont pas
 * parents/enfants de TourEngine (sidebar, boutons de section) puissent
 * déclencher la visite sans état intermédiaire à synchroniser.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOUR_STEPS } from "@/lib/tourSteps";

// Miroir de detectEtat() dans src/app/client/[clientId]/accueil/page.tsx —
// dupliqué volontairement (page, pas un module exportable). Garder en phase
// si sa logique change un jour.
const ACCUEIL_CLIENT_STEP_IDS = new Set(["signature", "paiement", "branding"]);

function detectAccueilEtat(etapes: { id: string; statut: string }[]): 1 | 2 | 3 {
  if (etapes.length === 0) return 1;
  if (etapes.some((e) => e.id === "lancement" && e.statut === "complete")) return 3;
  const clientEtapes = etapes.filter((e) => ACCUEIL_CLIENT_STEP_IDS.has(e.id));
  const allClientDone = clientEtapes.length > 0 && clientEtapes.every((e) => e.statut === "complete");
  return allClientDone ? 2 : 1;
}

interface TourActions {
  startFullTour: () => void;
  startSectionTour: (section: string) => void;
}

interface TourContextValue {
  clientId: string;
  isPrestige: boolean | null;
  accueilEtat: 1 | 2 | 3 | null;
  tourVu: boolean | null;
  clientLogoUrl: string;
  clientName: string;
  /** true seulement une fois les données résolues et si au moins une étape
   *  de cette section survivrait au filtrage (forfait, état accueil). */
  hasVisibleSteps: (section: string) => boolean;
  markTourSeen: () => void;
  startFullTour: () => void;
  startSectionTour: (section: string) => void;
  /** Appelé par TourEngine à son montage pour brancher ses vraies actions. */
  registerActions: (actions: TourActions) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour() doit être utilisé sous <TourProvider>");
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { clientId } = useParams<{ clientId: string }>();

  const [isPrestige, setIsPrestige]     = useState<boolean | null>(null);
  const [accueilEtat, setAccueilEtat]   = useState<1 | 2 | 3 | null>(null);
  const [tourVu, setTourVu]             = useState<boolean | null>(null);
  const [clientLogoUrl, setClientLogoUrl] = useState("");
  const [clientName, setClientName]       = useState("");

  const actionsRef = useRef<TourActions | null>(null);

  // ── Résolution unique : forfait + infos client + état accueil + statut
  // "visite déjà vue". ──────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    Promise.all([
      getDoc(doc(db, "clients", clientId)),
      getDoc(doc(db, "clients", clientId, "roadmap", "main")),
      fetch(`/api/client/tour-status?clientId=${clientId}`)
        .then((r) => (r.ok ? r.json() : { tourVu: false }))
        .catch(() => ({ tourVu: false })),
    ]).then(([clientSnap, roadmapSnap, statusData]) => {
      if (cancelled) return;

      const data = clientSnap.exists() ? clientSnap.data() : {};
      setIsPrestige((data.forfait ?? "Essentiel") === "Prestige");
      setClientLogoUrl(data.logo_url ?? "");
      setClientName(data.restaurant ?? data.nom ?? "");

      const etapes = roadmapSnap.exists()
        ? ((roadmapSnap.data().etapes ?? []) as { id: string; statut: string }[])
        : [];
      setAccueilEtat(detectAccueilEtat(etapes));

      setTourVu(!!(statusData as { tourVu?: boolean }).tourVu);
    });

    return () => { cancelled = true; };
  }, [clientId]);

  const hasVisibleSteps = useCallback((section: string) => {
    if (isPrestige === null || accueilEtat === null) return false;
    return TOUR_STEPS.some((s) => {
      if (s.section !== section) return false;
      if (s.prestigeSeulement && !isPrestige) return false;
      if (s.section === "accueil" && accueilEtat !== 1) return false;
      return true;
    });
  }, [isPrestige, accueilEtat]);

  const markTourSeen = useCallback(() => {
    if (!clientId) return;
    setTourVu(true);
    fetch(`/api/client/tour-status?clientId=${clientId}`, { method: "POST" }).catch(() => {});
  }, [clientId]);

  const startFullTour = useCallback(() => {
    actionsRef.current?.startFullTour();
  }, []);

  const startSectionTour = useCallback((section: string) => {
    actionsRef.current?.startSectionTour(section);
  }, []);

  const registerActions = useCallback((actions: TourActions) => {
    actionsRef.current = actions;
  }, []);

  const value: TourContextValue = {
    clientId, isPrestige, accueilEtat, tourVu, clientLogoUrl, clientName,
    hasVisibleSteps, markTourSeen, startFullTour, startSectionTour, registerActions,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
