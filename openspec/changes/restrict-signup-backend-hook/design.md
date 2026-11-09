## Context

L'application CrewDayz et l'application Roadmap partagent la même instance Supabase Cloud de production (`https://jfafunxtgkjyezrqouyc.supabase.co`). Dans cette infrastructure, la table `auth.users` est un annuaire d'identité partagé.
L'ADR 0004 avait mis en place une validation par expressions régulières et fichiers d'environnement côté client (`SignupComponent`, `validateSignupEmail`), en anticipant expressément qu'un renforcement côté base de données (PostgreSQL Auth Hook) pourrait être déployé ultérieurement.

La recommandation de sécurité SEC-03 a mis en exergue deux limites critiques :
1. L'absence de barrière serveur lors d'appels directs à l'API Supabase (`curl`).
2. Le contournement possible via Google OAuth (où un compte Google quelconque recevait un token de session sans validation de domaine).

## Goals / Non-Goals

**Goals :**
- Verrouiller de manière absolue la création de compte au niveau de PostgreSQL via un Auth Hook Supabase (`before-user-created`).
- Intercepter à la fois les inscriptions par e-mail/mot de passe et les premiers flux Google OAuth.
- Supporter les règles par domaine d'entreprise (`@ca-titres.fr`) ET les exceptions individuelles d'e-mails (comptes VIP Google, prestataires ciblés).
- Fournir un mode permissif automatique si aucune règle n'est active (préservation du dev local et de la CI).
- Centraliser les règles dans une table de base de données dédiée pour une administration à chaud sans redéploiement frontend.
- Rendre les deux applications (Crewdayz et Roadmap) autonomes tout en bénéficiant de cette sécurité partagée.

**Non-Goals :**
- Gérer les permissions et droits applicatifs métier au sein du Auth Hook : le Hook n'est qu'un filtre d'entrée organisationnel ("Passeport"). L'attribution des rôles (`viewer`, `collaborator`, `admin`) et l'accès aux données continuent d'être régis par les schémas métier et politiques RLS applicatives de Crewdayz (`cd_*`) et de Roadmap (`rm_*`).
- Remplacer Supabase Auth par un IDP tiers (Clerk, Auth0).

## Decisions

