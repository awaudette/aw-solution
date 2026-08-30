/**
 * tourSteps.ts
 *
 * Contenu de la visite guidée du portail client — séparé du moteur
 * (src/components/tour/TourEngine.tsx) pour pouvoir être modifié sans y
 * toucher. Chaque étape cible un bloc précis via l'attribut data-tour-id
 * posé à la main dans la page/le composant concerné.
 *
 * Contenu définitif — voir contenu-visite-guidee.md à la racine du projet
 * pour la source. 29 étapes, dont 2 réservées à Prestige (branding-profil-
 * clientele, support-rencontre) : un client Essentiel en voit 27.
 *
 * prestigeSeulement: true → étape exclue pour un client au forfait
 * Essentiel ; la numérotation ("étape X sur Y") s'ajuste en conséquence
 * (voir getVisibleSteps() dans TourEngine.tsx).
 *
 * section → identifiant de regroupement (pas un libellé d'affichage) pour
 * un futur bouton "Voir la visite de cette section" qui ne rejouerait que
 * les étapes de la section courante.
 *
 * ⚠️ roadmap-journal (5.3) : l'ancre est posée, mais son activation (bascule
 * de l'onglet "Journal de développement" avant de pouvoir la trouver) n'est
 * pas encore câblée dans le moteur — voir la proposition soumise à Alex.
 * Tant que ce n'est pas résolu, cette étape est sautée automatiquement par
 * le délai maximal d'attente d'ancre (comportement sûr, pas une erreur).
 */

export interface TourStep {
  id: string;
  /** Identifiant de regroupement (ex. "accueil", "branding") — pas un libellé */
  section: string;
  /** Slug de route sous /client/{clientId}/{slug} */
  slug: string;
  /** Valeur de l'attribut data-tour-id posé sur le bloc cible */
  anchor: string;
  titre: string;
  texte: string;
  prestigeSeulement?: boolean;
  /** Sélecteur CSS générique cliqué par le moteur avant d'attendre l'ancre —
   *  pour les étapes qui ciblent un contenu caché derrière un sous-onglet
   *  local à la page (ex. bascule d'onglet avant de pouvoir surligner). */
  preClickSelector?: string;
}

