"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc, onSnapshot, addDoc, collection, Timestamp,
  getDoc, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  CreditCard, Loader2, Download, ChevronLeft, ChevronRight,
  Star, Check, X, Calendar, Eye, Pencil, Plus,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

// ─── Données forfaits ─────────────────────────────────────────────────────────

const FORFAIT_FEATURES: Array<{
  category: string;
  items: Array<{ label: string; essentiel: boolean }>;
}> = [
  {
    category: "FIDÉLISATION & RÉCOMPENSES",
    items: [
      { label: "Système de points",                       essentiel: true  },
      { label: "Catalogue de récompenses",                 essentiel: true  },
      { label: "Roue bonus quotidienne",                   essentiel: true  },
      { label: "Codes promo partenaires",                  essentiel: true  },
      { label: "Carte membre à code-barres",               essentiel: true  },
      { label: "Programme de parrainage",                  essentiel: false },
    ],
  },
  {
    category: "ENGAGEMENT CLIENT",
    items: [
      { label: "Promotions et offres ciblées",             essentiel: true  },
      { label: "Popup vedette au lancement",               essentiel: true  },
      { label: "Notifications push",                       essentiel: true  },
      { label: "Anniversaire — récompense automatique",    essentiel: false },
      { label: "Sondages et avis in-app",                  essentiel: false },
    ],
  },
  {
    category: "PLATEFORME & ADMINISTRATION",
    items: [
      { label: "Application iOS et Android à votre image", essentiel: true },
      { label: "Design unique par restaurant",              essentiel: true },
      { label: "Multi-succursale",                         essentiel: true },
      { label: "Panneau d'administration",                 essentiel: true },
      { label: "Intégration POS (Lightspeed, etc.) — sur demande", essentiel: true },
    ],
  },
  {
    category: "CRM & INTELLIGENCE CLIENT",
    items: [
      { label: "Fiche client détaillée",                     essentiel: false },
      { label: "Segmentation comportementale automatique",   essentiel: false },
      { label: "Score de fidélité",                          essentiel: false },
    ],
  },
  {
    category: "AUTOMATISATION — CENTRE DE CONTRÔLE",
    items: [
      { label: "Alertes automatisées quotidiennes",          essentiel: false },
      { label: "Messages prêts à envoyer, ciblés par segment", essentiel: false },
      { label: "Campagnes en 3 étapes",                     essentiel: false },
    ],
  },
  {
    category: "ANALYTIQUE & RAPPORTS",
    items: [
      { label: "Tableau de bord (vue d'ensemble, membres)", essentiel: true  },
      { label: "Analytique 7/30/90 jours",                 essentiel: false },
      { label: "Revenus attribués aux promotions",          essentiel: false },
      { label: "Rapport de performance mensuel",            essentiel: false },
      { label: "Vue consolidée multi-succursales",          essentiel: false },
    ],
  },
  {
    category: "SUPPORT & ACCOMPAGNEMENT",
    items: [
      { label: "Accès direct et personnel, en tout temps", essentiel: true  },
      { label: "Matériel de lancement fourni",             essentiel: true  },
      { label: "Rencontre stratégique mensuelle",           essentiel: false },
    ],
  },
];

