"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65, delay, ease },
  };
}

const FAQ_ITEMS = [
  {
    q: "Est-ce que l'application est vraiment à mon image?",
    a: "Oui, chaque application est développée sur mesure selon votre branding, vos couleurs, votre logo et vos préférences. Vous pouvez même ajouter des sections utiles pour vous : menu, quiz, réservation, commande en ligne, galerie photo, évènements, réseaux sociaux et plus encore.",
  },
  {
    q: "Combien de temps faut-il pour que l'app soit prête?",
    a: "En moyenne, votre application est opérationnelle en quelques semaines après notre première rencontre.",
  },
  {
    q: "Est-ce que mes clients doivent télécharger une app?",
    a: "Oui, vos clients téléchargent votre application sur l'App Store ou Google Play. C'est gratuit pour eux et prend moins de 2 minutes.",
  },
  {
    q: "Est-ce que je dois être techno pour utiliser le dashboard?",
    a: "Pas du tout. Le dashboard est conçu pour les propriétaires, pas pour des techniciens. Si vous savez utiliser un téléphone, vous allez savoir utiliser votre application.",
  },
  {
    q: "Qu'est-ce que la segmentation clients?",
    a: "La segmentation classe automatiquement vos clients en catégories selon leur comportement réel : VIP, nouveaux, réguliers, à risque, dormants et perdus. Chaque segment se met à jour automatiquement sans intervention de votre part.",
  },
  {
    q: "Comment fonctionnent les alertes automatisées?",
    a: "Chaque matin, vous recevez un résumé des situations importantes : clients à risque de partir, anniversaires de la semaine, périodes mortes à venir, gros dépensiers actifs. Vous n'avez qu'à cliquer pour agir.",
  },
  {
    q: "Est-ce que je peux envoyer des promotions à mes clients?",
    a: "Oui, vous pouvez envoyer des notifications push à tous vos membres ou uniquement à un segment précis. Par exemple, une offre spéciale uniquement pour vos clients VIP ou uniquement pour vos clients dormants.",
  },
  {
    q: "Est-ce que mes données sont sécurisées?",
    a: "Toutes vos données sont hébergées sur Firebase de Google, avec chiffrement complet. Vos données vous appartiennent et ne sont jamais partagées avec des tiers.",
  },
  {
    q: "Quel est le coût de la plateforme?",
    a: "Nos forfaits sont adaptés à la taille de votre entreprise. Contactez-nous pour une démo gratuite et on vous préparera une offre personnalisée.",
  },
  {
    q: "Est-ce que ça fonctionne pour mon type d'entreprise?",
    a: "AW Solution fonctionne pour tout type de PME qui bénéficie de fidéliser sa clientèle : restaurants, cafés, salons de coiffure, barbershops, clubs de golf, centres de loisirs et bien plus.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <>
      <Nav />

      {/* Hero */}
      <section
        style={{
          background: "#000",
          paddingTop: 160,
          paddingBottom: 40,
          textAlign: "center",
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
          FAQ
        </motion.p>

        <motion.h1
          {...fadeUp(0.2)}
          style={{
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            fontWeight: 800,
            fontFamily: "var(--font-sora)",
            color: "#fff",
            margin: "0 0 20px 0",
            lineHeight: 1.1,
          }}
        >
          Questions fréquentes.
        </motion.h1>

        <motion.p
          {...fadeUp(0.3)}
          style={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Tout ce que vous devez savoir avant de nous contacter.
        </motion.p>
      </section>

      {/* Accordion */}
      <section
        style={{
          background: "#000",
          paddingTop: 80,
          paddingBottom: 120,
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              {...fadeUp(0.1 + i * 0.05)}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Question row */}
              <button
                onClick={() => toggle(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "24px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "1rem",
                }}
              >
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    fontFamily: "var(--font-sora)",
                    color: "#fff",
                    lineHeight: 1.4,
                  }}
                >
                  {item.q}
                </span>
                <motion.span
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  style={{ flexShrink: 0, display: "flex" }}
                >
                  <ChevronDown size={20} color="rgba(255,255,255,0.4)" strokeWidth={1.75} />
                </motion.span>
              </button>

              {/* Answer */}
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <p
                      style={{
                        fontSize: "1rem",
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.8,
                        margin: 0,
                        paddingBottom: 24,
                        fontFamily: "var(--font-sora)",
                      }}
                    >
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
