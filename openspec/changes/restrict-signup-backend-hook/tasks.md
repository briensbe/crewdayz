## 1. Migration SQL & Sécurité Base de Données

- [x] 1.1 Créer le script de migration SQL `supabase/scripts/0003_auth_allowed_rules_and_hook.sql` définissant le schéma `app_auth`, la table `allowed_rules` (`rule_type`, `value`, `is_active`, `description`) et les politiques RLS associées.
- [x] 1.2 Implémenter la fonction SQL `public.hook_validate_signup(event jsonb)` gérant le mode permissif automatique (si table vide), la validation insensible à la casse des domaines et des exceptions e-mails, ainsi que l'interception de Google OAuth.
- [x] 1.3 Rédiger la documentation pas-à-pas pour l'activation du Hook d'authentification Supabase (`before-user-created`) dans le tableau de bord Supabase Cloud.

## 2. Service Angular & Configuration Dynamique

- [x] 2.1 Créer le service injectable `AuthConfigService` (`src/app/services/auth-config.service.ts`) pour récupérer les règles d'accès actives depuis Supabase avec repli robuste sur `environment.allowedEmailDomains`.
- [x] 2.2 Exposer dans `AuthConfigService` les signaux et méthodes de validation (`allowedDomains`, `allowedEmails`, `isEmailAllowed(email)`, `emailPlaceholder`).
- [x] 2.3 Rédiger la suite de tests unitaires pour `AuthConfigService` (`auth-config.service.spec.ts`) couvrant le chargement normal, l'erreur réseau avec fallback, et le mode permissif.

## 3. Intégration dans l'Application Angular

- [x] 3.1 Mettre à jour `SupabaseService` (`src/app/services/supabase.service.ts`) pour utiliser la validation dynamique de `AuthConfigService` lors de l'appel `signUpWithEmail`.
- [x] 3.2 Intercepter les retours d'erreurs d'authentification OAuth (notamment le code `access_denied` renvoyé lors d'un blocage par le Hook Supabase) dans `SupabaseService` et notifier l'utilisateur.
- [x] 3.3 Mettre à jour `SignupComponent` (`src/app/auth/signup/`) pour lier le placeholder, la validation en direct et les messages d'erreur au service dynamique.
- [x] 3.4 Aligner les composants `LoginComponent`, `ForgotPasswordComponent` et `ResetPasswordComponent` pour consommer le placeholder dynamique de `AuthConfigService`.

## 4. Tests & Vérification

- [x] 4.1 Mettre à jour les tests unitaires existants de `SignupComponent` et `LoginComponent` pour mocker `AuthConfigService`.
- [x] 4.2 Exécuter l'ensemble des tests unitaires (`pnpm test`) et vérifier la couverture du nouveau flux d'authentification.
- [x] 4.3 Compiler le projet via `pnpm build` pour valider l'absence de toute régression de typage ou de compilation.
