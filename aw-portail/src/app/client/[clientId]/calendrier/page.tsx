"use client";

import { useParams } from "next/navigation";
import { ClientCalendrier } from "@/components/calendrier/ClientCalendrier";

export default function CalendrierPage() {
  const { clientId } = useParams<{ clientId: string }>();
  return (
    <div style={{ padding: "16px 32px 24px", maxWidth: 720, margin: "0 auto" }}>
      <ClientCalendrier clientId={clientId} />
    </div>
  );
}
