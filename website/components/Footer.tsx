export default function Footer() {
  return (
    <footer
      style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px clamp(1.5rem, 5vw, 6rem)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* Left: logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="AW Solution" style={{ height: 32, width: "auto" }} />
          <span
            style={{
              fontSize: "0.9rem",
              fontFamily: "var(--font-sora)",
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            AW Solution
          </span>
        </div>

        {/* Center: copyright */}
        <p
          style={{
            fontSize: "0.85rem",
            fontFamily: "var(--font-sora)",
            color: "rgba(255,255,255,0.4)",
            margin: 0,
          }}
        >
          © 2026 AW Solution. Tous droits réservés.
        </p>

        {/* Right: email */}
        <a
          href="mailto:support@awsolution.ca"
          style={{
            fontSize: "0.85rem",
            fontFamily: "var(--font-sora)",
            color: "rgba(255,255,255,0.4)",
            textDecoration: "none",
          }}
        >
          support@awsolution.ca
        </a>
      </div>
    </footer>
  );
}
