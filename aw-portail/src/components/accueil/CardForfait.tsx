"use client";

import type { ClientData } from "@/hooks/useClientData";

function moisAnneeFR(d: Date | null) {
  if (!d) return "—";
  const s = d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #F3F4F6",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

interface CardForfaitProps {
  client: ClientData;
}

export function CardForfait({ client }: CardForfaitProps) {
  const metrics = [
    { label: "SUCCURSALES",      value: `${client.succursales}` },
    { label: "MONTANT MENSUEL",  value: client.montantMensuel ? `${client.montantMensuel} $` : "—" },
    { label: "EN LIGNE DEPUIS",  value: moisAnneeFR(client.dateLancement) },
    { label: "RENOUVELLEMENT",   value: moisAnneeFR(client.dateRenouvellement) },
  ];
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>Votre forfait</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0362E3", flexShrink: 0, display: "inline-block" }} />
        <p style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>{client.forfait}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 12px" }}>
        {metrics.map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
              {label}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
