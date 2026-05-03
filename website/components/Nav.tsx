"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Fonctionnalités",   href: "/#app",       sectionId: "app"       },
  { label: "Dashboard",         href: "/#dashboard", sectionId: "dashboard" },
  { label: "Comment ça marche", href: "/#comment",   sectionId: "comment"   },
  { label: "À propos",          href: "/about",      sectionId: null        },
  { label: "FAQ",               href: "/faq",        sectionId: null        },
];

const SCROLL_SECTIONS = ["hero", "probleme", "app", "dashboard", "comment", "contact"];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SCROLL_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={
        scrolled
          ? {
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              paddingTop: "20px",
              paddingBottom: "20px",
            }
          : { background: "transparent", paddingTop: "20px", paddingBottom: "20px" }
      }
    >
      <div
        className="max-w-[1400px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between"
        style={{ marginTop: "12px" }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="AW Solution" style={{ height: "48px", width: "auto" }} />
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = link.sectionId !== null && activeSection === link.sectionId;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  fontFamily: "var(--font-sora)",
                  color: isActive ? "#0362E3" : "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = isActive
                    ? "#0362E3"
                    : "rgba(255,255,255,0.6)";
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: CTA (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-3">
          <Link href="/demo" className="hidden lg:block" style={{ textDecoration: "none" }}>
            <button
              className="px-5 py-2.5 rounded-full text-white font-semibold text-sm transition-all duration-300 hover:brightness-110"
              style={{ background: "var(--blue)" }}
            >
              Demander votre démo
            </button>
          </Link>

          <button
            className="lg:hidden flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
          >
            {menuOpen ? <X size={24} color="#fff" /> : <Menu size={24} color="#fff" />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="lg:hidden"
            style={{
              background: "rgba(0,0,0,0.97)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              padding: "24px 24px 32px",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-sora)",
                  color: "rgba(255,255,255,0.8)",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/demo" style={{ textDecoration: "none" }} onClick={() => setMenuOpen(false)}>
              <button
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#0362E3",
                  border: "none",
                  borderRadius: 9999,
                  color: "#fff",
                  fontWeight: 700,
                  fontFamily: "var(--font-sora)",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  marginTop: 8,
                }}
              >
                Demander votre démo
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
