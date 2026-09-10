# ADR 0003: Contrôle d'Accès Basé sur les Rôles (RBAC) et Mode Lecture Seule

## Status
Accepted

## Date
2026-09-10

## Context
L'application CrewDayz est déployée sur internet et permet la gestion RH des plannings et absences. Pour ouvrir la consultation aux collaborateurs d'une organisation sans risquer d'altération de données, nous devons isoler les droits de lecture et d'écriture, restreindre les vues accessibles aux seuls écrans pertinents (vues mensuelle et annuelle) et attribuer le rôle `viewer` par défaut à tout nouvel utilisateur authentifié.

## Decision
Nous adoptons une architecture de contrôle d'accès multi-niveaux (Défense en profondeur) :
1. **Modèle de rôles Supabase / PostgreSQL & Trigger Automatique** : Table `crewdayz.user_profiles` liée aux utilisateurs `auth.users`, avec les rôles `'viewer'`, `'editor'`, `'admin'`. L'attribution du rôle `'viewer'` par défaut est obligatoirement réalisée via un trigger PostgreSQL (`AFTER INSERT ON auth.users`) en `SECURITY DEFINER` plutôt que par une insertion côté client Angular :
   - *Sécurité (Anti-escalade de privilèges)* : Interdit formellement toute écriture directe du rôle depuis le client frontend via l'API REST Supabase, empêchant ainsi un utilisateur d'injecter `{ role: 'admin' }` lors de la création de son compte.
   - *Atomicité & Résilience OAuth* : Garantit la création immédiate et systématique du profil lié même en cas de flux OAuth Google, de fermeture de fenêtre ou d'interruption réseau avant l'initialisation du front-end.
   - *Source unique de vérité* : Assure l'existence d'un profil cohérent quelle que soit la source de création du compte (OAuth, email/mot de passe, invitation console).
2. **Sécurisation par Row Level Security (RLS)** : Les politiques de lecture (`SELECT`) sont ouvertes à tous les utilisateurs authentifiés. Les politiques d'écriture (`INSERT`, `UPDATE`, `DELETE`) sont strictement réservées aux rôles `editor` et `admin`.
3. **Guards Angular et Routage dynamique** : Création d'un `RoleGuard` interdisant l'accès aux routes de gestion (`/dashboard`, `/collaborateurs`, `/reconciliation`, `/audit`) pour les `viewer`. Redirection racine par défaut vers `/mensuel` pour les `viewer`.
4. **Filtrage réactif de la navigation** : La barre latérale (`SidebarComponent`) adapte la liste des éléments de menu selon le rôle actif de l'utilisateur.
5. **Mode Lecture Seule dans les Vues** : Désactivation des événements d'édition (clic cellule calendrier, boutons de modification) pour les `viewer`.

## Consequences
- **Positives** :
  - Sécurité étanche : aucune possibilité d'auto-promotion de privilèges ni de contournement de l'interface grâce à la combinaison trigger DB + RLS PostgreSQL.
  - Expérience utilisateur épurée et ciblée pour les collaborateurs en consultation.
  - Attribution automatique `viewer` par défaut facilitant l'onboarding interne en toute sécurité et sans risque de comptes orphelins.
  - Flexibilité pour promouvoir manuellement des utilisateurs vers `editor` ou `admin`.
- **Négatives / Précautions** :
  - Nécessite d'exécuter la migration SQL Supabase correspondante pour créer la table de profil, le trigger et les politiques RLS.
  - Les tests unitaires et e2e devront couvrir les différents rôles.
