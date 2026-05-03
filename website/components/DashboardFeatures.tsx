"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Cake, AlertTriangle, TrendingUp, Star, Sparkles, User, Moon, XCircle } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const ALERT_CARDS = [
  {
    icon: Cake,
    color: "#0362E3",
    title: "2 anniversaires cette semaine",
    subtitle: "Envoyez-leur une surprise avant qu'il soit trop tard.",
  },
  {
    icon: AlertTriangle,
    color: "#FFD700",
    title: "12 membres à risque de partir",
    subtitle: "Un rappel maintenant peut les garder.",
  },
  {
    icon: TrendingUp,
    color: "#2ECC8A",
    title: "5 gros dépensiers ce mois-ci",
    subtitle: "Récompensez-les, transformez-les en VIP.",
  },
];

const SEGMENT_PILLS = [
  { icon: Star,          color: "#2ECC8A", label: "VIP"      },
  { icon: Sparkles,      color: "#14ADD7", label: "Nouveau"  },
  { icon: User,          color: "#9B9B9C", label: "Régulier" },
  { icon: AlertTriangle, color: "#FFD700", label: "À risque" },
  { icon: Moon,          color: "#9B9B9C", label: "Dormant"  },
  { icon: XCircle,       color: "#E84545", label: "Perdu"    },
];

function PhoneMockup({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        borderRadius: 36,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "#0a0a0a",
        boxShadow: "0 0 60px rgba(3,98,227,0.2), 0 30px 60px rgba(0,0,0,0.5)",
        overflow: "hidden",
        position: "relative",
        width: "100%",
        aspectRatio: "9/19.5",
      }}
    >
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
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top center",
          imageRendering: "crisp-edges",
        }}
      />
    </div>
  );
}

const STATS = [
  { prefix: "+", numericValue: 30, suffix: "%",   label: "Augmentation des revenus"    },
  { prefix: "",  numericValue: 5,  suffix: "x",   label: "Moins coûteux de fidéliser"  },
  { prefix: "",  numericValue: 70, suffix: "%",   label: "Clients qui reviennent plus" },
  { prefix: "",  numericValue: 2,  suffix: " min", label: "Pour lancer une campagne"   },
];

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const spring = { type: "spring" as const, stiffness: 80, damping: 18 };

