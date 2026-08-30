"use client";

/**
 * TourEngine.tsx
 *
 * Moteur de la visite guidée du portail client. Monté une seule fois dans
 * ClientLayoutWrapper — le seul composant qui survit à la navigation entre
 * sections — afin que la visite puisse traverser plusieurs pages.
 *
 * Le contenu (liste des étapes) vit dans src/lib/tourSteps.ts, séparé du
 * moteur. Voir ce fichier pour la forme d'une étape.
 *
 * Les données partagées (forfait, état de l'accueil, statut "déjà vue") et
 * les deux actions de démarrage viennent de TourProvider (voir ce fichier) —
 * ce composant-ci n'est plus responsable que du séquencement (navigation,
 * attente d'ancre, overlay, bulle) et enregistre ses implémentations réelles
 * de startFullTour/startSectionTour dans le contexte à son montage.
 *
 * État persisté dans sessionStorage (clé "tour_state_{clientId}") pour
 * survivre au router.push d'une section à l'autre : { active, stepIndex }.
 * Relu au montage pour reprendre la visite là où elle en était.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TOUR_STEPS, type TourStep } from "@/lib/tourSteps";
import { useTour } from "./TourProvider";
import { X } from "lucide-react";

// Logo AW Solution — repli si le client n'a pas encore de logo_url. Même
// URL que celle déjà utilisée dans support/page.tsx.
const AW_LOGO_URL =
  "https://firebasestorage.googleapis.com/v0/b/aw-portail.firebasestorage.app/o/logos%2FlogoAW.png?alt=media&token=84805ab1-6e47-4c82-a30c-fefb3343d4ee";

type Phase = "idle" | "welcome" | "waiting" | "active";

const MAX_ANCHOR_WAIT_MS = 4000;
const POST_SCROLL_DELAY_MS = 450;

const BUBBLE_WIDTH = 380;
/** Estimation utilisée seulement le temps qu'un premier rendu de la bulle
 *  existe dans le DOM pour être mesuré réellement (un ou deux frames). */
const BUBBLE_HEIGHT_FALLBACK = 180;
const MARGIN = 16;