const UPSELL_FEATURES: Array<{ category: string; items: string[] }> = [
  {
    category: "ENGAGEMENT AVANCÉ",
    items: [
      "Programme de parrainage",
      "Anniversaire — récompense automatique",
      "Sondages et avis in-app",
    ],
  },
  {
    category: "CRM & INTELLIGENCE CLIENT",
    items: [
      "Fiche client détaillée",
      "Segmentation comportementale automatique",
      "Score de fidélité",
    ],
  },
  {
    category: "AUTOMATISATION — CENTRE DE CONTRÔLE",
    items: [
      "Alertes automatisées quotidiennes",
      "Messages prêts à envoyer, ciblés par segment",
      "Campagnes en 3 étapes",
    ],
  },
  {
    category: "ANALYTIQUE & RAPPORTS",
    items: [
      "Analytique 7/30/90 jours",
      "Revenus attribués aux promotions",
      "Rapport de performance mensuel",
      "Vue consolidée multi-succursales",
    ],
  },
  {
    category: "SUPPORT PRIORITAIRE",
    items: ["Rencontre stratégique mensuelle"],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientInfo {
  nom: string;
  forfait: "Essentiel" | "Prestige";
  succursales: number;
  montantMensuel: number | null;
  prixParSuccursale: number | null;
  dateDebut: Date | null;
  stripeCustomerId: string | null;
}

interface StripeAbonnement {
  statut: string;
  dateDebut: string;
  dateProchaineFacture: string;
  produit: string | null;
  prix: number | null;
  devise: string;
}

interface StripeFacture {
  numero: string;
  montant: number;
  devise: string;
  date: string | null;
  statut: string | null;
  urlPDF: string | null;
}

interface CarteInfo {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  return null;
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

function formatMontant(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "0,00 $";
  return v.toLocaleString("fr-CA") + " $";
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function formatBrand(brand: string): string {
  const map: Record<string, string> = {
    visa: "Visa", mastercard: "Mastercard", amex: "American Express",
    discover: "Discover", jcb: "JCB", diners: "Diners Club", unionpay: "UnionPay",
  };
  return map[brand.toLowerCase()] ?? brand;
}

function formatExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, "0")} / ${String(year).slice(-2)}`;
}

const PAGE_SIZE = 5;

// ─── CardSetupForm ────────────────────────────────────────────────────────────

function CardSetupForm({
  customerId,
  onSuccess,
  onCancel,
}: {
  customerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/setup-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Formulaire introuvable");

      const { error: stripeError } = await stripe.confirmCardSetup(data.client_secret, {
        payment_method: { card: cardElement },
      });
      if (stripeError) throw new Error(stripeError.message);

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <div className="p-3.5 border border-gray-200 rounded-xl bg-gray-50">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "15px",
                color: "#374151",
                fontFamily: "system-ui, -apple-system, sans-serif",
                "::placeholder": { color: "#9CA3AF" },
              },
              invalid: { color: "#EF4444" },
            },
          }}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0362E3] text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Enregistrer la carte
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaiementPage() {
  const { clientId } = useParams<{ clientId: string }>();

  const [clientInfo, setClientInfo]       = useState<ClientInfo | null | undefined>(undefined);
  const [abonnement, setAbonnement]       = useState<StripeAbonnement | null>(null);
  const [factures, setFactures]           = useState<StripeFacture[]>([]);
  const [carte, setCarte]                 = useState<CarteInfo | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  const [forfaitDialog, setForfaitDialog]   = useState(false);
  const [upsellOpen, setUpsellOpen]         = useState(false);
  const [upsellLoading, setUpsellLoading]   = useState(false);
  const [upsellDone, setUpsellDone]         = useState(false);
  const [cardDialog, setCardDialog]         = useState(false);

  const [factPage, setFactPage] = useState(0);

  // Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", clientId), (snap) => {
      if (!snap.exists()) { setClientInfo(null); return; }
      const d = snap.data();
      setClientInfo({
        nom:               d.nom ?? "",
        forfait:           d.forfait === "Prestige" ? "Prestige" : "Essentiel",
        succursales:       d.succursales ?? 1,
        montantMensuel:    d.montantMensuel != null ? d.montantMensuel : null,
        prixParSuccursale: d.prixParSuccursale != null ? d.prixParSuccursale : null,
        dateDebut:         toDate(d.dateDebut) ?? toDate(d.dateLancement),
        stripeCustomerId:  d.stripeCustomerId ?? null,
      });
    });
    return () => unsub();
  }, [clientId]);

  // Stripe data
  const fetchStripeData = useCallback(async (customerId: string) => {
    setStripeLoading(true);
    try {
      const res  = await fetch(`/api/stripe/customer?customerId=${customerId}`);
      const data = await res.json();
      setAbonnement(data.subscription ?? null);
      setFactures(data.invoices ?? []);
      setCarte(data.paymentMethods ?? null);
    } catch {}
    finally { setStripeLoading(false); }
  }, []);

  useEffect(() => {
    if (clientInfo?.stripeCustomerId) fetchStripeData(clientInfo.stripeCustomerId);
  }, [clientInfo?.stripeCustomerId, fetchStripeData]);

  // Après ajout de carte
  async function handleCardSuccess() {
    setCardDialog(false);
    if (clientInfo?.stripeCustomerId) fetchStripeData(clientInfo.stripeCustomerId);
    try {
      await createNotification({
        type: "paiement_configure", destinataire: "admin",
        clientId, clientNom: clientInfo?.nom ?? "", auteurRole: "client",
        description: `${clientInfo?.nom ?? ""} a configuré sa méthode de paiement`,
        lien: `/admin/clients/${clientId}?tab=paiement`,
      });
      const roadmapSnap = await getDoc(doc(db, "clients", clientId, "roadmap", "main"));
      if (roadmapSnap.exists()) {
        const etapes = (roadmapSnap.data().etapes ?? []) as { id: string; statut: string }[];
        const idx = etapes.findIndex((e) => e.id === "paiement");
        if (idx !== -1 && etapes[idx]?.statut !== "complete") {
          const updated = etapes.map((e, i) => i === idx ? { ...e, statut: "complete" } : e);
          await updateDoc(roadmapSnap.ref, { etapes: updated });
        }
      }
    } catch {}
  }

  // Upsell
  async function handleUpsellConfirm() {
    if (!clientInfo) return;
    setUpsellLoading(true);
    try {
      await createNotification({
        type: "upsell_demande", destinataire: "admin",
        clientId, clientNom: clientInfo.nom, auteurRole: "client",
        description: `${clientInfo.nom} demande une mise à niveau vers le forfait Prestige`,
        lien: `/admin/clients/${clientId}?tab=paiement`,
        actionRequise: true,
      });
      setUpsellDone(true);
    } catch {}
    finally { setUpsellLoading(false); }
  }

  if (clientInfo === undefined) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }
  if (!clientInfo) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <p className="text-sm text-gray-400">Client introuvable.</p>
      </div>
    );
  }

  const dateRenouvellement = clientInfo.dateDebut ? addMonths(clientInfo.dateDebut, 12) : null;
  const totalFactPages     = Math.ceil(factures.length / PAGE_SIZE);
  const facturesPage       = factures.slice(factPage * PAGE_SIZE, (factPage + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#F4F6F9] pt-6 pr-6 pb-16 pl-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Paiement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Votre abonnement et vos factures</p>
        </div>

        {/* ── 1 — Forfait actuel ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Forfait actuel</h2>
          </div>
          <div className="px-6 py-5 space-y-5">
            {/* Badge + bouton Voir mon forfait */}
            <div className="flex items-center gap-3">
              {clientInfo.forfait === "Prestige" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  <Star size={13} className="fill-blue-500 text-blue-500" /> Prestige
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  Essentiel
                </span>
              )}
              <button
                onClick={() => setForfaitDialog(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-gray-200 transition-colors"
              >
                <Eye size={13} /> Voir mon forfait
              </button>
            </div>

            {/* Grille */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Prix / succursale</p>
                <p className="text-base font-bold text-gray-900">{formatMontant(clientInfo.prixParSuccursale)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Succursales</p>
                <p className="text-base font-bold text-gray-900">{clientInfo.succursales}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total mensuel</p>
                <p className="text-base font-bold text-gray-900">{formatMontant(clientInfo.montantMensuel)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date de début</p>
                <p className="text-base font-bold text-gray-900">{formatDate(clientInfo.dateDebut)}</p>
              </div>
            </div>

            {/* Renouvellement */}
            {dateRenouvellement && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={14} className="text-gray-300 flex-shrink-0" />
                Renouvellement le{" "}
                <span className="font-medium text-gray-700">{formatDate(dateRenouvellement)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 2 — Upsell (seulement si Essentiel) ──────────────────────── */}
        {clientInfo.forfait === "Essentiel" && (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-blue-50">
              <h2 className="text-sm font-semibold text-[#0362E3]">
                Passer au Prestige — 299 $/succursale/mois
              </h2>
              <p className="text-xs text-blue-400 mt-0.5">Débloquez ces fonctionnalités exclusives :</p>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-5">
                {UPSELL_FEATURES.map((cat) => (
                  <div key={cat.category}>
                    <p className="text-[11px] font-semibold text-[#0362E3] uppercase tracking-[0.1em] mb-2">
                      {cat.category}
                    </p>
                    <ul className="space-y-1.5">
                      {cat.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-[#0362E3] font-bold flex-shrink-0 mt-0.5 leading-none">→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setUpsellDone(false); setUpsellOpen(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0362E3] text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Améliorer mes fonctionnalités
              </button>
            </div>
          </div>
        )}

        {/* ── 3 — Moyen de paiement ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Moyen de paiement</h2>
          </div>
          <div className="px-6 py-5">
            {stripeLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Chargement…
              </div>
            ) : carte ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatBrand(carte.brand)}{" "}
                      <span className="text-gray-400">•••• •••• •••• {carte.last4}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Expire {formatExpiry(carte.exp_month, carte.exp_year)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCardDialog(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors flex-shrink-0"
                >
                  <Pencil size={11} /> Modifier ma carte
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">Aucune carte enregistrée</p>
                <button
                  onClick={() => setCardDialog(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0362E3] text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0"
                >
                  <Plus size={14} /> Ajouter une carte
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 4 — Prochaine facture ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Prochaine facture</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
              À venir
            </span>
          </div>
          <div className="px-6 py-5">
            {stripeLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Chargement…
              </div>
            ) : abonnement?.dateProchaineFacture ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  Prochaine facturation le{" "}
                  <span className="font-semibold text-gray-900">
                    {formatDate(abonnement.dateProchaineFacture)}
                  </span>
                </p>
                <p className="text-xs text-gray-400">Le paiement sera prélevé automatiquement à cette date.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aucune facturation planifiée</p>
            )}
          </div>
        </div>

        {/* ── 5 — Historique des factures ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Historique des factures</h2>
            {totalFactPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFactPage((p) => Math.max(0, p - 1))}
                  disabled={factPage === 0}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-400">{factPage + 1} / {totalFactPages}</span>
                <button
                  onClick={() => setFactPage((p) => Math.min(totalFactPages - 1, p + 1))}
                  disabled={(factPage + 1) * PAGE_SIZE >= factures.length}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {stripeLoading ? (
            <div className="flex items-center gap-2 px-6 py-8 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Chargement…
            </div>
          ) : factures.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Aucune facture pour le moment
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {facturesPage.map((f) => (
                <div key={f.numero} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{f.numero}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(f.date)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {f.montant.toLocaleString("fr-CA")} {f.devise}
                  </p>
                  {f.montant === 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 whitespace-nowrap">
                      Gratuit
                    </span>
                  ) : f.statut === "paid" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-100 whitespace-nowrap">
                      Payé
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100 whitespace-nowrap">
                      En attente
                    </span>
                  )}
                  {f.urlPDF ? (
                    <a
                      href={f.urlPDF}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors border border-blue-100"
                    >
                      <Download size={12} /> PDF
                    </a>
                  ) : (
                    <div className="w-[52px]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialog — Voir mon forfait ──────────────────────────────────── */}
      <Dialog open={forfaitDialog} onOpenChange={setForfaitDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              {clientInfo.forfait === "Prestige" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  <Star size={13} className="fill-blue-500 text-blue-500" /> Prestige
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  Essentiel
                </span>
              )}
              {clientInfo.prixParSuccursale != null && (
                <span className="text-sm font-normal text-gray-400">
                  — {formatMontant(clientInfo.prixParSuccursale)} / succursale / mois
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-1 py-2">
            {FORFAIT_FEATURES.map((cat) => {
              const isPrestige = clientInfo.forfait === "Prestige";
              return (
                <div key={cat.category}>
                  <p className="text-[11px] font-semibold text-[#0362E3] uppercase tracking-[0.1em] mb-2">
                    {cat.category}
                  </p>
                  <div className="border-t border-gray-100 mb-3" />
                  <ul className="space-y-2.5">
                    {cat.items.map((item) => {
                      const included = isPrestige || item.essentiel;
                      return (
                        <li
                          key={item.label}
                          className={`flex items-start gap-2.5 text-sm ${
                            included ? "text-gray-800" : "text-gray-400"
                          }`}
                        >
                          {included ? (
                            <Check size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <X size={13} className="text-gray-300 mt-0.5 flex-shrink-0" />
                          )}
                          {item.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-center">
            <button
              onClick={() => setForfaitDialog(false)}
              className="px-8 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Upsell ───────────────────────────────────────────── */}
      <Dialog open={upsellOpen} onOpenChange={(o) => { if (!upsellLoading) setUpsellOpen(o); }}>
        <DialogContent className="max-w-md">
          {upsellDone ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900">Demande envoyée ✓</DialogTitle>
                <DialogDescription className="text-gray-500 leading-relaxed pt-1">
                  Nous avons bien reçu votre demande. Un membre de l&apos;équipe AW Solution vous contactera dans les 24h pour finaliser votre mise à niveau vers le Prestige.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="pt-2">
                <button
                  onClick={() => setUpsellOpen(false)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0362E3] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Fermer
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900">Mise à niveau vers Prestige</DialogTitle>
                <DialogDescription className="text-gray-500 leading-relaxed pt-1">
                  Nous allons vous contacter dans les 24h pour finaliser votre mise à niveau vers le Prestige. Vous n&apos;avez rien d&apos;autre à faire.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 pt-2">
                <button
                  onClick={() => setUpsellOpen(false)}
                  disabled={upsellLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpsellConfirm}
                  disabled={upsellLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0362E3] text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {upsellLoading && <Loader2 size={14} className="animate-spin" />}
                  Confirmer
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Carte Stripe ─────────────────────────────────────── */}
      <Dialog open={cardDialog} onOpenChange={(o) => { if (!o) setCardDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {carte ? "Modifier ma carte" : "Ajouter une carte"}
            </DialogTitle>
            <DialogDescription className="text-gray-500 pt-0.5">
              Vos informations de carte sont sécurisées par Stripe.
            </DialogDescription>
          </DialogHeader>
          {clientInfo.stripeCustomerId ? (
            <Elements stripe={stripePromise}>
              <CardSetupForm
                customerId={clientInfo.stripeCustomerId}
                onSuccess={handleCardSuccess}
                onCancel={() => setCardDialog(false)}
              />
            </Elements>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">
              Aucun compte Stripe associé à ce client.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
