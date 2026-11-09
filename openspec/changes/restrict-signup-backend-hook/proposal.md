## Why

Actuellement, la restriction des inscriptions définie par l'ADR 0004 repose uniquement sur une validation côté client Angular (`SignupComponent` et `SupabaseService.signUpWithEmail`). Cette implémentation présente une vulnérabilité critique de contournement (recommandation SEC-03) : un attaquant peut contourner le formulaire via un appel direct à l'API Supabase (`curl`) ou via la connexion Google OAuth (qui crée l'utilisateur dans `auth.users` sans passer par la validation frontend). De plus, modifier la liste des domaines autorisés nécessite aujourd'hui une recompilation et un redéploiement complet du frontend.

Cette proposition implémente l'Option A (Single Source of Truth en BDD + Supabase Auth Hook) pour verrouiller la création de compte au niveau de la base de données de manière dynamique, tout en gérant les exceptions individuelles d'e-mails (comptes VIP Google OAuth) et le mode permissif pour les environnements de développement local et CI.

## What Changes

- **Table de configuration d'accès en BDD (`app_auth.allowed_rules`)** : Création d'une table partagée stockant à la fois les domaines autorisés (`rule_type = 'domain'`) et les adresses e-mails individuelles d'exception (`rule_type = 'email'`) avec activation dynamique (`is_active = true`).
- **Hook d'authentification Supabase (`before-user-created`)** : Implémentation d'une fonction SQL déclenchée avant toute insertion dans `auth.users`, bloquant immédiatement les inscriptions et connexions Google OAuth non autorisées.
- **Mode permissif auto-adaptatif** : Si aucune règle active n'est présente en BDD (ex: environnement local dev / CI), le Hook autorise toutes les créations de compte pour préserver la fluidité des tests.
- **Service Angular dynamique (`AuthConfigService`)** : Chargement des règles autorisées depuis Supabase au démarrage de l'application avec repli sur `environment.allowedEmailDomains` en cas d'indisponibilité réseau.
- **Mise à jour des formulaires d'authentification** : Les composants Angular (`SignupComponent`, `LoginComponent`, placeholders) consomment les règles dynamiques issues du service centralisé.

## Capabilities

### New Capabilities
<!-- Aucune nouvelle capability majeure indépendante -->

### Modified Capabilities
- `email-domain-restriction` : Extension de la spécification pour intégrer la validation serveur via Hook PostgreSQL Supabase, le support des exceptions individuelles par adresse e-mail (OAuth Google / VIP), la source de vérité dynamique en base de données et le mode permissif automatique.

## Impact

- **Base de données / Supabase** : Nouveau script de migration SQL créant le schéma `app_auth`, la table `allowed_rules`, les politiques RLS et la fonction Hook `public.hook_validate_signup`. Configuration du Auth Hook dans Supabase.
- **Services Angular** : Création d'un service `src/app/services/auth-config.service.ts` et mise à jour de `src/app/services/supabase.service.ts`.
- **Composants Angular** : Injection du service d'accès dynamique dans `src/app/auth/signup/signup.component.ts`, `login.component.ts`, `forgot-password.component.ts` et `reset-password.component.ts`.
- **Fichiers d'environnement** : Maintien de `environment.allowedEmailDomains` comme valeur de secours (fallback).
- **Architecture & ADRs** : Création de l'ADR 0011 rendant obsolète (supersedes) l'ADR 0004 et documentant les alternatives étudiées (Option B - deux instances distinctes, Option C - solutions externes type Clerk/Auth0).
