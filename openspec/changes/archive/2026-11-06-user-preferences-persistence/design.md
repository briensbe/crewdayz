## Context

Dans les parcs informatiques d'entreprise, les politiques de sécurité (GPO) et scripts de fermeture nettoient systématiquement les données locales du navigateur (`localStorage`, `sessionStorage`, IndexedDB, cookies locaux).
Dans Crewdayz, les préférences utilisateurs sont actuellement enregistrées unitairement dans `localStorage` (clés `crewdayz_theme_preference`, `crewdayz_annual_name_col_width`, `crewdayz_monthly_name_col_width`, etc.). Par conséquent, les utilisateurs perdent leur personnalisation à chaque fermeture du navigateur.

L'objectif de cette conception technique est de basculer la source de vérité des préférences utilisateur vers la base de données Supabase, tout en instaurant une discipline stricte sur le nombre d'écritures pour éviter d'inonder la base de données lors des manipulations d'interface.

## Goals / Non-Goals

### Goals
- Centraliser l'ensemble des préférences actuelles et futures dans une colonne PostgreSQL `jsonb` dédiée.
- Garantir que chaque utilisateur authentifié (quel que soit son rôle : `viewer`, `editor`, `admin`) puisse sauvegarder et restaurer ses préférences.
- Minimiser drastiquement le nombre de requêtes SQL : **0 requête** pendant l'utilisation continue, et **au maximum 1 requête consolidée** au départ de l'utilisateur uniquement si un changement réel a eu lieu.
- Supprimer les appels d'écriture directe à `localStorage` dans les composants et directives métier.
- Maintenir une expérience fluide sans latence (mises à jour réactives en mémoire à 60fps).

### Non-Goals
- Gérer la synchronisation temps réel inter-onglets en direct (Realtime WebSocket) pour les préférences visuelles : la stratégie adoptée est *last-hidden-wins*, largement suffisante pour des options de confort.
- Stocker les données de formulaires non sauvegardés ou l'état de brouillon de saisie d'absences.
- Persister les filtres et critères de recherche des tableaux/vues en base de données : les filtres (`FilterState`, texte de recherche, collaborateurs épinglés) sont des états d'exploration très dynamiques qui changent fréquemment au cours de la session. Ils sont explicitement exclus de la persistance distante dans `cd_user_preferences` pour limiter au maximum les requêtes et restent gérés localement dans le navigateur (en mémoire et/ou stockage local).

## Decisions

