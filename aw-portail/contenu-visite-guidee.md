# Contenu complet de la visite guidée — portail client AW Solution

Ce document contient les textes définitifs de toutes les étapes de la visite guidée.
Il remplace les 3 étapes de test actuellement dans `src/lib/tourSteps.ts`.

## Règles de rédaction

- Les textes ci-dessous sont **définitifs**. Ne les reformule pas, ne les raccourcis pas, ne les enrichis pas.
- **Aucun tiret cadratin ni demi-cadratin dans les textes.** Utilise des virgules. Si tu vois un tiret dans un texte ci-dessous, c'est une erreur, remplace-le par une virgule.
- Les guillemets français et les apostrophes typographiques sont conservés tels quels.

## Structure attendue

Chaque étape déclare : `id`, `slug` (la route), `anchor` (le `data-tour-id`), `titre`, `texte`, et `prestigeSeulement` si applicable.

L'ordre ci-dessous est l'ordre exact de la visite. Il suit l'ordre du menu tel qu'il apparaît pendant l'onboarding.

Un champ supplémentaire est nécessaire : **`section`**, un identifiant de regroupement (ex. `"accueil"`, `"branding"`), pour que le bouton « Voir la visite de cette section » puisse rejouer uniquement les étapes de la section où se trouve le client. Ajoute ce champ à chaque étape.

## Ancres à poser

Certaines ancres existent déjà (posées pour les 3 étapes de test) : `accueil-hero`, `branding-infos`, `support-messagerie`. Toutes les autres sont à créer.

Rappel de la convention retenue : l'ancre se pose en enveloppant l'appel du composant dans la page parente, jamais en éditant le composant cible lui-même.

**Important pour l'Accueil** : les 4 étapes ci-dessous ciblent les blocs de `AccueilOnboarding` (état 1). Si le client est dans l'état 2 (`AccueilConstruction`) ou 3 (`AccueilActif`), ces ancres n'existeront pas. Le moteur doit sauter proprement une étape dont l'ancre n'apparaît jamais, ce qui est déjà le comportement prévu par le délai maximal. Signale-moi si tu vois un meilleur moyen de gérer ce cas.

---

# 1. ACCUEIL (`slug: "accueil"`, `section: "accueil"`)

## 1.1 — ancre `accueil-banniere`
**Titre :** Ce qui demande votre attention

**Texte :**
Quand une action est attendue de votre part, elle apparaît ici, tout en haut. C'est le seul endroit à surveiller pour ne rien manquer. Tant que la bannière est vide, vous n'avez rien à faire, le travail est de notre côté.

## 1.2 — ancre `accueil-etapes`
**Titre :** Les étapes de votre projet

**Texte :**
Cette ligne montre le chemin complet entre la signature de votre entente et le lancement de votre application. L'étape en cours est mise en évidence, celles qui sont franchies sont marquées comme terminées. Vous savez donc en un coup d'œil où votre projet est rendu et ce qui s'en vient, sans avoir à nous le demander.

## 1.3 — ancre `accueil-messages`
**Titre :** Vos messages et notifications

**Texte :**
Chaque fois que notre équipe vous écrit, publie une mise à jour ou franchit une étape de votre projet, vous en êtes avisé ici. Les échanges plus longs se poursuivent dans la section Support, mais le premier signal passe toujours par cette section.

## 1.4 — ancre `accueil-forfait`
**Titre :** Votre forfait

**Texte :**
Un rappel de votre forfait et de ce qu'il comprend. Les détails de facturation et votre moyen de paiement se trouvent dans la section Paiement.

---

# 2. CONTRAT (`slug: "contrat"`, `section: "contrat"`)

## 2.1 — ancre `contrat-carte`
**Titre :** Votre entente de service

**Texte :**
C'est ici que tout commence. Votre entente de service est la première chose à régler, parce que c'est elle qui donne le coup d'envoi à votre projet : tant qu'elle n'est pas signée, la construction de votre application ne peut pas démarrer.

Vous pouvez lire le contrat au complet directement à l'écran. Pour le signer, le bouton « Signer le contrat » vous dirige vers notre plateforme de signature électronique, où vous n'aurez qu'à entrer votre courriel et signer.

