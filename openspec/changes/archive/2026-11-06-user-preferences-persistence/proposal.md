## Why

Dans l'environnement de production en entreprise, les postes clients exécutent des scripts stricts de sécurité ou appliquent des stratégies de groupe (GPO) qui purgent intégralement le stockage local (`localStorage`, `sessionStorage`, cookies non-SSO) à chaque fermeture du navigateur.

En conséquence, les utilisateurs de Crewdayz perdent systématiquement l'ensemble de leurs préférences de confort visuel à chaque fin de journée :
- Le choix du thème (Clair / Sombre / Système).
- Le redimensionnement personnalisé des colonnes des tableaux (vues Annuelle, Mensuelle, Collaborateurs).
- L'état de consultation des notes de version (la modale des nouveautés réapparaît à chaque session).

*Note sur les filtres :* Les filtres de recherche et critères de filtrage des tableaux sont volontairement exclus de la persistance en base de données. Ils restent éphémères / locaux (stockage de session ou local) afin d'éviter des requêtes inutiles et de permettre aux utilisateurs de démarrer chaque journée de travail sur une vue dégagée par défaut.

L'objectif de ce changement est de déplacer la source de vérité des préférences utilisateur vers la base de données Supabase au format JSONB, tout en appliquant une stratégie d'écriture événementielle ultra-sobre (flush uniquement aux moments clés et sous réserve d'un changement réel) afin de garantir une résilience totale sans surcharger la base de données.

## What Changes

- **Nouvelle table Supabase dédiée aux préférences (`cd_user_preferences`)** :
  - Clé primaire liée à `auth.users(id)` (`user_id`).
  - Colonne `preferences jsonb NOT NULL DEFAULT '{}'::jsonb`.
  - Politiques Row Level Security (RLS) strictes permettant à chaque utilisateur authentifié de lire et mettre à jour uniquement ses propres préférences (évitant les restrictions de modification de la table `cd_user_profiles`).
- **Nouveau service centralisé de gestion des préférences (`PreferencesService`)** :
  - Store réactif basé sur les Signaux Angular (`signal`, `computed`).
  - Initialisation au login de l'utilisateur avec chargement des données distantes.
  - Sauvegarde locale en cache pour le script anti-flicker du thème au démarrage non connecté.
- **Stratégie d'écriture événementielle ciblée (Flush on Key Events)** :
  - Zéro écriture en base pendant la session de travail active.
  - Déclenchement de la synchronisation distante uniquement lors des événements charnières :
    - Changement de visibilité de la page / perte de focus (`document.visibilitychange` lorsque l'état devient `hidden`).
    - Fermeture ou changement de page (`window.pagehide`).
    - Déconnexion explicite (`SupabaseService.signOut`).
- **Filtrage par Deep Equality (0 écriture si inchangé)** :
  - Comparaison systématique entre l'état actuel en mémoire et le dernier instantané persisté.
  - Annulation pure et simple de l'appel réseau si aucune valeur n'a été modifiée ou si une valeur est revenue à son état initial.
- **Migration des fonctionnalités existantes vers `PreferencesService`** :
  - Raccordement de `ThemeService` pour synchroniser le thème.
  - Raccordement de `ResizableDirective` et des vues (`AnnualViewComponent`, `MonthlyViewComponent`, `EmployeeListComponent`) pour les largeurs de colonnes.
  - Raccordement de `ReleaseNotesComponent` pour l'enregistrement de la dernière version consultée.
  - Conservation des filtres en stockage local/session sans émission de requêtes distantes.

## Capabilities

### New Capabilities
- `user-preferences`: Gestion centralisée et typée des préférences utilisateur en mémoire (Signaux Angular) avec persistance distante dans Supabase (`jsonb`), synchronisation événementielle (changement d'onglet, fermeture, déconnexion) et contrôle strict du volume d'écriture par comparaison d'état (zéro requête superflue).

### Modified Capabilities
<!-- Aucune modification de spécification existante -->

## Impact

- **Base de données & Migrations Supabase** :
  - Création du script SQL `supabase/scripts/0004_user_preferences.sql` créant la table `crewdayz.cd_user_preferences`, l'index et les politiques RLS associées.
- **Services applicatifs** :
  - Création de `src/app/services/preferences.service.ts` et de sa suite de tests `src/app/services/preferences.service.spec.ts`.
  - Adaptation de `src/app/services/supabase.service.ts` pour intégrer le chargement et la sauvegarde des préférences, ainsi que l'appel au flush lors du `signOut()`.
  - Adaptation de `src/app/services/theme.service.ts` pour s'interfacer avec `PreferencesService`.
- **Directives et Composants UI** :
  - Adaptation de `src/app/shared/directives/resizable.directive.ts` pour notifier le store des nouvelles largeurs de colonnes.
  - Adaptation de `src/app/views/annual-view/annual-view.component.ts`, `src/app/views/monthly-view/monthly-view.component.ts` et `src/app/views/employee-list/employee-list.component.ts` pour initialiser et persister leurs largeurs de colonnes.
  - Maintien des filtres des vues en gestion locale standard (sans persistance Supabase).
  - Adaptation de `src/app/shared/release-notes/release-notes.component.ts`.
- **Modèles de données & Typage** :
  - Création de l'interface `UserPreferences` dans `src/app/models/preferences.model.ts`.
