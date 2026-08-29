"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Home,
  FileText,
  CreditCard,
  Palette,
  Map,
  BookOpen,
  BarChart2,
  LifeBuoy,
  Settings,
  LogOut,
  ChevronRight,
  CalendarDays,
  Sparkles,
} from "lucide-react";

type NavItem = { label: string; icon: React.ElementType; slug: string };

/* Mots génériques à ignorer pour le calcul des initiales */
const STOP_WORDS = new Set([
  "club","de","du","d","la","le","les","et","of","the","a","au","aux","en",
  "restaurant","café","cafe","bar","bistro","brasserie","groupe","inc","ltée","ltee",
]);

function getInitials(nom: string): string {
  const words = nom.trim().split(/\s+/).filter(w => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return nom.trim().slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ─── Ordre maître de la navigation ─────────────────────────────────────────
// Quatre entrées (contrat, paiement, branding, roadmap) descendent en bas du
// menu, indépendamment les unes des autres, dès que leur condition Firestore
// respective est remplie — voir isSectionDone() plus bas. Les autres entrées
// ne bougent jamais.
const MASTER_NAV: NavItem[] = [
  { label: "Accueil",            icon: Home,         slug: "accueil"      },
  { label: "Contrat",            icon: FileText,     slug: "contrat"      },
  { label: "Paiement",           icon: CreditCard,   slug: "paiement"     },
  { label: "Branding",           icon: Palette,      slug: "branding"     },
  { label: "Feuille de route",   icon: Map,          slug: "roadmap"      },
  { label: "Documentation",      icon: BookOpen,     slug: "documentation"},
  { label: "Données & rapports", icon: BarChart2,    slug: "donnees"      },
  { label: "Calendrier",         icon: CalendarDays, slug: "calendrier"   },
  { label: "Nouveautés",         icon: Sparkles,     slug: "nouveautes"   },
  { label: "Support",            icon: LifeBuoy,     slug: "support"      },
  { label: "Paramètres",         icon: Settings,     slug: "parametres"   },
];

/** Slugs éligibles à descendre en bas du menu une fois réglés. */
const DESCENDABLE_SLUGS = new Set(["contrat", "paiement", "branding", "roadmap"]);

export default function ClientSidebar({ onExpandedChange }: { onExpandedChange?: (v: boolean) => void }) {
  const [expanded, setExpanded]             = useState(false);
  const [contratSigne, setContratSigne]     = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [clientNom, setClientNom]           = useState("");
  const [clientColor, setClientColor]       = useState("#0362E3");
  const [brandingComplete, setBrandingComplete]   = useState(false);
  const [paiementComplete, setPaiementComplete]   = useState(false);
  const [lancementComplete, setLancementComplete] = useState(false);

  function handleExpand(v: boolean) {
    setExpanded(v);
    onExpandedChange?.(v);
  }
  const params   = useParams();
  const pathname = usePathname();
  const router   = useRouter();
  const clientId = params.clientId as string;

  useEffect(() => {
      // Couleur avatar : branding/main.couleurPrincipale > couleurPortail > couleur_primaire > #0362E3
    let unsubBranding: (() => void) | null = null;

    const unsub = onSnapshot(doc(db, "clients", clientId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setContratSigne(data?.contrat?.statut === "signe");
      setClientNom(data?.nom ?? "");
      const fallback = data?.couleurPortail || data?.couleur_primaire || "#0362E3";
      // Écouter branding/main pour couleurPrincipale
      if (unsubBranding) unsubBranding();
      unsubBranding = onSnapshot(
        doc(db, "clients", clientId, "branding", "main"),
        (bSnap) => {
          const bData = bSnap.exists() ? bSnap.data() : {};
          setClientColor((bData.couleurPrincipale ?? "") || fallback);
          setBrandingComplete(!!bData.brandingCompletedAt);
        },
      );
    });
    return () => { unsub(); unsubBranding?.(); };
  }, [clientId]);


  useEffect(() => {
    const q = query(
      collection(db, "clients", clientId, "messages"),
      where("auteurRole", "==", "admin"),
    );
    return onSnapshot(q, (snap) => {
      const count = snap.docs.filter((d) => d.data().lu === false).length;
      setUnreadMessages(count);
    });
  }, [clientId]);

  // Un seul listener pour les deux conditions issues de roadmap/main
  // (paiement et lancement) — évite un deuxième onSnapshot sur ce document.
  useEffect(() => {
    return onSnapshot(doc(db, "clients", clientId, "roadmap", "main"), (snap) => {
      const etapes = snap.exists()
        ? ((snap.data().etapes ?? []) as { id: string; statut: string }[])
        : [];
      setPaiementComplete(etapes.some((e) => e.id === "paiement" && e.statut === "complete"));
      setLancementComplete(etapes.some((e) => e.id === "lancement" && e.statut === "complete"));
    });
  }, [clientId]);

  function isSectionDone(slug: string): boolean {
    switch (slug) {
      case "contrat":  return contratSigne;
      case "paiement": return paiementComplete;
      case "branding": return brandingComplete;
      case "roadmap":  return lancementComplete;
      default:         return false;
    }
  }

  // Ordre du haut : tout ce qui n'est pas descendable, + le descendable pas
  // encore réglé. Ordre du bas : le descendable réglé, toujours dans l'ordre
  // fixe du tableau maître (pas l'ordre chronologique de complétion) — un
  // menu prévisible d'une visite à l'autre.
  const topItems = MASTER_NAV.filter(
    (item) => !DESCENDABLE_SLUGS.has(item.slug) || !isSectionDone(item.slug),
  );
  const bottomItems = MASTER_NAV.filter(
    (item) => DESCENDABLE_SLUGS.has(item.slug) && isSectionDone(item.slug),
  );

  function renderNavItem({ label, icon: Icon, slug }: NavItem) {
    const href   = `/client/${clientId}/${slug}`;
    const active = pathname === href || pathname.startsWith(`${href}/`);

    const badge = slug === "support" && unreadMessages > 0 ? unreadMessages : 0;

    return (
      <Link
        key={slug}
        href={href}
        className="flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm transition-colors group relative"
        style={{
          backgroundColor: active ? "#EFF6FF" : "transparent",
          color:           active ? "#0362E3" : "#6B7280",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB";
            (e.currentTarget as HTMLElement).style.color = "#111827";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#6B7280";
          }
        }}
      >
        <div className="relative flex-shrink-0">
          <Icon size={18} strokeWidth={active ? 2 : 1.5} />
          {badge > 0 && (
            <span
              className="absolute flex items-center justify-center font-semibold"
              style={{
                top: -5, right: -5, minWidth: 14, height: 14,
                padding: "0 3px", borderRadius: 7, fontSize: 9,
                background: "#EF4444", color: "#fff", lineHeight: 1,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {expanded && (
          <span className="whitespace-nowrap font-medium overflow-hidden flex-1">{label}</span>
        )}
        {expanded && badge > 0 && (
          <span
            className="flex items-center justify-center font-semibold flex-shrink-0"
            style={{
              minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9,
              fontSize: 11, background: "#EF4444", color: "#fff",
            }}
          >
            {badge}
          </span>
        )}
        {!expanded && (
          <div className="absolute left-14 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {label}
          </div>
        )}
      </Link>
    );
  }

  async function handleLogout() {
    await fetch("/api/auth/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookieName: `session_client_${clientId}` }),
    });
    router.push("/login");
  }

  return (
    <aside
      onMouseEnter={() => handleExpand(true)}
      onMouseLeave={() => handleExpand(false)}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col border-r border-gray-100 bg-white transition-all duration-200 ease-in-out overflow-hidden"
      style={{ width: expanded ? 220 : 56 }}
    >
      {/* Initiales client */}
      <div className="flex items-center h-14 px-3.5 gap-3 border-b border-gray-100 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: clientColor }}
        >
          <span className="text-white font-bold text-xs tracking-wide">
            {clientNom ? getInitials(clientNom) : "…"}
          </span>
        </div>
        {expanded && (
          <span className="text-gray-900 font-semibold text-sm whitespace-nowrap overflow-hidden">
            {clientNom || "…"}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {topItems.map(renderNavItem)}
        {bottomItems.length > 0 && (
          <div className="mx-2 my-1.5 border-t border-gray-100" />
        )}
        {bottomItems.map(renderNavItem)}
      </nav>

      {/* Déconnexion */}
      <div className="py-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors w-[calc(100%-16px)] group relative"
        >
          <LogOut size={18} className="flex-shrink-0" strokeWidth={1.5} />
          {expanded && (
            <span className="whitespace-nowrap font-medium">Déconnexion</span>
          )}
          {!expanded && (
            <div className="absolute left-14 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Déconnexion
            </div>
          )}
        </button>
        {expanded && (
          <div className="flex items-center justify-end px-4 pt-2">
            <ChevronRight size={14} className="text-gray-300" />
          </div>
        )}
      </div>
    </aside>
  );
}