Si le bouton n'est pas encore actif, c'est simplement que nous préparons votre lien de signature. Vous recevrez un courriel dès qu'il sera prêt.

Une fois l'entente signée, cette section conserve votre contrat et sa version signée en PDF, téléchargeable en tout temps. Vous n'aurez jamais à la chercher dans vos courriels.

---

# 3. PAIEMENT (`slug: "paiement"`, `section: "paiement"`)

## 3.1 — ancre `paiement-carte`
**Titre :** Votre moyen de paiement

**Texte :**
Deuxième chose à faire dès votre arrivée : ajouter votre moyen de paiement. Avec l'entente signée, c'est ce qui permet de lancer officiellement votre projet.

Vous inscrivez votre carte une seule fois, et vous pouvez la remplacer en tout temps par la suite, par exemple si la vôtre vient à expiration. Le traitement se fait par notre fournisseur de paiement sécurisé, nous ne conservons jamais vos données bancaires.

Vous voyez aussi ici votre forfait actuel et ce qu'il comprend. Si un forfait supérieur peut mieux vous convenir, l'information s'affiche à cet endroit, sans aucun engagement de votre part.

Enfin, vos factures s'accumulent ici, de la plus récente à la plus ancienne, consultables et téléchargeables pour votre comptabilité.

---

# 4. BRANDING (`slug: "branding"`, `section: "branding"`)

## 4.1 — ancre `branding-apercu`

Cette première étape n'a pas de bloc propre. Cible le haut de la page, par exemple son en-tête ou le conteneur des sections.

**Titre :** L'apparence de votre application

**Texte :**
C'est ici que votre application prend son apparence. Vous y retrouvez tout ce qui compose votre identité, des couleurs jusqu'à la façon dont votre programme de fidélité est présenté à vos clients.

C'est aussi la troisième chose à régler au départ. Plus vite on a votre matériel et vos préférences, plus vite on peut commencer à monter votre application. C'est souvent ici que les projets prennent de l'avance ou du retard.

## 4.2 — ancre `branding-infos` (existe déjà)
**Titre :** Informations de l'entreprise

**Texte :**
Vos coordonnées légales et votre contact principal. C'est ce qui nous permet de vous joindre rapidement et de préparer vos documents officiels, comme votre entente et vos factures. Assurez-vous que le nom légal, le NEQ, l'adresse et les coordonnées de votre contact sont exacts, parce qu'on s'y fie pour tout ce qui est administratif.

## 4.3 — ancre `branding-visuel`
**Titre :** Branding visuel

**Texte :**
Vos couleurs et vos logos. Déposez-nous plusieurs versions de votre logo si vous en avez, en haute résolution, avec ou sans fond, en différents formats. Votre logo apparaît à plusieurs endroits dans l'application, sur des fonds pâles comme foncés et à des tailles très différentes. Plus on a de versions, plus il sera net partout.

## 4.4 — ancre `branding-fidelite`
**Titre :** Programme de fidélité

**Texte :**
Le cœur de votre application. Comment vos clients accumulent des points et ce qu'ils peuvent obtenir en échange.

Prévoyez au moins trois ou quatre récompenses. Une seule récompense donne peu de raisons de revenir, tandis qu'un éventail de choix, du petit plaisir accessible à la récompense qui se mérite, garde vos clients accrochés plus longtemps.

Ajoutez aussi de belles images pour chacune. Une récompense qu'on voit donne bien plus envie qu'une ligne de texte.

## 4.5 — ancre `branding-setup`
**Titre :** Setup technique

**Texte :**
C'est la section la plus importante de toutes, et celle qui influence le plus votre délai de lancement. C'est elle qui nous permet de relier votre système de caisse à votre application.

Donnez-nous le plus de détails possible sur votre équipement et votre configuration. Et si vous pouvez nous fournir des identifiants d'accès à votre système de caisse, on peut aller voir nous-mêmes comment il est monté, ce qui accélère énormément le travail et vous évite une série d'allers-retours par courriel.

## 4.6 — ancre `branding-sections-app`
**Titre :** Sections de l'application

**Texte :**
Les différentes pages que vos clients verront dans votre application. Vous choisissez lesquelles activer selon ce qui convient à votre commerce.

## 4.7 — ancre `branding-templates`
**Titre :** Préférences des écrans

