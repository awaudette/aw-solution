"use client";

import { useState, useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandingTemplates } from "@/types/branding";
import { Monitor, CheckCircle2, X, ChevronLeft, ChevronRight, Check, Gamepad2 } from "lucide-react";

const TEMPLATES = [
  { id: "editorial",  label: "Éditorial" },
  { id: "essentiel",  label: "Essentiel" },
  { id: "chaleureux", label: "Chaleureux" },
  { id: "prestige",   label: "Prestige" },
  { id: "nocturne",   label: "Nocturne" },
  { id: "frais",      label: "Frais" },
];

const STEPS = [
  { key: "accueil",        label: "Accueil",             desc: "Page principale que vos membres voient en ouvrant l'app" },
  { key: "recompenses",    label: "Récompenses",          desc: "Catalogue de récompenses échangeables par vos membres" },
  { key: "promotions",     label: "Promotions",           desc: "Page des offres et promotions en cours" },
  { key: "bonus",          label: "Bonus",                desc: "Défis et missions pour gagner des points supplémentaires" },
  { key: "menu",           label: "Menu déroulant",       desc: "Menu complet de votre restaurant" },
  { key: "centreControle", label: "Centre de contrôle",  desc: "Tableau de bord et outils de gestion" },
  { key: "creationPromo",  label: "Création de contenu", desc: "Outil de création de promotions personnalisées" },
] as const;

type StepKey = typeof STEPS[number]["key"];

const B = (p: string, t: string) =>
  `https://firebasestorage.googleapis.com/v0/b/aw-portail.firebasestorage.app/o/templates%2F${p}.mp4?alt=media&token=${t}`;

const STEP_VIDEOS: Partial<Record<StepKey, Partial<Record<string, string>>>> = {
  accueil:        { editorial: B("accueil-editorial","e55869b3-6d6b-4651-92d9-a5abf40d8ff1"), essentiel: B("accueil-essentiel","0ab47723-6df0-47cd-bbce-7032a1f5e2fc"), chaleureux: B("accueil-chaleureux","8707ca48-506a-4120-8dcd-ed1c281078c2"), prestige: B("accueil-prestige","cade458c-0580-42a0-a48a-3f47ec33f9d9"), nocturne: B("accueil-nocturne","dba100be-73e0-4085-8234-a7e26c0e2db2"), frais: B("accueil2-frais","90de0ad3-dab2-4345-b176-eb58bdae7c58") },
  recompenses:    { editorial: B("recompenses-editorial","7f5b8583-8e4b-4756-a966-45ecca79197a"), essentiel: B("recompenses-essentiel","2284bba4-37b2-422d-b15c-9583a7fa8026"), chaleureux: B("recompenses-chaleureux","7eb8e58e-0fe2-43fc-8bfc-c977743c5da6"), prestige: B("recompenses-prestige","550feca2-2648-4ba7-84c4-1804c0bffe73"), nocturne: B("recompenses-nocturne","3fb46a14-3d36-493b-ad1e-29dd6d51948c"), frais: B("recompenses2-frais","35858dca-cd36-4b30-9df0-54ce2559fc05") },
  promotions:     { editorial: B("promotions-editorial","a54b3fd5-43ad-44c0-bc34-eca28b2a8f3d"), essentiel: B("promotions-essentiel","90cbd2d1-bd17-4378-a7e6-73cb92466f37"), chaleureux: B("promotions-chaleureux","97f19e4f-1956-4ace-bc73-f4e3ea71c6a3"), prestige: B("promotions-prestige","fa084570-7605-4cb8-9b06-f90b44687145"), nocturne: B("promotions-nocturne","c1f3950b-f821-4be3-9afa-03bdf6e1ccac"), frais: B("promotions2-frais","267f2adf-1081-4446-b25a-7bfc943b66c0") },
  bonus:          { editorial: B("bonus-editorial","11e6afe6-bfc7-4075-8cf1-8959c504da65"), essentiel: B("bonus-essentiel","4dfa3fd5-b62e-46bd-a8ed-17bc1a1bea5a"), chaleureux: B("bonus-chaleureux","bb91a6e7-fb0c-4f35-997d-16616b4d4815"), prestige: B("bonus-prestige","cd21482b-3866-4988-935b-95817bffd0f5"), frais: B("bonus2.frais","a732e4c5-760a-41cd-a517-11678d8e422f") },
  menu:           { editorial: B("menu-editorial","2a4cad6d-6819-4532-9da4-d06e70bdca0f"), essentiel: B("menu-essentiel","3cd5b744-2e7d-4da7-abc7-db0b32696a76"), chaleureux: B("menu-chaleureux","144b8c4b-23fc-415c-af18-95ca6a1dcfb2"), prestige: B("menu-prestige","7bf872de-267d-4398-aae4-809945f39a19"), nocturne: B("menu-nocturne","679fc747-cc27-4ed7-b3ca-d059dbf97ba9"), frais: B("menu-frais","e5b150ca-06bc-4b9f-8dbe-3ad3a14ccb9f") },
  centreControle: { editorial: B("controle-editorial","d71a0993-269d-47ee-a9d5-426eae7674f2"), essentiel: B("controle-essentiel","1fbacbd6-5cdc-49b2-bf92-fa21245fbff3"), chaleureux: B("controle-chaleureux","3f77606d-378d-4aed-9c1f-c6246dbff882"), prestige: B("controle-prestige","88c9c086-473e-447e-952d-d0f16e029b7c"), nocturne: B("controle-nocturne","5e7d4b16-0c69-4a14-9409-2c2a0f81165a"), frais: B("controle2-frais","e2fe13c9-835f-4eb8-b9b9-4216c2928765") },
  creationPromo:  { editorial: B("creer-editorial","47874cd9-b662-4c69-9a9b-ac4f87464ee1"), essentiel: B("creer-essentiel","fa955957-1432-49c6-9935-a25db6319490"), chaleureux: B("creer-chaleureux","6cb9c9a7-9543-44de-b37a-a10655e6e52f"), prestige: B("creer-prestige","56166891-574e-42b1-9db2-e381f4201d2d"), nocturne: B("creer-nocturne","e4a250ce-bb0f-4e5b-a97e-d9a4474d9094"), frais: B("creer2-frais","459c2c11-13af-404b-af8c-ec16d88bd296") },
};

