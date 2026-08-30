"use client";

/**
 * TourSectionButton.tsx
 *
 * Bouton discret, à poser dans l'en-tête de chaque page — relance la visite
 * guidée depuis la première étape de `section` uniquement. Se rend
 * lui-même invisible (retourne null) si aucune étape de cette section ne
 * survivrait au filtrage actuel (forfait, état de l'accueil) : jamais un
 * bouton visible qui ne mènerait nulle part.
 */

import { Compass } from "lucide-react";
import { useTour } from "./TourProvider";

export function TourSectionButton({ section }: { section: string }) {
  const tour = useTour();
  if (!tour.hasVisibleSteps(section)) return null;

  return (
    <button
      onClick={() => tour.startSectionTour(section)}
      title="Revoir la visite de cette section"
      aria-label="Revoir la visite de cette section"
      style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        border: "1px solid #E5E7EB", background: "#fff", color: "#6B7280",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 150ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#F9FAFB";
        (e.currentTarget as HTMLElement).style.color = "#0362E3";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#fff";
        (e.currentTarget as HTMLElement).style.color = "#6B7280";
      }}
    >
      <Compass size={14} />
    </button>
  );
}
