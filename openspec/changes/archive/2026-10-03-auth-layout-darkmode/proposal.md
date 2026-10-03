## Why

Actuellement, lors de l'arrivée sur la page de connexion (`/login`), le thème sombre n'est pas appliqué même s'il est configuré dans le `localStorage`, car `ThemeService` n'est instancié qu'au moment où la barre latérale (`SidebarComponent`) est affichée. De plus, lors de la soumission du formulaire de connexion, la barre latérale apparaît instantanément dès que l'utilisateur est authentifié dans l'état réactif, avant même que la navigation du routeur vers la page d'accueil/tableau de bord soit terminée et que le formulaire disparaisse.

Cette proposition résout ces deux problématiques en découplant le layout applicatif des pages d'authentification publiques (via un `MainLayoutComponent` dédié et un routage structuré) et en garantissant une initialisation précoce du thème avec un script anti-flicker.

## What Changes

- **Initialisation précoce du thème (Anti-flicker)** :
  - Ajout d'un script inline ultra-léger dans `<head>` de `index.html` lisant `localStorage` (`crewdayz_theme_preference`) et `prefers-color-scheme` pour appliquer immédiatement la classe `.dark-mode` à `<html>` avant le bootstrap d'Angular (suppression du flash blanc).
  - Enregistrement de `ThemeService` via `provideAppInitializer` (ou injection dans `App`) pour synchroniser immédiatement l'état réactif d'Angular dès le démarrage.
- **Composant de Layout Applicatif (`MainLayoutComponent`)** :
  - Création du composant autonome `MainLayoutComponent` hébergeant la barre latérale (`<app-sidebar>`), la zone de contenu principale (`<main>`), le `<router-outlet>` des vues protégées et `<app-release-notes>`.
  - Simplification du composant racine `App` qui ne gère désormais que le `<router-outlet>` principal et les notifications globales (`<app-toast-container>`).
- **Refonte de la hiérarchie des routes (`app.routes.ts`)** :
  - Les pages publiques (`/login`, `/signup`, `/forgot-password`, `/reset-password`) sont rendues directement sans shell applicatif.
  - Toutes les routes protégées sont regroupées sous la route parente `MainLayoutComponent` protégée par `AuthGuard`.
  - Gestion de la redirection racine (`/` vers `/mensuel` ou `/dashboard`) directement au niveau du parent `MainLayoutComponent`.
  - Suppression de l'affichage prématuré du menu pendant la transition de connexion : le menu n'est affiché qu'une fois la route protégée activée et le formulaire de connexion quitté.

## Capabilities

### New Capabilities
- `application-layout`: Gestion du shell applicatif et du conteneur de mise en page pour les routes authentifiées, séparant nettement les écrans d'authentification isolés du layout principal avec sidebar.

### Modified Capabilities
- `theme-management`: Initialisation anticipée du thème au bootstrap et script inline anti-flicker pour garantir l'application du dark mode dès le premier rendu, y compris sur les pages d'authentification non connectées.

## Impact

- **Composants impactés** : `App` (`app.html`, `app.ts`), nouveau `MainLayoutComponent` (`src/app/layout/main-layout/...`), `index.html`, `app.config.ts`, `app.routes.ts`, `ThemeService`.
- **Routage** : `AuthGuard` appliqué sur la route parente du layout au lieu d'être dispersé.
- **Expérience utilisateur** : Zéro flash blanc lors du rechargement en mode sombre, transition fluide et propre entre le formulaire de connexion et l'application.
