"use client";

import { use, useEffect, useRef, useState } from "react";
import {
  doc, setDoc, updateDoc, getDoc,
  collection, addDoc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification, markActionCompleteFor } from "@/lib/notifications";
import { useBrandingData } from "@/hooks/useBrandingData";
import { SectionInfos }       from "@/components/branding/SectionInfos";
import { SectionBranding }    from "@/components/branding/SectionBranding";
import { SectionFidelite }    from "@/components/branding/SectionFidelite";
import { SectionSetup }       from "@/components/branding/SectionSetup";
import { SectionSectionsApp } from "@/components/branding/SectionSectionsApp";
import { SectionTemplates }   from "@/components/branding/SectionTemplates";
import { SectionFichiers }    from "@/components/branding/SectionFichiers";
import { SectionProfilClientele } from "@/components/branding/SectionProfilClientele";
import { CheckCircle2, Sparkles } from "lucide-react";
import { TourSectionButton } from "@/components/tour/TourSectionButton";

const ALL_SECTIONS = [
  { key: "infos",     label: "Informations" },
  { key: "branding",  label: "Branding visuel" },
  { key: "fidelite",  label: "Fidélité" },
  { key: "setup",     label: "Setup technique" },
  { key: "sections",  label: "Sections app" },
  { key: "templates", label: "Écrans" },
  { key: "fichiers",  label: "Fichiers" },
];

const PRESTIGE_SECTION = { key: "profil", label: "Profil clientèle" };

const BASE_REQUIRED = ["infos", "branding", "fidelite", "setup", "templates"];

