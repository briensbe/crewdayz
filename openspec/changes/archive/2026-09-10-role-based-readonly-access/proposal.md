## Why

L'application RH CrewDayz est déployée sur le web public. Pour permettre aux collaborateurs de l'entreprise de consulter le planning sans risque de dégradation accidentelle ou malveillante des données, il est nécessaire d'introduire un profil de consultation par défaut en lecture seule ("Viewer") avec un accès restreint aux vues mensuelles et annuelles.

## What Changes

- **Attribution par défaut du rôle Viewer** : Tout nouvel utilisateur authentifié avec un email d'entreprise obtient automatiquement le rôle `viewer`.
- **Restriction des vues accessibles pour les Viewers** : Seules les vues Mensuelle (`/mensuel`), Annuelle (`/annuel`) et Mon Profil (`/profile`) sont accessibles et visibles dans le menu. Les vues d'administration et de gestion (`/dashboard`, `/collaborateurs`, `/reconciliation`, `/audit`) sont masquées et protégées par des guards.
- **Redirection par défaut adaptée** : Les utilisateurs avec le rôle `viewer` sont automatiquement redirigés vers `/mensuel` au lieu du tableau de bord.
- **Désactivation des actions de modification en UI** : Dans les vues mensuelle et annuelle, les interactions de création/modification/suppression d'absences et de collaborateurs sont désactivées pour les Viewers.
- **Sécurité RLS Supabase (Défense en profondeur)** : Verrouillage au niveau de la base de données PostgreSQL/Supabase pour n'autoriser que les requêtes `SELECT` aux utilisateurs ayant le rôle `viewer`.
- **Gestion et promotion des rôles** : Possibilité de promouvoir manuellement un utilisateur en rôle `editor` ou `admin`.

## Capabilities

### New Capabilities
- `role-based-access-control`: Définition des rôles applicatifs (`viewer`, `editor`, `admin`), contrôle d'accès aux routes, filtrage de la navigation et sécurisation des actions et données en lecture seule.

### Modified Capabilities

## Impact

- **Frontend Angular** : Nouveaux guards de rôle (`RoleGuard`), mise à jour du routage (`app.routes.ts`), mise à jour de la barre latérale (`SidebarComponent`), adaptation des composants de vue (`MonthlyViewComponent`, `AnnualViewComponent`).
- **Services** : Extension de `SupabaseService` et `AuthService` pour charger et exposer le rôle réactif du profil utilisateur.
- **Backend / Supabase** : Table de profils ou rôles utilisateurs (`crewdayz.user_roles` ou colonne `role`), politiques PostgreSQL RLS adaptées par rôle.