const NEEDS_MOCKUP = new Set<string>([
  "bonus-editorial","bonus-essentiel","bonus-chaleureux","bonus-prestige","bonus-frais",
  "accueil-frais","recompenses-frais","promotions-frais","bonus-frais",
  "menu-frais","centreControle-frais","creationPromo-frais",
  "accueil-nocturne",
]);

const PLACEHOLDERS: Record<StepKey, string> = {
  accueil:        "Ex: J'aime l'Éditorial mais avec la barre de progression circulaire du Chaleureux en bas de page…",
  recompenses:    "Ex: Je préfère le Prestige mais avec des photos de récompenses plus grandes…",
  promotions:     "Ex: Je veux une bannière animée bien visible, avec le compte à rebours de l'offre…",
  bonus:          "Ex: La carte à gratter est un must — j'aime l'animation de points qui monte dans le Frais…",
  menu:           "Ex: Je veux les icônes de couleur mais avec le menu sur la verticale…",
  centreControle: "Ex: Je veux le centre de contrôle Prestige mais avec fond noir comme Nocturne…",
  creationPromo:  "Ex: Je veux créer mon contenu en étapes successives et non tout dans la même page…",
};

const DEMO_COMMENTS: Partial<Record<StepKey, string>> = {
  accueil:     "J'aime le style Éditorial mais je voudrais la barre de progression circulaire du template Chaleureux en bas de page",
  recompenses: "Je préfère le template Prestige pour les récompenses, mais avec les photos plus grandes comme dans le template Dense",
  bonus:       "Je veux absolument la carte à gratter — j'aime l'idée que le client gratte pour découvrir son gain",
  menu:        "Template Chaleureux pour le menu, avec une belle photo du restaurant en haut",
};

const TOUR_STEPS = [
  {
    title: "Explorez les styles",
    desc: "Le curseur fait défiler les templates disponibles. Utilisez les points de navigation ou les flèches pour passer d'un style à l'autre.",
    showComment: false,
  },
  {
    title: "Sélectionnez votre préféré",
    desc: "Quand un template vous plaît, cliquez « Sélectionner ce template ». Le bouton passe au vert avec un ✓ — votre choix est mémorisé pour cette section.",
    showComment: false,
  },
  {
    title: "Laissez vos commentaires",
    desc: "Précisez vos préférences, inspirations ou demandes spéciales pour chaque section. Exemples de ce que vous pouvez écrire :",
    showComment: true,
  },
  {
    title: "Passez à la section suivante",
    desc: "Cliquez « Suivant » pour passer à la prochaine section de votre application et répéter le processus pour chaque page.",
    showComment: false,
  },
];

