# AW Solution — Website Build Context
> Lire intégralement avant d'écrire une seule ligne de code.
> Ce fichier est la référence absolue pour tout le site.

---

## 1. L'ENTREPRISE

**AW Solution** est une plateforme SaaS white-label qui permet aux PME de connaître leurs clients, de les faire revenir et de mesurer les retombées économiques de leur programme de fidélité.

**Cible :** Propriétaires de PME qui bénéficient de fidéliser leur clientèle — restaurants, clubs de golf, salons de coiffure, barbershops, centres de loisirs, fast-food, etc. Ne pas nommer des industries spécifiques sur le site — parler du PROBLÈME universel.

**Positionnement :** La seule solution au Québec qui combine une app mobile branded sur mesure + dashboard CRM + segmentation comportementale + alertes automatisées + analytiques avancées dans une interface mobile pensée pour les propriétaires, pas pour des analystes.

---

## 2. LE MESSAGE — STORYBRAND

### Le héros
Le propriétaire de PME qui travaille fort mais gère son entreprise à l'aveugle.

### Le villain
L'invisibilité totale de sa clientèle. Il n'a aucune donnée, aucun moyen de contacter ses clients, aucune façon de savoir ce qui se passe.

### Les situations concrètes où il se reconnaît
- Un client qu'il voyait chaque semaine a disparu. Il ne sait même pas quand.
- Ses ventes baissent un mardi. Il ne sait pas pourquoi.
- Ses meilleurs clients sont peut-être chez son compétiteur ce soir.
- Il fait une promotion. Il ne sait pas si ça a fonctionné.
- Il ne peut contacter aucun de ses clients. Zéro. Il n'a même pas leur courriel.

### La transformation
**Avant :** Il ne connaît pas ses clients, ne sait pas qui revient, qui part, pourquoi les ventes fluctuent, comment réagir.
**Après :** Il sait tout en temps réel. Il connaît ses meilleurs clients par nom, reçoit des alertes sur les situations importantes, peut contacter ses clients en quelques secondes, comprend ce qui fonctionne.

---

## 3. CONTENU — SECTION PAR SECTION

### SECTION 1 : HERO (plein écran)

**Titre :**
"Vos clients reviennent. D'autres partent. Vous ne savez pas pourquoi."

**Sous-titre :**
"Aucune donnée, aucune façon de les contacter, aucune idée comment agir, vous gérez votre entreprise à l'aveugle."

