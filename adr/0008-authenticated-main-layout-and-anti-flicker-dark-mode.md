# ADR 0008: Séparation du Layout Applicatif Authentifié et Dark Mode Anti-Flicker

## Status
Accepted

## Date
2026-10-03

## Context
Auparavant, le composant racine `App` incluait directement la barre latérale `<app-sidebar>` et la conditionnait à la présence de `supabaseService.user()`.
Cela provoquait deux problèmes :
1. Sur les pages publiques non connectées (ex: `/login`), `ThemeService` n'était pas instancié (car injecté uniquement dans des composants protégés) et aucun script initial n'appliquait la classe `.dark-mode` avant le chargement d'Angular.
2. Lors de la connexion, dès que `user()` était renseigné, la barre latérale apparaissait immédiatement dans le DOM alors que le formulaire de connexion était toujours présent et que la navigation du routeur n'était pas finalisée.

## Decision
1. **Script Anti-flicker & `provideAppInitializer`** :
   - Insertion d'un script inline dans le `<head>` de `index.html` pour lire `localStorage` (`crewdayz_theme_preference`) ou `prefers-color-scheme: dark` et appliquer immédiatement la classe `.dark-mode` sur l'élément `<html>` avant le chargement d'Angular.
   - Initialisation globale de `ThemeService` via `provideAppInitializer` dans `app.config.ts`.
2. **Architecture par `MainLayoutComponent`** :
   - Création de `MainLayoutComponent` contenant `<app-sidebar>`, la zone de contenu `<main>` et `<app-release-notes>`.
   - Simplification de `App` au simple `<router-outlet>` racine et `<app-toast-container>`.
   - Regroupement des routes protégées sous `MainLayoutComponent` dans `app.routes.ts`, avec `AuthGuard` au niveau parent.

## Consequences
- **Positives** :
  - Zéro flash blanc lors du chargement des pages en mode sombre, même avant le bootstrap Angular.
  - Isolation propre des pages publiques d'authentification sans menu ni sidebar.
  - Transition de connexion nette et fluide sans apparition prématurée du menu.
  - Code de routage plus maintenable avec une protection centralisée au niveau du parent.
- **Négatives / Précautions** :
  - Toute nouvelle page protégée doit être déclarée comme enfant de la route parente `MainLayoutComponent`.
