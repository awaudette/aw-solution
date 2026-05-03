"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Star, RotateCw, Target } from "lucide-react";

const CAROUSEL_IMAGES = [
  { src: "/images/bonus.jpg",            alt: "Bonus quotidien" },
  { src: "/images/Recompenses.jpg",      alt: "Récompenses" },
  { src: "/images/menu.jpg",             alt: "Menu" },
  { src: "/images/promotions.jpg",       alt: "Promotions" },
  { src: "/images/recompenseDetail.jpg", alt: "Détail récompense" },
];

function PhoneMockup({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        borderRadius: 36,
        border: "2px solid rgba(255,255,255,0.12)",
        background: "#0a0a0a",
        boxShadow: "0 0 60px rgba(3,98,227,0.2), 0 30px 60px rgba(0,0,0,0.5)",
        overflow: "hidden",
        position: "relative",
        width: "100%",
        aspectRatio: "9/19.5",
      }}
    >
      {/* Dynamic island */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: 60,
          height: 6,
          borderRadius: 9999,
          background: "#000",
          zIndex: 2,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

const FEATURES = [
  {
    icon: Star,
    title: "Points et Récompenses",
    description:
      "Vos clients accumulent des points à chaque visite et échangent contre des récompenses que vous choisissez.",
  },
  {
    icon: RotateCw,
    title: "Roue Bonus Quotidienne",
    description:
      "Une mécanique de gamification qui crée une habitude de visite. Vos clients reviennent chaque jour.",
  },
  {
    icon: Target,
    title: "Promotions Ciblées",
    description:
      "Envoyez des offres à tous vos membres ou uniquement aux clients qui en ont besoin.",
  },
];

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: {
      duration: 0.65,
      delay,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  };
}

export default function AppFeatures() {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round((el.scrollLeft / (el.scrollWidth - el.clientWidth)) * (CAROUSEL_IMAGES.length - 1));
    setActiveIdx(Math.max(0, Math.min(CAROUSEL_IMAGES.length - 1, idx)));
  };

  return (
    <section style={{ background: "#000", width: "100%", paddingTop: 120, paddingBottom: 140 }}>
      <div
        className="flex flex-col lg:flex-row items-center"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
          gap: "clamp(3rem, 10vw, 10rem)",
        }}
      >
        {/* Left: text content */}
        <div className="w-full lg:flex-1 text-center lg:text-left">
          <motion.p
            {...fadeUp(0)}
            style={{
              fontSize: 11,
              letterSpacing: "4px",
              color: "#0362E3",
              textTransform: "uppercase",
              fontFamily: "var(--font-sora)",
              margin: "0 0 20px 0",
            }}
          >
            Pour vos clients
          </motion.p>

          <motion.h2
            {...fadeUp(0.1)}
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 800,
              fontFamily: "var(--font-sora)",
              color: "#fff",
              margin: "0 0 20px 0",
              lineHeight: 1.1,
            }}
          >
            Une application{" "}
            <span
              style={{
                fontFamily: "var(--font-playfair)",
                fontStyle: "italic",
                color: "#0362E3",
              }}
            >
              à votre image
            </span>
          </motion.h2>

          <motion.p
            {...fadeUp(0.2)}
            style={{
              fontSize: "1.05rem",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.7,
              margin: "0 0 52px 0",
              maxWidth: "30rem",
            }}
          >
            Branded à 100% pour votre entreprise. Vos clients accumulent des
            points, réclament des récompenses et restent engagés.
          </motion.p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  {...fadeUp(0.35 + i * 0.1)}
                  style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem" }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: "rgba(3,98,227,0.1)",
                      border: "1px solid rgba(3,98,227,0.22)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={19} color="#0362E3" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "0.975rem",
                        fontWeight: 700,
                        fontFamily: "var(--font-sora)",
                        color: "#fff",
                        margin: "0 0 6px 0",
                      }}
                    >
                      {feature.title}
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "rgba(255,255,255,0.38)",
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right: 3 phone mockups — desktop only */}
        <div
          className="hidden lg:flex"
          style={{
            flexShrink: 0,
            position: "relative",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {/* Blue glow behind center phone */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              background: "#0362E3",
              filter: "blur(80px)",
              opacity: 0.15,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          {/* Left phone — hidden on mobile */}
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 0.85, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, type: "spring", stiffness: 80, damping: 18 }}
            style={{
              width: 200,
              zIndex: 1,
              marginRight: -30,
              transform: "rotate(-8deg) translateY(40px)",
            }}
          >
            <PhoneMockup src="/images/promotions.jpg" alt="Promotions" />
          </motion.div>

          {/* Center phone */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.4, type: "spring", stiffness: 80, damping: 18 }}
            style={{ width: 230, zIndex: 3 }}
          >
            <PhoneMockup src="/images/bonus.jpg" alt="Bonus" />
          </motion.div>

          {/* Right phone — hidden on mobile */}
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 0.85, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, type: "spring", stiffness: 80, damping: 18 }}
            style={{
              width: 200,
              zIndex: 1,
              marginLeft: -30,
              transform: "rotate(8deg) translateY(40px)",
            }}
          >
            <PhoneMockup src="/images/Recompenses.jpg" alt="Récompenses" />
          </motion.div>
        </div>

        {/* Mobile carousel — replaces phone mockups below lg */}
        <div className="lg:hidden w-full">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="no-scrollbar"
            style={{
              display: "flex",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              gap: 16,
              padding: "0 24px",
              scrollbarWidth: "none",
            } as React.CSSProperties}
          >
            {CAROUSEL_IMAGES.map((img) => (
              <div
                key={img.src}
                style={{
                  width: "65vw",
                  flexShrink: 0,
                  scrollSnapAlign: "center",
                  borderRadius: 36,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  style={{ width: "100%", aspectRatio: "9/19.5", objectFit: "cover", display: "block" }}
                />
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            {CAROUSEL_IMAGES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: i === activeIdx ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.3)",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
