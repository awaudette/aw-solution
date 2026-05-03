"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const TITLE_LINES = [
  [
    { text: "Vos", accent: false },
    { text: "clients", accent: false },
  ],
  [
    { text: "disparaissent.", accent: true },
  ],
  [
    { text: "Vous", accent: false },
    { text: "regardez.", accent: false },
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

function IntroPhone({
  src,
  alt,
  rotateYInitial,
  exitDir,
  isExit,
}: {
  src: string;
  alt: string;
  rotateYInitial: number;
  exitDir: -1 | 1;
  isExit: boolean;
}) {
  return (
    <motion.div
      style={{ transformPerspective: 800 }}
      initial={{ opacity: 0, rotateY: rotateYInitial, scale: 0.85 }}
      animate={
        isExit
          ? { x: `${exitDir * 120}vw`, scale: 0.6, opacity: 0 }
          : { opacity: 1, rotateY: 0, scale: 1 }
      }
      transition={
        isExit
          ? { duration: 0.6, ease: "easeIn" }
          : { duration: 0.8, ease }
      }
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: "42vw",
          borderRadius: 36,
          border: "1px solid rgba(255,255,255,0.15)",
          overflow: "hidden",
          boxShadow: "0 0 80px rgba(20,173,215,0.3)",
          background: "#0a0a0a",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            aspectRatio: "9/19.5",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
          }}
        />
      </motion.div>
    </motion.div>
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
    const t1 = setTimeout(() => setPhase("exit"), 2300);
    const t2 = setTimeout(() => {
      setPhase("hero");
      setHeroKey((k) => k + 1);
    }, 2900);
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
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Radial glow centered behind phones */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at center, rgba(20,173,215,0.25) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* Slowly rotating ring */}
            <motion.div
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                width: 370,
                height: 370,
                borderRadius: "50%",
                border: "1px solid rgba(20,173,215,0.15)",
                pointerEvents: "none",
              }}
            />

            {/* Phone pair */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                position: "relative",
                zIndex: 1,
                alignItems: "flex-end",
              }}
            >
              <IntroPhone
                src="/images/HomePagePokeStation.jpg"
                alt="AW Solution app client"
                rotateYInitial={25}
                exitDir={-1}
                isExit={phase === "exit"}
              />
              <IntroPhone
                src="/images/HomePageGolf.jpg"
                alt="AW Solution dashboard"
                rotateYInitial={-25}
                exitDir={1}
                isExit={phase === "exit"}
              />
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
              style={{
                fontSize: "clamp(2.8rem, 5vw, 4.25rem)",
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
              Sans données, sans contact, vous gérez votre entreprise à l&apos;aveugle.
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
