"use client";
// Ancienne page /rapports — redirigée vers l'onglet Historique de Données & rapports
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function RapportsRedirect() {
  const router = useRouter();
  const { clientId } = useParams() as { clientId: string };
  useEffect(() => { router.replace(`/client/${clientId}/donnees?tab=historique`); }, [clientId, router]);
  return null;
}
