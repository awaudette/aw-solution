"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  doc, onSnapshot, Timestamp, updateDoc, addDoc,
  collection, query, orderBy, where, getDocs, writeBatch,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, functions, storage } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  ExternalLink,
  Building2,
  MapPin,
  User,
  Mail,
  Phone,
  Calendar,
  CalendarDays,
  MessageSquare,
  Send,
  Palette,
  Map,
  BookOpen,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { AdminBrandingViewer } from "@/components/admin/AdminBrandingViewer";
import { AdminRoadmapViewer } from "@/components/admin/AdminRoadmapViewer";
import { AdminCalendrierClient } from "@/components/calendrier/AdminCalendrierClient";
import { AdminDocumentationTab } from "@/components/admin/AdminDocumentationTab";

interface ContratInfo {
  urlHTML:        string;
  urlPDF?:        string;
  statut:         "en_attente" | "signe";
  genereLe:       Date | null;
  dateSignature?: Date | null;
  forfait:        string;
}

interface ClientDetail {
  nom:             string;
  adresse?:        string;
  dateAcquisition: Date | null;
  contact:         string;
  courriel:        string;
  telephone:       string;
  forfait:         string;
  succursales:     number;
  montantMensuel:  number;
  statut:          string;
  neq?:            string;
  titreContact?:   string;
  prixParSuccursale?: number;
  contrat?:        ContratInfo;
}

interface Message {
  id: string;
  texte: string;
  auteur: string;
  auteurRole: "client" | "admin";
  date: Date;
  lu: boolean;
}

function toDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  return null;
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(d: Date) {
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

function StatutContrat({ statut, dateSignature }: { statut: ContratInfo["statut"]; dateSignature?: Date | null }) {
  if (statut === "signe") {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
          <CheckCircle size={12} /> Contrat signé ✓
        </span>
        {dateSignature && (
          <p className="text-xs text-green-600 pl-1">Signé le {formatDate(dateSignature)}</p>
        )}
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100">
      <Clock size={12} /> En attente de signature
    </span>
  );
}

export default function AdminClientDetailPage() {
  return (
    <Suspense>
      <AdminClientDetailContent />
    </Suspense>
  );
}

function AdminClientDetailContent() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"fiche" | "messages" | "branding" | "roadmap" | "calendrier" | "documentation">(
    searchParams.get("tab") === "messages"      ? "messages"      :
    searchParams.get("tab") === "branding"      ? "branding"      :
    searchParams.get("tab") === "roadmap"       ? "roadmap"       :
    searchParams.get("tab") === "calendrier"    ? "calendrier"    :
    searchParams.get("tab") === "documentation" ? "documentation" : "fiche"
  );

  const [client, setClient]   = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signFile, setSignFile]           = useState<File | null>(null);
  const [signDate, setSignDate]           = useState(() => new Date().toISOString().slice(0, 10));
  const [signing, setSigning]             = useState(false);
  const [signError, setSignError]         = useState<string | null>(null);

  // Synchronisation — jeton portailSyncJob
  interface SyncStatus {
    exists: boolean;
    tokenSuffix: string | null;
    revoked: boolean;
    createdAt: string | null;
    lastUsedAt: string | null;
  }
  const [syncStatus, setSyncStatus]       = useState<SyncStatus | null>(null);
  const [syncLoading, setSyncLoading]     = useState(false);
  const [newToken, setNewToken]           = useState<string | null>(null);
  const [tokenCopied, setTokenCopied]     = useState(false);
  const [syncError, setSyncError]         = useState<string | null>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgTexte, setMsgTexte] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", id), (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const d = snap.data();
      const contratRaw = d.contrat;
      setClient({
        nom:              d.nom ?? "",
        adresse:          d.adresse ?? "",
        dateAcquisition:  toDate(d.dateCreation),
        contact:          d.contact ?? "",
        courriel:         d.courriel ?? "",
        telephone:        d.telephone ?? "",
        forfait:          d.forfait ?? "Essentiel",
        succursales:      d.succursales ?? 1,
        montantMensuel:   d.montantMensuel ?? 0,
        statut:           d.statut ?? "inactif",
        neq:              d.neq ?? "",
        titreContact:     d.titreContact ?? "",
        prixParSuccursale: d.prixParSuccursale ?? 0,
        contrat: contratRaw ? {
          urlHTML:       contratRaw.urlHTML       ?? "",
          urlPDF:        contratRaw.urlPDF        ?? undefined,
          statut:        contratRaw.statut        ?? "en_attente",
          genereLe:      toDate(contratRaw.genereLe),
          dateSignature: toDate(contratRaw.dateSignature),
          forfait:       contratRaw.forfait       ?? "",
        } : undefined,
      });
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  // Messages listener
  useEffect(() => {
    const q = query(
      collection(db, "clients", id, "messages"),
      orderBy("date", "asc"),
    );
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        texte: d.data().texte ?? "",
        auteur: d.data().auteur ?? "",
        auteurRole: (d.data().auteurRole ?? "client") as "client" | "admin",
        date: d.data().date instanceof Timestamp ? d.data().date.toDate() : new Date(),
        lu: d.data().lu ?? false,
      }));
      setMessages(msgs);
      setUnreadCount(msgs.filter((m) => m.auteurRole === "client" && !m.lu).length);
    });
  }, [id]);


  // Scroll to bottom when messages tab is open
  useEffect(() => {
    if (activeTab === "messages") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  function handleViewContrat() {
    window.open(`/api/contrat/${id}`, "_blank", "noopener,noreferrer");
  }

  // Synchronisation — statut du jeton portailSyncJob
  useEffect(() => {
    fetch(`/api/admin/sync-token?clientId=${id}`)
      .then((r) => r.json())
      .then((d) => setSyncStatus(d))
      .catch(() => setSyncStatus(null));
  }, [id]);

  async function handleGenerateToken() {
    if (syncStatus?.exists) {
      const ok = confirm(
        "Régénérer le jeton ? L'ancien jeton cessera de fonctionner immédiatement — portailSyncJob devra être reconfiguré avec le nouveau."
      );
      if (!ok) return;
    }
    setSyncLoading(true);
    setSyncError(null);
    setTokenCopied(false);
    try {
      const res = await fetch("/api/admin/sync-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setNewToken(data.token);
      setSyncStatus({
        exists: true,
        tokenSuffix: data.tokenSuffix,
        revoked: false,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      });
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleCopyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  async function handleMarquerSigne() {
    if (!signFile || !client) return;
    setSigning(true);
    setSignError(null);
    try {
      const storageRef = ref(storage, `contrats/${id}/contrat-signe.pdf`);
      await uploadBytes(storageRef, signFile);
      const urlPDF = await getDownloadURL(storageRef);
      const [y, m, d] = signDate.split("-").map(Number);
      const dateSignature = Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
      const now = Timestamp.now();
      await updateDoc(doc(db, "clients", id), {
        "contrat.statut":        "signe",
        "contrat.dateSignature": dateSignature,
        "contrat.urlPDF":        urlPDF,
      });
      await createNotification({
        type: "contrat_signe", destinataire: "admin",
        clientId: id, clientNom: client.nom, auteurRole: "admin",
        description: `${client.nom} a signé le contrat`,
        lien: `/admin/clients/${id}?tab=contrat`,
      });
      setSignModalOpen(false);
    } catch (e: unknown) {
      setSignError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSigning(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setSuccess(false);
    try {
      const fn = httpsCallable<{ clientId: string }, { urlHTML: string }>(functions, "generateContrat");
      await fn({ clientId: id });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendMessage() {
    if (!msgTexte.trim() || !client) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, "clients", id, "messages"), {
        texte: msgTexte.trim(),
        auteur: "AW Solution",
        auteurRole: "admin",
        date: Timestamp.now(),
        lu: false,
      });

      // Mark client messages as read
      const msgQ = query(
        collection(db, "clients", id, "messages"),
        where("auteurRole", "==", "client"),
      );
      const msgSnap = await getDocs(msgQ);
      const unreadMsgs = msgSnap.docs.filter((d) => d.data().lu === false);
      if (unreadMsgs.length > 0) {
        const msgBatch = writeBatch(db);
        unreadMsgs.forEach((d) => msgBatch.update(d.ref, { lu: true }));
        await msgBatch.commit();
      }

      // Marquer les notifications "nouveau_message" de ce client comme lues
      // (sous-collection clients/{id}/notifs, filtre en JS)
      const notifSnap = await getDocs(collection(db, "clients", id, "notifs"));
      const unreadNotifs = notifSnap.docs.filter(
        (d) => d.data().type === "nouveau_message" && d.data().lu === false,
      );
      if (unreadNotifs.length > 0) {
        const batch = writeBatch(db);
        unreadNotifs.forEach((d) => batch.update(d.ref, { lu: true }));
        await batch.commit();
      }

      fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: client.courriel,
          subject: "Nouveau message de votre équipe AW Solution",
          html: `<p>Bonjour,</p><p>Vous avez reçu un nouveau message de votre équipe AW Solution :</p><p>${msgTexte.trim()}</p><p><a href="http://localhost:3000/client/${id}/support">Voir le message →</a></p>`,
        }),
      }).catch(() => {});

      setMsgTexte("");
    } finally {
      setSendingMsg(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16 text-gray-500">Client introuvable.</div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{client.nom}</h1>
          <p className="text-sm text-gray-500">Fiche client — {id}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        <button
          onClick={() => setActiveTab("fiche")}
          className="px-4 py-2 text-sm font-medium transition-colors relative"
          style={{ color: activeTab === "fiche" ? "#0362E3" : "#6B7280" }}
        >
          Fiche client
          {activeTab === "fiche" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className="px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2"
          style={{ color: activeTab === "messages" ? "#0362E3" : "#6B7280" }}
        >
          <MessageSquare size={14} />
          Messages
          {unreadCount > 0 && (
            <span className="flex items-center justify-center font-semibold"
              style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, fontSize: 11, background: "#EF4444", color: "#fff" }}>
              {unreadCount}
            </span>
          )}
          {activeTab === "messages" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("branding")}
          className="px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2"
          style={{ color: activeTab === "branding" ? "#0362E3" : "#6B7280" }}
        >
          <Palette size={14} />
          Branding
          {activeTab === "branding" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("roadmap")}
          className="px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2"
          style={{ color: activeTab === "roadmap" ? "#0362E3" : "#6B7280" }}
        >
          <Map size={14} />
          Feuille de route
          {activeTab === "roadmap" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("calendrier")}
          className="px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2"
          style={{ color: activeTab === "calendrier" ? "#0362E3" : "#6B7280" }}
        >
          <CalendarDays size={14} />
          Calendrier
          {activeTab === "calendrier" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("documentation")}
          className="px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2"
          style={{ color: activeTab === "documentation" ? "#0362E3" : "#6B7280" }}
        >
          <BookOpen size={14} />
          Documentation
          {activeTab === "documentation" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
      </div>

      {activeTab === "fiche" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info client */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Informations client
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={<Building2 size={14} />} label="Nom entreprise"    value={client.nom} />
                <InfoRow icon={<MapPin size={14} />}    label="Adresse"          value={client.adresse ?? ""} />
                <InfoRow icon={<Calendar size={14} />}  label="Date d'acquisition" value={formatDate(client.dateAcquisition)} />
                <InfoRow icon={<User size={14} />}      label="Contact"          value={client.contact} />
                <InfoRow icon={<Mail size={14} />}      label="Courriel"       value={client.courriel} />
                <InfoRow icon={<Phone size={14} />}     label="Téléphone"      value={client.telephone} />
                {client.neq && (
                  <InfoRow icon={<FileText size={14} />} label="NEQ" value={client.neq} />
                )}
                {client.titreContact && (
                  <InfoRow icon={<User size={14} />} label="Titre" value={client.titreContact} />
                )}
                {client.contrat?.statut === "signe" && client.contrat.dateSignature && (
                  <InfoRow icon={<Calendar size={14} />} label="Date de signature" value={formatDate(client.contrat.dateSignature)} />
                )}
              </div>
            </div>

            {/* Forfait */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Forfait & tarification
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <PriceCard label="Forfait"          value={client.forfait} />
                <PriceCard label="Succursales"      value={String(client.succursales)} />
                <PriceCard label="Total / mois"     value={client.montantMensuel ? `${client.montantMensuel} $` : "—"} />
              </div>
            </div>

            {/* Synchronisation portailSyncJob */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound size={16} className="text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Synchronisation — portailSyncJob
                </h2>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Jeton utilisé par la Cloud Function du projet Firebase de ce client pour pousser
                ses agrégats chaque nuit vers <code className="text-[11px] bg-gray-50 px-1 py-0.5 rounded">/api/sync/analytics</code>.
              </p>

              {syncStatus?.exists ? (
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">
                    Jeton actif — se termine par ••••{syncStatus.tokenSuffix}
                  </span>
                  {syncStatus.lastUsedAt && (
                    <span className="text-gray-400">
                      Dernière sync : {formatDate(new Date(syncStatus.lastUsedAt))}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-4">Aucun jeton généré pour ce client.</p>
              )}

              {newToken && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-yellow-800">
                    Copiez ce jeton maintenant — il ne sera plus jamais affiché.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white border border-yellow-200 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap">
                      {newToken}
                    </code>
                    <button
                      onClick={handleCopyToken}
                      className="flex-shrink-0 p-1.5 rounded-md border border-yellow-300 hover:bg-yellow-100 transition-colors"
                      title="Copier"
                    >
                      {tokenCopied ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-yellow-700" />}
                    </button>
                  </div>
                </div>
              )}

              {syncError && (
                <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {syncError}
                </p>
              )}

              <button
                onClick={handleGenerateToken}
                disabled={syncLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {syncLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : syncStatus?.exists ? <RefreshCw size={14} /> : <KeyRound size={14} />}
                {syncStatus?.exists ? "Régénérer le jeton" : "Générer un jeton"}
              </button>
            </div>
          </div>

          {/* Contrat */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Contrat
              </h2>
            </div>

            {client.contrat ? (
              <div className="space-y-4">
                <StatutContrat statut={client.contrat.statut} dateSignature={client.contrat.dateSignature} />
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Forfait : <span className="font-medium text-gray-700">{client.contrat.forfait}</span></div>
                  <div>Généré le : <span className="font-medium text-gray-700">{formatDate(client.contrat.genereLe)}</span></div>
                </div>
                <button
                  onClick={handleViewContrat}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink size={13} /> Voir le contrat
                </button>
                {client.contrat.urlPDF && (
                  <a
                    href={client.contrat.urlPDF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-green-600 hover:underline"
                  >
                    <ExternalLink size={13} /> Voir le contrat signé (PDF)
                  </a>
                )}
                {client.contrat.statut !== "signe" && (
                  <button
                    onClick={() => {
                      setSignDate(new Date().toISOString().slice(0, 10));
                      setSignFile(null);
                      setSignError(null);
                      setSignModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <CheckCircle size={14} /> Marquer comme signé
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Regénérer le contrat
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Aucun contrat généré pour ce client.</p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  {generating ? "Génération…" : "Générer le contrat"}
                </button>
              </div>
            )}

            {error && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-3 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <CheckCircle size={12} /> Contrat généré avec succès.
              </p>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Processus de signature</p>
              <ol className="space-y-3">
                {[
                  { n: 1, texte: "Générer le contrat ci-dessus." },
                  { n: 2, texte: "Cliquer « Voir le contrat », l'imprimer en PDF depuis le navigateur (Fichier → Imprimer → Enregistrer en PDF)." },
                  { n: 3, texte: "Envoyer le PDF au client via DocuSeal, HelloSign ou par courriel pour signature." },
                  { n: 4, texte: "Copier le lien de signature généré et l'ajouter dans Firestore : clients → [id] → contrat → urlDocuSeal." },
                  { n: 5, texte: "Une fois signé : changer contrat.statut à « signe » et ajouter l'URL du PDF signé dans contrat.urlPDF." },
                ].map(({ n, texte }) => (
                  <li key={n} className="flex gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {n}
                    </span>
                    <p className="text-xs text-gray-500 leading-relaxed">{texte}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {activeTab === "messages" && (
        <div className="max-w-3xl">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
            {/* Messages list */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3" style={{ maxHeight: 440 }}>
              {messages.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-10">Aucun message pour ce client</p>
              )}
              {messages.map((m) => {
                const isAdmin = m.auteurRole === "admin";
                return (
                  <div key={m.id} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                    {!isAdmin && (
                      <p className="text-xs text-gray-400 mb-1 ml-1 font-medium">{m.auteur}</p>
                    )}
                    <div
                      className="max-w-lg text-sm leading-relaxed px-4 py-2.5"
                      style={{
                        background: isAdmin ? "#0362E3" : "#F3F4F6",
                        color: isAdmin ? "#fff" : "#1F2937",
                        borderRadius: isAdmin ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      }}
                    >
                      {m.texte}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 px-1">{formatTime(m.date)}</p>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply */}
            <div className="border-t border-gray-100 p-4 flex gap-3 items-end">
              <textarea
                value={msgTexte}
                onChange={(e) => setMsgTexte(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Répondre au client…"
                rows={2}
                className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-sans"
              />
              <button
                onClick={handleSendMessage}
                disabled={!msgTexte.trim() || sendingMsg}
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: msgTexte.trim() && !sendingMsg ? "#0362E3" : "#E5E7EB" }}
              >
                {sendingMsg
                  ? <Loader2 size={15} className="animate-spin text-white" />
                  : <Send size={15} color={msgTexte.trim() ? "#fff" : "#9CA3AF"} />
                }
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === "branding" && (
        <AdminBrandingViewer clientId={id} forfait={client?.forfait} />
      )}
      {activeTab === "roadmap" && (
        <AdminRoadmapViewer clientId={id} />
      )}
      {activeTab === "calendrier" && (
        <div style={{ padding: "24px 0" }}>
          <AdminCalendrierClient clientId={id} />
        </div>
      )}
      {activeTab === "documentation" && (
        <div style={{ paddingTop: 8 }}>
          <AdminDocumentationTab
            clientId={id}
            clientNom={client.nom}
            clientCourriel={client.courriel}
          />
        </div>
      )}
    </div>

    {/* Dialog — Marquer comme signé */}
    <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Marquer le contrat comme signé</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">
              Contrat signé (PDF)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setSignFile(e.target.files?.[0] ?? null)}
              className="text-sm text-gray-600 w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">
              Date de signature
            </label>
            <input
              type="date"
              value={signDate}
              onChange={(e) => setSignDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {signError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {signError}
            </p>
          )}
        </div>
        <DialogFooter className="flex gap-2">
          <button
            onClick={() => setSignModalOpen(false)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleMarquerSigne}
            disabled={!signFile || signing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {signing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Confirmer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        {icon} {label}
      </div>
      <div className="text-sm font-medium text-gray-800">{value || "—"}</div>
    </div>
  );
}

function PriceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-base font-semibold text-gray-900">{value}</div>
    </div>
  );
}
