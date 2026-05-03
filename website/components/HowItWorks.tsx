"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { Smartphone, Users, TrendingUp, ArrowRight, ArrowDown } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Smartphone,
    title: "On construit votre app",
    description:
      "Branded à votre image, configurée selon votre entreprise, prête en quelques jours.",
  },
  {
    number: "02",
    icon: Users,
    title: "Vos clients s'inscrivent",
    description:
      "Ils accumulent des points à chaque visite. Vous commencez à collecter des données réelles.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Vous gérez, vous réagissez, vous croissez",
    description:
      "Alertes, campagnes, analytiques, vous prenez des décisions basées sur des faits.",
  },
];

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function HowItWorks() {

  return (
    <section style={{ background: "#000", width: "100%", paddingTop: 120, paddingBottom: 120 }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        {/* Header */}
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
            Processus
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
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Simple. Rapide. Opérationnel.
          </motion.h2>
        </div>

        {/* Steps row */}
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Fragment key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.65, delay: 0.2 + i * 0.2, ease }}
                  whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(3,98,227,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(3,98,227,0.1)";
                  }}
                  className="w-full lg:flex-1 lg:max-w-[340px]"
                  style={{
                    padding: "40px 32px",
                    background: "rgba(3,98,227,0.04)",
                    border: "1px solid rgba(3,98,227,0.1)",
                    borderRadius: 20,
                    position: "relative",
                    zIndex: 1,
                    cursor: "default",
                    transition: "border-color 0.3s",
                  }}
                >
                  <p
                    style={{
                      fontSize: "clamp(3rem, 6vw, 5rem)",
                      fontWeight: 800,
                      fontFamily: "var(--font-sora)",
                      color: "#0362E3",
                      opacity: 0.9,
                      margin: "0 0 16px 0",
                      lineHeight: 1,
                    }}
                  >
                    {step.number}
                  </p>
                  <Icon size={32} color="#0362E3" strokeWidth={1.5} />
                  <p
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-sora)",
                      color: "#fff",
                      margin: "16px 0 0 0",
                      lineHeight: 1.2,
                    }}
                  >
                    {step.title}
                  </p>
                  <p
                    style={{
                      fontSize: "1rem",
                      fontWeight: 400,
                      fontFamily: "var(--font-sora)",
                      color: "rgba(255,255,255,0.45)",
                      margin: "8px 0 0 0",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.description}
                  </p>
                </motion.div>

                {i < STEPS.length - 1 && (
                  <>
                    <ArrowRight
                      size={32}
                      color="#0362E3"
                      strokeWidth={1.5}
                      className="hidden lg:block"
                      style={{ opacity: 0.5, flexShrink: 0 }}
                    />
                    <ArrowDown
                      size={32}
                      color="#0362E3"
                      strokeWidth={1.5}
                      className="lg:hidden"
                      style={{ opacity: 0.5 }}
                    />
                  </>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