**CTA principal :** "Réserver une démo" (bouton bleu #0362E3)
**CTA secondaire :** "Voir comment ça marche" (ghost button)

**Visuel hero :**
Deux phones côte à côte, flottants, glow bleu derrière.
- Gauche : label "Vos clients" + app_home.jpg
- Droite : label "Vous" + dash_analytics.jpg

---

### SECTION 2 : LE PROBLÈME

**Titre :** "Reconnaissez-vous ces situations?"

4 cards, icône Lucide + texte court :
- "Un client fidèle disparaît. Vous ne savez pas quand, ni pourquoi."
- "Vos ventes baissent un mardi. Vous n'avez aucune explication."
- "Vous faites une promotion. Vous ne saurez jamais si ça a fonctionné."
- "Vous avez des centaines de clients. Vous ne pouvez en contacter aucun."

---

### SECTION 3 : APP CLIENT

**Label :** "Pour vos clients"
**Titre :** "Une application mobile à votre image"
**Sous-titre :** "Branded à 100% pour votre entreprise. Vos clients accumulent des points, réclament des récompenses et restent engagés."

**3 features :**
- Points et Récompenses — "Vos clients accumulent des points à chaque visite et échangent contre des récompenses que vous choisissez."
- Roue Bonus Quotidienne — "Une mécanique de gamification qui crée une habitude de visite. Vos clients reviennent chaque jour."
- Promotions Ciblées — "Envoyez des offres à tous vos membres ou uniquement aux clients qui en ont besoin."

**Phones :** app_home.jpg (principal), app_bonus.jpg, app_rewards.jpg

---

### SECTION 4 : DASHBOARD

**Label :** "Pour vous"
**Titre :** "Vous savez tout. En temps réel."
**Sous-titre :** "Un dashboard complet dans votre téléphone. Vos données, vos clients, vos alertes, où que vous soyez."

**4 features :**
- Alertes Automatisées — "Chaque matin, vous savez exactement quoi faire. Clients à risque, anniversaires, périodes mortes, vous êtes toujours un pas d'avance."
- Segmentation Client — "VIP, nouveaux, à risque, dormants, perdus. Chaque client est classifié automatiquement selon son comportement réel."
- Analytiques Avancées — "Revenus, visites, panier moyen, taux de rétention, ROI du programme, tout mesuré, tout visualisé."
- Campagnes Push — "Lancez une campagne ciblée en moins de 2 minutes. Le bon message, aux bons clients, au bon moment."

**Phones :** dash_analytics.jpg (principal), dash_membres.jpg, dash_alerts.jpg

---

### SECTION 5 : STATISTIQUES

**Titre :** "La fidélisation, c'est prouvé."

3 stats :
- +30% de revenus en moyenne pour les entreprises avec un programme de fidélité actif.
- 5x moins coûteux de fidéliser un client existant que d'en acquérir un nouveau.
- 70% des clients reviennent plus souvent quand un programme de fidélité est en place.

---

### SECTION 6 : COMMENT ÇA MARCHE

**Titre :** "Simple. Rapide. Opérationnel."

3 étapes :
1. On construit votre app — Branded à votre image, configurée selon votre entreprise, prête en quelques jours.
2. Vos clients téléchargent et s'inscrivent — Ils accumulent des points à chaque visite. Vous commencez à collecter des données réelles.
3. Vous gérez, vous réagissez, vous croissez — Alertes, campagnes, analytiques. Vous prenez des décisions basées sur des faits.

---

### SECTION 7 : CTA FINAL

**Titre :** "15 minutes suffisent."
**Sous-titre :** "On vous démontre comment AW Solution peut faire passer votre entreprise à un autre niveau. Sans engagement."
**CTA :** "Réserver ma démo gratuite"

---

## 4. CE QU'ON NE MET PAS

- Aucune liste de clients actuels
- Aucun emoji — icônes Lucide React seulement
- Aucun prix ni forfait
- Aucune mention de Poké Station ou Club de Golf par nom
- Aucune FAQ, timeline, histoire du fondateur
- Zéro texte inutile

---

## 5. DESIGN SYSTEM

### Couleurs
```css
--blue: #0362E3
--blue-dark: #001C5D
--grey: #2E2E2F
--black: #000000
--white: #F0F4FF
--blue-glow: rgba(3,98,227,0.3)
--blue-subtle: rgba(3,98,227,0.1)
```

### Segments (couleurs fixes)
```css
--vip: #2ECC8A
--nouveau: #14ADD7
--atrisk: #FFD700
--dormant: #9B9B9C
--perdu: #E84545
```

### Typographie
- Titres : Sora 800
- Accents : Playfair Display Italic Bold
- Body : Sora 400-500
- JAMAIS : Inter, Roboto, Arial

---

## 6. ANIMATIONS

- Hero : Canvas particules bleues + glow orbe pulsant + scramble text au load
- Phones : Float animation translateY 4s infinite + glow derrière
- Scroll reveal : Framer Motion whileInView avec stagger
- Stats : Compteurs animés 0 → chiffre final au scroll
- Nav : Glassmorphism au scroll
- Cards : translateY(-4px) + border bleu au hover
- CTA button : Glow pulse en boucle

---

## 7. IMAGES dans `public/images/`

App Client :
- app_home.jpg
- app_bonus.jpg
- app_rewards.jpg
- app_promos.jpg
- app_menu.jpg

Dashboard :
- dash_overview.jpg
- dash_overview2.jpg
- dash_analytics.jpg
- dash_analytics2.jpg
- dash_membres.jpg
- dash_alerts.jpg

---

## 8. STACK

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- GSAP + ScrollTrigger
- Lucide React (icônes)
- next/image pour toutes les images

---

## 9. RÈGLES ABSOLUES

- Mobile-first — tester 390px en priorité
- Responsive : 390px / 768px / 1280px / 1920px
- Un seul CTA principal par section
- Construire et tester une section à la fois
- npm run dev après chaque section

---

## 10. ORDRE DE BUILD

1. globals.css + layout.tsx
2. Nav.tsx
3. Hero.tsx
4. Problem.tsx
5. AppFeatures.tsx
6. DashboardFeatures.tsx
7. Stats.tsx
8. HowItWorks.tsx
9. CTA.tsx
10. Footer.tsx
11. Polish final
