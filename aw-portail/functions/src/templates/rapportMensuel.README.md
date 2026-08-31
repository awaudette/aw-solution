# Gabarit `rapportMensuel.html` — documentation

Rempli par la Cloud Function `genererRapportPdf` (`functions/src/index.ts`) à
partir du document `clients/{clientId}/rapports/{rapportId}`, puis rendu en
PDF via `page.setContent(html)` + `page.pdf()` (Puppeteer + `@sparticuz/chromium`).

Sorti du gabarit lui-même (voir historique : un exemple `<!-- ROW:X -->`
imbriqué dans le commentaire de tête faisait fermer le commentaire HTML
prématurément — `-->` ne peut pas apparaître à l'intérieur d'un commentaire
HTML, même à titre d'exemple).

## Mécanisme de remplacement

Deux types de jetons, remplacement par simple chaîne (`String.replaceAll`),
aucune dépendance de templating ajoutée :

1. **Jetons scalaires** `{{NOM_DU_JETON}}`
   Remplacés directement par une valeur déjà formatée (fr-CA, via les mêmes
   helpers `fmtArgent`/`fmtNombre` que le reste du portail — voir
   `src/lib/mockAnalytics.ts`). Le gabarit ne fait **aucun** calcul ni
   formatage : toute la logique vit dans la Cloud Function.

2. **Blocs nommés** `<!-- NOM:CLE --> … <!-- /NOM:CLE -->`
   - `ROW:xxx` → gabarit d'une ligne répétable. La CF extrait le HTML entre
     les marqueurs, le duplique une fois par entrée du tableau de données (en
     remplaçant les jetons scalaires internes), joint le résultat, puis
     remplace le bloc marqueurs-compris par ce résultat joint.
   - `IF:xxx` → section conditionnelle (présente/vide). La CF ne garde que le
     bloc dont la condition est vraie et retire l'autre entièrement
     (marqueurs compris).

## Contrat de données — vérifié contre un document réel

Les noms ci-dessous ont été vérifiés directement dans Firestore
(`clients/poke-station-tr/analytics/trois-rivieres`, champ `comptabilite`,
mois `2026-07`) — pas seulement contre le type `Comptabilite` de
`src/types/analytics.ts` ou un script de seed. Les deux concordent pour les
champs déjà déployés partout.

Champs réels de `comptabilite.synthese` (mois courant, pas cumulatif) :
`inscriptions, membresActifs, membresTotal, notifEnvoyees, tauxOuverturePush,
visites, pointsDistribues, pointsRachetes, valeurRachetee, bonusAttribues,
valeurBonus, revenus`.

Champs réels de `comptabilite.snapshotFinMois` (cumulatif, figé au dernier
jour du mois) : `membresTotal, revenusTotal, visites, pointsEnCirculation,
valeurPointsDistribues`.

### Scalaires

| Jeton | Source | Note |
|---|---|---|
| `NOM_COMMERCE` | `clients/{clientId}.restaurant` | |
| `LOGO_URL` | `clients/{clientId}.logo_url` | Obligatoire — un rapport mensuel suppose une app déjà lancée. |
| `MOIS_LETTRES` | dérivé de `comptabilite.moisRef` ("2026-07" → "Juillet 2026") | |
| `DATE_GENERATION` | horodatage de génération, formaté | |
| `COULEUR_ACCENT` | `clients/{clientId}.couleur_primaire` | Repli sur `#0F2540` **seulement si absente**. Jamais la couleur du portail AW Solution (`#0362E3`, utilisée ailleurs dans le portail comme repli par défaut) — le rapport est aux couleurs du client. `couleur_secondaire` n'est volontairement pas utilisée (voir plus bas). |
| `TAUX_CONVERSION` | config par client, défaut `0.40` ($/100 pts) | |

### Section 1 — Résumé financier du mois

| Jeton | Source |
|---|---|
| `RESUME_VENTES` | `synthese.revenus` |
| `RESUME_TRANSACTIONS` | `facturesDetail.length` (dérivé — aucun compteur brut) |
| `RESUME_POINTS_FACTURES` / `_NOTE` | `synthese.pointsDistribues - synthese.valeurBonus` ; `_NOTE` = `""` (voir « Split points factures/bonus » ci-dessous) |
| `RESUME_POINTS_BONUS` / `_NOTE` | `synthese.valeurBonus` ; `_NOTE` = `""` |
| `RESUME_POINTS_TOTAL` | `synthese.pointsDistribues` |
| `RESUME_VALEUR_POINTS` | calculé : `pointsDistribues / 100 * TAUX_CONVERSION` |
| `RESUME_POINTS_RECLAMES` | `synthese.pointsRachetes` |
| `RESUME_NB_RECOMPENSES` | `reclamationsDetail.length` (dérivé) |
| `RESUME_VALEUR_RECOMPENSES` | `synthese.valeurRachetee` ("food cost total des réclamations") |
| `RESUME_RABAIS_ACCORDES` | calculé : somme de `facturesDetail[].rabaisApplique` — **jamais forcé à 0** |
| `RESUME_COUT_RABAIS` | calculé : somme de `promotions[].coutReel` — **jamais forcé à 0** |
| `RESUME_COUT_TOTAL` | calculé : `RESUME_VALEUR_RECOMPENSES + RESUME_COUT_RABAIS` |

Note sur `rabaisApplique` : dans le document réel, ce champ est toujours
**présent** (jamais `undefined`), à `0` quand il n'y a pas de rabais — ne pas
traiter l'absence du champ comme un cas à gérer séparément de sa valeur nulle.

Pour Poké Station ce mois-ci, `rabaisApplique` et `coutReel` sont
effectivement à 0 partout (aucune promotion à rabais réel ce mois précis) —
ce qui explique probablement pourquoi la version initiale de cette demande
supposait ces champs "toujours à 0$". Ils ne le sont pas structurellement :
le calcul par sommation reste la bonne approche, pas un hardcode.

### Section 2 — Promotions du mois

`{{PROMOTIONS_PORTEE_NOTE}}` — jeton scalaire, placé juste sous le titre de
section, **hors** des blocs `IF:PROMOTIONS_*` (visible même si la liste est
vide). `ComptabilitePromotion` n'a pas de champ franchise — les promotions
sont toujours réseau entier, jamais filtrables par franchise. Un rapport
**par franchise** doit donc porter une mention explicite et visible pour
qu'un franchisé ne croie pas que ce sont ses chiffres à lui (demande
explicite d'Alex : "pas une note discrète") :

- Rapport **global** (pas de `franchiseId`) : `PROMOTIONS_PORTEE_NOTE = ""`.
- Rapport **par franchise** : `PROMOTIONS_PORTEE_NOTE =
  '<p class="mention-portee">Promotions du réseau — ces statistiques
  couvrent l'ensemble des franchises.</p>'` (classe `.mention-portee` :
  fond teinté + bordure d'accent, même poids visuel qu'un vrai avertissement,
  pas le style discret de `.footnote`/`.note-inline`).

Bloc `ROW:PROMOTION`, un par entrée de `comptabilite.promotions[]` :

| Jeton interne | Source (`ComptabilitePromotion`) |
|---|---|
| `promo_nom` | `nom` |
| `promo_type` | `typeRabais` |
| `promo_utilisations` | `reclamations` |
| `promo_revenus` | `revenusGeneres` |
| `promo_cout` | `coutReel` |

`IF:PROMOTIONS_PRESENTES` / `IF:PROMOTIONS_VIDE` selon `promotions.length`.

`comptabilite.codesPromo[]` existe (code, promotionLiee, utilisations,
rabaisTotal) mais n'est **volontairement pas utilisé** dans ce rapport —
signalé ici au cas où ce serait un oubli plutôt qu'un choix, pas un bug.

### Section 3 — Registre de points

| Jeton | Source |
|---|---|
| `REGISTRE_SOLDE_DEBUT` | voir « Solde de début de mois » ci-dessous |
| `REGISTRE_POINTS_GAGNES` | `synthese.pointsDistribues` |
| `REGISTRE_POINTS_UTILISES` | `synthese.pointsRachetes` |
| `REGISTRE_SOLDE_FIN` | `snapshotFinMois.pointsEnCirculation` |
| `REGISTRE_TAUX_RACHAT` | voir « `tauxRachat` — toujours pas déployé partout » ci-dessous |
| `REGISTRE_PASSIF_DOLLARS` | calculé : `REGISTRE_SOLDE_FIN / 100 * TAUX_CONVERSION` |

`snapshotFinMois.valeurPointsDistribues` existe dans le document réel mais
vaut `0` aujourd'hui (pas encore calculé par le `portailSyncJob`) —
volontairement pas utilisé comme source de `RESUME_VALEUR_POINTS`, qui est
calculé indépendamment à partir du taux de conversion. Ne pas basculer vers
ce champ tant qu'il n'est pas fiable.

**Solde de début de mois** — approche hybride :
1. Priorité : lire `snapshotFinMois.pointsEnCirculation` du rapport du mois
   précédent (`clients/{clientId}/rapports/comptable-{moisPrecedent}`) — c'est
   directement le solde de début de ce mois-ci.
2. Filet (premier mois, ou document précédent manquant) : dériver
   algébriquement `soldeFin - pointsDistribues + pointsRachetes` du mois
   courant.

### Section 4 — Historique des factures du mois (résumé quotidien)

**Changement de conception** : un mois réel contient 150 à 500 factures
(170 chez Poké Station Trois-Rivières en juillet 2026) — un tableau détaillé
facture par facture est ingérable en PDF. Le PDF affiche désormais un résumé
**par jour**, et le détail complet part en CSV séparé.

Bloc `ROW:JOUR_FACTURES`, un par jour du mois ayant au moins une facture,
obtenu en agrégeant `comptabilite.facturesDetail[]` par date :

| Jeton interne | Calcul |
|---|---|
| `jour_date` | date du groupe |
| `jour_nbFactures` | nombre de factures ce jour-là |
| `jour_montantTotal` | somme des `montant` de ce jour |
| `jour_pointsAttribues` | somme des `pointsAttribues` de ce jour |

Ligne de total en fin de tableau (jetons scalaires, pas un `ROW:` — une
seule ligne) :

| Jeton | Calcul |
|---|---|
| `FACTURES_TOTAL_NB` | `facturesDetail.length` |
| `FACTURES_TOTAL_MONTANT` | somme de tous les `montant` du mois |
| `FACTURES_TOTAL_POINTS` | somme de tous les `pointsAttribues` du mois |

`IF:FACTURES_PRESENTES` / `IF:FACTURES_VIDE` selon `facturesDetail.length`.

#### CSV séparé — détail facture par facture

Généré directement depuis `comptabilite.facturesDetail[]` (données brutes,
indépendamment des chaînes déjà formatées pour le PDF — pas de conflit avec
le contrat ci-dessus), déposé dans Storage à côté du PDF.

- **Convention de nom** : `factures-{moisRef}[-{franchiseId}].csv`
- **Colonnes, dans cet ordre** : Date, Franchise, Montant, Points attribués,
  Code promo, Promotion liée, Rabais appliqué — mapping 1:1 depuis
  `ComptabiliteFacture` (`date, franchise, montant, pointsAttribues,
  codePromo, promotionLiee, rabaisApplique`).
- **Encodage** : UTF-8 **avec BOM** (sans BOM, Excel Windows casse les
  accents des noms de franchise/promotion).
- **Formatage des valeurs** : dates ISO (`2026-07-01`), nombres bruts en
  point décimal (`42.03`, pas `42,03 $`) — **différent** du formatage
  d'affichage fr-CA du PDF, pour rester ré-importable/calculable sans friction
  de paramètres régionaux. Échapper (guillemets doublés) tout champ contenant
  une virgule ou un guillemet (noms de promotion notamment, ex. `Fiers
  d'être ici! 🩵`).

**`RapportDoc` (`src/types/analytics.ts`)** : nouveau champ optionnel
`facturesCsvUrl?: string`, à côté de `pdfUrl?: string`, écrit par la même
étape de la Cloud Function qui patche `{ pdfUrl, publie: true }` (TODO déjà
présent dans `functions/src/index.ts`) → `{ pdfUrl, facturesCsvUrl, publie: true }`.

### Section 5 — Historique des réclamations du mois

**Inchangée** — détail complet dans le PDF (pas de résumé quotidien, pas de
CSV séparé) : le volume réel est sous 20 lignes par mois (9 chez Poké Station
Trois-Rivières en juillet 2026), largement gérable en PDF.

Bloc `ROW:RECLAMATION`, un par entrée de `comptabilite.reclamationsDetail[]` :

| Jeton interne | Source (`ComptabiliteReclamation`) |
|---|---|
| `reclamation_date` | `date` |
| `reclamation_recompense` | `recompense` |
| `reclamation_franchise` | `franchise` |
| `reclamation_points` | `pointsReclames` |
| `reclamation_cout` | `foodCost` |

`IF:RECLAMATIONS_PRESENTES` / `IF:RECLAMATIONS_VIDE` selon
`reclamationsDetail.length`.

## Split points factures/bonus — résolu, disponible dès maintenant

`valeurBonus` est le nombre de **points** distribués par les bonus joués
(pas un montant en dollars, malgré le nom) ; `bonusAttribues` est le nombre
de parties de bonus jouées. Confirmé avec Alex. Le split est donc calculable
dès aujourd'hui, à partir de champs déjà universels (pas une amélioration
Poké-Station-only) :