**Texte :**
C'est ici que vous nous donnez une idée du style visuel que vous recherchez. Plusieurs présentations sont possibles pour un même contenu.

Écrivez-nous vos commentaires, même les idées à moitié formées. Ce que vous aimez ailleurs, une ambiance qui vous parle, quelque chose que vous voulez éviter. Ce sont ces précisions qui nous permettent de concevoir quelque chose qui vous ressemble plutôt qu'un modèle générique.

## 4.8 — ancre `branding-fichiers`
**Titre :** Fichiers et ressources

**Texte :**
Déposez-nous tout ce que vous avez : photos de votre commerce, de vos plats, de votre équipe, vidéos, visuels de vos réseaux sociaux, matériel promotionnel. Même ce qui vous semble anodin peut servir.

Plus on a de matériel, plus le design final sera propre et vous ressemblera. Un manque de photos, c'est ce qui pousse à utiliser des images génériques, et ça se voit toujours.

## 4.9 — ancre `branding-profil-clientele` — **`prestigeSeulement: true`**
**Titre :** Profil de votre clientèle

**Texte :**
Ce portrait nous sert à segmenter votre clientèle. En comprenant les habitudes de vos clients, à quelle fréquence ils viennent normalement et ce qui constitue une visite typique chez vous, on peut établir les bons repères.

C'est ce qui nous permet de distinguer un de vos meilleurs clients d'un client qui commence à s'éloigner. Un client qui vient chaque semaine et qu'on n'a pas vu depuis un mois, ça veut dire quelque chose, chez un commerce où on vient trois fois par année, non. Ces repères changent d'un commerce à l'autre, et c'est vous qui nous les donnez.

---

# 5. FEUILLE DE ROUTE (`slug: "roadmap"`, `section: "roadmap"`)

## 5.1 — ancre `roadmap-entete`
**Titre :** Le plan de votre projet

**Texte :**
C'est le plan complet de votre projet, de la signature jusqu'au lancement de votre application. Vous savez en tout temps où les choses sont rendues, sans avoir à nous le demander.

Une fois votre application lancée, cette section descend au bas du menu. Elle reste consultable, mais vous n'aurez plus besoin de la surveiller au quotidien.

## 5.2 — ancre `roadmap-progression`
**Titre :** Progression

**Texte :**
Toutes les étapes de votre projet, du début à la fin, avec ce qui est terminé, ce qui est en cours et ce qui s'en vient.

Certaines étapes dépendent de nous, d'autres de vous. Quand quelque chose est attendu de votre part, c'est indiqué clairement, et c'est généralement là que le projet accélère ou ralentit.

## 5.3 — ancre `roadmap-journal`

**Attention** : cette étape cible le contenu de l'onglet « Journal de développement », qui n'est pas l'onglet actif par défaut. Le moteur doit basculer `activeTab` sur cet onglet avant de surligner. Propose-moi la façon la plus propre de le faire, par exemple un champ optionnel `preAction` sur l'étape, ou un paramètre d'URL lu par la page. Ne l'invente pas sans me le dire.

**Titre :** Journal de développement

**Texte :**
C'est ici qu'on vous tient au courant de notre avancement. Chaque fois qu'on termine une partie de votre application, on vous la présente ici, souvent avec des images de ce qu'on a monté.

Vous répondez directement dans le journal : vous approuvez ce qu'on vous montre, vous demandez des modifications ou vous posez vos questions. Rien n'est final tant que vous n'avez pas donné votre avis, et plus vos commentaires arrivent tôt, plus les corrections sont simples à faire.

---

# 6. DOCUMENTATION (`slug: "documentation"`, `section: "documentation"`)

## 6.1 — ancre `documentation-categories`
**Titre :** Vos documents

**Texte :**
Vos guides et documents de référence, classés par sujet.

Cette section se remplit surtout une fois votre application terminée. C'est normal si elle est encore peu garnie au début : les guides expliquent les fonctionnalités de votre application, avec vos écrans et vos règles, alors on les prépare quand tout est arrêté plutôt que de vous donner des explications qui changeraient en cours de route.

Vous y trouverez ensuite vos formations, la marche à suivre pour votre personnel et le matériel pour présenter le programme à votre clientèle. Les ajouts récents sont identifiés, alors vous voyez d'un coup d'œil ce qui est nouveau depuis votre dernière visite.

