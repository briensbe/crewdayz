## Context

L'application CrewDayz et l'application Roadmap partagent la même instance Supabase Cloud de production (`https://jfafunxtgkjyezrqouyc.supabase.co`). Dans cette infrastructure, la table `auth.users` est un annuaire d'identité partagé.
L'ADR 0004 avait mis en place une validation par expressions régulières et fichiers d'environnement côté client (`SignupComponent`, `validateSignupEmail`), en anticipant expressément qu'un renforcement côté base de données pourrait être déployé ultérieurement.

La recommandation de sécurité SEC-03 a mis en exergue deux limites critiques :
1. L'absence de barrière serveur lors d'appels directs à l'API Supabase (`curl`).
2. Le contournement possible via Google OAuth (où un compte Google quelconque recevait un token de session sans validation de domaine).

## Goals / Non-Goals

**Goals :**
- Verrouiller de manière absolue la création de compte au niveau de PostgreSQL via un Trigger natif `BEFORE INSERT ON auth.users`.
- Intercepter à la fois les inscriptions par e-mail/mot de passe et les flux Google OAuth.
- Supporter les règles par domaine d'entreprise (`@ca-titres.fr`) ET les exceptions individuelles d'e-mails (comptes VIP Google, prestataires ciblés).
- Protéger la confidentialité des e-mails VIP (invisibles de l'API PostgREST publique).
- Fournir un mode permissif automatique si aucune règle n'est active (préservation du dev local et de la CI).
- Centraliser les règles dans une table de base de données dédiée pour une administration à chaud sans redéploiement frontend.
- Standardiser le message d'erreur d'interception : *"Veuillez utiliser votre adresse professionnelle autorisée."*.

**Non-Goals :**
- Gérer les permissions et droits applicatifs métier au sein du Trigger d'inscription : le Trigger n'est qu'un filtre d'entrée organisationnel ("Passeport"). L'attribution des rôles (`viewer`, `collaborator`, `admin`) et l'accès aux données continuent d'être régis par les schémas métier et politiques RLS applicatives de Crewdayz (`cd_*`) et de Roadmap (`rm_*`) ("Le Visa").
- Dépendre de fonctionnalités expérimentales Supabase (ex: GoTrue Auth Hook HTTP ou UI Dashboard non disponible en local).
- Remplacer Supabase Auth par un IDP tiers (Clerk, Auth0).

## Decisions

### Décision 1 : Modèle "Passeport vs Visa" et Trigger PostgreSQL Natif
- **Rationale :** Dans une organisation d'entreprise, l'identité (qui a le droit d'avoir un compte) est transverse, tandis que l'accès aux fonctionnalités est local à chaque application.
  - *Niveau 1 (Passeport) :* Table `app_auth.allowed_rules` + Trigger natif PostgreSQL `BEFORE INSERT ON auth.users` exécutant `public.trigger_validate_signup()`.
  - *Niveau 2 (Visa) :* Tables de profils et rôles métier de chaque application (`crewdayz.cd_user_roles`, `roadmap.profiles`) protégées par RLS.
- **Pourquoi le Trigger natif plutôt que le GoTrue Auth Hook ?**
  - L'Auth Hook GoTrue est actuellement en Beta dans Supabase, absent de l'interface Supabase Studio locale (Docker) et exige une configuration manuelle hors migrations.
  - Le Trigger natif `BEFORE INSERT ON auth.users` s'applique de façon déterministe via les migrations standard (`supabase migration up`), garantit une atomicité ACID sans latence réseau et fonctionne de manière identique en local, en CI et en production.

### Décision 2 : Table unifiée `app_auth.allowed_rules` et Vue `public.allowed_rules`
- **Schéma et Table source :**
  ```sql
  CREATE SCHEMA IF NOT EXISTS app_auth;

  CREATE TABLE IF NOT EXISTS app_auth.allowed_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_type text NOT NULL CHECK (rule_type IN ('domain', 'email')),
      value text NOT NULL UNIQUE,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
  );
  ```
- **Politique de Sécurité et Droits d'Accès :**
  - `GRANT USAGE ON SCHEMA app_auth TO anon, authenticated, service_role;`
  - `REVOKE ALL ON app_auth.allowed_rules FROM anon, authenticated;`
  - `GRANT SELECT ON app_auth.allowed_rules TO anon, authenticated, service_role;`
  - `ALTER TABLE app_auth.allowed_rules ENABLE ROW LEVEL SECURITY;`
  - RLS sur la table limitant `SELECT` à `rule_type = 'domain' AND is_active = true`.
- **Double étanchéité via la vue publique :**
  - PostgREST n'exposant que le schéma `public` par défaut, une vue `public.allowed_rules` est créée avec `WITH (security_invoker = true)`.
  - La vue filtre explicitement `WHERE is_active = true AND rule_type = 'domain'`.
  - Ainsi, les e-mails VIP ne sont JAMAIS exposés à l'API publique et ne peuvent pas être énumérés par un attaquant.

### Décision 3 : Fonction Trigger auto-adaptative (`SECURITY DEFINER`)
- La fonction `public.trigger_validate_signup()` s'exécute avec les privilèges `SECURITY DEFINER` (droits `postgres`), lui permettant de lire les adresses e-mails VIP confidentielles dans `app_auth.allowed_rules`.
- **Protection anti-détournement :** `SET search_path = pg_catalog, pg_temp, app_auth, public` bloque toute attaque par injection de schéma.
- **Mode permissif automatique :** Si aucune règle active n'existe (`is_active = true`), le trigger retourne immédiatement `RETURN NEW;` sans bloquer les environnements de dev local ou CI.
- **Blocage strict :** Si des règles actives existent et que l'e-mail ou le domaine ne correspond pas, le trigger lève une exception `P0001` avec le message standardisé : `"Veuillez utiliser votre adresse professionnelle autorisee."`.

### Décision 4 : Service Angular `AuthConfigService` avec sélection explicite de schéma
- Comme `SupabaseService` configure par défaut `db: { schema: 'crewdayz' }`, `AuthConfigService` bascule explicitement sur `client.schema('public').from('allowed_rules')` pour interroger la vue sans déclencher l'erreur `PGRST205`.
- En cas d'échec ou en environnement hors ligne, repli transparent sur `environment.allowedEmailDomains`.
- Dans `SupabaseService`, l'erreur générique GoTrue `"Database error saving new user"` (HTTP 500) est interceptée et remappée vers le message utilisateur standardisé : *"Veuillez utiliser votre adresse professionnelle autorisée."*.

## Risks / Trade-offs

- **[Risque : Fail-open si table vide en production]** → *Mitigation :* Le script de migration doit être suivi immédiatement de l'insertion du domaine d'entreprise de production (`ca-titres.fr`). Dès qu'une règle active existe, le verrouillage devient strict (fail-closed).
- **[Risque : Énumération des e-mails VIP]** → *Mitigation :* Double verrouillage par vue filtrée et RLS interdisant tout accès public aux règles `rule_type = 'email'`.
- **[Risque : Dépendance partagée entre Crewdayz et Roadmap]** → *Mitigation :* Les règles vivent dans un schéma neutre `app_auth`. Le couplage reste minimal et indépendant des données métier respectives.

## Migration Plan

1. **Phase 1 (Base de données) :** Exécuter la migration `supabase/migrations/20261109100000_auth_allowed_rules_and_trigger_hook.sql` créant le schéma `app_auth`, la table `allowed_rules`, les permissions, la vue `public.allowed_rules` et le Trigger natif `public.trigger_validate_signup()`.
2. **Phase 2 (Peuplement initial) :** Insérer les domaines autorisés (`ca-titres.fr`, `yahoo.com`) et les éventuels e-mails VIP via Supabase Studio.
3. **Phase 3 (Frontend Angular) :** Déployer `AuthConfigService` et l'interception d'erreur dans `SupabaseService` et les composants d'authentification.
4. **Rollback Strategy :** Si un incident survient, supprimer le trigger (`DROP TRIGGER IF EXISTS on_auth_user_created_validate ON auth.users;`) ou désactiver les règles (`UPDATE app_auth.allowed_rules SET is_active = false;`), ce qui rétablit immédiatement le mode permissif automatique.
