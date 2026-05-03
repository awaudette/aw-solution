"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

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

export default function CTA() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const stars: Star[] = Array.from({ length: 40 }, () => ({
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

  return (
    <section
      className="py-20 lg:py-[140px]"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(ellipse at center, rgba(3,98,227,0.15) 0%, #000 70%)",
        textAlign: "center",
      }}
    >
      {/* Stars */}
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Blue orb */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "#0362E3",
          filter: "blur(120px)",
          opacity: 0.2,
          left: "calc(50% - 300px)",
          top: "calc(50% - 300px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
        animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 700,
          margin: "0 auto",
          paddingLeft: "clamp(1.5rem, 5vw, 3rem)",
          paddingRight: "clamp(1.5rem, 5vw, 3rem)",
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
          Passez à l&apos;action
        </motion.p>

        <motion.h2
          {...fadeUp(0.3)}
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            fontWeight: 800,
            fontFamily: "var(--font-sora)",
            color: "#fff",
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          15 minutes{" "}
          <span
            style={{
              fontFamily: "var(--font-playfair)",
              fontStyle: "italic",
              color: "#0362E3",
            }}
          >
            suffisent.
          </span>
        </motion.h2>

        <motion.p
          {...fadeUp(0.5)}
          style={{
            fontSize: "1.2rem",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            margin: "24px auto",
            maxWidth: 520,
          }}
        >
          On vous démontre comment AW Solution peut faire passer votre entreprise
          à un autre niveau, sans engagement.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.65,
            delay: 0.7,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          }}
        >
          <Link href="/demo" style={{ textDecoration: "none" }}>
            <motion.button
              animate={{
                boxShadow: [
                  "0 0 20px rgba(3,98,227,0.3)",
                  "0 0 40px rgba(3,98,227,0.6)",
                  "0 0 20px rgba(3,98,227,0.3)",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-full lg:w-auto"
              style={{
                background: "#0362E3",
                border: "none",
                borderRadius: 9999,
                padding: "18px 48px",
                color: "#fff",
                fontWeight: 700,
                fontFamily: "var(--font-sora)",
                fontSize: "1.1rem",
                cursor: "pointer",
              }}
            >
              Demander votre démo gratuite
            </motion.button>
          </Link>
        </motion.div>

        <motion.p
          {...fadeUp(0.9)}
          style={{
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.3)",
            margin: "16px 0 0 0",
          }}
        >
          Sans engagement, en 15 minutes.
        </motion.p>
      </div>
    </section>
  );
}
