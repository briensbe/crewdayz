## Why

Actuellement, la restriction des inscriptions définie par l'ADR 0004 repose uniquement sur une validation côté client Angular (`SignupComponent` et `SupabaseService.signUpWithEmail`). Cette implémentation présente une vulnérabilité critique de contournement (recommandation SEC-03) : un attaquant peut contourner le formulaire via un appel direct à l'API Supabase (`curl`) ou via la connexion Google OAuth (qui crée l'utilisateur dans `auth.users` sans passer par la validation frontend). De plus, modifier la liste des domaines autorisés nécessite aujourd'hui une recompilation et un redéploiement complet du frontend.

Cette proposition implémente l'Option A (Single Source of Truth en BDD + Trigger natif PostgreSQL `BEFORE INSERT ON auth.users`) pour verrouiller la création de compte au niveau de la base de données de manière dynamique et inviolable, tout en gérant les exceptions individuelles d'e-mails (comptes VIP Google OAuth), la confidentialité des adresses autorisées, et le mode permissif pour les environnements de développement local et CI.

## What Changes

- **Table de configuration d'accès en BDD (`app_auth.allowed_rules`)** : Création d'une table partagée stockant à la fois les domaines autorisés (`rule_type = 'domain'`) et les adresses e-mails individuelles d'exception (`rule_type = 'email'`) avec activation dynamique (`is_active = true`).
- **Vue publique et étanchéité (`public.allowed_rules`)** : Exposition sécurisée via PostgREST avec `WITH (security_invoker = true)` filtrant strictement les domaines actifs (`rule_type = 'domain'`), masquant ainsi les adresses e-mails VIP confidentielles de toute énumération publique.
- **Trigger PostgreSQL natif (`BEFORE INSERT ON auth.users`)** : Implémentation de la fonction `public.trigger_validate_signup()` (`SECURITY DEFINER`) déclenchée avant toute création dans `auth.users`, bloquant immédiatement les inscriptions directes et connexions Google OAuth non autorisées avec l'exception standardisée `P0001` : *"Veuillez utiliser votre adresse professionnelle autorisée."*.
- **Mode permissif auto-adaptatif** : Si aucune règle active n'est présente en BDD (ex: environnement local dev / CI), le Trigger autorise automatiquement toutes les créations de compte pour préserver la fluidité des tests.
- **Service Angular dynamique (`AuthConfigService`)** : Chargement des domaines autorisés depuis `client.schema('public').from('allowed_rules')` avec repli sur `environment.allowedEmailDomains` en cas d'indisponibilité réseau.
- **Mise à jour des formulaires d'authentification** : Les composants Angular (`SignupComponent`, `LoginComponent`, placeholders) consomment les règles dynamiques et affichent le message d'erreur standardisé.

## Capabilities

### New Capabilities
<!-- Aucune nouvelle capability majeure indépendante -->

### Modified Capabilities
- `email-domain-restriction` : Extension de la spécification pour intégrer la validation serveur via Trigger PostgreSQL natif, la protection contre l'énumération d'e-mails VIP, la source de vérité dynamique en base de données, le message d'erreur standardisé et le mode permissif automatique.

## Impact

- **Base de données / Supabase** : Scripts de migration SQL (`supabase/migrations/20261109100000_auth_allowed_rules_and_trigger_hook.sql` et `supabase/scripts/0003_auth_allowed_rules_and_hook.sql`) créant le schéma `app_auth`, la table `allowed_rules`, les privilèges d'accès, la vue publique `public.allowed_rules` et le Trigger natif `public.trigger_validate_signup()`.
- **Services Angular** : Création d'un service `src/app/services/auth-config.service.ts` interrogeant le schéma `public` et mise à jour de `src/app/services/supabase.service.ts` pour mapper les erreurs backend GoTrue.
- **Composants Angular** : Injection du service d'accès dynamique dans `src/app/auth/signup/signup.component.ts`, `login.component.ts`, `forgot-password.component.ts` et `reset-password.component.ts`.
- **Fichiers d'environnement** : Maintien de `environment.allowedEmailDomains` comme valeur de secours (fallback).
- **Architecture & ADRs** : Mise à jour de l'ADR 0011 formalisant le choix du Trigger natif plutôt que le Hook GoTrue expérimental et le découplage "Passeport vs Visa".
