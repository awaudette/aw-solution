"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { Etape, Recuperable, OrganisationDTO, ContactDTO, InteractionDTO } from "@/config/organisations";

export interface StaffMember {
  uid: string;
  prenom: string;
  nom: string;
  courriel: string;
  role: "admin" | "employe";
}

export interface NewOrganisationInput {
  nom: string;
  secteur?: string | null;
  siteWeb?: string | null;
  adresse?: string | null;
  nombreSuccursales?: number;
  groupeId?: string | null;
  etape?: Etape;
  proprietaire?: string;
  source?: string | null;
  forfaitPressenti?: string | null;
  valeurMensuelleEstimee?: number | null;
  concurrentEnPlace?: string | null;
  prochaineAction?: string | null;
  dateProchaineAction?: string | null;
  datePremierContact?: string | null;
  dateDemo?: string | null;
  datePropositionEnvoyee?: string | null;
  dateNegociation?: string | null;
  dateSignature?: string | null;
  dateLancement?: string | null;
  dateChurn?: string | null;
  motifPerte?: string | null;
  motifPerteDetail?: string | null;
  recuperable?: Recuperable | null;
  dateRelanceSuggeree?: string | null;
  clientId?: string | null;
}

export type OrganisationUpdateInput = Partial<NewOrganisationInput>;

export interface NewContactInput {
  prenom?: string;
  nom?: string;
  role?: string | null;
  courriel?: string | null;
  telephone?: string | null;
  cellulaire?: string | null;
  estDecideur?: boolean;
  notes?: string | null;
}
export type ContactUpdateInput = NewContactInput;

async function jsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body;
}

/**
 * Toutes les données/actions du CRM, exclusivement via /api/admin/organisations*
 * et /api/admin/staff — jamais le SDK Firestore client.
 */
export function useOrganisations() {
  const [organisations, setOrganisations] = useState<OrganisationDTO[]>([]);
  const [staff, setStaff]     = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const myUid = auth.currentUser?.uid ?? null;
  const me = staff.find(s => s.uid === myUid) ?? null;

  const refresh = useCallback(async () => {
    const body = await jsonOrThrow(await fetch("/api/admin/organisations"));
    setOrganisations(body.organisations ?? []);
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

  async function createOrganisation(input: NewOrganisationInput): Promise<string> {
    const body = await jsonOrThrow(await fetch("/api/admin/organisations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
    await refresh();
    return body.id as string;
  }

  async function updateOrganisation(id: string, input: OrganisationUpdateInput) {
    await jsonOrThrow(await fetch(`/api/admin/organisations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
    await refresh();
  }

  async function deleteOrganisation(id: string) {
    await jsonOrThrow(await fetch(`/api/admin/organisations/${id}`, { method: "DELETE" }));
    await refresh();
  }

  async function fetchOrganisation(id: string): Promise<OrganisationDTO> {
    const body = await jsonOrThrow(await fetch(`/api/admin/organisations/${id}`));
    return body.organisation;
  }

  async function fetchContacts(id: string): Promise<ContactDTO[]> {
    const body = await jsonOrThrow(await fetch(`/api/admin/organisations/${id}/contacts`));
    return body.contacts ?? [];
  }

  async function createContact(orgId: string, input: NewContactInput) {
    await jsonOrThrow(await fetch(`/api/admin/organisations/${orgId}/contacts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  }

  async function updateContact(orgId: string, contactId: string, input: ContactUpdateInput) {
    await jsonOrThrow(await fetch(`/api/admin/organisations/${orgId}/contacts/${contactId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  }

  async function deleteContact(orgId: string, contactId: string) {
    await jsonOrThrow(await fetch(`/api/admin/organisations/${orgId}/contacts/${contactId}`, { method: "DELETE" }));
  }

  async function fetchInteractions(orgId: string): Promise<InteractionDTO[]> {
    const body = await jsonOrThrow(await fetch(`/api/admin/organisations/${orgId}/interactions`));
    return body.interactions ?? [];
  }

  async function createInteraction(orgId: string, input: { type: string; texte: string; reaction?: string | null; date?: string | null }) {
    await jsonOrThrow(await fetch(`/api/admin/organisations/${orgId}/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  }

  return {
    organisations, staff, me, myUid, loading, error,
    refresh, createOrganisation, updateOrganisation, deleteOrganisation, fetchOrganisation,
    fetchContacts, createContact, updateContact, deleteContact,
    fetchInteractions, createInteraction,
  };
}