export default function DashboardFeatures() {
  const statRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      STATS.forEach((stat, i) => {
        const el = statRefs.current[i];
        if (!el) return;
        const obj = { value: 0 };
        gsap.to(obj, {
          value: stat.numericValue,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
          onUpdate: () => {
            el.textContent = stat.prefix + Math.round(obj.value) + stat.suffix;
          },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section style={{ background: "#050d1a", width: "100%", paddingTop: 120, paddingBottom: 140 }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            style={{
              fontSize: 11,
              letterSpacing: "4px",
              color: "#0362E3",
              textTransform: "uppercase",
              fontFamily: "var(--font-sora)",
              margin: "0 0 20px 0",
            }}
          >
            Tableau de Bord
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1, ease }}
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 800,
              fontFamily: "var(--font-sora)",
              color: "#fff",
              margin: "0 0 20px 0",
              lineHeight: 1.1,
            }}
          >
            Votre assistant qui ne dort jamais.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.2, ease }}
            style={{
              fontSize: "1.05rem",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.7,
              margin: "0 auto",
              maxWidth: 500,
            }}
          >
            Chaque matin, vos alertes sont prêtes. Vous n&apos;avez qu&apos;à agir.
          </motion.p>
        </div>

        {/* Alertes sub-section */}
        <div
          className="flex flex-col lg:flex-row items-center"
          style={{ gap: "clamp(3rem, 10vw, 10rem)" }}
        >
          {/* Left: two phones side by side */}
          <div
            className="relative flex items-end justify-center w-full max-w-[260px] mx-auto lg:mx-0 lg:flex-shrink-0 lg:w-auto"
          >
            {/* Blue glow */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                width: 350,
                height: 350,
                background: "#0362E3",
                filter: "blur(90px)",
                opacity: 0.12,
                zIndex: 0,
                pointerEvents: "none",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />

            {/* Left phone — hidden on mobile */}
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 0.85, x: 0, rotate: -4, y: 20 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
              style={{ width: 300, zIndex: 1, marginRight: -20, flexShrink: 0, position: "relative" }}
            >
              <PhoneMockup src="/images/alerte1.jpg" alt="Alertes — vue secondaire" />
            </motion.div>

            {/* Right phone */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0, rotate: 3 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.4 }}
              className="w-[240px] lg:w-[300px]"
              style={{ zIndex: 2, flexShrink: 0, position: "relative" }}
            >
              <PhoneMockup src="/images/alerte.jpg" alt="Alertes automatisées" />
            </motion.div>
          </div>

          {/* Right: text content */}
          <div className="w-full lg:flex-1 lg:min-w-0 lg:pl-28">
            {/* Feature tag */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: 9999,
                background: "rgba(3,98,227,0.12)",
                border: "1px solid rgba(3,98,227,0.25)",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-sora)",
                  color: "#0362E3",
                  letterSpacing: "0.04em",
                }}
              >
                Alertes Automatisées
              </span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.3 }}
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
                fontWeight: 800,
                fontFamily: "var(--font-sora)",
                color: "#fff",
                margin: "0 0 16px 0",
                lineHeight: 1.1,
              }}
            >
              Chaque matin, vous savez exactement quoi faire.
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.4 }}
              style={{
                fontSize: "1.05rem",
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.7,
                margin: "0 0 32px 0",
                maxWidth: "28rem",
              }}
            >
              Clients à risque, anniversaires, congés fériés, périodes mortes, clients VIP, membres dormants, gros dépensiers, vous êtes toujours un pas d&apos;avance.
            </motion.p>

            {/* Alert cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ALERT_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.15, ease }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.875rem",
                      padding: "14px 18px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: `3px solid ${card.color}`,
                    }}
                  >
                    <Icon size={16} color={card.color} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                    <div>
                      <p style={{
                        fontSize: "0.875rem",
                        fontFamily: "var(--font-sora)",
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        margin: "0 0 3px 0",
                      }}>
                        {card.title}
                      </p>
                      <p style={{
                        fontSize: "0.775rem",
                        fontFamily: "var(--font-sora)",
                        fontWeight: 400,
                        color: "rgba(255,255,255,0.4)",
                        margin: 0,
                      }}>
                        {card.subtitle}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Segmentation sub-section */}
        <div
          className="flex flex-col-reverse lg:flex-row items-center"
          style={{ gap: "clamp(3rem, 10vw, 10rem)", marginTop: 100 }}
        >
          {/* Left: text content */}
          <div className="w-full lg:flex-1">
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: 9999,
                background: "rgba(3,98,227,0.12)",
                border: "1px solid rgba(3,98,227,0.25)",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-sora)",
                  color: "#0362E3",
                  letterSpacing: "0.04em",
                }}
              >
                Segmentation Intelligente
              </span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.3 }}
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
                fontWeight: 800,
                fontFamily: "var(--font-sora)",
                color: "#fff",
                margin: "0 0 16px 0",
                lineHeight: 1.1,
              }}
            >
              Connaissez chaque client par nom.
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.4 }}
              style={{
                fontSize: "1.05rem",
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.7,
                margin: "0 0 32px 0",
                maxWidth: "28rem",
              }}
            >
              VIP, nouveaux, à risque, dormants, perdus, chaque client est
              classifié automatiquement selon son comportement réel.
            </motion.p>

            {/* Segment pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {SEGMENT_PILLS.map((seg, i) => {
                const Icon = seg.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.08, ease }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "6px 12px",
                      borderRadius: 9999,
                      background: `${seg.color}18`,
                      border: `1px solid ${seg.color}55`,
                    }}
                  >
                    <Icon size={13} color={seg.color} strokeWidth={2} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "var(--font-sora)",
                        color: seg.color,
                      }}
                    >
                      {seg.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right: two phones side by side */}
          <div
            className="relative flex items-end justify-center w-full max-w-[260px] mx-auto lg:mx-0 lg:flex-shrink-0 lg:w-auto"
          >
            {/* Blue glow */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                width: 350,
                height: 350,
                background: "#0362E3",
                filter: "blur(90px)",
                opacity: 0.12,
                zIndex: 0,
                pointerEvents: "none",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />

            {/* Left phone — hidden on mobile */}
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 0.85, x: 0, rotate: -4, y: 20 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
              style={{ width: 300, zIndex: 1, marginRight: -20, flexShrink: 0, position: "relative" }}
            >
              <PhoneMockup src="/images/segment1.jpg" alt="Segmentation — vue secondaire" />
            </motion.div>

            {/* Right phone */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0, rotate: 3 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.4 }}
              className="w-[240px] lg:w-[300px]"
              style={{ zIndex: 2, flexShrink: 0, position: "relative" }}
            >
              <PhoneMockup src="/images/segment.jpg" alt="Segmentation clients" />
            </motion.div>
          </div>
        </div>

        {/* Analytiques sub-section */}
        <div
          className="flex flex-col lg:flex-row items-center"
          style={{ gap: "clamp(3rem, 10vw, 10rem)", marginTop: 100 }}
        >
          {/* Left: two phones side by side */}
          <div
            className="relative flex items-end justify-center w-full max-w-[260px] mx-auto lg:mx-0 lg:flex-shrink-0 lg:w-auto"
          >
            {/* Blue glow */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                width: 350,
                height: 350,
                background: "#0362E3",
                filter: "blur(90px)",
                opacity: 0.12,
                zIndex: 0,
                pointerEvents: "none",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />

            {/* Left phone — hidden on mobile */}
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 0.85, x: 0, rotate: -4, y: 20 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
              style={{ width: 300, zIndex: 1, marginRight: -20, flexShrink: 0, position: "relative" }}
            >
              <PhoneMockup src="/images/analytics2.jpg" alt="Analytiques — vue secondaire" />
            </motion.div>

            {/* Right phone */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0, rotate: 3 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.4 }}
              className="w-[240px] lg:w-[300px]"
              style={{ zIndex: 2, flexShrink: 0, position: "relative" }}
            >
              <PhoneMockup src="/images/analytics3.jpg" alt="Analytiques avancées" />
            </motion.div>
          </div>

          {/* Right: text content */}
          <div className="w-full lg:flex-1 lg:min-w-0 lg:pl-40">
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.2 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: 9999,
                background: "rgba(3,98,227,0.12)",
                border: "1px solid rgba(3,98,227,0.25)",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-sora)",
                  color: "#0362E3",
                  letterSpacing: "0.04em",
                }}
              >
                Analytiques Avancées
              </span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.3 }}
              style={{
                fontSize: "clamp(2.6rem, 3vw, 3.2rem)",
                fontWeight: 800,
                fontFamily: "var(--font-sora)",
                color: "#fff",
                margin: "0 0 16px 0",
                lineHeight: 1.1,
              }}
            >
              Des données qui vous<br />font gagner de l&apos;argent.
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.4 }}
              style={{
                fontSize: "1.05rem",
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.7,
                margin: "0 0 36px 0",
                maxWidth: "28rem",
              }}
            >
              Revenus, visites, panier moyen, taux de rétention, ROI du programme,
              tout mesuré, tout visualisé, en temps réel.
            </motion.p>

            {/* Stat counters — 2×2 grid */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.5 }}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                maxWidth: "34rem",
              }}
            >
              {STATS.map((stat, i) => (
                <div
                  key={i}
                  style={{
                    padding: "26px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    ref={(el) => { statRefs.current[i] = el; }}
                    style={{
                      display: "block",
                      fontSize: "clamp(2rem, 3vw, 2.8rem)",
                      fontWeight: 800,
                      fontFamily: "var(--font-sora)",
                      color: "#0362E3",
                      lineHeight: 1,
                      marginBottom: 6,
                    }}
                  >
                    {stat.prefix}{stat.numericValue}{stat.suffix}
                  </span>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontFamily: "var(--font-sora)",
                      fontWeight: 400,
                      color: "rgba(255,255,255,0.45)",
                      lineHeight: 1.4,
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
