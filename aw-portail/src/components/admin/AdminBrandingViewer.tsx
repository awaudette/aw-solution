"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy, addDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandingMain, LogoBranding, Recompense, FichierBranding, BrandingTemplates } from "@/types/branding";
import { CheckCircle2, Building2, Palette, Star, Settings, Monitor, Paperclip, ExternalLink, ImageIcon, Layers, Smartphone, Rocket, Send, Users } from "lucide-react";
import { ProfilClienteleAdminView } from "@/components/branding/SectionProfilClientele";

const ALL_SECTIONS = [
  { key: "infos",     label: "Informations",    icon: Building2, color: "#0362E3", bg: "#EFF6FF" },
  { key: "branding",  label: "Branding",         icon: Palette,   color: "#9333EA", bg: "#FDF4FF" },
  { key: "fidelite",  label: "Fidélité",         icon: Star,      color: "#D97706", bg: "#FFFBEB" },
  { key: "setup",     label: "Setup",            icon: Settings,  color: "#16A34A", bg: "#F0FDF4" },
  { key: "sections",  label: "Sections app",     icon: Layers,    color: "#0891B2", bg: "#ECFEFF" },
  { key: "templates", label: "Templates",        icon: Monitor,   color: "#E11D48", bg: "#FFF1F2" },
  { key: "fichiers",  label: "Fichiers",         icon: Paperclip, color: "#7C3AED", bg: "#F5F3FF" },
];

const TEMPLATE_LABELS: Record<string, string> = {
  editorial: "Éditorial", essentiel: "Essentiel", chaleureux: "Chaleureux",
  prestige: "Prestige", nocturne: "Nocturne", frais: "Frais",
};

const TEMPLATE_STEPS: { key: keyof BrandingTemplates; label: string }[] = [
  { key: "accueil",        label: "Accueil" },
  { key: "recompenses",    label: "Récompenses" },
  { key: "promotions",     label: "Promotions" },
  { key: "bonus",          label: "Bonus" },
  { key: "menu",           label: "Menu déroulant" },
  { key: "centreControle", label: "Centre de contrôle" },
  { key: "creationPromo",  label: "Création de contenu" },
];

const SECTIONS_APP_LABELS: Record<string, string> = {
  accueil: "Accueil", recompenses: "Récompenses", promotions: "Promotions",
  bonus: "Bonus", menu: "Menu", profilMembre: "Profil membre",
  historiqueTransactions: "Historique des transactions", galerie: "Galerie",
  reservation: "Réservation", commandeEnLigne: "Commande en ligne",
  evenements: "Événements", carteSuccursales: "Carte des succursales",
  parrainage: "Parrainage", filActualites: "Fil d'actualités",
};

const STATUT_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  recu:          { label: "Reçu",          color: "#374151", bg: "#F3F4F6" },
  en_traitement: { label: "En traitement", color: "#92400E", bg: "#FFFBEB" },
  approuve:      { label: "Approuvé ✓",    color: "#166534", bg: "#F0FDF4" },
  a_refaire:     { label: "À refaire",     color: "#991B1B", bg: "#FEF2F2" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor, iconBg, complete, children }: {
  title: string; icon: React.ElementType; iconColor: string; iconBg: string; complete: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, background: iconBg, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={18} color={iconColor} />
          </div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
        </div>
        <span style={{
          display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 7,
          color: complete ? "#166534" : "#6B7280",
          background: complete ? "#F0FDF4" : "#F9FAFB",
          border: `1px solid ${complete ? "#BBF7D0" : "#E5E7EB"}`,
        }}>
          {complete && <CheckCircle2 size={11} />}
          {complete ? "Complété" : "Non complété"}
        </span>
      </div>
      {children}
    </div>
  );
}

