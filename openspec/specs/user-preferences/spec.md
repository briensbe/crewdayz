## Purpose

Fournir une gestion réactive et centralisée des préférences utilisateur dans l'application Crewdayz, avec persistance distante sécurisée dans Supabase (PostgreSQL JSONB), écriture sobre par déclencheurs événementiels (flush sur changement de visibilité, déchargement et déconnexion) et élimination des requêtes superflues par comparaison d'état (Deep Diff).

## Requirements

### Requirement: Centralized User Preferences State Management
L'application DOIT fournir un service réactif `PreferencesService` gérant l'état en mémoire des préférences de l'utilisateur connecté via des Signaux Angular, structuré selon un modèle typé `UserPreferences`.

#### Scenario: Loading preferences on user authentication
- **WHEN** un utilisateur s'authentifie avec succès dans l'application
- **THEN** le service récupère les préférences persistées depuis la table Supabase `crewdayz.cd_user_preferences`, initialise les signaux réactifs internes et stocke une copie témoin de l'instantané persisté.

#### Scenario: Fallback to defaults when no preferences exist
- **WHEN** un utilisateur se connecte pour la première fois ou ne possède aucun enregistrement dans `crewdayz.cd_user_preferences`
- **THEN** le service initialise les signaux avec les valeurs par défaut du système (`theme: 'system'`, largeurs de colonnes standards) et crée l'enregistrement distant lors du premier flush.

#### Scenario: Modifying a preference during active session
- **WHEN** un composant ou une directive met à jour une préférence (ex: modification du thème ou largeur de colonne)
- **THEN** le signal en mémoire est mis à jour immédiatement sans déclencher d'appel réseau ni d'accès synchrone à la base de données.

### Requirement: Event-Driven Persistence Flush
Le service `PreferencesService` DOIT différer la persistance en base de données et n'exécuter un enregistrement groupé que lors de la survenue d'événements de cycle de vie clés du navigateur ou de la session.

#### Scenario: Flush on visibility change (tab hidden)
- **WHEN** l'onglet de l'application passe en arrière-plan ou est minimisé (`document.visibilityState === 'hidden'`)
- **THEN** le service déclenche la vérification d'état et le flush asynchrone des préférences vers Supabase.

#### Scenario: Flush on page hide or window close
- **WHEN** la fenêtre du navigateur est fermée ou rechargée (`pagehide` event)
- **THEN** le service tente d'exécuter le flush immédiat de l'état modifié vers la base de données.

#### Scenario: Flush on explicit sign out
- **WHEN** l'utilisateur clique sur le bouton de déconnexion dans l'interface
- **THEN** l'application exécute et attend la complétion de la méthode `flush()` avant d'invalider le jeton de session Supabase.

### Requirement: Deep Equality Check and Zero Superfluous Writes
Le service `PreferencesService` DOIT comparer l'état actuel en mémoire avec le dernier instantané sauvegardé avant tout appel réseau, et annuler l'écriture si aucune modification réelle n'est constatée.

#### Scenario: No modifications during session
- **WHEN** un événement déclencheur (changement de visibilité, déconnexion) intervient et qu'aucune préférence n'a été modifiée depuis le chargement initial
- **THEN** aucun appel réseau `UPDATE` ou `UPSERT` vers Supabase n'est émis.

#### Scenario: Neutralized modifications during session
- **WHEN** un utilisateur modifie une préférence puis la remet à sa valeur d'origine au cours de la même session
- **THEN** la comparaison par égalité profonde constate l'absence de différence et aucun appel réseau n'est effectué.

#### Scenario: Consolidated payload write on effective modification
- **WHEN** plusieurs préférences distinctes ont été modifiées au cours de la session (ex: thème et plusieurs largeurs de colonnes)
- **THEN** un unique appel `UPSERT` transmet l'intégralité du payload JSONB consolidé vers Supabase, et l'instantané persisté est mis à jour avec le nouvel état.

### Requirement: Dedicated Row-Level Security on User Preferences
La table de stockage PostgreSQL `crewdayz.cd_user_preferences` DOIT appliquer une sécurité au niveau des lignes (RLS) garantissant que chaque utilisateur ne peut lire et modifier que ses propres préférences.

#### Scenario: Authenticated user querying own preferences
- **WHEN** un utilisateur authentifié avec l'identifiant `user_id` requête la table `crewdayz.cd_user_preferences`
- **THEN** la politique RLS `auth.uid() = user_id` autorise la lecture de son propre enregistrement.

#### Scenario: Authenticated user updating own preferences
- **WHEN** un utilisateur authentifié tente de modifier ou insérer (`UPSERT`) ses préférences
- **THEN** la politique RLS `WITH CHECK (auth.uid() = user_id)` autorise l'opération pour son compte, quel que soit son rôle applicatif (`viewer`, `editor`, ou `admin`).

#### Scenario: Unauthorized cross-user access prevention
- **WHEN** un utilisateur tente d'accéder ou de modifier les préférences d'un autre utilisateur
- **THEN** la base de données PostgreSQL rejette la requête en vertu des politiques RLS.

### Requirement: Integration with Layout, Tables and Release Notes
Les composants existants consommant des préférences locales DOIVENT être raccordés au nouveau service `PreferencesService`.

#### Scenario: Column width restoration across table views
- **WHEN** les composants de tableau (`AnnualViewComponent`, `MonthlyViewComponent`, `EmployeeListComponent`) s'initialisent
- **THEN** ils appliquent les largeurs de colonnes issues du signal réactif des préférences utilisateur.

#### Scenario: Exclusion of view filters from remote persistence
- **WHEN** un utilisateur modifie les filtres de recherche ou critères de filtrage des tableaux dans les différentes vues
- **THEN** ces réglages de filtres sont gérés localement et NE sont PAS enregistrés dans la table distante Supabase `cd_user_preferences`, garantissant zéro appel réseau et une réinitialisation propre de la vue à chaque nouvelle session.

#### Scenario: Release notes seen state persistence
- **WHEN** l'utilisateur consulte la dernière version des notes de version dans `ReleaseNotesComponent`
- **THEN** la version consultée est enregistrée dans le store des préférences pour ne plus réapparaître lors des sessions suivantes.
