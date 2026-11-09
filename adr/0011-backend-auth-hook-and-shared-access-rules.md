# ADR 0011: Sécurisation des Inscriptions par Trigger PostgreSQL Natif et Règles d'Accès Partagées

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

### Option A (Retenue) : Source de Vérité en BDD + Trigger Natif PostgreSQL + Découplage "Passeport vs Visa"
- **Principe :** 
  - Une table partagée `app_auth.allowed_rules` stocke les domaines d'entreprise autorisés (`rule_type = 'domain'`) ainsi que les adresses e-mails individuelles d'exception (`rule_type = 'email'`).
  - Une vue `public.allowed_rules` (`WITH (security_invoker = true)`) filtre strictement sur les domaines actifs, protégeant la confidentialité des e-mails VIP contre toute énumération via l'API publique.
  - Un Trigger natif PostgreSQL (`BEFORE INSERT ON auth.users`) exécutant la fonction `public.trigger_validate_signup()` (`SECURITY DEFINER`) intercepte chaque tentative de création de compte (mot de passe ET premier login Google OAuth) avant toute écriture en base.
  - Mode permissif auto-adaptatif : si aucune règle active n'est enregistrée en base (ex: dev local, CI), toutes les inscriptions sont acceptées par défaut.
  - Séparation conceptuelle stricte :
    - *Le Passeport (Niveau Identité globale) :* Le Trigger vérifie si la personne a le droit d'appartenir à l'annuaire d'entreprise.
    - *Le Visa (Niveau Applicatif) :* Chaque application gère indépendamment ses permissions, ses rôles et ses données via ses schémas PostgreSQL dédiés (`crewdayz.*` vs `roadmap.*`) protégés par Row Level Security (RLS).
- **Pourquoi le Trigger natif plutôt que le GoTrue Auth Hook HTTP / Beta ?**
  - L'Auth Hook GoTrue est actuellement en Beta, absent du Studio Supabase local (Docker) et non déclarable via de simples migrations SQL portables.
  - Le Trigger natif PostgreSQL est 100% portable, transactionnellement atomique (ACID, aucun risque de timeout réseau ou d'incohérence), appliqué automatiquement par `supabase migration up` et fonctionne identiquement en local, CI et production.
- **Avantages :** 
  - Sécurité absolue et inviolable au niveau de la base de données.
  - Prise en charge native et immédiate de Google OAuth avec comptes VIP autorisés.
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
  - **Complexité disproportionnée :** Le Trigger PostgreSQL natif réalise le même travail de sécurisation en moins de 60 lignes de code SQL nativement intégrées.

### Option Rejetée Spécifique : Filtrage par application (`app_scope`) au niveau de l'inscription
- **Principe :** Tenter de filtrer lors de la création du compte si un utilisateur s'inscrit pour Crewdayz ou pour Roadmap via un paramètre de métadonnées.
- **Raison du rejet :** La création du compte ne s'exécute qu'une seule fois, lors de la création initiale dans `auth.users`. Si un utilisateur est créé via Roadmap, son compte existerait déjà ; lors de sa connexion ultérieure sur Crewdayz, le trigger de création ne se déclencherait plus. Le contrôle par application doit obligatoirement relever des profils/rôles applicatifs et de la RLS de chaque schéma ("Le Visa"), et non de l'inscription globale ("Le Passeport").

## Decision

Nous adoptons **l'Option A** :
1. **Table de règles unifiée & Vue sécurisée :** Création du schéma `app_auth`, de la table `allowed_rules` et de la vue publique `public.allowed_rules` (`rule_type = 'domain'`).
2. **Trigger de sécurité PostgreSQL :** Fonction `public.trigger_validate_signup()` déclenchée en `BEFORE INSERT ON auth.users`, bloquant les inscriptions illicites et les comptes Google OAuth non autorisés avec le message : *"Veuillez utiliser votre adresse professionnelle autorisee."*.
3. **Mode permissif par défaut :** Autorisation automatique sans configuration si la table est vide.
4. **Service Angular dynamique :** `AuthConfigService` chargeant les règles actives avec repli sur `environment.allowedEmailDomains` pour la pré-validation UX.

## Consequences

- **Positives :**
  - Correction définitive de la vulnérabilité SEC-03 : impossible de contourner la restriction d'accès via `curl` ou Google OAuth.
  - Confidentialité garantie des exceptions e-mails individuelles (invisibles sur l'API publique).
  - Possibilité d'autoriser des comptes Google individuels d'exception (ex: compte administrateur perso `@gmail.com`) sans ouvrir la porte à l'intégralité du domaine `@gmail.com`.
  - Administration instantanée via Supabase Studio sans recompilation ni redéploiement d'application.
  - Préservation du SSO naturel et de l'indépendance des schémas de données de Crewdayz et de Roadmap.
  - Les environnements locaux et CI restent 100% fonctionnels sans aucune étape manuelle.
- **Négatives / Précautions :**
  - En production, la table doit contenir au moins une règle active dès le déploiement pour basculer du mode permissif vers le mode verrouillé strict.
  - Les utilisateurs non autorisés tentant de se connecter avec Google sont redirigés avec un code d'erreur `access_denied` qui est géré proprement par l'UI pour afficher un message clair.
