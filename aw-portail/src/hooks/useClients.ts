"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Client } from "@/types/admin";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clients"), (snap) => {
      const data: Client[] = snap.docs.map((doc) => {
        const d = doc.data();
        const derniere = d.derniereConnexion instanceof Timestamp
          ? d.derniereConnexion.toDate()
          : null;
        const joursInactif = derniere
          ? Math.floor((Date.now() - derniere.getTime()) / 86400000)
          : undefined;
        return {
          id: doc.id,
          clientId: doc.id,
          nom: d.nom ?? "—",
          forfait: d.forfait ?? "Essentiel",
          etapePipeline: d.etapePipeline ?? "Prospect",
          onboardingPct: d.onboardingPct ?? 0,
          derniereConnexion: derniere,
          statutFacture: d.statutFacture ?? "en attente",
          prochaineAction: d.prochaineAction ?? "—",
          montantMensuel: d.montantMensuel ?? 0,
          statut: d.statut ?? "inactif",
          succursales: d.succursales ?? 1,
          dateDebut: d.dateDebut instanceof Timestamp ? d.dateDebut.toDate() : null,
          joursInactif,
        };
      });
      setClients(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { clients, loading };
}
