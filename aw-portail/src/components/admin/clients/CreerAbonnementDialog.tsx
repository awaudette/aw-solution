"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface PriceOption {
  id: string;
  nom: string;
  montant: number | null;
  devise: string;
}

interface AbonnementActif {
  id: string;
  statut: string;
  nom: string | null;
  prix: number | null;
  devise: string;
  dateProchaineFacture: string | null;
}

interface EtatAbonnement {
  hasStripeCustomer: boolean;
  subscription: AbonnementActif | null;
  prices: PriceOption[];
}

function formatMontant(montant: number | null, devise: string): string {
  return montant != null ? `${montant.toFixed(2)} $ ${devise}` : "—";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Modale de création de l'abonnement Stripe d'un client, depuis la fiche
 * client admin. Recharge l'état à l'ouverture pour afficher l'abonnement
 * existant s'il y en a déjà un (empêche un double-clic de tenter d'en créer
 * un deuxième — la route refuse de toute façon avec 409).
 */
export function CreerAbonnementDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [etat, setEtat] = useState<EtatAbonnement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceId, setPriceId] = useState("");
  const [demarrageImmediat, setDemarrageImmediat] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/stripe/abonnement`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement");
        if (annule) return;
        setEtat(data);
        if (data.prices?.length) setPriceId(data.prices[0].id);
      } catch (e) {
        if (!annule) setError(e instanceof Error ? e.message : "Erreur lors du chargement");
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => { annule = true; };
  }, [clientId]);

  async function handleConfirmer() {
    if (!priceId || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/stripe/abonnement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, demarrageImmediat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création de l'abonnement");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création de l'abonnement");
      setConfirming(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer l&apos;abonnement</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : etat?.subscription ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">Un abonnement existe déjà pour ce client :</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
              <div>Prix : <span className="font-medium text-gray-800">{etat.subscription.nom ?? "—"} — {formatMontant(etat.subscription.prix, etat.subscription.devise)}/mois</span></div>
              <div>Statut : <span className="font-medium text-gray-800">{etat.subscription.statut}</span></div>
              <div>Prochain prélèvement : <span className="font-medium text-gray-800">{formatDate(etat.subscription.dateProchaineFacture)}</span></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Prix</label>
              <select
                value={priceId}
                onChange={(e) => setPriceId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {etat?.prices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} — {formatMontant(p.montant, p.devise)}/mois
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Démarrage</label>
              <select
                value={demarrageImmediat ? "immediat" : "suivant"}
                onChange={(e) => setDemarrageImmediat(e.target.value === "immediat")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="suivant">1er du mois suivant</option>
                <option value="immediat">Immédiat</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            {etat?.subscription ? "Fermer" : "Annuler"}
          </button>
          {!loading && !etat?.subscription && (
            <button
              onClick={handleConfirmer}
              disabled={!priceId || confirming}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-2"
            >
              {confirming && <Loader2 size={14} className="animate-spin" />}
              Confirmer
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