- `RESUME_POINTS_BONUS` = `synthese.valeurBonus`
- `RESUME_POINTS_FACTURES` = `synthese.pointsDistribues - synthese.valeurBonus`
- `RESUME_POINTS_FACTURES_NOTE` / `RESUME_POINTS_BONUS_NOTE` = `""` (le
  placeholder "Répartition non disponible ce mois-ci" ne s'applique plus à
  ce couple de jetons — les tokens `_NOTE` restent dans le gabarit par
  prudence, pour un futur cas où `valeurBonus` serait absent d'un document,
  mais ne devraient normalement jamais être utilisés en pratique).

Avec les vraies données Poké Station (juillet 2026) : points bonus =
**43 215** (`valeurBonus`), points factures = 70 329 − 43 215 = **27 114**.

**Confirmé explicitement absent de `comptabilite.synthese`** :
`purchasePointsIssued`, `scratchPointsIssued` — ces noms ne correspondent à
rien de transmis (ni aujourd'hui, ni en préparation) ; ce sont `valeurBonus`
et le calcul dérivé ci-dessus qui remplissent ce rôle. Ne pas les chercher.

## `tauxRachat` — toujours pas déployé partout

Contrairement au split points factures/bonus, `comptabilite.synthese.tauxRachat`
a été déployé côté Poké Station mais n'apparaissait pas encore dans le
document réel au moment de cette vérification (prochain calcul mensuel). Ce
champ **ne fait pas partie du type `Comptabilite` dans
`src/types/analytics.ts`** — schéma en avance sur le contrat partagé pour ce
client précis. Le gabarit n'a besoin d'aucune retouche pour l'afficher dès
qu'il sera présent : c'est la Cloud Function qui doit vérifier sa présence
et court-circuiter le calcul par défaut.

- `REGISTRE_TAUX_RACHAT` :
  si `synthese.tauxRachat` existe → l'afficher directement.
  Sinon → calculer `pointsRachetes / pointsDistribues * 100`.

## `valeurBonus` et `valeurRachetee` — les deux apparaissent dans le rapport

- **`valeurRachetee`** : `RESUME_VALEUR_RECOMPENSES` — food cost réel total
  des réclamations du mois, cohérent avec sa documentation dans
  `analytics.ts`.
- **`valeurBonus`** : `RESUME_POINTS_BONUS` (voir ci-dessus) — points, pas
  dollars. Ma note précédente ("volontairement non utilisé, magnitude
  incohérente avec un montant en $") était fausse : l'incohérence venait de
  l'avoir interprété comme un montant CAD alors que c'est un compte de
  points, cohérent avec `pointsDistribues` (43 215 / 70 329 ≈ 61 % des points
  du mois distribués via bonus, plausible).

## Génération — architecture réelle

Implémenté dans `functions/src/core/genererRapportPdf.ts` (logique pure,
types locaux dans `functions/src/core/types.ts` — voir le commentaire en
tête de ce fichier sur pourquoi ces types sont dupliqués depuis
`src/types/analytics.ts` plutôt qu'importés directement).

Deux points d'entrée appellent la même fonction :
- Le trigger `onDocumentCreated` sur `clients/{clientId}/rapports/{rapportId}`
  (`functions/src/index.ts`) — génère pour **les deux** types de documents
  créés par la sync nocturne : le rapport global (`comptable-{moisRef}`) et
  chaque rapport par franchise (`comptable-{moisRef}-{franchiseId}`). C'est
  volontaire — le sélecteur "Toutes les franchises" du portail doit lui
  aussi avoir un PDF.
- La fonction `onCall` `regenererRapportPdf({ clientId, rapportId })`,
  admin-only (`users/{uid}.role === "admin"`, même pattern que le reste de
  l'admin du portail) — pour régénérer manuellement sans attendre une vraie
  clôture de mois (utile en test, ou pour corriger un rapport après coup).

### Filtrage par franchise — fragilité connue et acceptée

`ComptabiliteFranchise` (le `donnees` d'un rapport par franchise) n'a ni
`facturesDetail`, ni `reclamationsDetail`, ni `promotions`. Pour ces trois
tableaux, `genererRapportPdf` va lire le rapport **global** du même mois
(`comptable-{moisRef}`, même `clientId`) et filtre `facturesDetail`/
`reclamationsDetail` où `.franchise === analytics/{franchiseId}.franchiseNom`.

**C'est un matching par chaîne de caractères (nom affiché), pas par id.**
Fragilité acceptée pour livrer maintenant plutôt que d'attendre que chaque
Cloud Function cliente pousse un id de franchise sur chaque ligne de
facture/réclamation. Risque concret : un nom de franchise renommé côté
client entre deux mois casse silencieusement le filtrage (les lignes de
l'ancien nom disparaissent du rapport de cette franchise, sans erreur). À
surveiller si un client renomme une franchise ; migration propre plus tard
= ajouter un `franchiseId` sur `ComptabiliteFacture`/`ComptabiliteReclamation`
et filtrer par id.

**Ce n'est plus un échec silencieux** : si `synthese.revenus > 0` pour la
franchise mais que `facturesDetail` filtré est vide, `facturesMismatchDetecte`
passe à `true` — `logger.warn` côté Cloud Function, et le jeton
`{{FACTURES_MISMATCH_WARNING}}` (section 4 du PDF) affiche un avertissement
visible (`.mention-avertissement`, jaune) plutôt qu'un tableau vide sans
explication. Même détection et même style d'avertissement côté écran dans
`OngletComptabilite.tsx` (`facturesMismatch`).

`promotions[]` n'a pas de champ franchise du tout (voir Section 2 ci-dessus)
— affiché tel quel (réseau entier) avec la mention explicite, jamais
filtré.

### Stockage et déclenchement manuel

- PDF : `clients/{clientId}/rapports/{rapportId}/rapport.pdf`
- CSV : `clients/{clientId}/rapports/{rapportId}/factures.csv`
- URLs au même format token que le reste de l'app (`?alt=media&token=...`,
  voir `logo_url`/`AW_LOGO_URL` dans le code existant) — pas d'URL signée à
  expiration.
- Mémoire/délai Cloud Function : `memory: "1GiB"`, `timeoutSeconds: 120` sur
  les deux points d'entrée (Puppeteer + Chromium dépassent largement les
  limites par défaut).

Déclenchement manuel après déploiement, pour un test immédiat sans attendre
une clôture de mois :

```bash
firebase functions:shell
# puis, dans le shell :
regenererRapportPdf({ clientId: "poke-station-tr", rapportId: "comptable-2026-07-trois-rivieres" })
```

(adapter `rapportId` selon le doc réellement présent — `comptable-2026-07`
pour le rapport global du même mois.)

## Notes de rendu

- **Marges et pagination du PDF** : gérées entièrement par les options de
  `page.pdf()` côté Cloud Function — pas par ce gabarit :
  ```js
  page.pdf({
    format: "letter",
    printBackground: true,
    margin: { top: "14mm", bottom: "18mm", left: "0mm", right: "0mm" },
    displayHeaderFooter: true,
    footerTemplate: /* contenu de rapportMensuelPiedDePage.html, jetons remplacés */,
    headerTemplate: "<span></span>",
  })
  ```
  (marges gauche/droite à 0 car les sections gèrent déjà leur propre padding
  horizontal — évite un double-espacement.)

- **Polices** : Inter 400/600/700, sous-ensemble latin (couvre les
  caractères accentués français, U+0000-00FF), auto-hébergées en base64
  directement dans `rapportMensuel.html`. Source : `@fontsource/inter`
  5.3.0 (licence SIL OFL) — pas un binaire deviné. `@sparticuz/chromium` ne
  fournit aucune police système par défaut, d'où l'auto-hébergement plutôt
  qu'une pile de polices système.

- **Garde-fou de contraste** : `COULEUR_ACCENT` vient directement de
  `couleur_primaire` sans validation de contraste pour l'instant — un client
  avec une couleur de marque très pâle pourrait produire du texte/bordures
  peu lisibles. Pas traité dans cette version ; à surveiller si ça arrive en
  pratique.
