"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useClients } from "@/hooks/useClients";
import type { Client } from "@/types/admin";
import { FileText, Loader2, ChevronRight, MessageSquare } from "lucide-react";

function ForfaitBadge({ forfait }: { forfait: Client["forfait"] }) {
  if (forfait === "Prestige") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
        ★ Prestige
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
      Essentiel
    </span>
  );
}

function StatutBadge({ statut }: { statut: Client["statut"] }) {
  const styles = {
    actif:   "bg-green-50 text-green-700 border-green-100",
    inactif: "bg-gray-50 text-gray-500 border-gray-200",
    pause:   "bg-yellow-50 text-yellow-700 border-yellow-100",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[statut]}`}>
      {statut.charAt(0).toUpperCase() + statut.slice(1)}
    </span>
  );
}

export default function ClientsListPage() {
  const { clients, loading } = useClients();
  const [clientsWithUnread, setClientsWithUnread] = useState<Set<string>>(new Set());

  // Badge "non lu" par client — sous-collection clients/{id}/notifs filtrée en JS
  useEffect(() => {
    if (clients.length === 0) return;

    const unreadMap = new Map<string, boolean>();
    const unsubs: Array<() => void> = [];

    clients.forEach((c) => {
      const unsub = onSnapshot(
        collection(db, "clients", c.id, "notifs"),
        (snap) => {
          const hasUnread = snap.docs.some(
            (d) =>
              d.data().type === "nouveau_message" &&
              d.data().destinataire === "admin" &&
              d.data().lu === false,
          );
          unreadMap.set(c.id, hasUnread);
          setClientsWithUnread(
            new Set(
              Array.from(unreadMap.entries())
                .filter(([, v]) => v)
                .map(([k]) => k),
            ),
          );
        },
      );
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
        <p className="mt-1 text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? "s" : ""} au total</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Client</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Forfait</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Statut</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Onboarding</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Mensuel</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-medium text-gray-900">{c.nom}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{c.id}</div>
                    </div>
                    {clientsWithUnread.has(c.id) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                        <MessageSquare size={11} /> Message
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ForfaitBadge forfait={c.forfait} />
                </td>
                <td className="px-4 py-4">
                  <StatutBadge statut={c.statut} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 w-28">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${c.onboardingPct}%`,
                          backgroundColor: c.onboardingPct === 100 ? "#16a34a" : "#0362E3",
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{c.onboardingPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-700 font-medium">
                  {c.montantMensuel ? `${c.montantMensuel} $` : "—"}
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/admin/clients/${c.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-100 transition-colors"
                  >
                    <FileText size={12} /> Fiche
                    <ChevronRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