## 6.2 — ancre `documentation-faq`
**Titre :** Foire aux questions

**Texte :**
Cette partie est déjà remplie et disponible dès maintenant.

Elle regroupe les questions qu'on nous pose le plus souvent, sur le fonctionnement du portail, le déroulement du projet et le programme de fidélité en général. Avant de nous écrire, jetez-y un œil, la réponse s'y trouve souvent, et ça vous épargne un aller-retour.

---

# 7. DONNÉES & RAPPORTS (`slug: "donnees"`, `section: "donnees"`)

## 7.1 — ancre `donnees-apercu`

Cible le conteneur principal de la page, ou le premier onglet.

**Titre :** Vos données et vos rapports

**Texte :**
C'est la section qui prendra le plus d'importance une fois votre application en marche.

Elle est vide au départ, et c'est normal, elle se remplit dès que vos premiers clients commencent à utiliser votre application. Vos données sont ensuite mises à jour chaque nuit.

Vous y suivrez tout ce qui compte : combien de membres vous avez, à quelle fréquence ils reviennent, les revenus générés, les points accumulés et réclamés, le rendement de vos promotions. C'est là que vous verrez concrètement ce que votre programme rapporte.

Vous y trouverez aussi vos rapports mensuels, qui reprennent chaque mois complet en détail. Ils sont conçus pour être utiles à votre comptabilité : les points distribués, ce qui a été réclamé, les rabais accordés et les montants correspondants, le tout téléchargeable pour vos dossiers ou pour votre comptable.

Tout l'historique se conserve, ce qui vous permet de comparer vos mois entre eux et de voir votre progression dans le temps.

---

# 8. CALENDRIER (`slug: "calendrier"`, `section: "calendrier"`)

## 8.1 — ancre `calendrier-liste`
**Titre :** Vos rendez-vous

**Texte :**
Vos rendez-vous avec notre équipe, réunis au même endroit.

Vous y voyez les rencontres à venir avec leur date, leur heure et leur sujet, ainsi que celles qui ont déjà eu lieu.

C'est aussi ici que vous demandez une nouvelle rencontre. Vous nous dites vos disponibilités, on vous confirme le moment, et il apparaît dans votre calendrier.

Pendant la construction de votre application, ces rencontres servent à valider les grandes étapes ensemble. Une fois lancée, elles servent à faire le point sur vos résultats et à ajuster votre programme.

---

# 9. NOUVEAUTÉS (`slug: "nouveautes"`, `section: "nouveautes"`)

## 9.1 — ancre `nouveautes-fil`
**Titre :** Nouveautés et mises à jour

**Texte :**
Ce qu'on ajoute et ce qu'on améliore sur la plateforme.

Deux types d'annonces s'y retrouvent. Les nouveautés, quand une fonctionnalité inédite devient disponible, et les mises à jour, quand on améliore ou corrige quelque chose d'existant. Chaque publication est identifiée pour que vous voyiez tout de suite de quoi il s'agit.

On y explique concrètement ce qui change et ce que ça vous apporte, avec des images ou des documents quand c'est utile.

Ça vaut la peine d'y jeter un œil de temps en temps, c'est souvent là que vous découvrirez une fonctionnalité qui vous sera utile et dont vous ignoriez l'existence.

---

# 10. SUPPORT (`slug: "support"`, `section: "support"`)

## 10.1 — ancre `support-entete`

Cible le bloc de coordonnées en haut de la page.

**Titre :** Nous joindre

**Texte :**
C'est votre porte d'entrée vers notre équipe. Trois façons de nous joindre s'y trouvent, chacune pour un besoin différent. On vous les présente une par une pour que vous sachiez laquelle utiliser selon la situation.

## 10.2 — ancre `support-messagerie` (existe déjà)
**Titre :** La messagerie

**Texte :**
Pour vos échanges du quotidien. Une question rapide, une précision, un suivi : vous nous écrivez, on vous répond, et toute la conversation se conserve au même endroit.

C'est l'équivalent d'un courriel, en plus simple, sans avoir à chercher qui contacter ni à retrouver le bon fil de discussion.

## 10.3 — ancre `support-demande`
**Titre :** Les demandes de support

