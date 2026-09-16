# golf-beattie-functions

Cloud Functions du projet Firebase **golf-beattie-d5062** (Club de golf Beattie —
La Sarre). Calcule les agrégats analytics à pousser vers `aw-portail`
(`POST /api/sync/analytics`, voir le contrat `src/types/analytics.ts` côté
portail).

**État actuel : calcul à blanc uniquement.** Rien ici n'écrit dans Firestore,
n'appelle le portail, ni ne se déploie. Voir `src/core/calculerAnalytics.ts`.

## Sécurité — clé de service

La clé `golf-beattie-d5062` (Admin SDK) ne vit **jamais** dans ce dossier.
Elle reste à `C:\Users\alexw\cles\golf-beattie-d5062.json` et est fournie aux
scripts via la variable d'env `GOOGLE_APPLICATION_CREDENTIALS`. `.gitignore`
bloque en plus tout fichier qui y ressemblerait par erreur.

## Exécuter le calcul à blanc

```bash
GOOGLE_APPLICATION_CREDENTIALS="C:\Users\alexw\cles\golf-beattie-d5062.json" npm run dry-run
```

## Collections brutes lues

| Collection | Champs utilisés | Plancher de date |
|---|---|---|
| `factures` | `montant_facture`, `points_gagnes`, `date_soumission`, `utilisateur_ref` | 2026-05-01 |
| `utilisateurs` | `points_restants` (snapshot actuel, `points_grattage` ignoré) | — |
| `Tirage` | `gain`, `date_tirage`, `utilisateur_ref` | 2025-12-08 |
| `Recompenses_reclamees` | `nom_recompense`, `points_utilises`, `date_reclamation` | aucun (non précisé par Alex) |

Règles de calcul : membre actif = ≥1 facture OU ≥1 tirage sur la fenêtre ;
visites = paires (membre, jour) distinctes dérivées des factures uniquement ;
points distribués = `points_gagnes` (factures) + `gain` (Tirage) ; points
utilisés = `points_utilises` (Recompenses_reclamees), groupé par
`nom_recompense` ; solde en circulation = somme courante de `points_restants`.

## Champs du contrat portail (`analytics.ts`) que le golf ne peut PAS fournir

**Explicitement exclus par Alex** (aucune tentative de calcul) :
- `promos` / `promotionsDetail[]` / `comptabilite.promotions[]` — promotions
- `comptabilite.codesPromo[]` — codes promo
- `comptabilite.synthese.valeurRachetee`, `.valeurBonus`,
  `snapshotFinMois.valeurPointsDistribues` — valeur rachetée en $
- `notifications.envoyees`, `.tauxOuverture`, `meilleureCampagne` —
  notifications

**Absents faute de source dans les 4 collections brutes actuelles** :
- `campagnes[]` — aucune collection de campagnes/envois lue
- `recompenses[].foodCost` / `.pourcentageFoodCost` — pas de coût sur
  `Recompenses_reclamees`, seulement `points_utilises`
- `comptabilite.facturesDetail[].franchise` — `factures` n'a qu'un
  `account_id` unique (250 755) ; club à site unique, pas de multi-franchise
- `segmentation`, `parcours`, `scoreFidelite` (Prestige) — non calculés
- `dateLancement`, `alertesActives` — non calculés
- `nouveauxMembres`, `achalandage` (jour × plage horaire) — calculables à
  partir des champs déjà lus (`created_time`, heure de `date_soumission`)
  mais pas demandés ici, donc pas implémentés

## Prochaine étape (hors scope de ce calcul à blanc)

Brancher `calculerAnalytics()` sur un vrai `portailSyncJob` planifié : écrire
`clients/{clientId}/analytics/*` restera côté **aw-portail** (comme documenté
dans `POST /api/sync/analytics`) — ce projet, lui, devra faire un `fetch` vers
ce endpoint avec le jeton Bearer du client, jamais une écriture Firestore
directe dans le projet du portail.