export function AdminBrandingViewer({ clientId, forfait }: { clientId: string; forfait?: string }) {
  const [main,             setMain]             = useState<Partial<BrandingMain>>({});
  const [logos,            setLogos]            = useState<LogoBranding[]>([]);
  const [recompenses,      setRecompenses]      = useState<Recompense[]>([]);
  const [fichiers,         setFichiers]         = useState<FichierBranding[]>([]);
  const [templates,        setTemplates]        = useState<Partial<BrandingTemplates>>({});
  const [loading,          setLoading]          = useState(true);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [sending,          setSending]          = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, "clients", clientId, "branding", "main"), snap => {
      const data = snap.exists() ? (snap.data() as Partial<BrandingMain> & { confirmationDebutDev?: boolean }) : {};
      setMain(data);
      setConfirmationSent(!!data.confirmationDebutDev);
      setLoading(false);
    });
    const u2 = onSnapshot(
      collection(db, "clients", clientId, "branding", "main", "logos"),
      snap => setLogos(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogoBranding)))
    );
    const u3 = onSnapshot(
      query(collection(db, "clients", clientId, "branding", "main", "recompenses"), orderBy("ordre")),
      snap => setRecompenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Recompense)))
    );
    const u4 = onSnapshot(
      collection(db, "clients", clientId, "branding", "main", "fichiers"),
      snap => setFichiers(
        snap.docs.map(d => ({ id: d.id, ...d.data() } as FichierBranding))
          .sort((a, b) => (b.uploadedAt?.seconds ?? 0) - (a.uploadedAt?.seconds ?? 0))
      )
    );
    const u5 = onSnapshot(doc(db, "clients", clientId, "branding", "templates"), snap => {
      setTemplates(snap.exists() ? (snap.data() as Partial<BrandingTemplates>) : {});
    });
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <div style={{ width: 20, height: 20, border: "2px solid #0362E3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  const completed = main.completedSections ?? [];
  const isPrestige = forfait?.toLowerCase() === "prestige";
  const allComplete = ALL_SECTIONS.every(s => completed.includes(s.key)) &&
    (!isPrestige || completed.includes("profil"));

  async function sendConfirmation() {
    setSending(true);
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, "clients", clientId, "messages"), {
        texte: "Nous avons bien reçu l'ensemble de vos informations de branding ! Notre équipe commence officiellement le développement de votre application. Nous vous tiendrons informé de l'avancement — n'hésitez pas à nous écrire ici si vous avez des questions en cours de route. Au plaisir de vous présenter le résultat !",
        auteur: "AW Solution",
        auteurRole: "admin",
        date: now,
        lu: false,
      });
      await setDoc(
        doc(db, "clients", clientId, "branding", "main"),
        { confirmationDebutDev: true },
        { merge: true }
      );
      setConfirmationSent(true);
    } finally {
      setSending(false);
    }
  }
  const adminVisibleSections = isPrestige
    ? [...ALL_SECTIONS, { key: "profil", label: "Profil clientèle", icon: Users, color: "#0362E3", bg: "#EFF6FF" }]
    : ALL_SECTIONS;
  const completedCount = adminVisibleSections.filter(s => completed.includes(s.key)).length;
  const pct = Math.round((completedCount / adminVisibleSections.length) * 100);

  return (
    <div className="space-y-4">

      {/* Progress */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Progression du branding</p>
          <p className="text-sm font-bold" style={{ color: pct === 100 ? "#22C55E" : "#0362E3" }}>{completedCount}/{adminVisibleSections.length} sections</p>
        </div>
        <div style={{ height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#0362E3", borderRadius: 4, transition: "width 0.4s ease" }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {adminVisibleSections.map(s => {
            const done = completed.includes(s.key);
            return (
              <span key={s.key} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                color: done ? "#166534" : "#9CA3AF",
                background: done ? "#F0FDF4" : "#F9FAFB",
                border: `1px solid ${done ? "#BBF7D0" : "#E5E7EB"}`,
              }}>
                {done && <CheckCircle2 size={10} />}
                {s.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Section 1 — Informations */}
      <SectionCard title="Section 1 — Informations de l'entreprise" icon={Building2} iconColor="#0362E3" iconBg="#EFF6FF" complete={completed.includes("infos")}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Informations légales</p>
            <div className="grid grid-cols-3 gap-3">
              <Row label="Nom légal"  value={main.nomLegal} />
              <Row label="Adresse"    value={main.adresse} />
              <Row label="NEQ"        value={main.neq} />
              <Row label="Slogan"     value={main.slogan} />
            </div>
          </div>
          <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact principal</p>
            <div className="grid grid-cols-3 gap-3">
              <Row label="Nom"                value={main.nomContactPrincipal} />
              <Row label="Rôle"               value={main.roleContactPrincipal} />
              <Row label="Tél. entreprise"    value={main.telephoneEntreprise} />
              <Row label="Tél. contact"       value={main.telephoneContact} />
              <Row label="Courriel entreprise" value={main.courrielEntreprise} />
              <Row label="Courriel contact"   value={main.courrielContact} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Section 2 — Branding */}
      <SectionCard title="Section 2 — Branding visuel" icon={Palette} iconColor="#9333EA" iconBg="#FDF4FF" complete={completed.includes("branding")}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Couleurs</p>
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: main.couleurPrincipale ?? "#ccc", border: "1px solid #E5E7EB" }} />
                <div>
                  <p className="text-xs text-gray-400">Principale</p>
                  <p className="text-sm font-semibold text-gray-800">{main.couleurPrincipale ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: main.couleurSecondaire ?? "#ccc", border: "1px solid #E5E7EB" }} />
                <div>
                  <p className="text-xs text-gray-400">Secondaire</p>
                  <p className="text-sm font-semibold text-gray-800">{main.couleurSecondaire ?? "—"}</p>
                </div>
              </div>
              {main.couleurPrincipale && main.couleurSecondaire && (
                <div style={{ flex: 1, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${main.couleurPrincipale}, ${main.couleurSecondaire})` }} />
              )}
            </div>
          </div>

          {logos.length > 0 && (
            <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Logos ({logos.length})</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
                {logos.map(logo => (
                  <div key={logo.id} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ padding: 10, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 70 }}>
                      {logo.url
                        ? <img src={logo.url} alt={logo.nom} style={{ maxWidth: "100%", maxHeight: 60, objectFit: "contain" }} />
                        : <ImageIcon size={24} color="#D1D5DB" />
                      }
                    </div>
                    <div style={{ padding: "5px 8px", borderTop: "1px solid #F3F4F6" }}>
                      <p style={{ fontSize: 11, color: "#6B7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{logo.nom}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {logos.length === 0 && <p className="text-sm text-gray-400 italic">Aucun logo uploadé</p>}
        </div>
      </SectionCard>

      {/* Section 3 — Fidélité */}
      <SectionCard title="Section 3 — Programme de fidélité" icon={Star} iconColor="#D97706" iconBg="#FFFBEB" complete={completed.includes("fidelite")}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 20px", textAlign: "center" }}>
              <p className="text-xs text-amber-600 mb-0.5">Points par $ dépensé</p>
              <p className="text-2xl font-bold text-amber-700">{main.ratioPointsParDollar ?? "—"}</p>
            </div>
          </div>

          {recompenses.length > 0 ? (
            <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Récompenses ({recompenses.length})</p>
              <div className="space-y-2">
                {recompenses.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#F9FAFB", borderRadius: 10, border: "1px solid #F3F4F6" }}>
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt={r.nom} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 40, borderRadius: 8, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ImageIcon size={16} color="#9CA3AF" /></div>
                    }
                    <div style={{ flex: 1 }}>
                      <p className="text-sm font-semibold text-gray-800">{r.nom}</p>
                      {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "3px 10px", flexShrink: 0 }}>
                      {r.valeurPts} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Aucune récompense ajoutée</p>
          )}
        </div>
      </SectionCard>

      {/* Section 4 — Setup */}
      <SectionCard title="Section 4 — Setup technique" icon={Settings} iconColor="#16A34A" iconBg="#F0FDF4" complete={completed.includes("setup")}>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Système POS"     value={main.posUtilise === "Autre" ? `Autre — ${main.posAutre}` : main.posUtilise} />
          <Row label="iPad en caisse"  value={main.iPad === true ? "Oui" : main.iPad === false ? "Non" : undefined} />
          <Row label="Clé API"         value={main.cleAPI} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Row label="Notes supplémentaires" value={main.descriptionSetup} />
          </div>
        </div>
      </SectionCard>

      {/* Section 5 — Sections app */}
      <SectionCard title="Section 5 — Sections de l'application" icon={Smartphone} iconColor="#0891B2" iconBg="#ECFEFF" complete={completed.includes("sections")}>
        {(main.sectionsApp ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {(main.sectionsApp ?? []).map(s => (
              <span key={s} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" }}>
                {SECTIONS_APP_LABELS[s] ?? s}
              </span>
            ))}
            {main.sectionsAppAutre && (
              <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: "#F5F3FF", color: "#6D28D9", border: "1px solid #DDD6FE" }}>
                Autre : {main.sectionsAppAutre}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Aucune section sélectionnée</p>
        )}
      </SectionCard>

      {/* Section 6 — Templates */}
      <SectionCard title="Section 6 — Préférences des écrans" icon={Monitor} iconColor="#E11D48" iconBg="#FFF1F2" complete={completed.includes("templates")}>
        <div className="space-y-2">
          {TEMPLATE_STEPS.map(({ key, label }) => {
            const t = templates[key];
            const hasTemplate = !!t?.templateId;
            return (
              <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "#F9FAFB", borderRadius: 10, border: "1px solid #F3F4F6" }}>
                <div style={{ flex: "0 0 140px" }}>
                  <p className="text-xs text-gray-400 mb-0.5">Écran</p>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                </div>
                <div style={{ flex: "0 0 110px" }}>
                  {hasTemplate
                    ? <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" }}>
                        {TEMPLATE_LABELS[t!.templateId] ?? t!.templateId}
                      </span>
                    : <span className="text-xs text-gray-300 italic">Non choisi</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {t?.commentaire
                    ? <p className="text-sm text-gray-600 italic leading-relaxed">"{t.commentaire}"</p>
                    : <p className="text-xs text-gray-300">Aucun commentaire</p>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Section 7 — Fichiers */}
      <SectionCard title="Section 7 — Fichiers et ressources" icon={Paperclip} iconColor="#7C3AED" iconBg="#F5F3FF" complete={completed.includes("fichiers")}>
        {fichiers.length > 0 ? (
          <div className="space-y-2">
            {fichiers.map(f => {
              const s = STATUT_STYLE[f.statut] ?? STATUT_STYLE.recu;
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#F9FAFB", borderRadius: 10, border: "1px solid #F3F4F6" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="text-sm font-medium text-gray-800 truncate">{f.nom}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatSize(f.taille)}</p>
                    {f.commentaireAdmin && <p className="text-xs text-red-500 mt-0.5">Note : {f.commentaireAdmin}</p>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>
                    {s.label}
                  </span>
                  <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#0362E3", display: "flex", flexShrink: 0 }}>
                    <ExternalLink size={14} />
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Aucun fichier déposé</p>
        )}
      </SectionCard>

      {/* ── Section Profil de clientèle (Prestige seulement) ── */}
      {forfait?.toLowerCase() === "prestige" && (
        <SectionCard
          title="Section 8 — Profil de votre clientèle"
          icon={Users} iconColor="#0362E3" iconBg="#EFF6FF"
          complete={completed.includes("profil")}
        >
          <ProfilClienteleAdminView clientId={clientId} />
        </SectionCard>
      )}

      {/* Bouton confirmation début de développement */}
      {allComplete && (
        <div style={{
          background: confirmationSent ? "#F0FDF4" : "linear-gradient(135deg, #0362E3 0%, #0251C1 100%)",
          border: `1px solid ${confirmationSent ? "#BBF7D0" : "transparent"}`,
          borderRadius: 16, padding: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: confirmationSent ? "#DCFCE7" : "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {confirmationSent
                ? <CheckCircle2 size={22} color="#16A34A" />
                : <Rocket size={22} color="#fff" />
              }
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: confirmationSent ? "#166534" : "#fff", margin: "0 0 3px" }}>
                {confirmationSent ? "Confirmation envoyée" : "Toutes les sections sont complétées"}
              </p>
              <p style={{ fontSize: 13, color: confirmationSent ? "#22C55E" : "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.4 }}>
                {confirmationSent
                  ? "Le client a été informé que le développement de son application a débuté."
                  : "Le client a rempli l'ensemble du branding. Envoyez-lui la confirmation que le développement commence."
                }
              </p>
            </div>
          </div>
          {!confirmationSent && (
            <button
              onClick={sendConfirmation}
              disabled={sending}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 10, border: "none", background: sending ? "rgba(255,255,255,0.2)" : "#fff", color: sending ? "rgba(255,255,255,0.5)" : "#0362E3", fontSize: 14, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer" }}
            >
              {sending ? "Envoi…" : <><Send size={14} style={{ marginRight: 6 }} /> Envoyer la confirmation</>}
            </button>
          )}
        </div>
      )}

    </div>
  );
}
