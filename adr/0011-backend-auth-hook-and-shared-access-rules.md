# ADR 0011: Sécurisation des Inscriptions par Auth Hook Supabase et Règles d'Accès Partagées

## Status
accepted, supersedes ADR-0004

## Supersedes
ADR-0004

## Date
2026-11-09

## Context
L'ADR 0004 avait introduit la restriction des inscriptions de nouveaux utilisateurs par domaine e-mail via des règles déclaratives côté frontend Angular (`environment.allowedEmailDomains`).
L'audit de sécurité et le traitement de la recommandation SEC-03 ont mis en évidence deux limites majeures de cette approche :
1. **Contournement par API directe :** Un appel direct à l'API Supabase (`curl /auth/v1/signup`) contourne l'application Angular et crée l'utilisateur dans `auth.users`.
2. **Fuite Google OAuth :** Lorsqu'un utilisateur s'authentifie via Google OAuth, le flux crée le compte directement dans `auth.users` sans passer par le formulaire d'inscription ni la validation frontend.
3. **Rigidité de configuration :** Tout ajout de domaine (ex: prestataire ou partenaire) exigeait une recompilation et un redéploiement complet des applications clientes.

Par ailleurs, les applications **CrewDayz** et **Roadmap** partagent en production la même instance Supabase Cloud (`jfafunxtgkjyezrqouyc.supabase.co`) et donc le même annuaire d'utilisateurs (`auth.users`). La question de la mutualisation et du découplage des deux applications s'est posée avec acuité.

## Options Étudiées

### Option A (Retenue) : Source de Vérité en BDD + Hook Supabase Auth + Découplage "Passeport vs Visa"
- **Principe :** 
  - Une table partagée `app_auth.allowed_rules` stocke les domaines d'entreprise autorisés (`rule_type = 'domain'`) ainsi que les adresses e-mails individuelles d'exception (`rule_type = 'email'`).
  - Un Hook PostgreSQL Supabase (`before-user-created`) intercepte chaque tentative de création de compte (mot de passe ET premier login Google OAuth) avant toute insertion dans `auth.users`.
  - Mode permissif auto-adaptatif : si aucune règle active n'est enregistrée en base (ex: dev local, CI), toutes les inscriptions sont acceptées par défaut.
  - Séparation conceptuelle stricte :
    - *Le Passeport (Niveau Identité globale) :* Le Hook vérifie si la personne a le droit d'appartenir à l'annuaire d'entreprise.
    - *Le Visa (Niveau Applicatif) :* Chaque application gère indépendamment ses permissions, ses rôles et ses données via ses schémas PostgreSQL dédiés (`crewdayz.*` vs `roadmap.*`) protégés par Row Level Security (RLS).
- **Avantages :** 
  - Sécurité absolue et inviolable au niveau de la base de données.
  - Prise en charge native et immédiate de Google OAuth avec comptes VIP/développeurs autorisés.
  - Administration à chaud sans redéploiement via Supabase Studio.
  - Maintien du Single Sign-On (SSO) naturel entre Crewdayz et Roadmap avec une seule configuration Google Cloud Console.
  - Zéro coût financier supplémentaire.

### Option B (Rejetée) : Scission en deux instances Supabase totalement indépendantes
- **Principe :** Créer un projet Supabase Cloud dédié à CrewDayz et un autre dédié à Roadmap, chacun avec son propre annuaire `auth.users` et ses propres règles d'accès.
- **Avantages :** Étanchéité d'infrastructure absolue entre les applications ; possibilité de refuser un domaine pour une application dès l'inscription.
- **Inconvénients / Raison du rejet :**
  - Perte du SSO : les utilisateurs devraient gérer deux comptes et deux sessions distinctes.
  - Doublement des coûts d'hébergement et des quotas de projets Supabase.
  - Duplication de la configuration Google Cloud OAuth (deux Client IDs, deux Redirect URIs) et des migrations d'authentification.
  - Complexité inutile pour deux applications d'une même organisation interne.

### Option C (Rejetée) : Délégation à un Fournisseur d'Identité Tiers (Clerk, Auth0, Kinde)
- **Principe :** Remplacer Supabase Auth par un service d'authentification tiers proposant nativement une interface d'allowlist de domaines et de comptes OAuth.
- **Avantages :** Interface utilisateur clé en main, gestion native des organisations et restrictions de domaines en quelques clics.
- **Inconvénients / Raison du rejet :**
  - **Rupture avec Supabase RLS :** Nécessite une architecture de délégation de jetons JWT complexes (Third-Party Auth) pour signer les requêtes vers la base de données.
  - **Coût élevé et récurrent :** Facturation au nombre d'utilisateurs actifs mensuels (MAU) et surcoûts sur les fonctionnalités multi-applications.
  - **Complexité disproportionnée :** Le Hook PostgreSQL Supabase réalise le même travail de sécurisation en moins de 50 lignes de code SQL nativement intégrées.

### Option Rejetée Spécifique : Filtrage par application (`app_scope`) au niveau du Hook de Signup
- **Principe :** Tenter de filtrer dans le Hook `before-user-created` si un utilisateur s'inscrit pour Crewdayz ou pour Roadmap via un paramètre de métadonnées.
- **Raison du rejet :** Le Hook ne s'exécute qu'une seule fois, lors de la création initiale du compte dans `auth.users`. Si un utilisateur est créé via Roadmap, son compte existerait déjà ; lors de sa connexion ultérieure sur Crewdayz, le hook ne se déclencherait plus. Le contrôle par application doit obligatoirement relever des profils/rôles applicatifs et de la RLS de chaque schéma ("Le Visa"), et non de l'inscription globale ("Le Passeport").

## Decision

Nous adoptons **l'Option A** :
1. **Table de règles unifiée :** Création du schéma `app_auth` et de la table `allowed_rules` (gérant domaines et exceptions e-mails).
2. **Hook de sécurité PostgreSQL :** Fonction `public.hook_validate_signup` interceptant les événements `before-user-created` de Supabase Auth, bloquant les inscriptions illicites et les comptes Google OAuth non autorisés.
3. **Mode permissif par défaut :** Autorisation automatique sans configuration si la table est vide.
4. **Service Angular dynamique :** `AuthConfigService` chargeant les règles actives avec repli sur `environment.allowedEmailDomains` pour la pré-validation UX.

## Consequences

- **Positives :**
  - Correction définitive de la vulnérabilité SEC-03 : impossible de contourner la restriction d'accès via `curl` ou Google OAuth.
  - Possibilité d'autoriser des comptes Google individuels d'exception (ex: compte administrateur perso `@gmail.com`) sans ouvrir la porte à l'intégralité du domaine `@gmail.com`.
  - Administration instantanée via Supabase Studio sans recompilation ni redéploiement d'application.
  - Préservation du SSO naturel et de l'indépendance des schémas de données de Crewdayz et de Roadmap.
  - Les environnements locaux et CI restent 100% fonctionnels sans aucune étape manuelle.
- **Négatives / Précautions :**
  - Nécessite l'exécution d'une migration SQL et l'activation du Hook dans les paramètres Supabase Auth de production.
  - Les utilisateurs non autorisés tentant de se connecter avec Google sont redirigés avec un code d'erreur `access_denied` qui doit être géré proprement par l'UI pour afficher un message clair.