export const TOUR_STEPS: TourStep[] = [
  // ─── 1. Accueil ───────────────────────────────────────────────────────────
  {
    id: "accueil-banniere",
    section: "accueil",
    slug: "accueil",
    anchor: "accueil-banniere",
    titre: "Ce qui demande votre attention",
    texte: "Quand une action est attendue de votre part, elle apparaît ici, tout en haut. C'est le seul endroit à surveiller pour ne rien manquer. Tant que la bannière est vide, vous n'avez rien à faire, le travail est de notre côté.",
  },
  {
    id: "accueil-etapes",
    section: "accueil",
    slug: "accueil",
    anchor: "accueil-etapes",
    titre: "Les étapes de votre projet",
    texte: "Cette ligne montre le chemin complet entre la signature de votre entente et le lancement de votre application. L'étape en cours est mise en évidence, celles qui sont franchies sont marquées comme terminées. Vous savez donc en un coup d'œil où votre projet est rendu et ce qui s'en vient, sans avoir à nous le demander.",
  },
  {
    id: "accueil-messages",
    section: "accueil",
    slug: "accueil",
    anchor: "accueil-messages",
    titre: "Vos messages et notifications",
    texte: "Chaque fois que notre équipe vous écrit, publie une mise à jour ou franchit une étape de votre projet, vous en êtes avisé ici. Les échanges plus longs se poursuivent dans la section Support, mais le premier signal passe toujours par cette section.",
  },
  {
    id: "accueil-forfait",
    section: "accueil",
    slug: "accueil",
    anchor: "accueil-forfait",
    titre: "Votre forfait",
    texte: "Un rappel de votre forfait et de ce qu'il comprend. Les détails de facturation et votre moyen de paiement se trouvent dans la section Paiement.",
  },

  // ─── 2. Contrat ───────────────────────────────────────────────────────────
  {
    id: "contrat-carte",
    section: "contrat",
    slug: "contrat",
    anchor: "contrat-carte",
    titre: "Votre entente de service",
    texte: "C'est ici que tout commence. Votre entente de service est la première chose à régler, parce que c'est elle qui donne le coup d'envoi à votre projet : tant qu'elle n'est pas signée, la construction de votre application ne peut pas démarrer.\n\nVous pouvez lire le contrat au complet directement à l'écran. Pour le signer, le bouton « Signer le contrat » vous dirige vers notre plateforme de signature électronique, où vous n'aurez qu'à entrer votre courriel et signer.\n\nSi le bouton n'est pas encore actif, c'est simplement que nous préparons votre lien de signature. Vous recevrez un courriel dès qu'il sera prêt.\n\nUne fois l'entente signée, cette section conserve votre contrat et sa version signée en PDF, téléchargeable en tout temps. Vous n'aurez jamais à la chercher dans vos courriels.",
  },

  // ─── 3. Paiement ──────────────────────────────────────────────────────────
  {
    id: "paiement-carte",
    section: "paiement",
    slug: "paiement",
    anchor: "paiement-carte",
    titre: "Votre moyen de paiement",
    texte: "Deuxième chose à faire dès votre arrivée : ajouter votre moyen de paiement. Avec l'entente signée, c'est ce qui permet de lancer officiellement votre projet.\n\nVous inscrivez votre carte une seule fois, et vous pouvez la remplacer en tout temps par la suite, par exemple si la vôtre vient à expiration. Le traitement se fait par notre fournisseur de paiement sécurisé, nous ne conservons jamais vos données bancaires.\n\nVous voyez aussi ici votre forfait actuel et ce qu'il comprend. Si un forfait supérieur peut mieux vous convenir, l'information s'affiche à cet endroit, sans aucun engagement de votre part.\n\nEnfin, vos factures s'accumulent ici, de la plus récente à la plus ancienne, consultables et téléchargeables pour votre comptabilité.",
  },

  // ─── 4. Branding ──────────────────────────────────────────────────────────
  {
    id: "branding-apercu",
    section: "branding",
    slug: "branding",
    anchor: "branding-apercu",
    titre: "L'apparence de votre application",
    texte: "C'est ici que votre application prend son apparence. Vous y retrouvez tout ce qui compose votre identité, des couleurs jusqu'à la façon dont votre programme de fidélité est présenté à vos clients.\n\nC'est aussi la troisième chose à régler au départ. Plus vite on a votre matériel et vos préférences, plus vite on peut commencer à monter votre application. C'est souvent ici que les projets prennent de l'avance ou du retard.",
  },
  {
    id: "branding-infos",
    section: "branding",
    slug: "branding",
    anchor: "branding-infos",
    titre: "Informations de l'entreprise",
    texte: "Vos coordonnées légales et votre contact principal. C'est ce qui nous permet de vous joindre rapidement et de préparer vos documents officiels, comme votre entente et vos factures. Assurez-vous que le nom légal, le NEQ, l'adresse et les coordonnées de votre contact sont exacts, parce qu'on s'y fie pour tout ce qui est administratif.",
  },
  {
    id: "branding-visuel",
    section: "branding",
    slug: "branding",
    anchor: "branding-visuel",
    titre: "Branding visuel",
    texte: "Vos couleurs et vos logos. Déposez-nous plusieurs versions de votre logo si vous en avez, en haute résolution, avec ou sans fond, en différents formats. Votre logo apparaît à plusieurs endroits dans l'application, sur des fonds pâles comme foncés et à des tailles très différentes. Plus on a de versions, plus il sera net partout.",
  },
  {
    id: "branding-fidelite",
    section: "branding",
    slug: "branding",
    anchor: "branding-fidelite",
    titre: "Programme de fidélité",
    texte: "Le cœur de votre application. Comment vos clients accumulent des points et ce qu'ils peuvent obtenir en échange.\n\nPrévoyez au moins trois ou quatre récompenses. Une seule récompense donne peu de raisons de revenir, tandis qu'un éventail de choix, du petit plaisir accessible à la récompense qui se mérite, garde vos clients accrochés plus longtemps.\n\nAjoutez aussi de belles images pour chacune. Une récompense qu'on voit donne bien plus envie qu'une ligne de texte.",
  },
  {
    id: "branding-setup",
    section: "branding",
    slug: "branding",
    anchor: "branding-setup",
    titre: "Setup technique",
    texte: "C'est la section la plus importante de toutes, et celle qui influence le plus votre délai de lancement. C'est elle qui nous permet de relier votre système de caisse à votre application.\n\nDonnez-nous le plus de détails possible sur votre équipement et votre configuration. Et si vous pouvez nous fournir des identifiants d'accès à votre système de caisse, on peut aller voir nous-mêmes comment il est monté, ce qui accélère énormément le travail et vous évite une série d'allers-retours par courriel.",
  },
  {
    id: "branding-sections-app",
    section: "branding",
    slug: "branding",
    anchor: "branding-sections-app",
    titre: "Sections de l'application",
    texte: "Les différentes pages que vos clients verront dans votre application. Vous choisissez lesquelles activer selon ce qui convient à votre commerce.",
  },
  {
    id: "branding-templates",
    section: "branding",
    slug: "branding",
    anchor: "branding-templates",
    titre: "Préférences des écrans",
    texte: "C'est ici que vous nous donnez une idée du style visuel que vous recherchez. Plusieurs présentations sont possibles pour un même contenu.\n\nÉcrivez-nous vos commentaires, même les idées à moitié formées. Ce que vous aimez ailleurs, une ambiance qui vous parle, quelque chose que vous voulez éviter. Ce sont ces précisions qui nous permettent de concevoir quelque chose qui vous ressemble plutôt qu'un modèle générique.",
  },
  {
    id: "branding-fichiers",
    section: "branding",
    slug: "branding",
    anchor: "branding-fichiers",
    titre: "Fichiers et ressources",
    texte: "Déposez-nous tout ce que vous avez : photos de votre commerce, de vos plats, de votre équipe, vidéos, visuels de vos réseaux sociaux, matériel promotionnel. Même ce qui vous semble anodin peut servir.\n\nPlus on a de matériel, plus le design final sera propre et vous ressemblera. Un manque de photos, c'est ce qui pousse à utiliser des images génériques, et ça se voit toujours.",
  },
  {
    id: "branding-profil-clientele",
    section: "branding",
    slug: "branding",
    anchor: "branding-profil-clientele",
    titre: "Profil de votre clientèle",
    texte: "Ce portrait nous sert à segmenter votre clientèle. En comprenant les habitudes de vos clients, à quelle fréquence ils viennent normalement et ce qui constitue une visite typique chez vous, on peut établir les bons repères.\n\nC'est ce qui nous permet de distinguer un de vos meilleurs clients d'un client qui commence à s'éloigner. Un client qui vient chaque semaine et qu'on n'a pas vu depuis un mois, ça veut dire quelque chose, chez un commerce où on vient trois fois par année, non. Ces repères changent d'un commerce à l'autre, et c'est vous qui nous les donnez.",
    prestigeSeulement: true,
  },

  // ─── 5. Feuille de route ──────────────────────────────────────────────────
  {
    id: "roadmap-entete",
    section: "roadmap",
    slug: "roadmap",
    anchor: "roadmap-entete",
    titre: "Le plan de votre projet",
    texte: "C'est le plan complet de votre projet, de la signature jusqu'au lancement de votre application. Vous savez en tout temps où les choses sont rendues, sans avoir à nous le demander.\n\nUne fois votre application lancée, cette section descend au bas du menu. Elle reste consultable, mais vous n'aurez plus besoin de la surveiller au quotidien.",
  },
  {
    id: "roadmap-progression",
    section: "roadmap",
    slug: "roadmap",
    anchor: "roadmap-progression",
    titre: "Progression",
    texte: "Toutes les étapes de votre projet, du début à la fin, avec ce qui est terminé, ce qui est en cours et ce qui s'en vient.\n\nCertaines étapes dépendent de nous, d'autres de vous. Quand quelque chose est attendu de votre part, c'est indiqué clairement, et c'est généralement là que le projet accélère ou ralentit.",
    preClickSelector: '[data-tour-tab="progression"]',
  },
  {
    id: "roadmap-journal",
    section: "roadmap",
    slug: "roadmap",
    anchor: "roadmap-journal",
    titre: "Journal de développement",
    texte: "C'est ici qu'on vous tient au courant de notre avancement. Chaque fois qu'on termine une partie de votre application, on vous la présente ici, souvent avec des images de ce qu'on a monté.\n\nVous répondez directement dans le journal : vous approuvez ce qu'on vous montre, vous demandez des modifications ou vous posez vos questions. Rien n'est final tant que vous n'avez pas donné votre avis, et plus vos commentaires arrivent tôt, plus les corrections sont simples à faire.",
    preClickSelector: '[data-tour-tab="journal"]',
  },

  // ─── 6. Documentation ─────────────────────────────────────────────────────
  {
    id: "documentation-categories",
    section: "documentation",
    slug: "documentation",
    anchor: "documentation-categories",
    titre: "Vos documents",
    texte: "Vos guides et documents de référence, classés par sujet.\n\nCette section se remplit surtout une fois votre application terminée. C'est normal si elle est encore peu garnie au début : les guides expliquent les fonctionnalités de votre application, avec vos écrans et vos règles, alors on les prépare quand tout est arrêté plutôt que de vous donner des explications qui changeraient en cours de route.\n\nVous y trouverez ensuite vos formations, la marche à suivre pour votre personnel et le matériel pour présenter le programme à votre clientèle. Les ajouts récents sont identifiés, alors vous voyez d'un coup d'œil ce qui est nouveau depuis votre dernière visite.",
  },
  {
    id: "documentation-faq",
    section: "documentation",
    slug: "documentation",
    anchor: "documentation-faq",
    titre: "Foire aux questions",
    texte: "Cette partie est déjà remplie et disponible dès maintenant.\n\nElle regroupe les questions qu'on nous pose le plus souvent, sur le fonctionnement du portail, le déroulement du projet et le programme de fidélité en général. Avant de nous écrire, jetez-y un œil, la réponse s'y trouve souvent, et ça vous épargne un aller-retour.",
  },

  // ─── 7. Données & rapports ────────────────────────────────────────────────
  {
    id: "donnees-apercu",
    section: "donnees",
    slug: "donnees",
    anchor: "donnees-apercu",
    titre: "Vos données et vos rapports",
    texte: "C'est la section qui prendra le plus d'importance une fois votre application en marche.\n\nElle est vide au départ, et c'est normal, elle se remplit dès que vos premiers clients commencent à utiliser votre application. Vos données sont ensuite mises à jour chaque nuit.\n\nVous y suivrez tout ce qui compte : combien de membres vous avez, à quelle fréquence ils reviennent, les revenus générés, les points accumulés et réclamés, le rendement de vos promotions. C'est là que vous verrez concrètement ce que votre programme rapporte.\n\nVous y trouverez aussi vos rapports mensuels, qui reprennent chaque mois complet en détail. Ils sont conçus pour être utiles à votre comptabilité : les points distribués, ce qui a été réclamé, les rabais accordés et les montants correspondants, le tout téléchargeable pour vos dossiers ou pour votre comptable.\n\nTout l'historique se conserve, ce qui vous permet de comparer vos mois entre eux et de voir votre progression dans le temps.",
  },

  // ─── 8. Calendrier ────────────────────────────────────────────────────────
  {
    id: "calendrier-liste",
    section: "calendrier",
    slug: "calendrier",
    anchor: "calendrier-liste",
    titre: "Vos rendez-vous",
    texte: "Vos rendez-vous avec notre équipe, réunis au même endroit.\n\nVous y voyez les rencontres à venir avec leur date, leur heure et leur sujet, ainsi que celles qui ont déjà eu lieu.\n\nC'est aussi ici que vous demandez une nouvelle rencontre. Vous nous dites vos disponibilités, on vous confirme le moment, et il apparaît dans votre calendrier.\n\nPendant la construction de votre application, ces rencontres servent à valider les grandes étapes ensemble. Une fois lancée, elles servent à faire le point sur vos résultats et à ajuster votre programme.",
  },

  // ─── 9. Nouveautés ────────────────────────────────────────────────────────
  {
    id: "nouveautes-fil",
    section: "nouveautes",
    slug: "nouveautes",
    anchor: "nouveautes-fil",
    titre: "Nouveautés et mises à jour",
    texte: "Ce qu'on ajoute et ce qu'on améliore sur la plateforme.\n\nDeux types d'annonces s'y retrouvent. Les nouveautés, quand une fonctionnalité inédite devient disponible, et les mises à jour, quand on améliore ou corrige quelque chose d'existant. Chaque publication est identifiée pour que vous voyiez tout de suite de quoi il s'agit.\n\nOn y explique concrètement ce qui change et ce que ça vous apporte, avec des images ou des documents quand c'est utile.\n\nÇa vaut la peine d'y jeter un œil de temps en temps, c'est souvent là que vous découvrirez une fonctionnalité qui vous sera utile et dont vous ignoriez l'existence.",
  },

  // ─── 10. Support ──────────────────────────────────────────────────────────
  {
    id: "support-entete",
    section: "support",
    slug: "support",
    anchor: "support-entete",
    titre: "Nous joindre",
    texte: "C'est votre porte d'entrée vers notre équipe. Trois façons de nous joindre s'y trouvent, chacune pour un besoin différent. On vous les présente une par une pour que vous sachiez laquelle utiliser selon la situation.",
  },
  {
    id: "support-messagerie",
    section: "support",
    slug: "support",
    anchor: "support-messagerie",
    titre: "La messagerie",
    texte: "Pour vos échanges du quotidien. Une question rapide, une précision, un suivi : vous nous écrivez, on vous répond, et toute la conversation se conserve au même endroit.\n\nC'est l'équivalent d'un courriel, en plus simple, sans avoir à chercher qui contacter ni à retrouver le bon fil de discussion.",
  },
  {
    id: "support-demande",
    section: "support",
    slug: "support",
    anchor: "support-demande",
    titre: "Les demandes de support",
    texte: "Pour un problème concret ou une demande précise. Contrairement à un message, une demande est suivie : elle a un statut, vous voyez si elle est ouverte, en traitement ou réglée, et rien ne se perd dans une conversation.\n\nVous choisissez la catégorie, vous décrivez la situation, et vous pouvez joindre des images. Une capture d'écran vaut souvent mieux qu'un long paragraphe, surtout quand quelque chose ne fonctionne pas comme prévu.\n\nUtilisez cette voie plutôt que la messagerie dès qu'il s'agit d'un problème ou d'une demande qui exige une intervention de notre part.",
  },
  {
    id: "support-rencontre",
    section: "support",
    slug: "support",
    anchor: "support-rencontre",
    titre: "La rencontre stratégique",
    texte: "Une rencontre avec notre équipe pour prendre du recul sur vos résultats, disponible chaque mois si vous en ressentez le besoin.\n\nCe n'est pas du dépannage. C'est un temps d'arrêt pour regarder les chiffres ensemble : ce qui fonctionne, ce qui fonctionne moins, quelles promotions ont porté et ce qu'on ajusterait pour la suite.\n\nLa plupart du temps, vos données parlent d'elles-mêmes et vous n'aurez pas besoin de nous. Mais quand une décision est plus importante, quand quelque chose vous intrigue dans vos résultats ou que vous voulez pousser plus loin, c'est ici que vous la demandez.",
    prestigeSeulement: true,
  },

  // ─── 11. Paramètres ───────────────────────────────────────────────────────
  {
    id: "parametres-compte",
    section: "parametres",
    slug: "parametres",
    anchor: "parametres-compte",
    titre: "Votre compte",
    texte: "Vos informations personnelles et votre sécurité. Vous pouvez y modifier vos coordonnées et changer votre mot de passe en tout temps.\n\nGardez vos coordonnées à jour, c'est à ces adresses qu'on vous écrit quand quelque chose demande votre attention.",
  },
  {
    id: "parametres-utilisateurs",
    section: "parametres",
    slug: "parametres",
    anchor: "parametres-utilisateurs",
    titre: "La gestion des utilisateurs",
    texte: "Vous pouvez donner accès au portail à d'autres personnes de votre équipe, chacune avec son propre compte et son propre mot de passe.\n\nPour chaque personne que vous ajoutez, vous choisissez les sections auxquelles elle a accès. Votre gérant peut ainsi consulter les données et le calendrier sans voir votre contrat ni vos informations de paiement.\n\nC'est plus sûr que de partager votre mot de passe, et vous gardez le contrôle : vous pouvez retirer un accès en tout temps, par exemple quand quelqu'un quitte votre équipe.",
  },
  {
    id: "parametres-notifications",
    section: "parametres",
    slug: "parametres",
    anchor: "parametres-notifications",
    titre: "Vos notifications",
    texte: "Vous décidez de quoi vous voulez être avisé, et par quel moyen.\n\nChaque personne de votre équipe a ses propres préférences. Votre gérant peut recevoir les avis liés aux données sans être dérangé par ceux qui concernent la facturation.\n\nSi vous trouvez qu'on vous écrit trop, ou pas assez, c'est ici que ça s'ajuste.",
  },
];
