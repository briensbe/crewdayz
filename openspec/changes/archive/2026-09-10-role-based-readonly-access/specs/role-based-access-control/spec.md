## ADDED Requirements

### Requirement: Attribution automatique du rôle Viewer à l'inscription
Le système DOIT attribuer automatiquement le rôle `viewer` à tout nouvel utilisateur authentifié avec une adresse de l'entreprise.

#### Scenario: Nouvel utilisateur se connectant pour la première fois
- **GIVEN** un utilisateur authentifié sans profil préalable dans la base de données
- **WHEN** l'utilisateur finalise sa première connexion
- **THEN** le système crée un profil avec le rôle `viewer` par défaut

### Requirement: Filtrage de la navigation selon le rôle
Le menu latéral de l'application DOIT adapter dynamiquement la liste des liens de navigation selon le rôle de l'utilisateur connecté.

#### Scenario: Navigation affichée pour un utilisateur Viewer
- **GIVEN** un utilisateur connecté avec le rôle `viewer`
- **WHEN** le menu latéral est affiché
- **THEN** seuls les liens « Vue Mensuelle », « Vue Annuelle » et « Mon Profil » sont visibles
- **THEN** les liens « Tableau de Bord », « Collaborateurs », « Rapprochement Triskell » et « Historique d'Audit » sont masqués

#### Scenario: Navigation affichée pour un utilisateur Editor ou Admin
- **GIVEN** un utilisateur connecté avec le rôle `editor` ou `admin`
- **WHEN** le menu latéral est affiché
- **THEN** l'ensemble des modules autorisés (incluant Tableau de Bord, Collaborateurs, Audit, etc.) est visible

### Requirement: Protection des routes par Guard de rôles
Le système DOIT restreindre l'accès aux routes protégées et rediriger les utilisateurs non autorisés.

#### Scenario: Tentative d'accès à une route restreinte par un Viewer
- **GIVEN** un utilisateur connecté avec le rôle `viewer`
- **WHEN** l'utilisateur tente d'accéder directement à `/dashboard` ou `/collaborateurs` via l'URL
- **THEN** le Guard intercepte la navigation et redirige l'utilisateur vers `/mensuel`

#### Scenario: Redirection racine par défaut selon le rôle
- **GIVEN** un utilisateur connecté avec le rôle `viewer`
- **WHEN** l'utilisateur accède à la route racine `/`
- **THEN** le système redirige automatiquement l'utilisateur vers `/mensuel`

### Requirement: Mode lecture seule sur les vues de planning
Dans les vues autorisées en consultation (« Vue Mensuelle » et « Vue Annuelle »), le système DOIT désactiver les interactions de création, modification ou suppression d'absences pour les profils `viewer`.

#### Scenario: Clic sur une case de calendrier par un Viewer
- **GIVEN** un utilisateur connecté avec le rôle `viewer` sur la vue mensuelle
- **WHEN** l'utilisateur clique sur une case de date d'un collaborateur
- **THEN** aucune modale de saisie ou de modification d'absence ne s'ouvre

#### Scenario: Boutons d'action administrative masqués
- **GIVEN** un utilisateur connecté avec le rôle `viewer`
- **WHEN** la vue mensuelle ou annuelle est affichée
- **THEN** les boutons de modification de données ou de synchronisation sont masqués ou désactivés

### Requirement: Sécurisation des accès aux données au niveau Supabase (RLS)
La base de données DOIT appliquer des politiques Row Level Security (RLS) distinctes empêchant toute mutation par un utilisateur `viewer`.

#### Scenario: Tentative d'insertion ou modification via l'API Supabase par un Viewer
- **GIVEN** un utilisateur authentifié avec le rôle `viewer`
- **WHEN** une requête HTTP `INSERT`, `UPDATE` ou `DELETE` est émise vers les tables `absences` ou `collaborateurs`
- **THEN** Supabase PostgreSQL rejette la requête avec une erreur de permission RLS
