"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, onSnapshot, Timestamp,
} from "firebase/firestore";
import {
  markNotificationRead, markActionDone, getNotifStyle,
  type NotificationDoc,
} from "@/lib/notifications";
import { db, auth } from "@/lib/firebase";
import { useClients } from "@/hooks/useClients";
import type { Client } from "@/types/admin";
import { CheckCircle2, Clock, TrendingUp, Users, Check, Bell } from "lucide-react";


function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)  return "il y a quelques secondes";
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `il y a ${mins} minute${mins > 1 ? "s" : ""}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days} jour${days > 1 ? "s" : ""}`;
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

function StatutFactureBadge({ statut }: { statut: Client["statutFacture"] }) {
  const styles = {
    "payé": "bg-green-50 text-green-700 border-green-100",
    "en attente": "bg-yellow-50 text-yellow-700 border-yellow-100",
    "en retard": "bg-red-50 text-red-700 border-red-100",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[statut]}`}>
      {statut}
    </span>
  );
}

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

function OnboardingBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: pct === 100 ? "#16a34a" : "#0362E3",
          }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}


const NOTIF_PAGE_SIZE = 5;

export default function AdminDashboard() {
  const { clients, loading } = useClients();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [notifPage, setNotifPage]         = useState(0);

  // Notifications admin — une subscription par client (sous-collection clients/{id}/notifs)
  // + une subscription fixe sur notifs_internes (tâches "À faire" sans client lié).
  // Évite une collection top-level pour les notifications liées à un client.
  useEffect(() => {
    const myUid = auth.currentUser?.uid ?? null;

    // Une notification sans destinataireUid se comporte exactement comme
    // avant (visible par tout admin) ; avec destinataireUid, seul ce membre
    // du personnel précis la voit.
    function visiblePourMoi(n: NotificationDoc): boolean {
      return n.destinataire === "admin" && !n.lu && (!n.destinataireUid || n.destinataireUid === myUid);
    }

    // Map clé (clientId ou "_internes") → notifications non lues destinées à l'admin
    const notifMap = new Map<string, NotificationDoc[]>();
    const unsubs: Array<() => void> = [];

    function recalc() {
      const merged = Array.from(notifMap.values())
        .flat()
        .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
      setNotifPage(0);
      setNotifications(merged);
    }

    // Notifications internes (pas de client lié — ex. tâches À faire)
    const unsubInternes = onSnapshot(collection(db, "notifs_internes"), (snap) => {
      const internes = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id:              d.id,
            type:            data.type            ?? "",
            destinataire:    data.destinataire     ?? "admin",
            clientId:        data.clientId         ?? null,
            clientNom:       data.clientNom        ?? "",
            auteurRole:      data.auteurRole        ?? "admin",
            description:     data.description      ?? "",
            lien:            data.lien             ?? "",
            date:            data.date instanceof Timestamp ? data.date.toDate() : null,
            lu:              data.lu               ?? false,
            actionRequise:   data.actionRequise    ?? false,
            actionCompletee: data.actionCompletee  ?? false,
            destinataireUid: data.destinataireUid  ?? undefined,
          } as NotificationDoc;
        })
        .filter(visiblePourMoi);
      notifMap.set("_internes", internes);
      recalc();
    });
    unsubs.push(unsubInternes);

    if (clients.length > 0) {
      clients.forEach((c) => {
        const unsub = onSnapshot(
          collection(db, "clients", c.id, "notifs"),
          (snap) => {
            const clientNotifs = snap.docs
              .map((d) => {
                const data = d.data();
                return {
                  id:              d.id,
                  type:            data.type            ?? "",
                  destinataire:    data.destinataire     ?? "admin",
                  clientId:        data.clientId         ?? c.id,
                  clientNom:       data.clientNom        ?? c.nom,
                  auteurRole:      data.auteurRole        ?? "client",
                  description:     data.description      ?? "",
                  lien:            data.lien             ?? "",
                  date:            data.date instanceof Timestamp ? data.date.toDate() : null,
                  lu:              data.lu               ?? false,
                  actionRequise:   data.actionRequise    ?? false,
                  actionCompletee: data.actionCompletee  ?? false,
                  destinataireUid: data.destinataireUid  ?? undefined,
                } as NotificationDoc;
              })
              .filter(visiblePourMoi);

            notifMap.set(c.id, clientNotifs);
            recalc();
          }
        );
        unsubs.push(unsub);
      });
    }

    return () => unsubs.forEach((u) => u());
  }, [clients]);

  const mrr = clients
    .filter((c) => c.statut === "actif")
    .reduce((sum, c) => sum + c.montantMensuel, 0);

  const totalActifs = clients.filter((c) => c.statut === "actif").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vue d&apos;ensemble de tous vos clients</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">MRR</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{mrr.toLocaleString("fr-CA")} $</p>
          <p className="text-xs text-gray-400 mt-1">Revenus mensuels récurrents</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Clients actifs</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Users size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalActifs}</p>
          <p className="text-xs text-gray-400 mt-1">{clients.length} clients au total</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Notifications</span>
            <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Bell size={16} className="text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {notifications.filter(n => n.actionRequise && !n.actionCompletee).length} actions requises
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
          {notifications.length > NOTIF_PAGE_SIZE && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNotifPage((p) => Math.max(0, p - 1))}
                disabled={notifPage === 0}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
              >←</button>
              <span className="text-xs text-gray-400">
                {notifPage + 1} / {Math.ceil(notifications.length / NOTIF_PAGE_SIZE)}
              </span>
              <button
                onClick={() => setNotifPage((p) => Math.min(Math.ceil(notifications.length / NOTIF_PAGE_SIZE) - 1, p + 1))}
                disabled={(notifPage + 1) * NOTIF_PAGE_SIZE >= notifications.length}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
              >→</button>
            </div>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
            <CheckCircle2 size={28} className="text-gray-200" />
            Aucune notification
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications
              .slice(notifPage * NOTIF_PAGE_SIZE, (notifPage + 1) * NOTIF_PAGE_SIZE)
              .map((n) => {
                const cfg = getNotifStyle(n.type);
                const canDismiss = !n.actionRequise || n.actionCompletee;
                return (
                  <div
                    key={n.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{ background: cfg.bg }}
                  >
                    <span className="text-base flex-shrink-0" role="img" aria-label={cfg.label}>
                      {cfg.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: cfg.text }}>
                        {n.clientNom && <span className="font-semibold">{n.clientNom} · </span>}
                        {n.description}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: cfg.text, opacity: 0.65 }}>
                        {timeAgo(n.date)}
                        {n.actionRequise && !n.actionCompletee && (
                          <span className="ml-2 font-semibold">· Action requise</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {n.lien && (
                        <button
                          onClick={() => router.push(n.lien)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                          style={{ borderColor: cfg.border, color: cfg.text, background: "#fff" }}
                        >
                          Voir
                        </button>
                      )}
                      <button
                        onClick={() => canDismiss
                          ? markNotificationRead(n.id, n.clientId)
                          : undefined
                        }
                        disabled={!canDismiss}
                        title={canDismiss ? "Marquer comme lu" : "Complétez l'action avant de fermer"}
                        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                        style={{
                          borderColor:   n.actionCompletee ? "#BBF7D0" : canDismiss ? cfg.border : "#E5E7EB",
                          color:         n.actionCompletee ? "#166534" : canDismiss ? cfg.text   : "#9CA3AF",
                          background:    n.actionCompletee ? "#F0FDF4" : "#fff",
                          opacity:       canDismiss ? 1 : 0.4,
                          cursor:        canDismiss ? "pointer" : "not-allowed",
                        }}
                      >
                        <Check size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Tableau clients */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Clients</h2>
          <span className="text-xs text-gray-400">{clients.length} au total</span>
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
              <Users size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Aucun client pour l&apos;instant</p>
            <p className="text-xs text-gray-300 mt-1">Les clients apparaîtront ici dès qu&apos;ils sont créés dans Firestore</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Nom du restaurant", "Forfait", "Étape pipeline", "Onboarding", "Dernière connexion", "Facture", "Prochaine action"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">{c.nom}</td>
                    <td className="px-5 py-3.5"><ForfaitBadge forfait={c.forfait} /></td>
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{c.etapePipeline}</td>
                    <td className="px-5 py-3.5 min-w-[120px]"><OnboardingBar pct={c.onboardingPct} /></td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-300" />
                        {formatDate(c.derniereConnexion)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatutFactureBadge statut={c.statutFacture} /></td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">{c.prochaineAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
