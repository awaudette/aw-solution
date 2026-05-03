"use client";

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Target, Shield, Zap, CheckCircle } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65, delay, ease },
  };
}

const VALUES = [
  {
    icon: Target,
    title: "Simplicité",
    description: "Des outils puissants qui restent simples à utiliser au quotidien.",
    bullets: [
      "Interface intuitive, prise en main immédiate",
      "Opérationnel en quelques jours",
      "Accompagnement personnalisé inclus",
    ],
  },
  {
    icon: Shield,
    title: "Transparence",
    description: "Vos données vous appartiennent. Toujours.",
    bullets: [
      "Vos données vous appartiennent à 100%",
      "Tarification claire et prévisible",
      "Rapports clairs et compréhensibles",
    ],
  },
  {
    icon: Zap,
    title: "Impact",
    description: "Chaque fonctionnalité est conçue pour avoir un impact direct sur vos revenus.",
    bullets: [
      "ROI mesurable dès les premiers mois",
      "Alertes actionnables en temps réel",
      "Résultats concrets sur vos revenus",
    ],
  },
];

const STORY_PARAGRAPHS = [
  "AW Solution a été fondée avec une mission claire, donner aux PME les outils pour connaître leurs clients, les fidéliser et prendre des décisions basées sur des données réelles.",
  "Notre plateforme combine une application mobile branded sur mesure pour vos clients, un dashboard analytique complet et un système d'alertes automatisées, le tout dans une interface pensée pour les propriétaires, pas pour des analystes.",
  "Basés au Québec, on comprend la réalité des entrepreneurs d'ici. On parle votre langue, on connaît vos défis, et on est là pour vous accompagner à chaque étape.",
];

export default function AboutPage() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section
        style={{
          background: "#000",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          paddingTop: 120,
          paddingBottom: 40,
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        <motion.p
          {...fadeUp(0.1)}
          style={{
            fontSize: 11,
            letterSpacing: "4px",
            color: "#0362E3",
            textTransform: "uppercase",
            fontFamily: "var(--font-sora)",
            margin: "0 0 24px 0",
          }}
        >
          À Propos
        </motion.p>

        <motion.h1
          {...fadeUp(0.2)}
          style={{
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            fontWeight: 800,
            fontFamily: "var(--font-sora)",
            color: "#fff",
            margin: "0 0 24px 0",
            lineHeight: 1.1,
            maxWidth: 800,
          }}
        >
          Une plateforme bâtie par un entrepreneur, pour des entrepreneurs.
        </motion.h1>

        <motion.p
          {...fadeUp(0.35)}
          style={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            margin: 0,
            maxWidth: 600,
          }}
        >
          AW Solution est né d&apos;un constat simple, les propriétaires de PME
          méritent les mêmes outils que les grandes chaînes, sans la complexité
          et sans le prix.
        </motion.p>
      </section>

      {/* Story */}
      <section
        style={{
          background: "#000",
          paddingTop: 40,
          paddingBottom: 120,
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        <div
          className="flex flex-col lg:flex-row"
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            gap: "clamp(2rem, 8vw, 8rem)",
            alignItems: "flex-start",
          }}
        >
          {/* Left: quote */}
          <div style={{ flex: 1 }}>
            <motion.blockquote
              {...fadeUp(0.1)}
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                fontFamily: "var(--font-playfair)",
                fontStyle: "italic",
                fontWeight: 400,
                color: "#fff",
                margin: "0 0 24px 0",
                lineHeight: 1.4,
              }}
            >
              &ldquo;J&apos;ai vu des propriétaires travailler 70 heures par
              semaine sans jamais savoir pourquoi certains clients revenaient
              et d&apos;autres non.&rdquo;
            </motion.blockquote>
            <motion.p
              {...fadeUp(0.25)}
              style={{
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.4)",
                margin: 0,
                fontFamily: "var(--font-sora)",
              }}
            >
              Alex W., Fondateur d&apos;AW Solution
            </motion.p>
          </div>

          {/* Right: story paragraphs */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {STORY_PARAGRAPHS.map((text, i) => (
              <motion.p
                key={i}
                {...fadeUp(0.1 + i * 0.15)}
                style={{
                  fontSize: "1rem",
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.8,
                  margin: 0,
                  fontFamily: "var(--font-sora)",
                }}
              >
                {text}
              </motion.p>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section
        style={{
          background: "#000",
          paddingTop: 40,
          paddingBottom: 120,
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <motion.h2
            {...fadeUp(0)}
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 800,
              fontFamily: "var(--font-sora)",
              color: "#fff",
              textAlign: "center",
              margin: "0 0 60px 0",
            }}
          >
            Nos valeurs
          </motion.h2>

          <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap" }}>
            {VALUES.map((val, i) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={i}
                  {...fadeUp(0.2 + i * 0.15)}
                  whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(3,98,227,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(3,98,227,0.1)";
                  }}
                  style={{
                    flex: 1,
                    maxWidth: 340,
                    minWidth: 260,
                    padding: 40,
                    background: "rgba(3,98,227,0.04)",
                    border: "1px solid rgba(3,98,227,0.1)",
                    borderRadius: 20,
                    cursor: "default",
                    transition: "border-color 0.3s",
                  }}
                >
                  {/* Icon container */}
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 16,
                      background: "rgba(3,98,227,0.1)",
                      border: "1px solid rgba(3,98,227,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={40} color="#0362E3" strokeWidth={1.5} />
                  </div>

                  {/* Title */}
                  <p
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-sora)",
                      color: "#fff",
                      margin: "20px 0 0 0",
                      lineHeight: 1.2,
                    }}
                  >
                    {val.title}
                  </p>

                  {/* Divider */}
                  <div
                    style={{
                      width: 40,
                      height: 2,
                      background: "#0362E3",
                      margin: "12px 0",
                    }}
                  />

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "1rem",
                      fontWeight: 400,
                      fontFamily: "var(--font-sora)",
                      color: "rgba(255,255,255,0.45)",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {val.description}
                  </p>

                  {/* Bullets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: 20 }}>
                    {val.bullets.map((bullet, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <CheckCircle size={14} color="#2ECC8A" strokeWidth={2} style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontFamily: "var(--font-sora)",
                            color: "rgba(255,255,255,0.55)",
                            lineHeight: 1.5,
                          }}
                        >
                          {bullet}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