### Décision 1 : Modèle "Passeport vs Visa" (Option A - Retenue)
- **Rationale :** Dans une organisation d'entreprise, l'identité (qui a le droit d'avoir un compte) est transverse, tandis que l'accès aux fonctionnalités est local à chaque application.
  - *Niveau 1 (Passeport) :* Table `app_auth.allowed_rules` + Hook PostgreSQL `public.hook_validate_signup` déclenché sur `before-user-created`.
  - *Niveau 2 (Visa) :* Tables de profils et rôles métier de chaque application (`crewdayz.cd_user_roles`, `roadmap.profiles`) protégées par RLS.
- **Alternatives étudiées :**
  - *Option B (Deux instances Supabase séparées) :* Offre un cloisonnement strict mais supprime le SSO, double les frais et impose une double gestion de configuration Google OAuth.
  - *Option C (IDP externe Clerk / Auth0) :* Offre une interface graphique tierce mais complique drastiquement le modèle de sécurité en imposant une conversion complexe des jetons JWT pour Supabase RLS, avec un coût par utilisateur actif (MAU).
  - *Filtrage applicatif par `app_scope` dans le Hook :* Rejeté car le Hook `before-user-created` ne s'exécute qu'une seule fois à l'inscription. Un utilisateur inscrit pour une app posséderait déjà un compte dans `auth.users` et pourrait s'authentifier sur l'autre app lors des sessions suivantes sans repasser par le hook.

### Décision 2 : Table unifiée `app_auth.allowed_rules` (Domaines + Exceptions d'e-mails)
- **Structure SQL :**
  ```sql
  CREATE SCHEMA IF NOT EXISTS app_auth;

  CREATE TABLE IF NOT EXISTS app_auth.allowed_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_type text NOT NULL CHECK (rule_type IN ('domain', 'email')),
      value text NOT NULL UNIQUE, -- ex: 'ca-titres.fr' ou 'admin.perso@gmail.com'
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now()
  );
  ```
- **Politique RLS :**
  - Lecture publique (`anon`, `authenticated`) pour permettre au frontend d'adapter ses formulaires et messages d'erreur.
  - Écriture réservée aux super-administrateurs / `service_role`.

### Décision 3 : Hook PostgreSQL auto-adaptatif (Permissif par défaut)
- La fonction PostgreSQL vérifie la présence de règles actives (`is_active = true`).
- Si la table est vide, la fonction renvoie l'événement sans lever d'exception (`RETURN event;`). Cela garantit que les environnements locaux de développement ou les tests automatisés ne nécessitent aucun paramétrage complexe.
- Si des règles existent, l'e-mail de l'événement (`event->'user'->>'email'`) est testé :
  1. Correspondance exacte d'e-mail (`rule_type = 'email' AND lower(value) = v_email`).
  2. Correspondance du domaine (`rule_type = 'domain' AND lower(value) = v_domain`).
- En cas d'échec, une exception `RAISE EXCEPTION` avec code `P0001` et message JSON structuré bloque la création du compte.

### Décision 4 : Service Angular `AuthConfigService` avec fallback
- Un service Angular `AuthConfigService` interroge `app_auth.allowed_rules` au démarrage.
- En cas d'échec réseau ou si la table n'est pas encore migrée, le service utilise en repli direct les valeurs déclarées dans `environment.allowedEmailDomains`.
- Les signaux réactifs (`allowedDomains()`, `isAllowedEmail()`, `emailPlaceholder()`) alimentent les composants d'authentification (`SignupComponent`, etc.).

## Risks / Trade-offs

- **[Risque : Cache ou latence de lecture frontend]** → *Mitigation :* Le frontend effectue une pré-validation UX rapide avec les données en cache/fallback, mais le véritable garde-fou infalsifiable s'exécute sur le serveur PostgreSQL à la milliseconde près.
- **[Risque : Dépendance partagée entre Crewdayz et Roadmap]** → *Mitigation :* La table vit dans un schéma partagé `app_auth` ou dans `public`. Si Roadmap ou Crewdayz a besoin d'isoler ses environnements ultérieurement, la migration vers des instances distinctes restera triviale car le script de migration est modulaire et indépendant des données métier.
- **[Risque : Blocage accidentel d'un administrateur avec compte personnel]** → *Mitigation :* Support natif des règles de type `email` dans la table, permettant d'ajouter immédiatement n'importe quelle adresse e-mail d'exception sans ouvrir le domaine complet.

## Migration Plan

1. **Phase 1 (Base de données) :** Exécuter le script de migration SQL créant le schéma `app_auth`, la table `allowed_rules` et le trigger/hook `hook_validate_signup`.
2. **Phase 2 (Configuration Supabase) :** Activer le Auth Hook dans le tableau de bord Supabase (Authentication → Hooks → "Before User Created" pointant vers `public.hook_validate_signup`).
3. **Phase 3 (Peuplement initial) :** Insérer les domaines de production (`ca-titres.fr`) et les éventuels comptes e-mails d'exception (ex: compte Google de test).
4. **Phase 4 (Frontend Angular) :** Déployer le service `AuthConfigService` et relier les composants d'authentification.
5. **Rollback Strategy :** Si un incident survient, désactiver le Auth Hook dans le tableau de bord Supabase ou vider les règles actives (`UPDATE app_auth.allowed_rules SET is_active = false`), ce qui rétablit immédiatement le mode permissif automatique.

## Open Questions

- *Gestion de la notification utilisateur sur Google OAuth :* Lorsque Google OAuth est rejeté par le Hook Supabase, Supabase redirige l'utilisateur vers l'URL de retour avec un fragment d'erreur (`#error=access_denied&error_description=...`). Le frontend Angular devra intercepter ces paramètres pour afficher un toast explicite plutôt qu'une page blanche.
