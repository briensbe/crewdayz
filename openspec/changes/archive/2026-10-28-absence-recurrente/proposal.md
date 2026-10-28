## Why

Aujourd'hui, la déclaration d'absences régulières (ex. collaborateurs à temps partiel à 80% ou 50%, ou formations périodiques) impose de renseigner manuellement chaque date ou chaque semaine de manière répétitive. Pour un collaborateur à 80% avec un jour non travaillé par semaine sur une année complète, cela représente plus de 45 saisies manuelles.

L'objectif est d'offrir une fonctionnalité de remplissage direct par récurrence hebdomadaire au sein de la modale de déclaration d'absence, inspirée de l'ergonomie d'outils comme Outlook, sans dégrader l'expérience de saisie simple au quotidien.

## What Changes

- **Section récurrence repliable dans la modale d'absence** : Ajout d'une option facultative "Répéter cette absence" (désactivée par défaut) dans `AbsenceModalComponent`.
- **Paramétrage périodique type Outlook** :
  - Définition d'un intervalle de répétition en semaines (*"Toutes les X semaine(s)"*).
  - Sélection des jours ouvrés de la semaine (Lundi, Mardi, Mercredi, Jeudi, Vendredi).
  - Choix de la période appliquée aux jours sélectionnés (Journée entière, Matin, Après-midi).
- **Règles métier de non-régression et protection des données** :
  - Préservation des jours fériés français : aucun événement de temps partiel n'est généré sur un jour férié chômé.
  - Préservation des absences existantes : les congés ou événements déjà saisis sur la période ne sont pas écrasés.
- **Indicateur de simulation en temps réel** : Affichage dynamique du nombre d'occurrences qui seront créées et du nombre de jours ignorés (fériés ou conflits).
- **Génération concrète dans la base de données** : Matérialisation directe des lignes dans la table existante `cd_absences` via `AbsenceService`, permettant l'édition ou la suppression manuelle individuelle de chaque jour.

## Capabilities

### New Capabilities
- `absence-recurrence`: Définition et génération d'absences récurrentes sur une période donnée avec gestion des intervalles hebdomadaires, des demi-journées, et des règles de non-écrasement (jours fériés et absences existantes).

### Modified Capabilities
<!-- Aucune modification de spécification existante -->

## Impact

- **Composants UI** :
  - `src/app/shared/absence-modal/absence-modal.component.ts` (modale et interactions de récurrence)
  - `src/app/shared/absence-modal/absence-modal.component.html` (interface utilisateur et formulaire)
  - `src/app/shared/absence-modal/absence-modal.component.css` (styles de la section récurrence et des sélecteurs de jours)
  - `src/app/views/monthly-view/monthly-view.component.ts` (gestion de la sauvegarde groupée)
- **Logique métier / Helpers** :
  - Création d'un utilitaire pur `src/app/shared/utils/recurrence-generator.ts` (calcul des dates, filtres jours fériés et détection des conflits)
  - Tests unitaires associés `src/app/shared/utils/recurrence-generator.spec.ts`
- **Modèle de données & Backend** :
  - Zéro migration Supabase requise : réutilisation stricte de la table `cd_absences` et de la catégorie `'Temps partiel'` (ou toute autre catégorie sélectionnée).