**Texte :**
Pour un problème concret ou une demande précise. Contrairement à un message, une demande est suivie : elle a un statut, vous voyez si elle est ouverte, en traitement ou réglée, et rien ne se perd dans une conversation.

Vous choisissez la catégorie, vous décrivez la situation, et vous pouvez joindre des images. Une capture d'écran vaut souvent mieux qu'un long paragraphe, surtout quand quelque chose ne fonctionne pas comme prévu.

Utilisez cette voie plutôt que la messagerie dès qu'il s'agit d'un problème ou d'une demande qui exige une intervention de notre part.

## 10.4 — ancre `support-rencontre` — **`prestigeSeulement: true`**
**Titre :** La rencontre stratégique

**Texte :**
Une rencontre avec notre équipe pour prendre du recul sur vos résultats, disponible chaque mois si vous en ressentez le besoin.

Ce n'est pas du dépannage. C'est un temps d'arrêt pour regarder les chiffres ensemble : ce qui fonctionne, ce qui fonctionne moins, quelles promotions ont porté et ce qu'on ajusterait pour la suite.

La plupart du temps, vos données parlent d'elles-mêmes et vous n'aurez pas besoin de nous. Mais quand une décision est plus importante, quand quelque chose vous intrigue dans vos résultats ou que vous voulez pousser plus loin, c'est ici que vous la demandez.

---

# 11. PARAMÈTRES (`slug: "parametres"`, `section: "parametres"`)

## 11.1 — ancre `parametres-compte`
**Titre :** Votre compte

**Texte :**
Vos informations personnelles et votre sécurité. Vous pouvez y modifier vos coordonnées et changer votre mot de passe en tout temps.

Gardez vos coordonnées à jour, c'est à ces adresses qu'on vous écrit quand quelque chose demande votre attention.

## 11.2 — ancre `parametres-utilisateurs`
**Titre :** La gestion des utilisateurs

**Texte :**
Vous pouvez donner accès au portail à d'autres personnes de votre équipe, chacune avec son propre compte et son propre mot de passe.

Pour chaque personne que vous ajoutez, vous choisissez les sections auxquelles elle a accès. Votre gérant peut ainsi consulter les données et le calendrier sans voir votre contrat ni vos informations de paiement.

C'est plus sûr que de partager votre mot de passe, et vous gardez le contrôle : vous pouvez retirer un accès en tout temps, par exemple quand quelqu'un quitte votre équipe.

## 11.3 — ancre `parametres-notifications`
**Titre :** Vos notifications

**Texte :**
Vous décidez de quoi vous voulez être avisé, et par quel moyen.

Chaque personne de votre équipe a ses propres préférences. Votre gérant peut recevoir les avis liés aux données sans être dérangé par ceux qui concernent la facturation.

Si vous trouvez qu'on vous écrit trop, ou pas assez, c'est ici que ça s'ajuste.

---

# Récapitulatif

29 étapes au total, dont 2 réservées à Prestige (4.9 et 10.4). Un client Essentiel en verra donc 27.

Répartition : Accueil 4, Contrat 1, Paiement 1, Branding 9, Feuille de route 3, Documentation 2, Données & rapports 1, Calendrier 1, Nouveautés 1, Support 4, Paramètres 3.

# Ce que je veux de toi

1. Remplace le contenu de `src/lib/tourSteps.ts` par ces 29 étapes, en ajoutant le champ `section`.
2. Pose toutes les ancres `data-tour-id` manquantes, en enveloppant les composants dans les pages parentes.
3. Pour l'étape 5.3 (journal de développement), propose-moi ta solution pour la bascule d'onglet avant de l'implémenter.
4. Pour les étapes ciblant `AccueilOnboarding`, dis-moi comment tu gères le cas où le client est dans un autre état de la page d'accueil.
5. Ne touche pas au moteur `TourEngine.tsx` sauf si une de ces étapes l'exige, et dis-le-moi si c'est le cas.
6. Ne construis pas encore les déclencheurs (première connexion, bouton dans la sidebar, boutons par section). On les fera après.
7. Lance `npx tsc --noEmit` à la fin et confirme qu'il ne reste que les 6 erreurs préexistantes.
8. Ne commit pas, ne déploie pas.
