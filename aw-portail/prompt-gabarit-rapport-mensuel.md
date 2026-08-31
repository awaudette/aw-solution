# Instructions pour Claude Code

Lis ce fichier au complet et suis les instructions ci-dessous.

---

Ne écris aucun code pour l'instant, présente-moi d'abord ton plan.

Objectif : créer le gabarit HTML complet du rapport financier mensuel, dans `functions/src/templates/rapportMensuel.html`, qui sera rempli par la Cloud Function existante (déclenchée sur `clients/{clientId}/rapports/{rapportId}`) et converti en PDF via Puppeteer.

Ce gabarit doit être visuellement soigné, professionnel, digne d'une institution financière — clair et propre, pas austère, avec de vrais titres de section, des tableaux lisibles, de bonnes marges, une hiérarchie visuelle nette.

## Contenu exact, section par section, dans cet ordre

### PAGE DE COUVERTURE

- Fond clair et propre (pas sombre comme l'écran de bienvenue de la visite guidée — ici on veut la clarté d'un document financier institutionnel).
- Logo du client centré en haut (source: `clients/{clientId}.logo_url` — obligatoire à ce stade puisqu'un rapport mensuel suppose une application déjà lancée).
- Nom du commerce en grand.
- Titre "Rapport financier mensuel".
- Le mois couvert en toutes lettres (ex. "Juillet 2026").
- Date de génération en petit, discret, en bas de page.
- Une phrase de démarcation légale en petit texte : "Ce rapport présente les données financières et transactionnelles générées par le programme de fidélité. Il est fourni à titre de suivi et de conciliation et ne remplace pas les services d'un professionnel de la comptabilité."

### SECTION 1 — RÉSUMÉ FINANCIER DU MOIS

Un tableau à deux colonnes (indicateur / valeur), avec ces lignes dans cet ordre :

- Ventes admissibles au programme (`revenueMembers` du mois, en dollars)
- Nombre de transactions (`invoicesValidated`)
- Points distribués par factures (`purchasePointsIssued`)
- Points distribués par bonus (`scratchPointsIssued`)
- Total des points distribués (`pointsIssuedTotal`)
- Valeur des points accordés en dollars (`pointsIssuedTotal / 100 * 0.40` — le taux 0.40$/100pts est spécifique à ce client, prévois un paramètre configurable plutôt qu'une valeur codée en dur, avec 0.40 comme valeur par défaut si rien n'est spécifié)
- Points réclamés (`pointsRedeemedTotal`)
- Récompenses utilisées (`redemptionsCount`)
- Valeur des récompenses (`rewardsCost`, en dollars)
- Rabais accordés (actuellement toujours à 0$ — affiche la ligne avec une petite note "suivi à venir")
- Coût des rabais accordés (actuellement toujours à 0$, même note)
- Coût total du programme (somme de la valeur des récompenses et du coût des rabais, calculé, pas une donnée brute)

### SECTION 2 — PROMOTIONS DU MOIS

Un tableau avec une ligne par promotion créée dans le mois (source: `comptabilite.promotions`), colonnes : Nom, Type de rabais, Nombre d'utilisations, Revenus attribués, Coût des rabais (actuellement 0$, même note que plus haut).

Si aucune promotion ce mois-là, affiche un message clair "Aucune promotion créée ce mois-ci" plutôt qu'un tableau vide.

### SECTION 3 — REGISTRE DE POINTS

Un tableau à deux colonnes :

- Solde de points au début du mois (à définir précisément dans ton plan comment on l'obtient)
- Points gagnés ce mois (`pointsIssuedTotal`)
- Points utilisés ce mois (`pointsRedeemedTotal`)
- Solde de points à la fin du mois (`pointsLiabilitySnapshot` ou équivalent)
- Taux de rachat des points (`tauxRachat`, en pourcentage)
- Passif en points en circulation en dollars (le solde de fin multiplié par le même taux de conversion 0.40$/100pts)

### SECTION 4 — HISTORIQUE DES FACTURES DU MOIS

Un tableau détaillé (source: `comptabilite.facturesDetail`), colonnes : Date, Franchise, Montant, Points attribués, Code promo, Promotion liée, Rabais appliqué (toujours 0$ actuellement).

Trie par date décroissante. Si la liste est longue, prévois que le tableau puisse s'étendre sur plusieurs pages PDF proprement (répète l'en-tête de colonnes sur chaque nouvelle page si le moteur de rendu le permet).

### SECTION 5 — HISTORIQUE DES RÉCLAMATIONS DU MOIS

Même traitement (source: `comptabilite.reclamationsDetail`), colonnes : Date, Récompense, Franchise, Points réclamés, Coût réel.

Trie par date décroissante.

### PIED DE PAGE

Sur chaque page du PDF : nom du commerce, numéro de page, mention "AW Solution" discrète.

## Demandes techniques

1. Propose la structure de données JavaScript exacte (l'objet que la Cloud Function devra construire à partir du document `Comptabilite` reçu) qui alimentera ce gabarit.
2. Confirme comment tu gères le solde de points au début du mois — est-ce calculable depuis les données disponibles, ou faut-il le dériver du solde de fin du mois précédent moins les mouvements de ce mois ?
3. Propose la palette de couleurs et la typographie que tu comptes utiliser pour un rendu "clair et propre, professionnel" — donne-moi 2-3 exemples de choix (couleur d'accent, police) avant de trancher toi-même.
4. Confirme que Puppeteer peut gérer proprement la pagination automatique d'un document HTML long (plusieurs pages) sans que je doive gérer les sauts de page manuellement dans le gabarit.

Présente-moi ton plan complet avant d'écrire le gabarit : structure du fichier, comment les données s'y insèrent, et tout point où mes instructions ne collent pas avec ce qui existe. Attends ma validation.
