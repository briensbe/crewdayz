## Context

L'application CrewDayz gère les plannings d'équipes et les absences de collaborateurs sur un déploiement web accessible sur internet. Actuellement, une fois authentifié, tout utilisateur bénéficie d'un accès complet à toutes les vues et à toutes les fonctionnalités d'écriture.

Pour répondre aux besoins de partage interne sans compromettre l'intégrité des plannings RH, nous introduisons un système de contrôle d'accès basé sur les rôles (RBAC) avec attribution par défaut du rôle `viewer`.

## Goals / Non-Goals

**Goals:**
- Attribuer automatiquement le rôle `viewer` à tout nouvel utilisateur authentifié.
- Restreindre l'accès de navigation aux seules vues autorisées pour les viewers (`/mensuel`, `/annuel`, `/profile`).
- Rediriger automatiquement les viewers vers `/mensuel` dès la connexion ou l'accès à la racine `/`.
- Désactiver les interactions d'édition dans les composants de vue (`MonthlyViewComponent`, `AnnualViewComponent`).
- Sécuriser l'accès aux données côté Supabase / PostgreSQL via des politiques Row Level Security (RLS).
- Permettre à un administrateur de modifier manuellement le rôle d'un utilisateur (ex: promotion vers `editor` ou `admin`).

**Non-Goals:**
- Mettre en place une interface complexe de gestion fine de permissions par granularité de bouton (un modèle à 3 rôles `viewer` / `editor` / `admin` est suffisant).
- Gérer le multi-organisation / multi-tenant dans cette version.

## Decisions

### 1. Modèle de données de profil & rôles dans Supabase
- **Décision** : Utiliser une table `crewdayz.user_profiles` (ou `user_roles`) liée à `auth.users.id`, avec une colonne `role` typée en enum ou text (`viewer`, `editor`, `admin`), avec valeur par défaut `viewer`.
- **Mécanisme de création automatique (Trigger PostgreSQL)** : Un trigger PostgreSQL `AFTER INSERT ON auth.users` (exécuté en `SECURITY DEFINER`) insère automatiquement un enregistrement avec le rôle `viewer` par défaut dès qu'un compte est créé.
- **Pourquoi un trigger plutôt qu'un insert Angular ?**
  1. *Sécurité & Anti-escalade de privilèges* : La table des rôles reste en lecture seule pour les utilisateurs (`INSERT`/`UPDATE` interdits depuis le client). Cela empêche qu'un utilisateur n'injecte `{ role: 'admin' }` depuis les outils de dev du navigateur.
  2. *Atomicité et résilience OAuth Google* : Garantit la création immédiate du profil même en cas d'interruption réseau ou de fermeture d'onglet pendant le flux OAuth.
  3. *Source unique de vérité* : Fonctionne de manière homogène pour tout mode d'inscription (OAuth, email/mot de passe, console Supabase).
- **Alternatives rejetées** : 
  - Stocker le rôle uniquement dans `user_metadata` Supabase (rejeté car non sécurisé pour les politiques RLS SQL sans vérification complexe).
  - Effectuer l'insertion depuis l'application Angular (rejeté pour raisons de sécurité et de robustesse).

### 2. Exposition réactive du rôle dans Angular
- **Décision** : Dans `SupabaseService` (ou un `AuthService` dédié), charger le profil utilisateur au login et exposer des signaux Angular :
  - `userRole = signal<'viewer' | 'editor' | 'admin' | null>(null)`
  - `isReadOnly = computed(() => this.userRole() === 'viewer')`
- **Rationale** : Utilisation des signaux Angular natifs conformément aux conventions du projet, facilitant la réactivité dans les templates et la barre latérale.

### 3. Protection du routage (Guards & Redirection)
- **Décision** : Créer un guard fonctionnel `RoleGuard` (ou étendre `AuthGuard`) acceptant des données de route `data: { requiredRoles: ['editor', 'admin'] }`.
- Si un `viewer` tente d'accéder à `/dashboard`, `/collaborateurs`, `/reconciliation` ou `/audit`, le guard le redirige vers `/mensuel`.
- Redirection à la racine : un resolver ou guard racine redirige les `viewer` vers `/mensuel` et les autres rôles vers `/dashboard`.

### 4. Filtrage dynamique du menu latéral
- **Décision** : Adapter `SidebarComponent` pour filtrer `navigationItems` via une computed property basée sur le rôle actuel de l'utilisateur.

### 5. Verrouillage RLS PostgreSQL
- **Décision** : Mettre à jour les politiques RLS sur les tables `crewdayz.absences`, `crewdayz.collaborateurs`, `crewdayz.audit_logs`, etc. :
  - `SELECT` : Autorisé pour tous les utilisateurs authentifiés (`viewer`, `editor`, `admin`).
  - `INSERT` / `UPDATE` / `DELETE` : Restreint aux rôles `editor` et `admin` via une fonction helper SQL `is_editor_or_admin()`.

## Risks / Trade-offs

- **[Risque de désynchronisation entre rôle frontend et backend]** → Le rôle est vérifié à la fois dans Angular (UX/navigation) et dans Supabase RLS (sécurité stricte des données). Une modification directe des appels d'API par un utilisateur malveillant sera bloquée au niveau SQL.
- **[Délai de chargement du rôle au premier rendu]** → Maintien d'un état de chargement initial dans `RoleGuard` pour attendre la résolution du profil utilisateur avant d'effectuer les redirections de routage.
