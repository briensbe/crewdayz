## Purpose

Définir l'architecture du layout applicatif, isolant les vues d'authentification publiques du shell applicatif principal sécurisé (`MainLayoutComponent`).

## Requirements

### Requirement: Dedicated authenticated layout component
L'application DOIT fournir un composant de mise en page dédié (`MainLayoutComponent`) pour héberger la barre latérale de navigation (`<app-sidebar>`), le conteneur principal (`<main class="main-content">`), la vue enfant active (`<router-outlet>`) et les notes de version (`<app-release-notes>`).

#### Scenario: Rendering authenticated layout shell
- **WHEN** un utilisateur authentifié accède à une route protégée (ex: `/mensuel`, `/dashboard`, `/collaborateurs`, `/profile`)
- **THEN** `MainLayoutComponent` affiche la barre latérale, applique les classes de marge et d'état rétracté sur `<main>`, et restitue le composant cible dans son `<router-outlet>`.

### Requirement: Public authentication views isolation
L'application DOIT isoler les vues d'authentification publiques (`/login`, `/signup`, `/forgot-password`, `/reset-password`) de sorte qu'aucun élément de navigation applicatif (sidebar, menu, release notes) ne soit présent dans le DOM sur ces pages.

#### Scenario: Clean public login page render
- **WHEN** un utilisateur non authentifié ou déconnecté accède à la page `/login`
- **THEN** seul le formulaire de connexion est rendu via le `<router-outlet>` racine d'`App`, sans aucune présence ni clignotement de la barre latérale.

#### Scenario: Smooth transition after login submission
- **WHEN** un utilisateur soumet avec succès ses identifiants sur la page `/login`
- **THEN** le formulaire de connexion reste affiché jusqu'à la fin de la navigation vers la route protégée, et la barre latérale n'apparaît qu'au moment où la vue cible dans `MainLayoutComponent` est activée.

### Requirement: Protected routing hierarchy with root redirection
L'application DOIT regrouper toutes les routes protégées sous la route parente `MainLayoutComponent` sécurisée par `AuthGuard`, et DOIT gérer la redirection de la racine `/` vers la vue par défaut appropriée au niveau de ce parent.

#### Scenario: Unauthenticated access attempt to protected route
- **WHEN** un utilisateur non connecté tente d'accéder directement à une route sous `MainLayoutComponent`
- **THEN** `AuthGuard` bloque l'activation au niveau parent et redirige l'utilisateur vers `/login` avec le paramètre `returnUrl`.

#### Scenario: Root route redirection for authenticated user
- **WHEN** un utilisateur connecté accède à l'URL racine `/`
- **THEN** la route parente résout la redirection vers la vue par défaut (`/mensuel` ou `/dashboard` selon son rôle).