const CSS = `
  @keyframes section-text-in  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes section-card-out { from{transform:translateX(0)} to{transform:translateX(-100%)} }
  @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
  @keyframes demo-fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

interface Props { clientId: string; isComplete: boolean; }
type Selections   = Partial<Record<StepKey, string>>;
type Commentaires = Partial<Record<StepKey, string>>;

const CursorSVG = ({ clicking }: { clicking: boolean }) => (
  <svg width="24" height="30" viewBox="0 0 24 30" style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))", transform: clicking ? "scale(0.8)" : "scale(1)", transition: "transform 120ms ease" }}>
    <path d="M2 2l18 13-8.5 2.5-3.5 9z" fill="white" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

export function SectionTemplates({ clientId, isComplete }: Props) {
  const [isOpen,         setIsOpen]         = useState(false);
  const [stepIdx,        setStepIdx]        = useState(0);
  const [tmplIdx,        setTmplIdx]        = useState(0);
  const [selections,     setSelections]     = useState<Selections>({});
  const [commentaires,   setCommentaires]   = useState<Commentaires>({});
  const [fading,         setFading]         = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [savingCard,     setSavingCard]     = useState(false);
  const [savedCard,      setSavedCard]      = useState(false);
  const [showTour,       setShowTour]       = useState(false);
  const [tourStep,       setTourStep]       = useState(0);
  const [showBonusCard,  setShowBonusCard]  = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transLabel,     setTransLabel]     = useState("");
  const [transExiting,   setTransExiting]   = useState(false);
  const [cursorX,        setCursorX]        = useState(-300);
  const [cursorY,        setCursorY]        = useState(-300);
  const [cursorVisible,  setCursorVisible]  = useState(false);
  const [cursorClicking, setCursorClicking] = useState(false);

  const dotBtnRefs   = useRef<(HTMLButtonElement | null)[]>([]);
  const selectBtnRef = useRef<HTMLButtonElement | null>(null);
  const nextBtnRef   = useRef<HTMLButtonElement | null>(null);
  const typeAreaRef  = useRef<HTMLDivElement | null>(null);

  const step            = STEPS[stepIdx];
  const tmpl            = TEMPLATES[tmplIdx];
  const videoUrl        = STEP_VIDEOS[step.key]?.[tmpl.id] ?? null;
  const needsMockup     = NEEDS_MOCKUP.has(`${step.key}-${tmpl.id}`);
  const isBonusNocturne = step.key === "bonus" && tmpl.id === "nocturne";
  const isFrais         = tmpl.id === "frais";
  const isSelected      = selections[step.key] === tmpl.id;
  const chosenCount     = STEPS.filter(s => selections[s.key]).length;
  const demoActive      = showTour && tourStep < 4;

  /* ── Firestore ── */
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", clientId, "branding", "templates"), snap => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<BrandingTemplates>;
      const sel: Selections = {}; const com: Commentaires = {};
      for (const s of STEPS) { if (data[s.key]) { sel[s.key] = data[s.key]?.templateId ?? ""; com[s.key] = data[s.key]?.commentaire ?? ""; } }
      setSelections(sel); setCommentaires(com);
    });
    return unsub;
  }, [clientId]);

  useEffect(() => { document.body.style.overflow = isOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [isOpen]);
  useEffect(() => { setTmplIdx(0); }, [stepIdx]);

  /* ── Cursor animation sequences ── */
  useEffect(() => {
    if (!showTour || tourStep > 3) return;
    let alive = true;
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    const moveTo = (el: HTMLElement | null, ox = 10, oy = 10) => {
      if (!el || !alive) return;
      const r = el.getBoundingClientRect();
      setCursorX(r.left + ox);
      setCursorY(r.top + oy);
    };

    const clickAnim = async () => {
      if (!alive) return;
      setCursorClicking(true); await sleep(200);
      if (!alive) return; setCursorClicking(false);
    };

    const goClick = async (el: HTMLElement | null) => {
      moveTo(el); await sleep(700); if (!alive) return; await clickAnim();
    };

    const demoFade = async (fn: () => void) => {
      if (!alive) return; setFading(true); await sleep(160); if (!alive) return; fn(); setFading(false);
    };

    const typeInto = async (section: StepKey, text: string) => {
      moveTo(typeAreaRef.current, 20, 20); await sleep(650);
      for (let i = 0; i <= text.length; i++) {
        if (!alive) return;
        setCommentaires(c => ({ ...c, [section]: text.slice(0, i) }));
        await sleep(26);
      }
    };

    async function run() {
      setCursorVisible(true);
      await sleep(400);

      if (tourStep === 0) {
        // Parcourir tous les templates un par un puis revenir au premier
        moveTo(dotBtnRefs.current[0]); await sleep(700); if (!alive) return;
        for (let i = 1; i < TEMPLATES.length; i++) {
          const idx = i;
          moveTo(dotBtnRefs.current[idx]); await sleep(500); if (!alive) return;
          await demoFade(() => setTmplIdx(idx)); await sleep(420); if (!alive) return;
        }
        moveTo(dotBtnRefs.current[0]); await sleep(560); if (!alive) return;
        await demoFade(() => setTmplIdx(0));
      }

      if (tourStep === 1) {
        // Explorer 3 templates avant de sélectionner
        moveTo(dotBtnRefs.current[1]); await sleep(520); if (!alive) return;
        await demoFade(() => setTmplIdx(1)); await sleep(430); if (!alive) return;
        moveTo(dotBtnRefs.current[2]); await sleep(520); if (!alive) return;
        await demoFade(() => setTmplIdx(2)); await sleep(430); if (!alive) return;
        moveTo(dotBtnRefs.current[3]); await sleep(520); if (!alive) return;
        await demoFade(() => setTmplIdx(3)); await sleep(430); if (!alive) return;
        // Revenir au premier et sélectionner
        moveTo(dotBtnRefs.current[0]); await sleep(560); if (!alive) return;
        await demoFade(() => setTmplIdx(0)); await sleep(480); if (!alive) return;
        await goClick(selectBtnRef.current); if (!alive) return;
        setSelections(s => ({ ...s, accueil: "editorial" }));
      }

      if (tourStep === 2) {
        await typeInto("accueil", DEMO_COMMENTS.accueil!); if (!alive) return; await sleep(500);
        await goClick(nextBtnRef.current); if (!alive) return;
        await demoFade(() => setStepIdx(1)); await sleep(700); if (!alive) return;
        await typeInto("recompenses", DEMO_COMMENTS.recompenses!); if (!alive) return; await sleep(500);
        await goClick(nextBtnRef.current); if (!alive) return;
        await demoFade(() => setStepIdx(2)); await sleep(700); if (!alive) return;
        // Promotions — no comment, go directly to Bonus
        moveTo(nextBtnRef.current); await sleep(600); if (!alive) return;
        await clickAnim(); if (!alive) return;
        await demoFade(() => setStepIdx(3)); await sleep(700); if (!alive) return;
        await typeInto("bonus", DEMO_COMMENTS.bonus!); if (!alive) return; await sleep(500);
        await goClick(nextBtnRef.current); if (!alive) return;
        await demoFade(() => setStepIdx(4)); await sleep(700); if (!alive) return;
        await typeInto("menu", DEMO_COMMENTS.menu!);
      }

      if (tourStep === 3) {
        await sleep(300); moveTo(nextBtnRef.current);
        await sleep(800); if (!alive) return;
        await clickAnim();
      }
    }

    run().catch(() => {});
    return () => { alive = false; };
  }, [showTour, tourStep]);

  /* ── Handlers ── */
  function fade(fn: () => void) { setFading(true); setTimeout(() => { fn(); setFading(false); }, 160); }

  function handleOpenModal() {
    setStepIdx(0); setTmplIdx(0); setIsOpen(true);
    if (chosenCount === 0) { setShowTour(true); setTourStep(0); }
  }

  function advanceTour() { setTourStep(s => s + 1); }

  function finishTour() {
    setCursorVisible(false);
    setStepIdx(0); setTmplIdx(0); setSelections({}); setCommentaires({});
    setShowTour(false);
  }

  function prevTmpl() { fade(() => setTmplIdx(i => (i - 1 + TEMPLATES.length) % TEMPLATES.length)); }
  function nextTmpl() { fade(() => setTmplIdx(i => (i + 1) % TEMPLATES.length)); }
  function prevStep()  { if (showTransition) return; fade(() => setStepIdx(i => i - 1)); }

  function nextStep() {
    if (showTransition) return;
    if (showTour) { fade(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1))); return; }
    if (stepIdx === 2) { setShowBonusCard(true); return; }
    if (stepIdx >= STEPS.length - 1) return;
    const label = STEPS[stepIdx + 1].label;
    setTransLabel(label); setTransExiting(false); setShowTransition(true);
    setTimeout(() => {
      setStepIdx(i => i + 1); setTransExiting(true);
      setTimeout(() => setShowTransition(false), 640);
    }, 2300);
  }

  function continueToBonusStep() { setShowBonusCard(false); fade(() => setStepIdx(3)); }

  function toggleSelect() {
    setSelections(s => {
      if (s[step.key] === tmpl.id) { const n = { ...s }; delete n[step.key]; return n; }
      return { ...s, [step.key]: tmpl.id };
    });
  }

  async function saveAndClose() {
    setSaving(true);
    try {
      const payload: Record<string, { templateId: string; commentaire: string }> = {};
      for (const s of STEPS) payload[s.key] = { templateId: selections[s.key] ?? "", commentaire: commentaires[s.key] ?? "" };
      await setDoc(doc(db, "clients", clientId, "branding", "templates"), payload, { merge: true });
      await setDoc(doc(db, "clients", clientId, "branding", "main"), { completedSections: arrayUnion("templates") }, { merge: true });
      setSavedCard(true);
      setIsOpen(false);
    } finally { setSaving(false); }
  }

  async function saveCardTemplates() {
    setSavingCard(true);
    try {
      const payload: Record<string, { templateId: string; commentaire: string }> = {};
      for (const s of STEPS) payload[s.key] = { templateId: selections[s.key] ?? "", commentaire: commentaires[s.key] ?? "" };
      await setDoc(doc(db, "clients", clientId, "branding", "templates"), payload, { merge: true });
      await setDoc(doc(db, "clients", clientId, "branding", "main"), { completedSections: arrayUnion("templates") }, { merge: true });
      setSavedCard(true);
    } finally { setSavingCard(false); }
  }

  /* ─── Video renderer (shared) ────────────────────────────────────────── */
  function renderVideo(compact = false) {
    if (isBonusNocturne) return (
      <div style={{ maxWidth: 300, background: "#1C1C1E", borderRadius: 20, padding: compact ? 20 : 32, border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
        <div style={{ fontSize: compact ? 28 : 36, marginBottom: compact ? 10 : 14 }}>🌙</div>
        <p style={{ fontSize: compact ? 13 : 15, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>Bonus intégré à l'accueil</p>
        <p style={{ fontSize: compact ? 12 : 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>Le template Nocturne n'a pas d'écran Bonus distinct — la mécanique est intégrée à l'accueil.</p>
      </div>
    );
    if (videoUrl) {
      if (needsMockup) return (
        <div style={{ aspectRatio: "9/19.5", ...(compact ? { maxHeight: "100%" } : { height: "100%" }), borderRadius: compact ? 36 : 42, border: `${compact ? 6 : 10}px solid #2A2A2A`, background: "#111", overflow: "hidden", boxShadow: "0 0 0 1px rgba(255,255,255,0.06),0 24px 60px rgba(0,0,0,0.7)" }}>
          <video key={videoUrl} src={videoUrl} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center bottom", display: "block" }}/>
        </div>
      );
      return <video key={videoUrl} src={videoUrl} autoPlay muted loop playsInline style={{ ...(compact ? { maxHeight: "100%", maxWidth: "100%" } : { height: "100%", maxWidth: "100%" }), objectFit: "contain", display: "block" }}/>;
    }
    return (
      <div style={{ width: compact ? 180 : 220, height: compact ? 320 : 380, background: "#1C1C1E", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Monitor size={compact ? 22 : 28} color="rgba(255,255,255,0.15)" />
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>Aperçu bientôt disponible</p>
      </div>
    );
  }

  /* ─── Section card ──────────────────────────────────────────────────── */
  return (
    <>
      <div id="section-templates" style={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "#FFF1F2", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Monitor size={20} color="#E11D48" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Section 6 — Préférences des écrans</p>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Choisissez un template par page de votre application</p>
            </div>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: isComplete ? "#166534" : "#6B7280", background: isComplete ? "#F0FDF4" : "#F9FAFB", border: `1px solid ${isComplete ? "#BBF7D0" : "#E5E7EB"}`, borderRadius: 8, padding: "4px 10px", flexShrink: 0 }}>
            {isComplete && <CheckCircle2 size={12}/>}{isComplete ? "Complété" : "À compléter"}
          </span>
        </div>

        {chosenCount > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {STEPS.map(s => { const sel = selections[s.key]; const lbl = TEMPLATES.find(t => t.id === sel)?.label; return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, background: sel ? "#F0FDF4" : "#F9FAFB", border: `1px solid ${sel ? "#BBF7D0" : "#E5E7EB"}` }}>
                {sel && <CheckCircle2 size={11} color="#22C55E"/>}
                <span style={{ fontWeight: 500, color: sel ? "#166534" : "#9CA3AF" }}>{s.label}</span>
                {lbl && <span style={{ color: "#6B7280" }}>· {lbl}</span>}
              </div>
            ); })}
          </div>
        )}

        {chosenCount > 0 ? (
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 8 }}>
            <button onClick={handleOpenModal} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Modifier la sélection ({chosenCount}/7)
            </button>
            <button onClick={saveCardTemplates} disabled={savingCard} style={{ padding: "10px 24px", borderRadius: 10, border: "none", cursor: savingCard ? "not-allowed" : "pointer", background: savedCard ? "#22C55E" : "#0362E3", color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 200ms" }}>
              {savingCard ? "Enregistrement…" : savedCard ? "✓ Enregistré" : "Enregistrer"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <button onClick={handleOpenModal} style={{ padding: "13px 36px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#0362E3,#0251C1)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(3,98,227,0.35)" }}>
              Démarrer la sélection
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0D0D0D", display: "flex", flexDirection: "column" }}>
          <style>{CSS}</style>

          {/* Floating cursor */}
          {cursorVisible && (
            <div style={{ position: "fixed", left: cursorX, top: cursorY, zIndex: 10001, pointerEvents: "none", transition: "left 580ms cubic-bezier(.25,.46,.45,.94), top 580ms cubic-bezier(.25,.46,.45,.94)" }}>
              <CursorSVG clicking={cursorClicking}/>
            </div>
          )}

          {/* Section transition */}
          {showTransition && (
            <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "#0D0D0D", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, animation: transExiting ? "section-card-out 640ms cubic-bezier(.76,0,.24,1) forwards" : "none" }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase", animation: "section-text-in 500ms ease both" }}>Étape {stepIdx + 2} sur 7</p>
              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", margin: 0, animation: "section-text-in 500ms 60ms ease both" }}>Maintenant, choisissez votre template pour</p>
              <p style={{ fontSize: 44, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.8px", animation: "section-text-in 500ms 120ms ease both" }}>{transLabel}</p>
            </div>
          )}

          {/* Bonus card */}
          {showBonusCard && (
            <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(13,13,13,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ maxWidth: 460, width: "100%", background: "#1A1A1A", borderRadius: 20, padding: 32, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(3,98,227,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Gamepad2 size={22} color="#0362E3"/>
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>🎮 À propos du Bonus</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "0 0 18px" }}>Une note importante avant de continuer</p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.75, margin: "0 0 24px" }}>
                  Vous allez maintenant choisir votre type de jeu bonus. Sachez que nous pouvons reproduire pour tous les templates l'animation de points qui monte, visible dans le template Frais — il s'agit ici de choisir quel type de jeu vous préférez :{" "}
                  <span style={{ color: "#60A5FA", fontWeight: 500 }}>roue, dés, carte à gratter, machine à sous, plinko, ou reel</span>. Le style visuel sera ensuite entièrement adapté à vos couleurs.
                </p>
                <button onClick={continueToBonusStep} style={{ width: "100%", padding: "13px 24px", borderRadius: 10, border: "none", background: "#0362E3", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Compris, continuer →
                </button>
              </div>
            </div>
          )}

          {/* Close button — always accessible */}
          <button onClick={() => setIsOpen(false)} style={{ position: "absolute", top: 16, right: 16, zIndex: 20, width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16}/>
          </button>

          {/* ══════════════════════════════════════════════════════
              DEMO MODE — two-column layout
          ═══════════════════════════════════════════════════════ */}
          {demoActive && (
            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

              {/* ── LEFT COLUMN (60%) — real interface + cursor target ── */}
              <div style={{ width: "60%", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>

                {/* Compact header */}
                <div style={{ padding: "10px 28px 8px", flexShrink: 0 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 2px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Étape {stepIdx + 1} sur {STEPS.length}
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>{step.label}</p>
                  <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#0362E3", borderRadius: 1, width: `${((stepIdx + 1) / STEPS.length) * 100}%`, transition: "width 350ms ease" }}/>
                  </div>
                </div>

                {/* Template name */}
                <div style={{ textAlign: "center", flexShrink: 0, padding: "4px 0 6px", opacity: fading ? 0 : 1, transition: "opacity 160ms" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>{tmpl.label}</p>
                  {isFrais && <p style={{ fontSize: 11, color: "rgba(96,165,250,0.8)", margin: "3px 0 0" }}>App réelle — vos couleurs seront différentes</p>}
                </div>

                {/* Middle: [phone | select+type] side by side; dots outside overflow */}
                <div style={{ flex: 1, display: "flex", minHeight: 0, padding: "0 24px", gap: 24, opacity: fading ? 0 : 1, transition: "opacity 160ms" }}>

                  {/* LEFT sub-column: phone (clips to fit) + dots pinned below */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0 }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", minHeight: 0, width: "100%" }}>
                      {renderVideo(true)}
                    </div>
                    <div style={{ flexShrink: 0, padding: "6px 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={prevTmpl} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", padding: 3 }}><ChevronLeft size={18}/></button>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        {TEMPLATES.map((t, i) => {
                          const cur = i === tmplIdx; const sel = selections[step.key] === t.id;
                          return (
                            <div key={t.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                              {sel && <span style={{ fontSize: 8, fontWeight: 700, color: "#22C55E" }}>✓</span>}
                              <button
                                ref={el => { dotBtnRefs.current[i] = el; }}
                                onClick={() => fade(() => setTmplIdx(i))}
                                title={t.label}
                                style={{ width: cur ? 20 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", padding: 0, transition: "all 200ms", background: sel ? "#22C55E" : cur ? "#fff" : "rgba(255,255,255,0.2)" }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={nextTmpl} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", padding: 3 }}><ChevronRight size={18}/></button>
                    </div>
                  </div>

                  {/* RIGHT sub-column: select button + type target, vertically centred */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
                    <button
                      ref={selectBtnRef}
                      onClick={toggleSelect}
                      disabled={isBonusNocturne}
                      style={{ padding: "9px 20px", borderRadius: 10, border: "none", cursor: isBonusNocturne ? "default" : "pointer", background: isBonusNocturne ? "rgba(255,255,255,0.05)" : isSelected ? "#22C55E" : "rgba(255,255,255,0.1)", color: isBonusNocturne ? "rgba(255,255,255,0.3)" : "#fff", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, transition: "background 200ms", boxShadow: isSelected ? "0 4px 14px rgba(34,197,94,0.35)" : "none" }}
                    >
                      {isSelected ? <><Check size={13} strokeWidth={2.5}/> Sélectionné</> : isBonusNocturne ? "Non disponible" : "Sélectionner ce template"}
                    </button>
                    <div ref={typeAreaRef} style={{ height: 4 }}/>
                  </div>
                </div>

                {/* Suivant — visual reference for cursor (not user-interactive) */}
                <div style={{ flexShrink: 0, padding: "4px 24px 10px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    ref={nextBtnRef}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(3,98,227,0.3)", background: "rgba(3,98,227,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 500, cursor: "default", pointerEvents: "none" }}
                  >
                    Suivant <ChevronRight size={13}/>
                  </button>
                </div>
              </div>

              {/* ── RIGHT COLUMN (40%) — demo panel ── */}
              <div style={{ width: "40%", background: "#12122A", display: "flex", flexDirection: "column", padding: "32px 28px 24px" }}>

                {/* Badge */}
                <div style={{ marginBottom: 20 }}>
                  <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: "rgba(3,98,227,0.25)", border: "1px solid rgba(3,98,227,0.5)", color: "#60A5FA", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>
                    DÉMONSTRATION
                  </span>
                </div>

                {/* Step indicator */}
                <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
                  {TOUR_STEPS.map((_, i) => (
                    <div key={i} style={{ height: 3, flex: i === tourStep ? 2 : 1, borderRadius: 2, background: i <= tourStep ? "#0362E3" : "rgba(255,255,255,0.1)", transition: "all 300ms" }}/>
                  ))}
                </div>

                {/* Step label */}
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 8px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Étape {tourStep + 1} sur {TOUR_STEPS.length}
                </p>

                {/* Instruction title */}
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.3px", lineHeight: 1.2, animation: "demo-fade-in 400ms ease both" }} key={`title-${tourStep}`}>
                  {TOUR_STEPS[tourStep].title}
                </h2>

                {/* Description */}
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, margin: "0 0 20px", animation: "demo-fade-in 400ms 60ms ease both" }} key={`desc-${tourStep}`}>
                  {TOUR_STEPS[tourStep].desc}
                </p>

                {/* Comment box (step 2 only) */}
                {TOUR_STEPS[tourStep].showComment && (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 18px", animation: "demo-fade-in 400ms 100ms ease both" }}>
                      <p style={{ fontSize: 11, color: "rgba(3,98,227,0.8)", margin: "0 0 8px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Section {step.label}
                      </p>
                      <p style={{ fontSize: 14, color: "#E5E7EB", lineHeight: 1.65, margin: 0, minHeight: 44 }}>
                        {commentaires[step.key] ?? ""}
                        <span style={{ display: "inline-block", width: 2, height: "1em", background: "#60A5FA", marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 0.7s infinite" }}/>
                      </p>
                    </div>
                  </div>
                )}

                {/* Spacer */}
                {!TOUR_STEPS[tourStep].showComment && <div style={{ flex: 1 }}/>}

                {/* Suivant button — tour control */}
                <button
                  onClick={advanceTour}
                  style={{ width: "100%", padding: "13px 20px", borderRadius: 12, border: "none", background: "#0362E3", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(3,98,227,0.35)", marginTop: 16 }}
                >
                  {tourStep < 3 ? <>Suivant <ChevronRight size={16}/></> : "Voir le résumé →"}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TOUR FINAL CARD (step 4)
          ═══════════════════════════════════════════════════════ */}
          {showTour && tourStep === 4 && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
              <div style={{ maxWidth: 500, width: "100%", textAlign: "center", animation: "demo-fade-in 500ms ease both" }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 20px", letterSpacing: "-0.4px" }}>C'est à vous ! 🎯</p>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, margin: "0 0 14px" }}>
                  Les templates sont présentés aux couleurs AW Solution pour vous donner une idée du style — chaque section sera construite sur mesure à vos couleurs et à votre image.
                </p>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, margin: "0 0 32px" }}>
                  Le template <strong style={{ color: "#fff" }}>Frais</strong> est un exemple d'application réelle déjà conçue par notre équipe — c'est pourquoi ses couleurs sont différentes.
                </p>
                <button onClick={finishTour} style={{ padding: "14px 40px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#0362E3,#0251C1)", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 20px rgba(3,98,227,0.45)" }}>
                  Commencer ma sélection →
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              NORMAL MODE — two-column layout (phone left, controls right)
          ═══════════════════════════════════════════════════════ */}
          {!showTour && (
            <>
              {/* Top bar */}
              <div style={{ padding: "20px 40px 14px", flexShrink: 0 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Étape {stepIdx + 1} sur {STEPS.length}</p>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>{step.label}</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 12px" }}>{step.desc}</p>
                <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: "#0362E3", width: `${((stepIdx + 1) / STEPS.length) * 100}%`, transition: "width 350ms ease" }}/>
                </div>
              </div>

              {/* Middle: phone left + controls right */}
              <div style={{ flex: 1, display: "flex", minHeight: 0, padding: "0 32px", gap: 32 }}>

                {/* LEFT — phone + arrows + dots */}
                <div style={{ flex: "0 0 60%", display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0 }}>

                  {/* Template name */}
                  <div style={{ flexShrink: 0, textAlign: "center", padding: "0 0 8px", opacity: fading ? 0 : 1, transition: "opacity 160ms" }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>{tmpl.label}</h2>
                    {isFrais && <p style={{ fontSize: 11, color: "rgba(96,165,250,0.8)", margin: "3px 0 0" }}>Exemple d'app réelle — la vôtre sera entièrement à vos couleurs</p>}
                  </div>

                  {/* Phone + side arrows */}
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minHeight: 0, opacity: fading ? 0 : 1, transition: "opacity 160ms" }}>
                    <button onClick={prevTmpl} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", display: "flex", padding: 6, flexShrink: 0 }}><ChevronLeft size={24}/></button>
                    {renderVideo(false)}
                    <button onClick={nextTmpl} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", display: "flex", padding: 6, flexShrink: 0 }}><ChevronRight size={24}/></button>
                  </div>

                  {/* Dots */}
                  <div style={{ flexShrink: 0, padding: "10px 0 6px", display: "flex", gap: 8, alignItems: "center" }}>
                    {TEMPLATES.map((t, i) => {
                      const cur = i === tmplIdx; const sel = selections[step.key] === t.id;
                      return (
                        <div key={t.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          {sel && <span style={{ fontSize: 9, fontWeight: 700, color: "#22C55E" }}>✓</span>}
                          <button
                            ref={el => { dotBtnRefs.current[i] = el; }}
                            onClick={() => fade(() => setTmplIdx(i))}
                            title={t.label}
                            style={{ width: cur ? 24 : 10, height: 10, borderRadius: 5, border: "none", cursor: "pointer", padding: 0, transition: "all 200ms", background: sel ? "#22C55E" : cur ? "#fff" : "rgba(255,255,255,0.2)" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT — select + comment */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 4, paddingBottom: 8, minHeight: 0 }}>

                  {/* Select button */}
                  <button
                    ref={selectBtnRef}
                    onClick={toggleSelect}
                    disabled={isBonusNocturne}
                    style={{ padding: "13px 24px", borderRadius: 10, border: "none", cursor: isBonusNocturne ? "default" : "pointer", background: isBonusNocturne ? "rgba(255,255,255,0.05)" : isSelected ? "#22C55E" : "rgba(255,255,255,0.1)", color: isBonusNocturne ? "rgba(255,255,255,0.3)" : "#fff", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 200ms", boxShadow: isSelected ? "0 4px 14px rgba(34,197,94,0.35)" : "none", flexShrink: 0 }}
                  >
                    {isSelected ? <><Check size={15} strokeWidth={2.5}/> Sélectionné</> : isBonusNocturne ? "Non disponible" : "Sélectionner ce template"}
                  </button>

                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "20px 0", flexShrink: 0 }}/>

                  {/* Comment */}
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8, flexShrink: 0 }}>Vos commentaires pour cette page</label>
                  <textarea
                    value={commentaires[step.key] ?? ""}
                    onChange={e => setCommentaires(c => ({ ...c, [step.key]: e.target.value }))}
                    rows={5}
                    style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", padding: "12px 14px", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box", lineHeight: 1.6, width: "100%" }}
                    placeholder={PLACEHOLDERS[step.key]}
                  />
                </div>
              </div>

              {/* Bottom nav */}
              <div style={{ flexShrink: 0, padding: "12px 40px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.35)" }}>
                <button onClick={prevStep} disabled={stepIdx === 0} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: stepIdx === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 500, cursor: stepIdx === 0 ? "not-allowed" : "pointer" }}>
                  <ChevronLeft size={16}/> Précédent
                </button>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", margin: 0 }}>{chosenCount} / 7 sélectionné{chosenCount !== 1 ? "s" : ""}</p>
                {stepIdx < STEPS.length - 1 ? (
                  <button ref={nextBtnRef} onClick={nextStep} disabled={showTransition || !selections[step.key]} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, border: "none", background: (showTransition || !selections[step.key]) ? "rgba(255,255,255,0.07)" : "#0362E3", color: (showTransition || !selections[step.key]) ? "rgba(255,255,255,0.25)" : "#fff", fontSize: 14, fontWeight: 600, cursor: (showTransition || !selections[step.key]) ? "not-allowed" : "pointer", transition: "background 200ms, color 200ms" }}>
                    Suivant <ChevronRight size={16}/>
                  </button>
                ) : (
                  <button onClick={saveAndClose} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 10, border: "none", background: saving ? "#4B5563" : "#22C55E", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Enregistrement…" : "✓ Terminer et enregistrer"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
