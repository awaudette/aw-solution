// Configuration centralisée des sections du portail client — source unique
// pour la barre latérale (ClientSidebar.tsx) ET le formulaire d'invitation
// (BlocUtilisateurs/InviteForm dans parametres/page.tsx). Ajouter une
// section à MASTER_NAV la fait apparaître automatiquement dans les deux —
// plus besoin de maintenir une seconde liste à la main.

import {
  Home, FileText, CreditCard, Palette, Map, BookOpen, BarChart2,
  CalendarDays, Sparkles, LifeBuoy, Settings,
} from "lucide-react";

export interface NavItem { label: string; icon: React.ElementType; slug: string }

// ─── Ordre maître de la navigation ─────────────────────────────────────────
// Quatre entrées (contrat, paiement, branding, roadmap) descendent en bas du
// menu dans ClientSidebar.tsx, indépendamment les unes des autres, dès que
// leur condition Firestore respective est remplie — voir isSectionDone()
// dans ce fichier. Les autres entrées ne bougent jamais.
export const MASTER_NAV: NavItem[] = [
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

/** Slugs éligibles à descendre en bas du menu une fois réglés (ClientSidebar). */
export const DESCENDABLE_SLUGS = new Set(["contrat", "paiement", "branding", "roadmap"]);

// ─── Permissions par section (formulaire d'invitation client) ──────────────
// Dérivé de MASTER_NAV ci-dessus : toute section ajoutée là apparaît ici
// automatiquement, avec le bon slug — plus de liste séparée à tenir à jour.
//
// key : identifiant stocké tel quel dans
// clients/{clientId}/users/{uid}.permissions. Diverge du slug pour deux
// entrées historiques (roadmap → feuilleDeRoute, donnees → rapports) parce
// que des invités existants ont déjà ces clés écrites dans Firestore : ne
// JAMAIS renommer une clé déjà utilisée sans migrer les documents existants.
// Une nouvelle section prend simplement key = slug.
const PERMISSION_KEY_BY_SLUG: Record<string, string> = {
  roadmap: "feuilleDeRoute",
  donnees: "rapports",
};

/** Sections limitées à "lecture" au maximum — toutes les autres vont jusqu'à "ecriture". */
const READ_ONLY_SLUGS = new Set(["parametres"]);

export type SectionKey =
  | "accueil" | "contrat" | "paiement" | "branding" | "feuilleDeRoute"
  | "documentation" | "rapports" | "calendrier" | "nouveautes"
  | "support" | "parametres";

export type Permission  = "lecture" | "ecriture" | null;
export type Permissions = Record<SectionKey, Permission>;

export interface PortalSection {
  key:           SectionKey;
  label:         string;
  slug:          string;
  maxPermission: "lecture" | "ecriture";
}

export const PORTAL_SECTIONS: PortalSection[] = MASTER_NAV.map((item) => ({
  key:           (PERMISSION_KEY_BY_SLUG[item.slug] ?? item.slug) as SectionKey,
  label:         item.label,
  slug:          item.slug,
  maxPermission: READ_ONLY_SLUGS.has(item.slug) ? "lecture" : "ecriture",
}));

export const DEFAULT_PERMISSIONS: Permissions = Object.fromEntries(
  PORTAL_SECTIONS.map((s) => [s.key, null]),
) as Permissions;
