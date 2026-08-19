"use client";

import { useEffect, useState } from "react";
import {
  doc,
  collection,
  onSnapshot,
  query,
  limit,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { RoadmapEtape } from "@/types/roadmap";
import { db } from "@/lib/firebase";

export interface ClientData {
  nom: string;
  restaurant: string;
  forfait: "Essentiel" | "Prestige";
  statut: string;
  statutApp: string;
  succursales: number;
  montantMensuel: number;
  dateLancement: Date | null;
  dateRenouvellement: Date | null;
  dateEstimeLancement: Date | null;
  prochainerAction: string;
  logo_url: string;
  onboardingPct: number;
  courriel: string;
  contact: string;
  couleur_primaire: string;
  couleur_secondaire: string;
  /** Couleur hero État 1 — définie par AW Solution (ex: "#0A1628"). Fallback: "#0A1628". */
  couleurPortail: string;
  /** Message de bienvenue initial. Vide = card masquée. */
  messagePersonnalise: string;
}

export type { StatutEtape } from "@/types/roadmap";

export interface OnboardingEtape {
  id: string;
  ordre: number;
  nom: string;
  statut: import("@/types/roadmap").StatutEtape;
  dateEstimee: { toDate: () => Date } | null;
  completedAt: { toDate: () => Date } | null;
}

export interface ActiviteItem {
  id: string;
  type: string;
  description: string;
  lien: string;
  date: Date;
  lu: boolean;
  actionRequise: boolean;
  actionCompletee: boolean;
}

export interface MessageItem {
  id: string;
  texte: string;
  auteur: string;
  auteurRole: "client" | "admin";
  date: Date;
  lu: boolean;
  lien?: string;       // slug de redirection (ex: "nouveautes")
  typeMsg?: string;    // "nouveaute" | "mise_a_jour" | undefined
}

export function useClientData(clientId: string) {
  const [client, setClient]     = useState<ClientData | null>(null);
  const [etapes, setEtapes]     = useState<OnboardingEtape[]>([]);
  const [activite, setActivite] = useState<ActiviteItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [annonce, setAnnonce]   = useState<string>("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const unsubClient = onSnapshot(doc(db, "clients", clientId), (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const d = snap.data();
      const toDate = (v: unknown) =>
        v instanceof Timestamp ? v.toDate() : null;
      setClient({
        nom:                d.nom ?? "",
        restaurant:         d.restaurant ?? d.nom ?? "",
        forfait:            d.forfait === "Prestige" ? "Prestige" : "Essentiel",
        statut:             d.statut ?? "inactif",
        statutApp:          d.statutApp ?? "",
        succursales:        d.succursales ?? 1,
        montantMensuel:     d.montantMensuel ?? 0,
        dateLancement:      toDate(d.dateLancement),
        dateRenouvellement: toDate(d.dateRenouvellement),
        dateEstimeLancement:toDate(d.dateEstimeLancement),
        prochainerAction:   d.prochainerAction ?? d.prochaineAction ?? "",
        logo_url:           d.logo_url ?? "",
        onboardingPct:      d.onboardingPct ?? 0,
        courriel:           d.courriel ?? "",
        contact:            d.contact ?? "",
        couleur_primaire:   d.couleur_primaire ?? "#0362E3",
        couleur_secondaire: d.couleur_secondaire ?? "#0245A3",
        couleurPortail:     d.couleurPortail     ?? "#0A1628",
        messagePersonnalise: d.messagePersonnalise ?? "",
      });
      setLoading(false);
    });

    // Étapes — source unique : clients/{clientId}/roadmap/main
    const unsubEtapes = onSnapshot(
      doc(db, "clients", clientId, "roadmap", "main"),
      (snap) => {
        if (!snap.exists()) { setEtapes([]); return; }
        const raw = (snap.data().etapes ?? []) as RoadmapEtape[];
        setEtapes(raw.map((e, i) => ({
          id:          e.id,
          ordre:       i + 1,
          nom:         e.nom,
          statut:      e.statut,
          dateEstimee: e.dateEstimee ?? null,
          completedAt: e.completedAt ?? null,
        })));
      }
    );

    // Notifications client — sous-collection clients/{clientId}/notifs
    // Filtrée par destinataire=="client" en JS (pas de where composé = pas d'index requis)
    const unsubActivite = onSnapshot(
      query(
        collection(db, "clients", clientId, "notifs"),
        limit(50),
      ),
      (snap) => {
        const items = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id:              d.id,
              type:            data.type            ?? "",
              description:     data.description     ?? "",
              lien:            data.lien             ?? "",
              date:            data.date instanceof Timestamp ? data.date.toDate() : new Date(),
              lu:              data.lu               ?? false,
              actionRequise:   data.actionRequise    ?? false,
              actionCompletee: data.actionCompletee  ?? false,
              destinataire:    data.destinataire     ?? "client",
            };
          })
          .filter((n) => n.destinataire === "client")
          .sort((a, b) => b.date.getTime() - a.date.getTime());
        setActivite(items);
      }
    );

    const unsubMessages = onSnapshot(
      query(collection(db, "clients", clientId, "messages"), orderBy("date", "desc"), limit(5)),
      (snap) => setMessages(snap.docs.map((d) => ({
        id: d.id, texte: d.data().texte ?? "", auteur: d.data().auteur ?? "AW Solution",
        auteurRole: d.data().auteurRole ?? "admin",
        date: d.data().date instanceof Timestamp ? d.data().date.toDate() : new Date(),
        lu: d.data().lu ?? false,
        lien: d.data().lien ?? undefined,
        typeMsg: d.data().typeMsg ?? undefined,
      })))
    );

    // Annonce : via API serveur (admin_config n'est pas lisible directement par les clients)
    fetch("/api/client/annonce")
      .then(r => r.json())
      .then(data => setAnnonce(data.texte ?? ""))
      .catch(() => {});

    return () => {
      unsubClient(); unsubEtapes(); unsubActivite(); unsubMessages();
    };
  }, [clientId]);

  return { client, etapes, activite, messages, annonce, loading };
}
