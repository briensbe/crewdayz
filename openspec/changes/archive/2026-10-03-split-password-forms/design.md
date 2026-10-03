## Context

L'application CrewDayz utilise Supabase pour l'authentification. Jusqu'à présent, la mise à jour du mot de passe (changement volontaire par un utilisateur connecté) et la réinitialisation du mot de passe (suite à un email de mot de passe oublié) partageaient le même composant Angular `UpdatePasswordComponent` situé sur `/update-password`.
Ce partage imposait une détection par paramètre de requête (`?mode=change`), des variables d'état conditionnelles (`requiresCurrentPassword`, `isRecovery`) et créait une ambiguïté sur la protection par `AuthGuard`.

## Goals / Non-Goals

**Goals:**
- Scinder la gestion des mots de passe en deux composants autonomes et indépendants :
  1. `UpdatePasswordComponent` (`/update-password`) pour le changement de mot de passe par un utilisateur authentifié.
  2. `ResetPasswordComponent` (`/reset-password`) pour la réinitialisation suite à un lien de récupération Supabase.
- Supprimer toute dépendance au paramètre d'URL `mode` et aux états conditionnels mixtes.
- Protéger `/update-password` avec `AuthGuard` dans `src/app/app.routes.ts`.
- Configurer `/reset-password` en tant que route publique dans `src/app/app.ts` et `src/app/app.routes.ts`.
- Adapter `SupabaseService` pour router les événements et redirections de recovery vers `/reset-password`.

**Non-Goals:**
- Modifier la politique de complexité des mots de passe Supabase (longueur minimale de 6 caractères conservée).
- Modifier l'interface ou le formulaire de demande de mot de passe oublié (`ForgotPasswordComponent`).

## Decisions

### 1. Conservation de `/update-password` pour la mise à jour connectée
- **Décision** : Conserver le nom et la route `/update-password` sous `AuthGuard`, en nettoyant le composant existant de toute logique liée au recovery.
- **Raison** : Cohérence avec l'historique du projet et simplicité de migration pour la navigation depuis le profil.
- **Alternative considérée** : Renommer en `/change-password`. Rejeté pour privilégier la continuité du nommage demandé.

### 2. Création de `ResetPasswordComponent` sur `/reset-password`
- **Décision** : Créer un composant Angular autonome respectant la structure en 3 fichiers (`.html`, `.css`, `.ts`), avec les seuls champs nécessaires (`newPassword` et `confirmPassword`).
- **Raison** : Isolation totale de la logique de réinitialisation, sans demande d'ancien mot de passe.
- **Alternative considérée** : Conserver un formulaire dynamique partagé. Rejeté pour éliminer la complexité conditionnelle.

### 3. Redirection et écoute d'événements dans `SupabaseService`
- **Décision** : Mettre à jour `resetPasswordForEmail` (`redirectTo: authRedirectUrl + '/reset-password'`), l'écouteur `PASSWORD_RECOVERY` et le gestionnaire PKCE pour cibler `/reset-password`.
- **Raison** : Aligner les flux d'authentification Supabase avec la nouvelle route publique.

## Risks / Trade-offs

- **[Lien de réinitialisation déjà envoyé]** → Si un utilisateur clique sur un ancien lien de réinitialisation reçu avant le déploiement qui pointe vers `/update-password`, la redirection PKCE ou l'événement `PASSWORD_RECOVERY` de `SupabaseService` le redirigera automatiquement vers `/reset-password`.
- **[Configuration Redirect URLs Supabase]** → L'URL `https://<domaine>/reset-password` doit être autorisée dans la liste des Redirect URLs du tableau de bord Supabase Auth en production.

## Migration Plan

1. Mettre à jour `SupabaseService` pour cibler `/reset-password`.
2. Créer le composant `ResetPasswordComponent` (`src/app/auth/reset-password/`).
3. Refactoriser `UpdatePasswordComponent` (`src/app/auth/update-password/`) pour supprimer `mode`, `isRecovery`, etc.
4. Mettre à jour `app.routes.ts` et `app.ts`.
5. Mettre à jour `ProfileComponent` pour supprimer `queryParams: { mode: 'change' }`.

## OpenQuestions

- Aucune question ouverte restante.