function storageKey(clientId: string) {
  return `tour_state_${clientId}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Attend qu'un élément corresponde à `selector` dans le DOM, via
 *  MutationObserver. Résout avec l'élément dès qu'il existe, ou avec null
 *  passé le délai maximal — jamais de blocage indéfini (voir
 *  MAX_ANCHOR_WAIT_MS). Générique : sert à la fois aux ancres data-tour-id
 *  et aux sélecteurs preClickSelector. */
function waitForSelector(selector: string): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) { resolve(existing); return; }

    let settled = false;
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el && !settled) {
        settled = true;
        observer.disconnect();
        clearTimeout(timeout);
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(null);
      }
    }, MAX_ANCHOR_WAIT_MS);
  });
}

function waitForAnchor(anchor: string): Promise<Element | null> {
  return waitForSelector(`[data-tour-id="${anchor}"]`);
}

const STABLE_WINDOW_MS      = 200;
const STABLE_CHECK_MS       = 50;
const MAX_STABILIZE_WAIT_MS = 2000;
const RECT_EPSILON_PX       = 1;
const RESCROLL_THRESHOLD_PX = 24;

function rectsClose(a: DOMRect, b: DOMRect, eps: number): boolean {
  return Math.abs(a.top - b.top) <= eps && Math.abs(a.left - b.left) <= eps
    && Math.abs(a.width - b.width) <= eps && Math.abs(a.height - b.height) <= eps;
}

/** Attend que le rectangle de `el` cesse de bouger pendant STABLE_WINDOW_MS
 *  consécutives avant de résoudre — sinon un défilement calculé pendant
 *  qu'un bloc charge encore son contenu (ex: la messagerie qui reçoit ses
 *  messages en plusieurs vagues) se cale sur des dimensions déjà périmées.
 *  Abandonne après MAX_STABILIZE_WAIT_MS et résout quand même avec le
 *  dernier rectangle connu plutôt que de bloquer indéfiniment. */
function waitForStableRect(el: Element): Promise<DOMRect> {
  return new Promise((resolve) => {
    const start = Date.now();
    let lastRect     = el.getBoundingClientRect();
    let stableSince  = start;

    function check() {
      const now  = Date.now();
      const rect = el.getBoundingClientRect();

      if (rectsClose(rect, lastRect, RECT_EPSILON_PX)) {
        if (now - stableSince >= STABLE_WINDOW_MS) { resolve(rect); return; }
      } else {
        lastRect    = rect;
        stableSince = now;
      }

      if (now - start >= MAX_STABILIZE_WAIT_MS) { resolve(rect); return; }
      setTimeout(check, STABLE_CHECK_MS);
    }
    check();
  });
}

interface PlacedRect { top: number; left: number; width: number; height: number }

/** Place la bulle près du bloc ciblé : dessous → dessus → droite → gauche,
 *  la première position qui tient entièrement dans le viewport (marge
 *  MARGIN) est retenue. Si aucune ne tient (bloc très grand), on superpose
 *  un coin du bloc — celui le plus loin du centre du viewport, pour masquer
 *  le moins de contenu — et on le signale via `overlay: true`. */
function placeBubble(target: DOMRect, width: number, height: number): { rect: PlacedRect; overlay: boolean } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const candidates: PlacedRect[] = [
    { top: target.bottom + MARGIN, left: target.left + target.width / 2 - width / 2, width, height },
    { top: target.top - MARGIN - height, left: target.left + target.width / 2 - width / 2, width, height },
    { top: target.top + target.height / 2 - height / 2, left: target.right + MARGIN, width, height },
    { top: target.top + target.height / 2 - height / 2, left: target.left - MARGIN - width, width, height },
  ];

  for (const c of candidates) {
    const fits =
      c.top >= MARGIN && c.left >= MARGIN &&
      c.top + c.height <= vh - MARGIN && c.left + c.width <= vw - MARGIN;
    if (fits) return { rect: c, overlay: false };
  }

  const corners: PlacedRect[] = [
    { top: target.top,             left: target.left,          width, height },
    { top: target.top,             left: target.right - width, width, height },
    { top: target.bottom - height, left: target.left,          width, height },
    { top: target.bottom - height, left: target.right - width, width, height },
  ];
  const cx = vw / 2, cy = vh / 2;
  corners.sort((a, b) => {
    const da = Math.hypot(a.left + a.width / 2 - cx, a.top + a.height / 2 - cy);
    const db = Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy);
    return db - da; // le plus loin du centre en premier
  });
  return { rect: corners[0], overlay: true };
}

/** Garantie finale, appliquée dans tous les cas : le rectangle retenu ne
 *  dépasse jamais du viewport — on le repousse vers l'intérieur sinon. */
function clampToViewport(r: PlacedRect): PlacedRect {
  const vw = window.innerWidth, vh = window.innerHeight;
  return {
    ...r,
    left: Math.min(Math.max(r.left, MARGIN), Math.max(MARGIN, vw - r.width - MARGIN)),
    top:  Math.min(Math.max(r.top,  MARGIN), Math.max(MARGIN, vh - r.height - MARGIN)),
  };
}

export function TourEngine() {
  const router   = useRouter();
  const pathname = usePathname();
  const tour     = useTour();
  const { clientId, isPrestige, accueilEtat, clientLogoUrl, clientName, tourVu, markTourSeen, registerActions } = tour;

  const [phase, setPhase]         = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [bubbleRect, setBubbleRect] = useState<PlacedRect | null>(null);
  const [bubbleOverlay, setBubbleOverlay] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false); // pour le fondu d'entrée

  const bubbleRef = useRef<HTMLDivElement>(null);
  const opIdRef = useRef(0); // jeton d'opération — annule les navigations en vol devenues obsolètes

  // Deux filtres indépendants, symétriques dans les deux sens de navigation
  // puisqu'ils retirent les étapes du tableau plutôt que de les "sauter" en
  // cours de route : prestigeSeulement et section "accueil" quand le client
  // n'est plus/pas en état 1 (les 4 étapes ne ciblent que AccueilOnboarding).
  // La numérotation "étape X sur Y" s'ajuste d'elle-même puisqu'elle se base
  // sur ce même tableau filtré.
  const visibleSteps: TourStep[] = (isPrestige === null || accueilEtat === null)
    ? []
    : TOUR_STEPS.filter((s) => {
        if (s.prestigeSeulement && !isPrestige) return false;
        if (s.section === "accueil" && accueilEtat !== 1) return false;
        return true;
      });

  // ── Fondu d'entrée de l'écran de bienvenue ──────────────────────────────
  useEffect(() => {
    if (phase !== "welcome") { setWelcomeVisible(false); return; }
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWelcomeVisible(true));
    });
    return () => cancelAnimationFrame(raf1);
  }, [phase]);

  // ── Reprise après navigation : une fois forfait + état accueil connus, relire sessionStorage ──
  useEffect(() => {
    if (isPrestige === null || accueilEtat === null) return; // attend la résolution des deux
    if (phase !== "idle") return;    // ne pas interrompre une visite déjà en cours dans cet onglet

    let raw: string | null = null;
    try { raw = sessionStorage.getItem(storageKey(clientId)); } catch { /* stockage indisponible */ }
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as { active: boolean; stepIndex: number };
      if (saved.active && saved.stepIndex >= 0 && saved.stepIndex < TOUR_STEPS.length) {
        goToStep(Math.min(saved.stepIndex, visibleSteps.length - 1));
      }
    } catch { /* état corrompu — ignoré, pas de reprise */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrestige, accueilEtat]);

  // ── Déclencheur 1 — première connexion : affiche l'écran de bienvenue
  // automatiquement si tourVu est résolu à false (jamais false par défaut,
  // seulement une fois la route /api/client/tour-status répondue) et
  // qu'aucune reprise n'est déjà en cours (sessionStorage lu directement,
  // pas via `phase`, pour éviter une course avec l'effet de reprise
  // ci-dessus qui écrit dans sessionStorage de façon synchrone). ──────────
  useEffect(() => {
    if (tourVu !== false) return;
    if (phase !== "idle") return;
    let raw: string | null = null;
    try { raw = sessionStorage.getItem(storageKey(clientId)); } catch { /* ignoré */ }
    if (raw) return; // une reprise est prioritaire
    setPhase("welcome");
  }, [tourVu, phase, clientId]);

  function persist(state: { active: boolean; stepIndex: number }) {
    try { sessionStorage.setItem(storageKey(clientId), JSON.stringify(state)); } catch { /* ignoré */ }
  }

  function clearPersisted() {
    try { sessionStorage.removeItem(storageKey(clientId)); } catch { /* ignoré */ }
  }

  const goToStep = useCallback(async (index: number) => {
    const step = visibleSteps[index];
    if (!step) { finishTour(); return; }

    const myOpId = ++opIdRef.current;
    setStepIndex(index);
    setTargetRect(null);
    setBubbleRect(null);
    persist({ active: true, stepIndex: index });
    setPhase("waiting");

    const targetPath = `/client/${clientId}/${step.slug}`;
    if (pathname !== targetPath) {
      router.push(targetPath);
    }

    // Bascule d'un sous-onglet local à la page avant de chercher l'ancre,
    // si l'étape le demande (ex: activer "Journal de développement" avant
    // de pouvoir surligner son contenu). Le bouton visé peut lui-même être
    // en train d'apparaître (navigation en cours) — on l'attend comme une
    // ancre avant de cliquer, dans les deux sens de navigation.
    if (step.preClickSelector) {
      const trigger = await waitForSelector(step.preClickSelector);
      if (opIdRef.current !== myOpId) return;
      (trigger as HTMLElement | null)?.click();
    }

    const el = await waitForAnchor(step.anchor);
    if (opIdRef.current !== myOpId) return; // une navigation plus récente a pris le relais

    if (!el) {
      console.warn(`[tour] ancre "${step.anchor}" introuvable après ${MAX_ANCHOR_WAIT_MS}ms — passage à l'étape suivante`);
      if (index + 1 < visibleSteps.length) {
        goToStep(index + 1);
      } else {
        finishTour();
      }
      return;
    }

    // Attendre que le rectangle du bloc se stabilise avant de défiler — un
    // bloc encore en train de charger son contenu (ex: Support/Messagerie)
    // grandirait après un défilement calculé trop tôt, laissant le bas du
    // bloc hors écran.
    await waitForStableRect(el);
    if (opIdRef.current !== myOpId) return;

    // Le défilement doit amener le bloc à l'écran AVANT tout calcul de
    // position de la bulle — sinon celle-ci se positionnerait sur un
    // rectangle périmé (avant le déplacement de la page).
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(POST_SCROLL_DELAY_MS);
    if (opIdRef.current !== myOpId) return;

    setTargetRect(el.getBoundingClientRect());
    setPhase("active");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSteps, clientId, pathname, router]);

  function finishTour() {
    opIdRef.current++;
    clearPersisted();
    setPhase("idle");
    setTargetRect(null);
    setBubbleRect(null);
    markTourSeen();
  }

  function handleCommencer() {
    persist({ active: true, stepIndex: 0 });
    goToStep(0);
  }

  function handlePlusTard() {
    setPhase("idle");
    markTourSeen();
  }

  function handleSuivant() {
    if (stepIndex + 1 < visibleSteps.length) goToStep(stepIndex + 1);
    else finishTour();
  }

  function handlePrecedent() {
    if (stepIndex > 0) goToStep(stepIndex - 1);
  }

  // ── Enregistrement des actions réelles dans le contexte partagé — permet
  // à ClientSidebar (visite complète) et TourSectionButton (visite d'une
  // section, dans chacune des pages) de déclencher le moteur sans être ses
  // parents/enfants React. Toujours ré-enregistré quand goToStep change,
  // pour que les fermetures gardées ne soient jamais périmées. ────────────
  useEffect(() => {
    registerActions({
      startFullTour: () => {
        clearPersisted();
        opIdRef.current++;
        setPhase("welcome");
      },
      startSectionTour: (section: string) => {
        const idx = visibleSteps.findIndex((s) => s.section === section);
        if (idx === -1) return; // ne devrait pas arriver — TourSectionButton se cache déjà dans ce cas
        goToStep(idx);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerActions, goToStep, visibleSteps, clientId]);

  // ── Suivi continu, en une seule boucle : rectangle de l'ancre (pour
  // l'overlay de surbrillance) ET position de la bulle (recalculée à
  // chaque frame à partir de ce même rectangle). Nécessaire parce qu'une
  // simple écoute scroll/resize ne suffit pas : survoler ClientSidebar
  // change marginLeft de <main> (56 → 220px) sans déclencher ces événements
  // — la bulle doit rester collée au bloc dans ce cas comme dans les autres.
  useEffect(() => {
    if (phase !== "active") return;
    const step = visibleSteps[stepIndex];
    if (!step) return;

    let raf: number;
    function tick() {
      const el = document.querySelector(`[data-tour-id="${step!.anchor}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        const measuredHeight = bubbleRef.current?.getBoundingClientRect().height || BUBBLE_HEIGHT_FALLBACK;
        const { rect: placed, overlay } = placeBubble(rect, BUBBLE_WIDTH, measuredHeight);
        setBubbleRect(clampToViewport(placed));
        setBubbleOverlay(overlay);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, stepIndex, visibleSteps]);

  // ── Correction du défilement si le bloc continue de changer après avoir
  // été affiché (ex: Support/Messagerie qui reçoit ses messages en
  // plusieurs vagues après le défilement initial). La boucle rAF ci-dessus
  // garde l'overlay/la bulle collés au bloc quoi qu'il arrive, mais elle ne
  // redéfile jamais la page — c'est le rôle de cet effet, avec un seuil pour
  // ignorer les micro-variations et ne pas redéfiler en boucle.
  useEffect(() => {
    if (phase !== "active") return;
    const step = visibleSteps[stepIndex];
    if (!step) return;
    const el = document.querySelector(`[data-tour-id="${step.anchor}"]`);
    if (!el) return;

    let lastRect     = el.getBoundingClientRect();
    let rescrolling  = false;

    const observer = new ResizeObserver(() => {
      if (rescrolling) return;
      const rect = el.getBoundingClientRect();
      const changed =
        Math.abs(rect.top    - lastRect.top)    > RESCROLL_THRESHOLD_PX ||
        Math.abs(rect.left   - lastRect.left)   > RESCROLL_THRESHOLD_PX ||
        Math.abs(rect.width  - lastRect.width)  > RESCROLL_THRESHOLD_PX ||
        Math.abs(rect.height - lastRect.height) > RESCROLL_THRESHOLD_PX;

      if (changed) {
        rescrolling = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          lastRect    = el.getBoundingClientRect();
          rescrolling = false;
        }, POST_SCROLL_DELAY_MS);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [phase, stepIndex, visibleSteps]);

  // ── Rendu ────────────────────────────────────────────────────────────────

  if (phase === "welcome") {
    const logoSrc = clientLogoUrl || AW_LOGO_URL;
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "radial-gradient(circle at 50% 32%, rgba(3,98,227,0.32), transparent 55%), #050609",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: welcomeVisible ? 1 : 0,
          transition: "opacity 700ms ease",
        }}
      >
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            textAlign: "center", maxWidth: 620, padding: "0 40px",
          }}
        >
          <img
            src={logoSrc}
            alt=""
            style={{ height: 120, width: "auto", maxWidth: "100%", objectFit: "contain", marginBottom: 40 }}
          />
          <p style={{
            fontSize: 44, fontWeight: 700, color: "#fff",
            letterSpacing: "-0.5px", lineHeight: 1.1, margin: "0 0 28px",
          }}>
            {clientName || "Votre commerce"}
          </p>
          <h1 style={{
            fontSize: 22, fontWeight: 600, color: "#7EB2FF",
            margin: "0 0 20px",
          }}>
            Bienvenue sur votre portail
          </h1>
          <p style={{
            fontSize: 17, color: "rgba(255,255,255,0.65)",
            lineHeight: 1.65, maxWidth: 480, margin: "0 0 56px",
          }}>
            C&apos;est ici que vous suivrez l&apos;avancement de votre application, consulterez vos
            données et communiquerez avec notre équipe. Laissez-nous vous faire visiter.
          </p>
          <button
            onClick={handleCommencer}
            style={{
              padding: "16px 40px", borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: "#0362E3", color: "#fff", border: "none", cursor: "pointer",
              boxShadow: "0 12px 32px rgba(3,98,227,0.45)", marginBottom: 24,
            }}
          >
            Commencer la visite
          </button>
          <button
            onClick={handlePlusTard}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 14, color: "rgba(255,255,255,0.5)",
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    );
  }

  if (phase === "active") {
    const step = visibleSteps[stepIndex];
    const padding = 8;
    const spotlightStyle: React.CSSProperties | null = targetRect ? {
      position: "fixed",
      top: targetRect.top - padding,
      left: targetRect.left - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
      borderRadius: 10,
      boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
      pointerEvents: "none",
      zIndex: 100,
      transition: "top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease",
    } : null;

    return (
      <>
        {spotlightStyle && <div style={spotlightStyle} />}

        {/* Bulle flottante — position recalculée en continu (voir l'effet
            plus haut), toujours garantie dans le viewport (clampToViewport). */}
        <div
          ref={bubbleRef}
          style={{
            position: "fixed",
            top: bubbleRect?.top ?? -9999,
            left: bubbleRect?.left ?? -9999,
            width: BUBBLE_WIDTH,
            boxSizing: "border-box",
            visibility: bubbleRect ? "visible" : "hidden",
            background: "#fff",
            borderRadius: 14,
            boxShadow: bubbleOverlay
              ? "0 20px 48px rgba(0,0,0,0.38)"   // ombre plus marquée quand la bulle chevauche le bloc
              : "0 12px 32px rgba(0,0,0,0.22)",
            padding: 20,
            zIndex: 101,
            transition: "top 150ms ease, left 150ms ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#0362E3", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Étape {stepIndex + 1} sur {visibleSteps.length}
            </p>
            <button
              onClick={finishTour}
              aria-label="Quitter la visite"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2, display: "flex", flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: "0 0 6px" }}>{step?.titre}</p>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: "0 0 16px", whiteSpace: "pre-line" }}>{step?.texte}</p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <button
              onClick={handlePrecedent}
              disabled={stepIndex === 0}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "1px solid #E5E7EB", background: "#fff",
                color: stepIndex === 0 ? "#D1D5DB" : "#374151",
                cursor: stepIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              Précédent
            </button>
            <button
              onClick={handleSuivant}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: "none", background: "#0362E3", color: "#fff", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(3, 98, 227, 0.35)",
              }}
            >
              {stepIndex + 1 < visibleSteps.length ? "Suivant" : "Terminer"}
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
