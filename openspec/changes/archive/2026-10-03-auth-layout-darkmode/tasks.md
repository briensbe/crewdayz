## 1. Initialisation Précoce du Thème et Anti-Flicker

- [x] 1.1 Ajouter le script synchrone anti-flicker dans le `<head>` de `src/index.html` pour lire `localStorage` et `prefers-color-scheme` et appliquer immédiatement la classe `.dark-mode` sur `<html>`.
- [x] 1.2 Configurer l'initialisation globale de `ThemeService` au bootstrap via `provideAppInitializer` dans `src/app/app.config.ts`.

## 2. Création du Composant de Layout Applicatif (`MainLayoutComponent`)

- [x] 2.1 Créer les fichiers du composant autonome `MainLayoutComponent` (`.ts`, `.html`, `.css`) dans `src/app/layout/main-layout/`.
- [x] 2.2 Définir le template de `MainLayoutComponent` contenant `<app-sidebar>`, `<main class="main-content" [class.sidebar-collapsed]="sidebarService.collapsed()"><router-outlet></router-outlet></main>` et `<app-release-notes>`.
- [x] 2.3 Injecter `SidebarService` et `SupabaseService` dans `MainLayoutComponent` pour gérer le layout et le rechargement de Jira Collector si nécessaire.

## 3. Refonte du Composant Racine `App`

- [x] 3.1 Simplifier `src/app/app.html` pour ne conserver que le `<router-outlet>` racine et `<app-toast-container>`.
- [x] 3.2 Nettoyer `src/app/app.ts` en retirant les imports de layout superflus (`SidebarComponent`, `ReleaseNotesComponent`) tout en maintenant la surveillance globale d'authentification.

## 4. Restructuration du Routage (`app.routes.ts`)

- [x] 4.1 Définir les routes publiques (`/login`, `/signup`, `/forgot-password`, `/reset-password`) au premier niveau sans layout.
- [x] 4.2 Définir la route parente `path: ''` avec `component: MainLayoutComponent` et `canActivate: [AuthGuard]`.
- [x] 4.3 Placer toutes les vues protégées (`/dashboard`, `/collaborateurs`, `/mensuel`, `/annuel`, `/vacances`, `/audit`, `/reconciliation`, `/suggestions`, `/profile`, `/update-password`) ainsi que la redirection racine `/` (`RootRedirectGuard`) en tant que routes enfants de `MainLayoutComponent`.

## 5. Validation et Tests

- [x] 5.1 Vérifier le chargement direct de `/login` en mode sombre sans flash blanc et sans sidebar.
- [x] 5.2 Valider la fluidité de la connexion : disparition du formulaire de login puis apparition du shell applicatif et de la vue cible.
- [x] 5.3 Exécuter `pnpm build` et les tests unitaires pour valider la non-régression.
