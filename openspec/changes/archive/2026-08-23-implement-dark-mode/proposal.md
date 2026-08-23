## Why

L'application CrewDayz dispose actuellement d'un thème clair par défaut. L'ajout d'un mode sombre (Dark Mode) améliore le confort visuel des utilisateurs en environnement peu éclairé, réduit la fatigue oculaire et modernise l'expérience utilisateur, en cohérence avec l'architecture déjà mise en œuvre avec succès sur le projet `roadmap`.

## What Changes

- **ThemeService réactif basé sur les signaux Angular** : Gestion des préférences de thème (`'light'`, `'dark'`, `'system'`), détection en temps réel des préférences du système d'exploitation (`prefers-color-scheme: dark`), synchronisation persistante dans le `localStorage` et application dynamique de la classe `dark-mode` sur `document.body` et `document.documentElement`.
- **Variables CSS pour le mode sombre** : Définition des variables CSS spécifiques au mode sombre dans `src/styles.css` sous la classe `body.dark-mode` (couleurs d'arrière-plan, surfaces, cartes, textes, bordures, ombres, tableaux, entrées de formulaire, etc.).
- **Sélecteur de thème dans le profil utilisateur** : Ajout d'une interface de sélection de thème (Clair / Sombre / Système) avec icônes Lucide dans la page de profil (`ProfileComponent`).
- **Raccourci de bascule rapide dans la sidebar** : Bouton d'action rapide dans le pied de page (`sidebar-footer`) permettant de basculer instantanément entre mode clair et mode sombre avec retour visuel adapté (icônes `Sun` / `Moon`, état réduit/déployé).
- **Optimisation des contrastes et éléments de planning en mode sombre** : Adaptation des variables CSS pour les week-ends (fonds assombris), la cellule "Jours Trav." au survol, les bandes de zones de vacances scolaires et la palette dynamique des badges d'équipes (`TEAM_PALETTE`).
- **Adaptations de composants & vues** : Ajustement des styles CSS des composants spécifiques (vue mensuelle, annuelle, filtres, modales d'absences, notes de version, alertes, etc.) pour une intégration fluide et harmonieuse en mode sombre.

## Capabilities

### New Capabilities
- `theme-management`: Gestion complète du thème sombre, clair et système avec persistance locale, détection OS, sélecteur UI dédié dans le profil, raccourci dans la barre latérale et adaptation dynamique des palettes graphiques (badges équipes, planning mensuel et annuel).

### Modified Capabilities
<!-- None -->

## Impact

- **Code affecté** :
  - Création de `src/app/services/theme.service.ts`
  - Mise à jour de `src/styles.css` pour supporter `body.dark-mode`, adapter les variables CSS, les badges d'équipes et la grille de planning
  - Mise à jour de `src/app/shared/utils/color-utils.ts` pour utiliser les variables CSS de thèmes
  - Mise à jour de `src/app/auth/profile/profile.component.{ts,html,css}` pour intégrer le sélecteur de thème
  - Mise à jour de `src/app/layout/sidebar/sidebar.component.{ts,html,css}` pour le raccourci dans le footer
  - Mise à jour de `src/app/views/monthly-view/monthly-view.component.css` pour les contrastes week-ends, jours fériés, vacances scolaires et cellule jours travaillés
  - Vérification et adaptation des composants graphiques (`monthly-view`, `annual-view`, `absence-modal`, `filters`, `release-notes`, `holidays-view`, etc.)
- **Dépendances** : Utilisation des icônes Lucide déjà présentes (`Sun`, `Moon`, `Monitor`). Aucune nouvelle dépendance externe requise.
- **Breaking Changes** : Aucun impact régressif ou cassant.
