## 1. Migration SQL & Sécurité Base de Données

- [x] 1.1 Créer le script de migration SQL `supabase/migrations/20261109100000_auth_allowed_rules_and_trigger_hook.sql` (et son reflet `supabase/scripts/0003_auth_allowed_rules_and_hook.sql`) définissant le schéma `app_auth`, la table `allowed_rules`, les permissions de sécurité et la politique RLS.
- [x] 1.2 Créer la vue publique `public.allowed_rules` avec `WITH (security_invoker = true)` filtrant strictement sur `rule_type = 'domain'` pour protéger la confidentialité des adresses e-mails VIP.
- [x] 1.3 Implémenter la fonction Trigger native `public.trigger_validate_signup()` (`SECURITY DEFINER`, `search_path` sécurisé) attachée en `BEFORE INSERT ON auth.users`, avec mode permissif automatique et levée de l'exception standardisée `P0001` : *"Veuillez utiliser votre adresse professionnelle autorisee."*.

## 2. Service Angular & Configuration Dynamique

- [x] 2.1 Créer le service injectable `AuthConfigService` (`src/app/services/auth-config.service.ts`) interrogeant explicitement `client.schema('public').from('allowed_rules')` avec repli robuste sur `environment.allowedEmailDomains`.
- [x] 2.2 Exposer dans `AuthConfigService` les signaux et méthodes de validation (`allowedDomains`, `allowedEmails`, `isEmailAllowed(email)`, `emailPlaceholder`).
- [x] 2.3 Rédiger la suite de tests unitaires pour `AuthConfigService` (`auth-config.service.spec.ts`) couvrant le chargement normal, l'erreur réseau avec fallback, et le mode permissif.

## 3. Intégration dans l'Application Angular

- [x] 3.1 Mettre à jour `SupabaseService` (`src/app/services/supabase.service.ts`) pour utiliser la validation dynamique de `AuthConfigService` et intercepter l'erreur 500 GoTrue (`"Database error saving new user"`) afin d'afficher *"Veuillez utiliser votre adresse professionnelle autorisée."*.
- [x] 3.2 Intercepter les retours d'erreurs d'authentification OAuth (notamment le code `access_denied` renvoyé lors d'un rejet par le Trigger) dans `SupabaseService` et notifier l'utilisateur.
- [x] 3.3 Mettre à jour `SignupComponent` (`src/app/auth/signup/`) pour lier le placeholder, la validation en direct et les messages d'erreur au service dynamique.
- [x] 3.4 Aligner les composants `LoginComponent`, `ForgotPasswordComponent` et `ResetPasswordComponent` pour consommer le placeholder dynamique de `AuthConfigService`.

## 4. Tests & Vérification

- [x] 4.1 Mettre à jour les tests unitaires existants (`email-validator.spec.ts`, `auth-config.service.spec.ts`) avec le nouveau message d'erreur standardisé.
- [x] 4.2 Exécuter l'ensemble des tests unitaires (`pnpm vitest run`) et vérifier le passage sans erreur (23/23 tests passés).
- [x] 4.3 Compiler le projet via `pnpm build` pour valider l'absence de toute régression de typage ou de compilation.
