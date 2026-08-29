"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { OrganisationDTO } from "@/config/organisations";
import type { OrganisationUpdateInput } from "@/hooks/useOrganisations";
import { toDateInputValue, combineDateTimeToIso } from "@/lib/dateInputs";

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#9CA3AF",
  textTransform: "uppercase", letterSpacing: "0.05em",
  display: "block", marginBottom: 4,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

export function InfosVenteCard({
  org, onSave,
}: {
  org: OrganisationDTO;
  onSave: (input: OrganisationUpdateInput) => Promise<void>;
}) {
  const [secteur, setSecteur]           = useState(org.secteur ?? "");
  const [siteWeb, setSiteWeb]           = useState(org.siteWeb ?? "");
  const [adresse, setAdresse]           = useState(org.adresse ?? "");
  const [nombreSuccursales, setNombreSuccursales] = useState(String(org.nombreSuccursales ?? 1));
  const [groupeId, setGroupeId]         = useState(org.groupeId ?? "");
  const [source, setSource]             = useState(org.source ?? "");
  const [forfaitPressenti, setForfaitPressenti] = useState(org.forfaitPressenti ?? "");
  const [valeurMensuelle, setValeurMensuelle]   = useState(org.valeurMensuelleEstimee != null ? String(org.valeurMensuelleEstimee) : "");
  const [concurrentEnPlace, setConcurrentEnPlace] = useState(org.concurrentEnPlace ?? "");
  const [prochaineAction, setProchaineAction]   = useState(org.prochaineAction ?? "");
  const [dateProchaineAction, setDateProchaineAction] = useState(toDateInputValue(org.dateProchaineAction));
  const [dateLancement, setDateLancement]       = useState(toDateInputValue(org.dateLancement));
  const [saving, setSaving]                     = useState(false);
  const [saved, setSaved]                       = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        secteur: secteur.trim() || null,
        siteWeb: siteWeb.trim() || null,
        adresse: adresse.trim() || null,
        nombreSuccursales: Number(nombreSuccursales) || 1,
        groupeId: groupeId.trim() || null,
        source: source.trim() || null,
        forfaitPressenti: forfaitPressenti.trim() || null,
        valeurMensuelleEstimee: valeurMensuelle.trim() ? Number(valeurMensuelle) : null,
        concurrentEnPlace: concurrentEnPlace.trim() || null,
        prochaineAction: prochaineAction.trim() || null,
        dateProchaineAction: combineDateTimeToIso(dateProchaineAction, ""),
        dateLancement: combineDateTimeToIso(dateLancement, ""),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  // Dates historiques du cycle de vente — affichées, pas modifiables ici
  // (déjà auto-remplies au changement d'étape correspondant).
  const datesHistoriques: { label: string; value: string | null }[] = [
    { label: "Premier contact", value: org.datePremierContact },
    { label: "Démo", value: org.dateDemo },
    { label: "Proposition envoyée", value: org.datePropositionEnvoyee },
    { label: "Signature", value: org.dateSignature },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-sm font-semibold text-gray-900 mb-3">Informations</p>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Secteur"><Input value={secteur} onChange={(e) => setSecteur(e.target.value)} /></Field>
          <Field label="Site web"><Input value={siteWeb} onChange={(e) => setSiteWeb(e.target.value)} /></Field>
        </div>
        <Field label="Adresse"><Input value={adresse} onChange={(e) => setAdresse(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Succursales">
            <Input type="number" min={1} value={nombreSuccursales} onChange={(e) => setNombreSuccursales(e.target.value)} />
          </Field>
          <Field label="Groupe (bannières liées)">
            <Input value={groupeId} onChange={(e) => setGroupeId(e.target.value)} />
          </Field>
        </div>

        <div className="border-t border-gray-100 pt-3" />

        <Field label="Source"><Input value={source} onChange={(e) => setSource(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Forfait pressenti"><Input value={forfaitPressenti} onChange={(e) => setForfaitPressenti(e.target.value)} /></Field>
          <Field label="Valeur mensuelle estimée ($)">
            <Input type="number" value={valeurMensuelle} onChange={(e) => setValeurMensuelle(e.target.value)} />
          </Field>
        </div>
        <Field label="Concurrent en place"><Input value={concurrentEnPlace} onChange={(e) => setConcurrentEnPlace(e.target.value)} /></Field>

        <div className="border-t border-gray-100 pt-3" />

        <Field label="Prochaine action"><Input value={prochaineAction} onChange={(e) => setProchaineAction(e.target.value)} /></Field>
        <Field label="Date de la prochaine action">
          <Input type="date" value={dateProchaineAction} onChange={(e) => setDateProchaineAction(e.target.value)} />
        </Field>

        <div className="border-t border-gray-100 pt-3" />

        <p style={LABEL}>Dates du cycle de vente</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          {datesHistoriques.map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg px-2.5 py-2">
              <p className="text-gray-400 mb-0.5">{label}</p>
              <p className="font-medium">{value ? new Date(value).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
            </div>
          ))}
        </div>

        <Field label="Date de lancement (livraison)">
          <Input type="date" value={dateLancement} onChange={(e) => setDateLancement(e.target.value)} />
        </Field>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`self-end px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? "bg-green-600 text-white" : "bg-[#0362E3] text-white hover:bg-[#0350c0]"
          } disabled:opacity-50`}
        >
          {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
