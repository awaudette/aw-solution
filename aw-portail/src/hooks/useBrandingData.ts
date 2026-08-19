"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandingMain } from "@/types/branding";

export function useBrandingData(clientId: string) {
  const [main, setMain] = useState<Partial<BrandingMain>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "clients", clientId, "branding", "main"),
      (snap) => {
        setMain(snap.exists() ? (snap.data() as BrandingMain) : {});
        setLoading(false);
      }
    );
    return unsub;
  }, [clientId]);

  const completedSections: string[] = Array.isArray(main.completedSections)
    ? main.completedSections
    : [];

  return { main, completedSections, loading };
}
