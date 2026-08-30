"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  PenLine,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TourSectionButton } from "@/components/tour/TourSectionButton";

interface ContratData {
  urlHTML:        string;
  urlPDF?:        string;
  urlDocuSeal?:   string;
  statut:         "en_attente" | "signe";
  genereLe:       Date | null;
  dateSignature?: Date | null;
  forfait:        string;
}

function toDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  return null;
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

export default function ContratPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [contrat, setContrat] = useState<ContratData | null | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", clientId), (snap) => {
      if (!snap.exists()) { setContrat(null); return; }
      const raw = snap.data().contrat;
      if (!raw) { setContrat(null); return; }
      setContrat({
        urlHTML:       raw.urlHTML       ?? "",
        urlPDF:        raw.urlPDF        ?? undefined,
        urlDocuSeal:   raw.urlDocuSeal   ?? undefined,
        statut:        raw.statut        ?? "en_attente",
        genereLe:      toDate(raw.genereLe),
        dateSignature: toDate(raw.dateSignature),
        forfait:       raw.forfait       ?? "",
      });
    });
    return () => unsub();
  }, [clientId]);

  // États de chargement
  if (contrat === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F4F6F9]">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!contrat) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-md">
          <FileText size={40} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Aucun contrat disponible</h2>
          <p className="text-sm text-gray-500">
            Votre contrat n'a pas encore été généré. Contactez AW Solution pour plus d'information.
          </p>
        </div>
      </div>
    );
  }

  // Contrat signé
  if (contrat.statut === "signe") {
    return (
      <div data-tour-id="contrat-carte" className="h-screen bg-[#F4F6F9] p-6 pb-0 flex flex-col gap-4">
        <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Contrat signé ✓</h1>
              <p className="text-xs text-gray-500">
                Forfait {contrat.forfait}
                {contrat.dateSignature
                  ? ` · Signé le ${formatDate(contrat.dateSignature)}`
                  : contrat.genereLe ? ` · ${formatDate(contrat.genereLe)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {contrat.urlPDF && (
              <a
                href={contrat.urlPDF}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
              >
                <ExternalLink size={12} /> Télécharger le PDF
              </a>
            )}
            <TourSectionButton section="contrat" />
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {contrat.urlPDF ? (
            <iframe
              src={contrat.urlPDF}
              className="w-full h-full"
              style={{ border: "none", display: "block" }}
              title="Contrat signé"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-400 py-24">
              PDF en cours de traitement…
            </div>
          )}
        </div>
      </div>
    );
  }

  // Contrat en attente
  return (
    <div data-tour-id="contrat-carte" className="min-h-screen bg-[#F4F6F9] p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
            <Clock size={18} className="text-yellow-600" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Contrat en attente de signature</h1>
            <p className="text-xs text-gray-500">Forfait {contrat.forfait} · Généré le {formatDate(contrat.genereLe)}</p>
          </div>
        </div>
        <TourSectionButton section="contrat" />
      </div>

      {/* Iframe */}
      <div
        className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        style={{ minHeight: "70vh" }}
      >
        <iframe
          src={`/api/contrat/${clientId}`}
          className="w-full h-full"
          style={{ minHeight: "70vh", border: "none" }}
          title="Contrat à signer"
        />
      </div>

      {/* Bouton Signer */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Lisez attentivement le contrat avant de signer.</p>
          {!contrat.urlDocuSeal && (
            <p className="text-xs text-gray-400 mt-0.5">
              AW Solution vous enverra le lien de signature par courriel.
            </p>
          )}
        </div>
        {contrat.urlDocuSeal ? (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shrink-0"
          >
            <PenLine size={14} /> Signer le contrat
          </button>
        ) : (
          <button
            disabled
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed shrink-0"
          >
            <PenLine size={14} /> Signer le contrat
          </button>
        )}
      </div>

      {/* Modal de confirmation */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Signature du contrat</DialogTitle>
            <DialogDescription className="text-gray-500 leading-relaxed pt-1">
              Vous devrez entrer votre adresse courriel sur la page suivante. Vous n'avez pas besoin de créer de compte, c'est uniquement pour identifier qui a signé le document.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <a
              href={contrat.urlDocuSeal}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setModalOpen(false)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <PenLine size={14} /> Continuer vers la signature
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
