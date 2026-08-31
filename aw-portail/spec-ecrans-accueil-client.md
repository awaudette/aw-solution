# Instructions pour Claude Code

Lis ce fichier au complet, puis suis les instructions à la toute fin.

---

## Contexte

Les trois écrans d'accueil client ci-dessous existent déjà dans le code et ont été testés et validés dans le passé pour d'autres clients — au moins "onboarding terminé" et "app lancée" fonctionnaient. Ce n'est donc pas un chantier à construire, mais une comparaison à faire entre la spec d'origine et l'état actuel du code, qui a peut-être dérivé depuis.

## Spécification — Client avec onboarding en cours

Hero en couleur (avec couleur mise par AW Solution lors de la création du client dans Firebase) avec nom du responsable, nom de l'entreprise, message de bienvenue, forfait actuel, statut : "actions requises" (rouge) au lieu de "actif" en vert, date de lancement estimé et date d'aujourd'hui — comme Golf Beattie présentement.

Bannière "action requise" (couleur mise par AW Solution en lien avec le client) avec bouton "compléter" comme Golf Beattie présentement.

Ligne horizontale avec chaque étape en lien avec le déploiement de l'application, chaque étape cliquable pour se rediriger vers la section liée : signature contrat, configuration paiement, configuration branding, design, développement, rencontre de validation, ajustements, tests & validation, soumission App Store et Google Play, formation et conception matériel de lancement, configuration succursale, lancement (même chose que la feuille de route mais à l'horizontale si possible, et la conception matériel de lancement au même endroit que formation) — même design que Golf Beattie présentement.

Section messages avec les messages non lus (bouton "voir" pour aller dans la messagerie vers le message, et bouton crochet pour faire disparaître le message de l'encadré — lu — sans rediriger ; le bouton "voir" ne fait pas disparaître le message, seulement le rediriger) et un bouton "envoyer un message" présent constamment.

Section notifications (avec tout ce qu'on a vu précédemment).

Section checklist visuelle avec seulement les actions à compléter côté client, avec rempli ou non (vert si remplie) — un peu comme la section déploiement dans le bas du portail Golf Beattie, mais seulement les étapes du client (contrat, paiement, branding, mais aussi rencontre de validation puisqu'il doit être présent, et formation et configuration puisqu'il doit être présent aussi).

Section "votre forfait" plus bas avec succursales, montant mensuel, en ligne depuis, et date de renouvellement — comme Golf Beattie présentement.

Retirer la section "actions rapides".

Message personnalisé que le client ajoute dans Firebase à la création du client.

## Spécification — Client avec onboarding terminé

Même hero que pour client avec onboarding en cours, mais avec statut "en cours de développement" (bleu), et la couleur du hero est maintenant liée à la couleur primaire mise dans branding.

"Étape actuelle" qui remplace la bannière "action requise", avec un bouton qui redirige vers la feuille de route.

Même ligne horizontale que client onboarding en cours.

Même section messages que client onboarding en cours.

Section notifications (même chose que onboarding en cours).

Section "dernières mises à jour" — journal en résumé, avec les 3 dernières mises à jour.

Section "votre forfait" comme onboarding en cours.

Retirer la section actions rapides.

Message personnalisé retiré.

Section documentation & formations : si aucun document, écrire "les guides et formations seront disponibles une fois votre app terminée" (distincte de celle de la FAQ).

## Spécification — Client avec app lancée et en fonction

Hero en couleur (avec couleur primaire mise dans branding par le client), avec nom du responsable, nom de l'entreprise, message de bienvenue, forfait actuel, statut "actif" en vert, date où l'app a été lancée et date d'aujourd'hui. Aussi dans le hero : 3 statistiques importantes comme total membres, total revenus, total visites — comme Poké Station présentement.

Alertes intelligentes : les 2-3 alertes prioritaires du jour directement sur l'accueil. Exemple : "47 membres VIP à risque — valeur en jeu 5 340 $" avec bouton d'action. C'est ça qui fait revenir le client chaque semaine.

Graphiques de tendance.

Messagerie (comme client onboarding terminé).

Notifications (comme client onboarding terminé).

Forfait choisi (comme client onboarding terminé).

Nouveautés AW Solution et mises à jour.

Rapport du mois : rapport mensuel téléchargeable, et rapport de performance téléchargeable (Prestige seulement).

Prochaine rencontre stratégique (Prestige seulement) — si aucune rencontre n'est cédulée encore, bouton "demander une rencontre stratégique".

---

## Ce que je te demande

Trouve les trois composants réels dans le code (`AccueilOnboarding.tsx`, `AccueilConstruction.tsx`, `AccueilActif.tsx`, ou leurs équivalents réels s'ils portent d'autres noms) et réponds pour chacun des trois :

1. Ce qui existe déjà et correspond fidèlement à la spec ci-dessus.
2. Ce qui existe mais diffère de la spec (comportement, contenu, ou apparence différents).
3. Ce qui manque complètement.

Ne modifie rien pour l'instant — présente-moi l'écart d'abord, on décidera ensemble quoi corriger et dans quel ordre.