### 1. Table dédiée `cd_user_preferences` vs Colonne dans `cd_user_profiles`
- **Choix** : Créer une nouvelle table `crewdayz.cd_user_preferences (user_id UUID PK, preferences JSONB, updated_at TIMESTAMPTZ)` avec politique RLS dédiée `auth.uid() = user_id`.
- **Justification** :
  - La table `cd_user_profiles` actuelle est protégée par une politique RLS stricte (`FOR UPDATE USING (crewdayz.is_admin())`). Permettre aux utilisateurs non-admins de modifier leur propre ligne dans `cd_user_profiles` poserait un risque de sécurité (tentative d'élévation de privilèges sur la colonne `role`).
  - Découpler les préférences du profil respecte le principe de responsabilité unique (SRP) et évite d'altérer la table principale des droits d'accès.
- **Alternatives écartées** :
  - *Ajout d'une colonne `preferences` dans `cd_user_profiles`* : rejeté pour des raisons de sécurité RLS et d'intégrité de la gestion des rôles.
  - *Utilisation de `supabase.auth.updateUser({ data: ... })` (User Metadata)* : rejeté car cela régénère les jetons JWT à chaque mise à jour et surcharge les en-têtes d'authentification.

### 2. Stratégie de persistance : Flush événementiel (Levier D) avec comparaison profonde
- **Choix** : Les modifications UI mettent à jour instantanément un Signal Angular en mémoire. L'écriture en base n'est déclenchée que lors d'événements clés :
  1. `document.addEventListener('visibilitychange')` : dès que `document.visibilityState === 'hidden'` (l'utilisateur change d'onglet, minimise le navigateur, verrouille son poste Windows ou ferme la fenêtre).
  2. `window.addEventListener('pagehide')` : événement W3C moderne plus robuste que `unload` pour les sorties de page.
  3. `SupabaseService.signOut()` : appel explicite à `flush()` avant l'invalidation de la session.
- **Comparaison préalable (Deep Diff)** : Avant l'envoi de la requête `UPSERT`, le service compare l'état mémoire avec l'instantané de référence issu du dernier chargement/sauvegarde. Si `isDeepEqual(current, persisted) === true`, l'opération réseau est annulée.
- **Alternatives écartées** :
  - *Écriture immédiate à chaque action* : rejeté en raison de la surcharge réseau (ex: dizaines de requêtes lors du redimensionnement de colonnes).
  - *Debounce court (300ms à 1s)* : rejeté car il génère encore plusieurs écritures intermédiaires lors de sessions de paramétrage.
  - *Debounce long sans événements* : rejeté en raison du risque de perte de données si le navigateur est fermé avant l'expiration du délai.

### 3. Modèle de données JSONB extensible
- **Choix** : Utiliser une structure JSON typée en TypeScript incluant le thème, les largeurs de colonnes et les notes de version, en excluant explicitement les filtres dynamiques :
  ```typescript
  export interface UserPreferences {
    theme?: 'light' | 'dark' | 'system';
    columnWidths?: {
      annualNameCol?: number;
      monthlyNameCol?: number;
      employeeNameCol?: number;
      [key: string]: number | undefined;
    };
    releaseNotes?: {
      lastSeenVersion?: string;
    };
  }
  ```
- **Justification** : 
  - Permet d'ajouter de futurs réglages durables de l'application dans le frontend sans devoir créer de migrations SQL à chaque évolution.
  - Les filtres et sélections dynamiques de vue (`FilterState`, texte de recherche, employés épinglés) sont délibérément exclus de ce modèle distant : ils sont volatiles, spécifiques à une session de travail ponctuelle, et leur synchronisation en base multiplierait inutilement les écritures.


## Risks / Trade-offs

- **[Risque] Fermeture brutale du navigateur (kill de processus par script IT)** → **Atténuation** : L'événement `visibilitychange` se déclenche dès la perte de focus de l'onglet, bien avant que le processus ne soit effectivement tué par le système d'exploitation. L'usage de l'API `fetch` avec `keepalive: true` ou d'un appel asynchrone non bloquant garantit la complétion de la requête.
- **[Risque] Session non authentifiée au démarrage (Cold Boot)** → **Atténuation** : Pour éviter un flash visuel au chargement de la page de login, `localStorage` ou la préférence système `prefers-color-scheme` reste utilisé comme cache optimiste non bloquant. Dès que la session utilisateur est validée, les préférences de la base sont appliquées.
- **[Risque] Concurrence multi-onglets (un même utilisateur avec 2 onglets ouverts)** → **Atténuation** : Comportement *last-hidden-wins*. Comme les préférences concernent des réglages visuels de l'UI (thème, largeurs de colonnes), une synchronisation complexe par CRDT ou verrouillage distribué n'est pas nécessaire.

## Migration Plan

1. **Phase Base de données** :
   - Exécuter le script `0004_user_preferences.sql` dans Supabase pour créer la table `crewdayz.cd_user_preferences` et ses politiques RLS.
2. **Phase Frontend - Service & Store** :
   - Implémenter le modèle `UserPreferences` et le service `PreferencesService`.
   - Brancher l'initialisation dans `SupabaseService` lors de la détection de l'état connecté.
   - Enregistrer les écouteurs globaux `visibilitychange` et `pagehide`.
3. **Phase Raccordement des composants** :
   - Mettre à jour `ThemeService` pour lire et écrire dans `PreferencesService`.
   - Mettre à jour `ResizableDirective` pour enregistrer les largeurs via `PreferencesService`.
   - Maintenir les filtres et critères de recherche des vues (`AnnualViewComponent`, `MonthlyViewComponent`, `EmployeeListComponent`, `DashboardComponent`) découplés de la base distante (gestion locale en mémoire / `localStorage`).
   - Mettre à jour `ReleaseNotesComponent`.
4. **Phase Nettoyage** :
   - Supprimer les clés isolées de `localStorage` tout en conservant un fallback gracieux.

## Open Questions

- *Faut-il prévoir un bouton "Réinitialiser mes préférences" dans le profil utilisateur ?*  
  Non bloquant pour cette phase, pourra être ajouté ultérieurement dans la page de profil.
