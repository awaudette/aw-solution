"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const TITLE_LINES = [
  [
    { text: "Transformez", accent: false },
    { text: "chaque", accent: false },
  ],
  [
    { text: "visite", accent: false },
    { text: "en", accent: false },
    { text: "habitude.", accent: true },
  ],
];

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, delay, ease },
  };
}

function mobileFadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease },
  };
}

function IntroStars() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Star = { x: number; y: number; vx: number; vy: number; r: number };
    const stars: Star[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 0.6 + 0.4,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = canvas.width;
        else if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        else if (s.y > canvas.height) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"intro" | "exit" | "hero">("intro");
  const [isMobile, setIsMobile] = useState(false);
  const [heroKey, setHeroKey] = useState(0);

  // Mobile intro sequence — desktop jumps straight to "hero"
  useEffect(() => {
    if (window.innerWidth >= 769) {
      setPhase("hero");
      return;
    }
    setIsMobile(true);
    const t1 = setTimeout(() => setPhase("exit"), 3200);
    const t2 = setTimeout(() => {
      setPhase("hero");
      setHeroKey((k) => k + 1);
    }, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    type Star = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const stars: Star[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 0.7 + 0.5,
      a: 0.7,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = canvas.width;
        else if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        else if (s.y > canvas.height) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const showIntro = isMobile && (phase === "intro" || phase === "exit");
  const fu = isMobile ? mobileFadeUp : fadeUp;
  const badgeDelay    = isMobile ? 0    : 0.2;
  const h1StartDelay  = isMobile ? 0.15 : 0.4;
  const subtitleDelay = isMobile ? 0.30 : 0.8;
  const ctaDelay      = isMobile ? 0.45 : 1.0;

  return (
    <>
      {/* Mobile-only cinematic intro — invisible on desktop */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "#020818",
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Stars */}
            <IntroStars />

            {/* Radial glow */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at center, rgba(20,173,215,0.3) 0%, transparent 65%)",
                pointerEvents: "none",
              }}
            />

            {/* Rotating ring */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              transition={{
                opacity: { duration: 0.5, delay: 0.8 },
                rotate: { duration: 12, repeat: Infinity, ease: "linear" },
              }}
              style={{
                position: "absolute",
                width: 300,
                height: 300,
                borderRadius: "50%",
                border: "1px solid rgba(20,173,215,0.2)",
                pointerEvents: "none",
              }}
            />

            {/* Logo + text */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo.png" alt="AW Solution" style={{ width: 80, display: "block" }} />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "4px", margin: "12px 0 0 0", fontFamily: "var(--font-sora)" }}
              >
                AW Solution
              </motion.p>

              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.3em", marginTop: 16, maxWidth: 260, textAlign: "center" }}>
                {["Transformez", "chaque", "visite", "en", "habitude."].map((word, i) => (
                  <motion.span
                    key={word}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 + i * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                    style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Phones — Phase 3 */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "1rem", marginTop: 32, alignItems: "flex-end" }}>
              {/* Left phone */}
              <motion.div
                style={{ transformPerspective: 800 }}
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              >
                <div style={{ width: "38vw", borderRadius: 36, border: "1px solid rgba(255,255,255,0.15)", overflow: "hidden", boxShadow: "0 0 80px rgba(20,173,215,0.3)", background: "#0a0a0a", transform: "rotateY(8deg) rotateZ(-2deg)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/HomePagePokeStation.jpg" alt="AW Solution app" style={{ width: "100%", aspectRatio: "9/19.5", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                </div>
              </motion.div>

              {/* Right phone */}
              <motion.div
                style={{ transformPerspective: 800 }}
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              >
                <div style={{ width: "38vw", borderRadius: 36, border: "1px solid rgba(255,255,255,0.15)", overflow: "hidden", boxShadow: "0 0 80px rgba(20,173,215,0.3)", background: "#0a0a0a", transform: "rotateY(-8deg) rotateZ(2deg)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/HomePageGolf.jpg" alt="AW Solution dashboard" style={{ width: "100%", aspectRatio: "9/19.5", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section
        className="relative flex flex-col lg:flex-row overflow-hidden"
        style={{ height: "100vh", background: "#000" }}
      >
        {/* Stars canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
        />

        {/* Blue orb */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "#0362E3",
            filter: "blur(80px)",
            opacity: 0.45,
            left: "calc(50% - 350px)",
            top: "calc(50% - 350px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
          animate={{ x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />

        {/* Left column */}
        <div
          className="relative z-10 w-full lg:w-1/2 h-full flex flex-col justify-center items-center lg:items-start text-center lg:text-left px-6 lg:pl-[clamp(10rem,18vw,22rem)] lg:pr-12"
        >
          {/* key increments on mobile after intro, triggering fresh stagger */}
          <div key={heroKey} style={{ display: "flex", flexDirection: "column", gap: "1.75rem", width: "100%", maxWidth: 600 }}>

            {/* Badge */}
            <motion.div {...fu(badgeDelay)} style={{ display: "inline-flex" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <span style={{ position: "relative", display: "flex", height: 8, width: 8, flexShrink: 0 }}>
                  <span
                    className="animate-ping"
                    style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#0362E3", opacity: 0.75 }}
                  />
                  <span style={{ position: "relative", display: "inline-flex", height: 8, width: 8, borderRadius: "50%", background: "#0362E3" }} />
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "#0362E3" }}>
                  NOUVEAU
                </span>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                  · Alertes automatisées intégrées
                </span>
              </div>
            </motion.div>

            {/* Title */}
            <h1
              className="text-[clamp(1.8rem,8vw,2.8rem)] md:text-[clamp(2.2rem,3.5vw,3.5rem)]"
              style={{
                fontWeight: 800,
                fontFamily: "var(--font-sora)",
                lineHeight: 1.08,
                margin: 0,
              }}
            >
              {(() => {
                let wordIndex = 0;
                return TITLE_LINES.map((line, li) => (
                  <span key={li} style={{ display: "block" }}>
                    {line.map((word) => {
                      const delay = h1StartDelay + wordIndex++ * 0.08;
                      return word.accent ? (
                        <motion.span
                          key={word.text}
                          {...fu(delay)}
                          style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic", fontWeight: 800, color: "#0362E3" }}
                        >
                          {word.text}
                        </motion.span>
                      ) : (
                        <motion.span
                          key={word.text}
                          {...fu(delay)}
                          style={{ color: "#F0F4FF", marginRight: "0.4em" }}
                        >
                          {word.text}
                        </motion.span>
                      );
                    })}
                  </span>
                ));
              })()}
            </h1>

            {/* Subtitle */}
            <motion.p
              {...fu(subtitleDelay)}
              style={{ fontSize: "1.1rem", color: "rgba(240,244,255,0.5)", lineHeight: 1.65, margin: 0, maxWidth: "28rem" }}
            >
              Sans données, sans contact, vous gérez votre entreprise à l&apos;aveugle. La fidélité, ce n&apos;est pas du hasard.
            </motion.p>

            {/* CTA */}
            <motion.div {...fu(ctaDelay)}>
              <Link href="/demo" className="block lg:inline-block" style={{ textDecoration: "none" }}>
                <button
                  className="w-full lg:w-auto"
                  style={{ background: "#0362E3", border: "none", borderRadius: "9999px", padding: "1rem 2rem", color: "#fff", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", transition: "box-shadow 0.3s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 28px rgba(3,98,227,0.55), 0 0 70px rgba(3,98,227,0.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                >
                  Demander votre démo
                </button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Right column — desktop only, pixel-perfect unchanged */}
        <div
          className="hidden lg:flex relative flex-shrink-0 w-1/2 items-center justify-center"
          style={{ zIndex: 5, height: "100vh" }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "#0362E3",
              filter: "blur(100px)",
              opacity: 0.2,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: "-20px",
              transform: "translateX(-3rem) translateY(2rem)",
            }}
          >
            {/* Left phone */}
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.5 }}
              style={{ marginRight: -20, zIndex: 1 }}
            >
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 255,
                  borderRadius: 36,
                  border: "1px solid rgba(255,255,255,0.15)",
                  overflow: "hidden",
                  boxShadow: "0 0 60px rgba(3,98,227,0.25), 0 40px 80px rgba(0,0,0,0.5)",
                  background: "#0a0a0a",
                  transform: "rotate(-6deg) translateY(30px)",
                  position: "relative",
                }}
              >
                <div
                  aria-hidden
                  style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 60, height: 6, borderRadius: 9999, background: "#000", zIndex: 10 }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/HomePagePokeStation.jpg"
                  alt="AW Solution — app client"
                  style={{ width: "100%", aspectRatio: "9 / 19.5", objectFit: "cover", objectPosition: "top center", display: "block", imageRendering: "crisp-edges" }}
                />
              </motion.div>
            </motion.div>

            {/* Right phone */}
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.7 }}
              style={{ zIndex: 2 }}
            >
              <motion.div
                animate={{ y: [-12, 0, -12] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 275,
                  borderRadius: 36,
                  border: "1px solid rgba(255,255,255,0.15)",
                  overflow: "hidden",
                  boxShadow: "0 0 80px rgba(3,98,227,0.35), 0 40px 80px rgba(0,0,0,0.6)",
                  background: "#0a0a0a",
                  position: "relative",
                }}
              >
                <div
                  aria-hidden
                  style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 60, height: 6, borderRadius: 9999, background: "#000", zIndex: 10 }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/HomePageGolf.jpg"
                  alt="AW Solution — dashboard"
                  style={{ width: "100%", aspectRatio: "9 / 19.5", objectFit: "cover", objectPosition: "top center", display: "block", imageRendering: "crisp-edges" }}
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
