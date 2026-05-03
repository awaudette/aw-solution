"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Monitor, Rocket, Mail, Globe, CheckCircle } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65, delay, ease },
  };
}

const INTERESTS = [
  "Application mobile branded",
  "Dashboard analytique",
  "Alertes automatisées",
  "Segmentation clients",
  "Campagnes push",
];

const STEPS = [
  { icon: Calendar, title: "On planifie un appel de 15 minutes" },
  { icon: Monitor, title: "On vous fait une démo personnalisée" },
  { icon: Rocket, title: "Votre app est prête en quelques semaines." },
];

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-sora)",
  color: "rgba(255,255,255,0.7)",
  marginBottom: 8,
};

export default function DemoPage() {
  const [form, setForm] = useState({
    prenom: "", nom: "", email: "", telephone: "",
    entreprise: "", typeEntreprise: "", nombreClients: "",
    interets: [] as string[], message: "",
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleInteret = (val: string) =>
    setForm((prev) => ({
      ...prev,
      interets: prev.interets.includes(val)
        ? prev.interets.filter((v) => v !== val)
        : [...prev.interets, val],
    }));

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    padding: "14px 20px",
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${focused === name ? "#0362E3" : "rgba(255,255,255,0.1)"}`,
    borderRadius: 12,
    color: "#fff",
    fontFamily: "var(--font-sora)",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: focused === name ? "0 0 0 3px rgba(3,98,227,0.15)" : "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  const focusProps = (name: string) => ({
    onFocus: () => setFocused(name),
    onBlur: () => setFocused(null),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const response = await fetch("https://formspree.io/f/mbdwdyok", {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      setIsSuccess(true);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Nav />

      {/* Hero */}
      <section
        style={{
          background: "#000",
          paddingTop: 160,
          paddingBottom: 60,
          textAlign: "center",
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        <motion.p
          {...fadeUp(0.1)}
          style={{ fontSize: 11, letterSpacing: "4px", color: "#0362E3", textTransform: "uppercase", fontFamily: "var(--font-sora)", margin: "0 0 24px 0" }}
        >
          Demande de Démo
        </motion.p>
        <motion.h1
          {...fadeUp(0.2)}
          style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 800, fontFamily: "var(--font-sora)", color: "#fff", margin: "0 0 20px 0", lineHeight: 1.1 }}
        >
          15 minutes pour changer votre business.
        </motion.h1>
        <motion.p
          {...fadeUp(0.3)}
          style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}
        >
          Remplissez ce formulaire et on vous contacte dans les 24 heures.
        </motion.p>
      </section>

      {/* Form + Info */}
      <section
        style={{
          background: "#000",
          paddingTop: 60,
          paddingBottom: 120,
          paddingLeft: "clamp(1.5rem, 5vw, 6rem)",
          paddingRight: "clamp(1.5rem, 5vw, 6rem)",
        }}
      >
        <div
          className="flex flex-col lg:flex-row"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            gap: "clamp(2rem, 6vw, 6rem)",
            alignItems: "flex-start",
          }}
        >
          {/* Form */}
          <div className="w-full lg:flex-[0_0_60%] lg:max-w-[60%]">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease }}
                  style={{ textAlign: "center", padding: "80px 0" }}
                >
                  <CheckCircle size={64} color="#2ECC8A" strokeWidth={1.5} style={{ marginBottom: 24 }} />
                  <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 800, fontFamily: "var(--font-sora)", color: "#fff", margin: "0 0 16px 0" }}>
                    Demande envoyée!
                  </h2>
                  <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    On vous contacte dans les 24 heures. À très bientôt!
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
                >
                  <input type="hidden" name="_subject" value="Nouvelle demande de démo — AW Solution" />
                  <input type="hidden" name="interets" value={form.interets.join(", ")} />

                  {/* Prénom + Nom */}
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                      <label style={LABEL_STYLE}>Prénom</label>
                      <input
                        type="text"
                        required
                        name="prenom"
                        placeholder="Alex"
                        value={form.prenom}
                        onChange={(e) => set("prenom", e.target.value)}
                        style={inputStyle("prenom")}
                        {...focusProps("prenom")}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={LABEL_STYLE}>Nom</label>
                      <input
                        type="text"
                        required
                        name="nom"
                        placeholder="Tremblay"
                        value={form.nom}
                        onChange={(e) => set("nom", e.target.value)}
                        style={inputStyle("nom")}
                        {...focusProps("nom")}
                      />
                    </div>
                  </div>

                  {/* Courriel */}
                  <div>
                    <label style={LABEL_STYLE}>Courriel professionnel</label>
                    <input
                      type="email"
                      required
                      name="email"
                      placeholder="alex@monentreprise.ca"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      style={inputStyle("email")}
                      {...focusProps("email")}
                    />
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label style={LABEL_STYLE}>Numéro de téléphone</label>
                    <input
                      type="tel"
                      name="telephone"
                      placeholder="514 000-0000"
                      value={form.telephone}
                      onChange={(e) => set("telephone", e.target.value)}
                      style={inputStyle("telephone")}
                      {...focusProps("telephone")}
                    />
                  </div>

                  {/* Entreprise */}
                  <div>
                    <label style={LABEL_STYLE}>Nom de votre entreprise</label>
                    <input
                      type="text"
                      required
                      name="entreprise"
                      placeholder="Mon Restaurant Inc."
                      value={form.entreprise}
                      onChange={(e) => set("entreprise", e.target.value)}
                      style={inputStyle("entreprise")}
                      {...focusProps("entreprise")}
                    />
                  </div>

                  {/* Type d'entreprise */}
                  <div>
                    <label style={LABEL_STYLE}>Type d&apos;entreprise</label>
                    <select
                      required
                      name="type_entreprise"
                      value={form.typeEntreprise}
                      onChange={(e) => set("typeEntreprise", e.target.value)}
                      style={{
                        ...inputStyle("typeEntreprise"),
                        color: form.typeEntreprise ? "#fff" : "rgba(255,255,255,0.35)",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 16px center",
                        cursor: "pointer",
                      }}
                      {...focusProps("typeEntreprise")}
                    >
                      <option value="" disabled style={{ background: "#111" }}>Sélectionnez...</option>
                      {["Restaurant", "Café", "Salon de coiffure", "Barbershop", "Club de golf", "Centre de loisirs", "Autre"].map((o) => (
                        <option key={o} value={o} style={{ background: "#111", color: "#fff" }}>{o}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nombre de clients */}
                  <div>
                    <label style={LABEL_STYLE}>Nombre de clients approximatif</label>
                    <select
                      name="nombre_clients"
                      value={form.nombreClients}
                      onChange={(e) => set("nombreClients", e.target.value)}
                      style={{
                        ...inputStyle("nombreClients"),
                        color: form.nombreClients ? "#fff" : "rgba(255,255,255,0.35)",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 16px center",
                        cursor: "pointer",
                      }}
                      {...focusProps("nombreClients")}
                    >
                      <option value="" style={{ background: "#111" }}>Sélectionnez...</option>
                      {["Moins de 500", "500 à 2000", "2000 à 5000", "Plus de 5000"].map((o) => (
                        <option key={o} value={o} style={{ background: "#111", color: "#fff" }}>{o}</option>
                      ))}
                    </select>
                  </div>

                  {/* Intérêts — pills */}
                  <div>
                    <label style={LABEL_STYLE}>Qu&apos;est-ce qui vous intéresse le plus?</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
                      {INTERESTS.map((val) => {
                        const active = form.interets.includes(val);
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => toggleInteret(val)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 9999,
                              border: `1px solid ${active ? "#0362E3" : "rgba(255,255,255,0.12)"}`,
                              background: active ? "rgba(3,98,227,0.15)" : "rgba(255,255,255,0.03)",
                              color: active ? "#0362E3" : "rgba(255,255,255,0.55)",
                              fontFamily: "var(--font-sora)",
                              fontSize: "0.875rem",
                              fontWeight: active ? 600 : 400,
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={LABEL_STYLE}>Message ou questions</label>
                    <textarea
                      rows={4}
                      name="message"
                      placeholder="Dites-nous ce que vous cherchez..."
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      style={{
                        ...inputStyle("message"),
                        resize: "vertical",
                        minHeight: 120,
                      }}
                      {...focusProps("message")}
                    />
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(3,98,227,0.3)",
                        "0 0 40px rgba(3,98,227,0.6)",
                        "0 0 20px rgba(3,98,227,0.3)",
                      ],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 50px rgba(3,98,227,0.8)" }}
                    style={{
                      width: "100%",
                      padding: "18px",
                      background: "#0362E3",
                      border: "none",
                      borderRadius: 9999,
                      color: "#fff",
                      fontFamily: "var(--font-sora)",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      cursor: "pointer",
                    }}
                  >
                    {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Info panel */}
          <div className="w-full lg:flex-[0_0_40%] lg:max-w-[40%]" style={{ paddingTop: 8 }}>
            <motion.div {...fadeUp(0.2)}>
              <p
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-sora)",
                  color: "#fff",
                  margin: "0 0 36px 0",
                }}
              >
                Ce qui vous attend
              </p>

              {/* Steps with dotted connector */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div
                          style={{
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
                          <Icon size={20} color="#0362E3" strokeWidth={1.5} />
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            style={{
                              width: 0,
                              flex: 1,
                              borderLeft: "2px dotted rgba(3,98,227,0.25)",
                              minHeight: 36,
                              margin: "6px 0",
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          fontFamily: "var(--font-sora)",
                          color: "#fff",
                          margin: "10px 0 36px 0",
                          lineHeight: 1.4,
                        }}
                      >
                        {step.title}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Contact info */}
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 32,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                }}
              >
                {[
                  { icon: Mail, text: "support@awsolution.ca" },
                  { icon: Globe, text: "awsolution.ca" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Icon size={16} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontFamily: "var(--font-sora)",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
