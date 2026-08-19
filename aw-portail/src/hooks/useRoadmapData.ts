"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RoadmapMain, RoadmapEtape } from "@/types/roadmap";

export const ETAPES_INIT: Pick<RoadmapEtape, "id" | "nom">[] = [
  { id: "signature",         nom: "Signature" },
  { id: "paiement",          nom: "Configuration paiement" },
  { id: "branding",          nom: "Branding" },
  { id: "design",            nom: "Design" },
  { id: "developpement",     nom: "Développement" },
  { id: "rencontre",         nom: "Rencontre de validation" },
  { id: "ajustements",       nom: "Ajustements" },
  { id: "tests",             nom: "Tests & Validation" },
  { id: "soumission",        nom: "Soumission App Store et Google Play" },
  { id: "formation",         nom: "Formation" },
  { id: "config_succursale", nom: "Configuration succursale" },
  { id: "materiel",          nom: "Conception matériel de lancement" },
  { id: "lancement",         nom: "Lancement 🚀" },
  { id: "suivi",             nom: "Suivi post-lancement" },
];

export function useRoadmapData(clientId: string) {
  const [roadmap, setRoadmap] = useState<RoadmapMain | null>(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    const ref = doc(db, "clients", clientId, "roadmap", "main");
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        setRoadmap(snap.data() as RoadmapMain);
      } else {
        const initial: RoadmapMain = {
          etapes: ETAPES_INIT.map(e => ({
            ...e,
            statut:      "a_venir",
            dateDebut:   null,
            dateFin:     null,
            dateEstimee: null,
            completedAt: null,
          })),
          dateLancementEstimee: null,
          dateCreation:         Timestamp.now(),
          introVue:             false,
        };
        await setDoc(ref, initial);
      }
      setLoading(false);
    });
    return unsub;
  }, [clientId]);

  return { roadmap, loading };
}
