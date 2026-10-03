## Why

Actuellement, le formulaire `UpdatePasswordComponent` remplit deux rôles distincts (modification de mot de passe par un utilisateur connecté et réinitialisation de mot de passe oublié) via un composant unique s'appuyant sur des états conditionnels et un paramètre d'URL `?mode=change`. Cette approche complexifie la maintenance, nuit à la lisibilité du code et crée une ambiguïté dans la protection des routes. Séparer ces deux usages en formulaires autonomes clarifie le routage, renforce la sécurité et simplifie la logique métier.

## What Changes

- **Mise à jour dédiée du mot de passe connecté (`/update-password`)** : Refactorisation de `UpdatePasswordComponent` pour le dédier exclusivement aux utilisateurs authentifiés, sous `AuthGuard`. Le formulaire requiert systématiquement la saisie du mot de passe actuel, du nouveau mot de passe et de sa confirmation, sans dépendre d'un paramètre d'URL `mode`.
- **Création du formulaire de réinitialisation (`/reset-password`)** : Création d'un composant standalone `ResetPasswordComponent` dédié à la réinitialisation suite à un oubli de mot de passe (flux de récupération Supabase Auth).
- **Mise à jour des flux de redirection Supabase** : Configuration de `SupabaseService` pour router les flux de récupération de mot de passe (événements `PASSWORD_RECOVERY` et échanges PKCE) vers `/reset-password` au lieu de `/update-password`.
- **Mise à jour du routage** : Positionnement de `/update-password` sous `AuthGuard` et enregistrement de `/reset-password` comme route publique dans `app.routes.ts` et `app.ts`.
- **Nettoyage du profil** : Suppression du query param `mode=change` lors de la navigation depuis `ProfileComponent`.

## Capabilities

### New Capabilities
- `password-management`: Gestion scindée de la mise à jour de mot de passe pour utilisateur connecté et de la réinitialisation suite à mot de passe oublié.

### Modified Capabilities
<!-- Aucune modification de spec existante requise -->

## Impact

- **Composants modifiés** : `src/app/auth/update-password/` (refactorisé), `src/app/auth/profile/` (navigation nettoyée), `src/app/app.ts` (routes publiques).
- **Nouveaux composants** : `src/app/auth/reset-password/` (HTML, CSS, TS).
- **Services modifiés** : `src/app/services/supabase.service.ts` (redirections de recovery).
- **Routage** : `src/app/app.routes.ts`.
- **Configuration Supabase** : L'URL de redirection de recovery pointe désormais vers `/reset-password`.
