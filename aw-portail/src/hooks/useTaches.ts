"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { Portee, Priorite, TacheDTO, CommentaireDTO } from "@/config/taches";

export interface StaffMember {
  uid: string;
  prenom: string;
  nom: string;
  courriel: string;
  role: "admin" | "employe";
}

export interface NewTacheInput {
  titre: string;
  description?: string | null;
  portee: Portee;
  assignes?: string[];
  priorite?: Priorite;
  dateEcheance?: string | null;
  heureEcheance?: boolean;
  clientId?: string | null;
  lienType?: string | null;
  lienId?: string | null;
}

export type TacheUpdateInput = Partial<NewTacheInput>;

async function jsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body;
}

/**
 * Toutes les données/actions de la section « À faire », exclusivement via
 * /api/admin/taches* et /api/admin/staff — jamais le SDK Firestore client.
 * Chaque action réussie déclenche un refresh() pour garder l'affichage à jour.
 */
export function useTaches() {
  const [taches, setTaches]   = useState<TacheDTO[]>([]);
  const [staff, setStaff]     = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const myUid = auth.currentUser?.uid ?? null;
  const me = staff.find(s => s.uid === myUid) ?? null;

  const refresh = useCallback(async () => {
    const body = await jsonOrThrow(await fetch("/api/admin/taches"));
    setTaches(body.taches ?? []);
  }, []);

  const loadStaff = useCallback(async () => {
    const body = await jsonOrThrow(await fetch("/api/admin/staff"));
    setStaff(body.staff ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([refresh(), loadStaff()])
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de chargement"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTache(input: NewTacheInput) {
    await jsonOrThrow(await fetch("/api/admin/taches", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
    await refresh();
  }

  async function updateTache(id: string, input: TacheUpdateInput) {
    await jsonOrThrow(await fetch(`/api/admin/taches/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
    await refresh();
  }

  async function completeTache(id: string, input?: { completedAt?: string; commentaire?: string }) {
    await jsonOrThrow(await fetch(`/api/admin/taches/${id}/complete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    }));
    await refresh();
  }

  async function reopenTache(id: string) {
    await jsonOrThrow(await fetch(`/api/admin/taches/${id}/reopen`, { method: "POST" }));
    await refresh();
  }

  async function deleteTache(id: string) {
    await jsonOrThrow(await fetch(`/api/admin/taches/${id}`, { method: "DELETE" }));
    await refresh();
  }

  async function fetchComments(id: string): Promise<CommentaireDTO[]> {
    const body = await jsonOrThrow(await fetch(`/api/admin/taches/${id}/commentaires`));
    return body.commentaires ?? [];
  }

  async function addComment(id: string, texte: string) {
    await jsonOrThrow(await fetch(`/api/admin/taches/${id}/commentaires`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texte }),
    }));
  }

  return {
    taches, staff, me, myUid, loading, error,
    refresh, createTache, updateTache, completeTache, reopenTache, deleteTache,
    fetchComments, addComment,
  };
}
