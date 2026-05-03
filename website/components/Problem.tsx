"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ITEMS = [
  {
    number: "01",
    title: "Un client fidèle disparaît.",
    subtitle: "Vous ne savez pas quand. Ni pourquoi.",
  },
  {
    number: "02",
    title: "Vos ventes baissent un mardi.",
    subtitle: "Vous n'avez aucune explication.",
  },
  {
    number: "03",
    title: "Vous faites une promotion.",
    subtitle: "Vous ne saurez jamais si ça a fonctionné.",
  },
  {
    number: "04",
    title: "Des centaines de clients.",
    subtitle: "Vous ne pouvez en contacter aucun.",
  },
];

export default function Problem() {
  console.log("[Problem] rendering");

  const itemRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const titleRefs    = useRef<(HTMLParagraphElement | null)[]>([]);
  const subtitleRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    console.log("[Problem] useEffect — setting up ScrollTrigger");
    const ctx = gsap.context(() => {
      ITEMS.forEach((_, i) => {
        const trigger  = itemRefs.current[i];
        const line     = lineRefs.current[i];
        const title    = titleRefs.current[i];
        const subtitle = subtitleRefs.current[i];
        if (!trigger || !line || !title || !subtitle) return;

        const tl = gsap.timeline({
          scrollTrigger: { trigger, start: "top 80%" },
        });

        // Step 1 — gradient line draws left to right
        tl.fromTo(line,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.8, ease: "power2.out" }
        );
        // Step 2 — title slides up
        tl.fromTo(title,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
          0.4
        );
        // Step 3 — subtitle slides up
        tl.fromTo(subtitle,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          0.6
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section style={{ background: "#000", width: "100%", paddingTop: 80, paddingBottom: 120 }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        {/* Title section */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "4px",
              color: "#0362E3",
              textTransform: "uppercase",
              fontFamily: "var(--font-sora)",
              margin: "0 0 16px 0",
            }}
          >
            Le Problème
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 800,
              fontFamily: "var(--font-sora)",
              color: "#fff",
              margin: 0,
            }}
          >
            Reconnaissez-vous ces situations?
          </h2>
        </div>

        {/* Items */}
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {ITEMS.map((item, i) => (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              style={{
                position: "relative",
                overflow: "visible",
                paddingTop: 20,
                paddingBottom: 20,
              }}
            >
              {/* Number + text row */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "2rem",
                }}
              >
                {/* Number — left side, normal flow */}
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    fontSize: "clamp(2rem, 6vw, 5rem)",
                    fontWeight: 800,
                    fontFamily: "var(--font-sora)",
                    color: "rgba(3,98,227,0.35)",
                    minWidth: 60,
                    textAlign: "center",
                    marginRight: 16,
                  }}
                >
                  {item.number}
                </span>

                {/* Text content */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* Gradient line */}
                  <div
                    ref={(el) => { lineRefs.current[i] = el; }}
                    style={{
                      width: "100%",
                      height: 1,
                      background: "linear-gradient(to right, #0362E3, transparent)",
                      transformOrigin: "left",
                      transform: "scaleX(0)",
                      marginBottom: 16,
                    }}
                  />
                  <p
                    ref={(el) => { titleRefs.current[i] = el; }}
                    style={{
                      fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
                      fontWeight: 800,
                      fontFamily: "var(--font-sora)",
                      color: "#fff",
                      margin: 0,
                      opacity: 0,
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    ref={(el) => { subtitleRefs.current[i] = el; }}
                    style={{
                      fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
                      fontWeight: 400,
                      fontFamily: "var(--font-sora)",
                      color: "rgba(255,255,255,0.4)",
                      margin: 0,
                      opacity: 0,
                    }}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