export default function BrandingPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const { main, completedSections, loading } = useBrandingData(clientId);
  const autoCheckDone = useRef(false);
  const [clientNom,  setClientNom]  = useState("");
  const [forfait,    setForfait]    = useState("");
  const prevCompleted = useRef<string[] | null>(null);

  useEffect(() => {
    getDoc(doc(db, "clients", clientId)).then(snap => {
      if (snap.exists()) {
        setClientNom(snap.data().nom ?? "");
        setForfait(snap.data().forfait ?? "");
      }
    });
  }, [clientId]);

  useEffect(() => {
    if (loading || !clientNom) return;
    if (prevCompleted.current === null) {
      prevCompleted.current = [...completedSections];
      return;
    }
    const newlyCompleted = completedSections.filter(s => !prevCompleted.current!.includes(s));
    if (newlyCompleted.length > 0) {
      const now = Timestamp.now();
      for (const key of newlyCompleted) {
        const label = ALL_SECTIONS.find(s => s.key === key)?.label ?? key;
        createNotification({
          type: "branding_section", destinataire: "admin",
          clientId, clientNom, auteurRole: "client",
          description: `${clientNom} a complété la section branding «${label}»`,
          lien: `/admin/clients/${clientId}?tab=branding`,
        }).catch(() => {});
      }
    }
    prevCompleted.current = [...completedSections];
  }, [completedSections, loading, clientNom, clientId]);

  const isPrestige = forfait?.toLowerCase() === "prestige";
  const visibleSections = isPrestige ? [...ALL_SECTIONS, PRESTIGE_SECTION] : ALL_SECTIONS;
  const requiredForComplete = isPrestige ? [...BASE_REQUIRED, "profil"] : BASE_REQUIRED;
  const completedCount = visibleSections.filter(s => completedSections.includes(s.key)).length;
  const pct = Math.round((completedCount / visibleSections.length) * 100);
  // Pour prestige : le branding n'est complet que si la section profil est aussi remplie
  const brandingComplete = !!main.brandingCompletedAt &&
    (!isPrestige || completedSections.includes("profil"));

  // Auto-check onboarding étape "Branding" when sections 1+2+3 are done
  useEffect(() => {
    if (autoCheckDone.current) return;
    if (loading) return;
    const allRequired = requiredForComplete.every(s => completedSections.includes(s));
    if (!allRequired || brandingComplete) return;

    autoCheckDone.current = true;

    async function run() {
      const [roadmapSnap, clientSnap] = await Promise.all([
        getDoc(doc(db, "clients", clientId, "roadmap", "main")),
        getDoc(doc(db, "clients", clientId)),
      ]);
      const nom = clientSnap.exists() ? (clientSnap.data().nom ?? "") : "";
      if (roadmapSnap.exists()) {
        const etapes = (roadmapSnap.data().etapes ?? []) as { id: string; statut: string }[];
        const idx = etapes.findIndex((e) => e.id === "branding");
        if (idx !== -1 && etapes[idx]?.statut !== "complete") {
          const updated = etapes.map((e, i) => i === idx ? { ...e, statut: "complete" } : e);
          await updateDoc(roadmapSnap.ref, { etapes: updated });
        }
      }
      const now = Timestamp.now();
      await Promise.all([
        setDoc(
          doc(db, "clients", clientId, "branding", "main"),
          { brandingCompletedAt: now },
          { merge: true }
        ),
        addDoc(collection(db, "clients", clientId, "messages"), {
          contenu: "Nous avons bien reçu vos informations de branding ! Notre équipe va débuter la conception de votre application très prochainement. Si nous avons des questions en cours de route, nous vous écrirons directement ici — gardez un œil sur vos messages. Au plaisir de vous présenter le résultat !",
          expediteur: "aw",
          lu: false,
          envoyeAt: now,
        }),
        createNotification({
          type: "branding_complet", destinataire: "admin",
          clientId, clientNom: nom, auteurRole: "client",
          description: `${nom} a complété toutes les sections branding — prêt à démarrer le développement`,
          lien: `/admin/clients/${clientId}?tab=branding`,
          actionRequise: true,
        }),
        // Cas 3 : branding terminé → notifications branding_section supersédées
        markActionCompleteFor({ clientId, type: "branding_section", destinataire: "admin" }),
      ]);
    }

    run();
  }, [completedSections, brandingComplete, loading, clientId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 48px 80px" }}>

        {/* Header */}
        <div data-tour-id="branding-apercu" style={{
          background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
          padding: 24, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>Configuration du branding</p>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>
                Complétez les sections ci-dessous pour que notre équipe puisse construire votre application
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {brandingComplete && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#166534", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "8px 14px" }}>
                  <Sparkles size={14} /> Branding complété
                </span>
              )}
              <TourSectionButton section="branding" />
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#0362E3", borderRadius: 3, transition: "width 0.4s ease" }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, flexShrink: 0 }}>
              {completedCount}/{ALL_SECTIONS.length}
            </p>
          </div>

          {/* Section pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {visibleSections.map(({ key, label }) => {
              const done = completedSections.includes(key);
              return (
                <a
                  key={key}
                  href={`#section-${key}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 20, textDecoration: "none",
                    fontSize: 12, fontWeight: 500,
                    color: done ? "#166534" : "#6B7280",
                    background: done ? "#F0FDF4" : "#F9FAFB",
                    border: `1px solid ${done ? "#BBF7D0" : "#E5E7EB"}`,
                    transition: "all 150ms",
                  }}
                >
                  {done && <CheckCircle2 size={11} />}
                  {label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div data-tour-id="branding-infos">
            <SectionInfos
              clientId={clientId}
              main={main}
              isComplete={completedSections.includes("infos")}
            />
          </div>
          <div data-tour-id="branding-visuel">
            <SectionBranding
              clientId={clientId}
              main={main}
              isComplete={completedSections.includes("branding")}
            />
          </div>
          <div data-tour-id="branding-fidelite">
            <SectionFidelite
              clientId={clientId}
              main={main}
              isComplete={completedSections.includes("fidelite")}
            />
          </div>
          <div data-tour-id="branding-setup">
            <SectionSetup
              clientId={clientId}
              main={main}
              isComplete={completedSections.includes("setup")}
            />
          </div>
          <div data-tour-id="branding-sections-app">
            <SectionSectionsApp
              clientId={clientId}
              main={main}
              isComplete={completedSections.includes("sections")}
            />
          </div>
          <div data-tour-id="branding-templates">
            <SectionTemplates
              clientId={clientId}
              isComplete={completedSections.includes("templates")}
            />
          </div>
          <div data-tour-id="branding-fichiers">
            <SectionFichiers
              clientId={clientId}
              isComplete={completedSections.includes("fichiers")}
            />
          </div>
          {isPrestige && (
            <div data-tour-id="branding-profil-clientele">
              <SectionProfilClientele
                clientId={clientId}
                clientNom={clientNom}
                isComplete={completedSections.includes("profil")}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
