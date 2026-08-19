"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ClientSidebar from "./ClientSidebar";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  // Les clients utilisent l'auth cookie (pas Firebase Auth).
  // Une connexion anonyme leur donne un request.auth valide pour
  // les règles Firestore qui vérifient request.auth != null.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientSidebar onExpandedChange={setExpanded} />
      <main
        className="min-h-screen transition-all duration-200 ease-in-out"
        style={{ marginLeft: expanded ? 220 : 56, paddingTop: 40 }}
      >
        {children}
      </main>
    </div>
  );
}
