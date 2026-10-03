## Context

Actuellement, le composant racine `App` (`src/app/app.html`) intègre directement la barre latérale `<app-sidebar>` et la conditionne via `@if (supabaseService.user())`.
Deux problèmes ergonomiques et visuels se posent :
1. **Absence du thème sombre sur `/login`** : `ThemeService` étant injecté uniquement dans `SidebarComponent` et `ProfileComponent`, il n'est pas instancié lors de l'arrivée sur `/login`. De plus, aucun script anti-flicker précoce n'applique la classe `.dark-mode` avant le chargement d'Angular.
2. **Clignotement du menu lors de la connexion** : Dès que l'authentification par mot de passe réussit, l'événement `SIGNED_IN` met à jour le signal `supabaseService.user()`. La barre latérale s'affiche immédiatement à l'écran à côté du formulaire de connexion, car la navigation du routeur Angular vers la page protégée n'a pas encore achevé son cycle de chargement asynchrone.

## Goals / Non-Goals

**Goals :**
- Garantir l'application immédiate du thème sombre sur toutes les pages, y compris la page de connexion non authentifiée, sans aucun flash blanc grâce à un script inline dans `index.html` et une initialisation par `provideAppInitializer`.
- Isoler complètement les vues d'authentification publiques (`/login`, `/signup`, `/forgot-password`, `/reset-password`) de tout élément du shell applicatif (sidebar, notifications de release).
- Regrouper l'ensemble des routes protégées sous un composant de mise en page dédié `MainLayoutComponent` avec `AuthGuard` au niveau parent.
- Rendre la transition de connexion fluide : le formulaire de connexion disparaît et cède la place à l'application complète (layout + vue de destination).

**Non-Goals :**
- Modifier la logique interne d'authentification Supabase (OAuth, OTP, session).
- Modifier les composants internes des vues métiers (`/mensuel`, `/dashboard`, etc.).

## Decisions

### 1. Script inline anti-flicker dans `index.html` et `provideAppInitializer`
- **Décision** :
  - Ajouter un court script synchrone dans `<head>` de `index.html` qui lit `localStorage.getItem('crewdayz_theme_preference')` et évalue `window.matchMedia('(prefers-color-scheme: dark)').matches`. Si le thème effectif est sombre, il ajoute immédiatement la classe `dark-mode` sur `document.documentElement`.
  - Enregistrer `ThemeService` dans `app.config.ts` via `provideAppInitializer(() => { inject(ThemeService); })` afin que le service réactif démarre au bootstrap et synchronise ses signaux avec le DOM.
- **Alternatives considérées** :
  - *Initialisation lazy dans `App` uniquement* : Risque de flash blanc perceptible lors du chargement des fichiers JS.
  - *Script inline seul sans service* : Perte de la réactivité Angular et de la synchronisation bidirectionnelle.

### 2. Architecture par Layout Component (`MainLayoutComponent`)
- **Décision** :
  - Créer `src/app/layout/main-layout/main-layout.component.{ts,html,css}` contenant :
    - `<app-sidebar></app-sidebar>`
    - `<main class="main-content" [class.sidebar-collapsed]="sidebarService.collapsed()"><router-outlet></router-outlet></main>`
    - `<app-release-notes></app-release-notes>`
  - Simplifier `src/app/app.html` à :
    ```html
    <router-outlet></router-outlet>
    <app-toast-container></app-toast-container>
    ```
- **Alternatives considérées** :
  - *Contrôle conditionnel dans `App` avec écoute des routes (`Router.events`)* : Moins idiomatique en Angular, complexifie le composant racine et peut entraîner des états transitoires désynchronisés.

### 3. Routage hiérarchique et protection par `AuthGuard` au niveau parent
- **Décision** :
  - Dans `app.routes.ts`, structurer les routes ainsi :
    - Routes publiques (`/login`, `/signup`, `/forgot-password`, `/reset-password`).
    - Route parente `path: ''` protégée par `canActivate: [AuthGuard]`, utilisant `MainLayoutComponent` avec les vues protégées en `children`.
    - La redirection racine (`path: ''` avec `RootRedirectGuard`) redirige vers la vue par défaut appropriée (`/mensuel` ou `/dashboard`).
- **Alternatives considérées** :
  - *Répéter `AuthGuard` sur chaque route enfant* : Redondant et source d'oublis lors de l'ajout de nouvelles routes.

## Risks / Trade-offs

- **[Risque]** Accès à `localStorage` dans le script `index.html` si le stockage est bloqué par le navigateur (navigation privée stricte).
  - *Mitigation* : Encapsuler l'accès dans un bloc `try/catch` avec fallback vers `prefers-color-scheme`.
- **[Risque]** Conflit de marges ou de hauteurs entre le conteneur racine et le nouveau layout.
  - *Mitigation* : Conserver les classes CSS de structure (`.app-layout`, `.main-content`, `.sidebar-collapsed`) dans `MainLayoutComponent` et adapter les styles globaux.

## Migration Plan

1. Mettre à jour `index.html` avec le script anti-flicker.
2. Mettre à jour `app.config.ts` pour initialiser `ThemeService` avec `provideAppInitializer`.
3. Créer `MainLayoutComponent` (`.ts`, `.html`, `.css`) dans `src/app/layout/main-layout/`.
4. Mettre à jour `app.html` et `app.ts` pour déléguer le shell au routeur.
5. Adapter `app.routes.ts` pour intégrer `MainLayoutComponent` en parent des routes authentifiées.
6. Valider le comportement sur `/login`, la bascule de thème, et la transition de connexion.

## Open Questions

Aucune question bloquante en suspens.
