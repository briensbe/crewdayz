## MODIFIED Requirements

### Requirement: Configuration des domaines d'e-mails autorisés dans l'environnement
L'application DOIT maintenir la propriété `allowedEmailDomains` dans les fichiers d'environnement (`src/environments/environment.ts` et `src/environments/environment.prod.ts`) comme configuration de repli (fallback), tout en privilégiant dynamiquement les règles d'accès actives interrogées depuis la base de données Supabase.

#### Scenario: Configuration avec un ou plusieurs domaines autorisés
- **WHEN** la source de configuration (base de données ou repli environnement) contient une liste de domaines (ex: `['ca-titres.fr', 'soprasteria.com']`)
- **THEN** seules les adresses e-mail se terminant par `@` suivi d'un des domaines listés sont considérées comme valides pour l'inscription standard

#### Scenario: Configuration non restrictive ou liste vide
- **WHEN** aucune règle active de domaine ou d'e-mail n'est présente en base de données et que `allowedEmailDomains` est vide (`[]`)
- **THEN** aucune restriction n'est appliquée et le système fonctionne en mode permissif automatique pour l'environnement de développement ou de test

### Requirement: Validation du domaine d'adresse e-mail lors de la création de compte
Le composant d'inscription `SignupComponent`, le service d'authentification `SupabaseService` ET la base de données PostgreSQL via un Auth Hook Supabase DOIVENT valider que l'adresse e-mail fournie correspond soit à un domaine autorisé, soit à une adresse e-mail d'exception explicite (insensible à la casse) avant d'enregistrer l'utilisateur ou de lui délivrer une session.

#### Scenario: Inscription réussie avec une adresse du domaine autorisé
- **WHEN** l'utilisateur soumet le formulaire d'inscription avec une adresse e-mail valide appartenant à un domaine autorisé (ex: `jean.dupont@ca-titres.fr`)
- **THEN** la validation frontend réussit, le Auth Hook PostgreSQL valide l'adresse et le compte est créé dans Supabase

#### Scenario: Inscription avec respect de l'insensibilité à la casse
- **WHEN** l'utilisateur saisit une adresse e-mail contenant des majuscules (ex: `Jean.Dupont@CA-TITRES.FR`)
- **THEN** l'adresse et le domaine sont normalisés en minuscules et validés avec succès côté client et côté serveur

#### Scenario: Tentative d'inscription avec un domaine non autorisé
- **WHEN** un utilisateur soumet le formulaire d'inscription avec une adresse e-mail non autorisée (ex: `inconnu@gmail.com`)
- **THEN** la soumission est bloquée par l'interface utilisateur avec affichage d'un message d'erreur clair

#### Scenario: Tentative de contournement par sous-domaine ou nom partiel
- **WHEN** un utilisateur soumet une adresse avec un domaine contenant le nom autorisé sans correspondance exacte (ex: `user@faux-ca-titres.fr` ou `user@ca-titres.fr.attacker.com`)
- **THEN** la validation échoue au niveau frontend et au niveau de l'Auth Hook PostgreSQL, bloquant la création de compte

## ADDED Requirements

### Requirement: Verrouillage serveur via Supabase Auth Hook et blocage Google OAuth
La base de données PostgreSQL DOIT exécuter un Hook d'authentification déclenché avant la création de tout utilisateur (`before-user-created`), interceptant aussi bien les créations de compte par mot de passe que les authentifications par fournisseur externe (Google OAuth).

#### Scenario: Tentative de contournement direct via l'API Supabase
- **WHEN** un tiers non autorisé envoie une requête directe à l'API Supabase (`curl /auth/v1/signup`) avec une adresse e-mail hors domaine autorisé
- **THEN** l'Auth Hook PostgreSQL intercepte la transaction, lève une exception d'accès refusé et aucune ligne n'est créée dans `auth.users`

#### Scenario: Connexion Google OAuth avec un compte non autorisé
- **WHEN** un utilisateur initie une connexion Google OAuth avec un compte non autorisé (ex: compte personnel Google non listé)
- **THEN** Google valide l'identité mais l'Auth Hook PostgreSQL rejette la création de l'utilisateur, empêchant l'obtention d'une session valide

#### Scenario: Connexion Google OAuth ou inscription avec un e-mail d'exception VIP
- **WHEN** un utilisateur se connecte avec une adresse e-mail enregistrée comme exception individuelle active dans `app_auth.allowed_rules` (ex: `admin.perso@gmail.com`)
- **THEN** l'Auth Hook PostgreSQL valide la création du compte même si le domaine global `@gmail.com` n'est pas autorisé

### Requirement: Source unique de vérité dynamique et mode permissif en local
Les règles d'accès DOIVENT être stockées dans une table de base de données dédiée (`app_auth.allowed_rules`), administrable sans redéploiement d'application et offrant un mode permissif automatique si aucune règle n'est active.

#### Scenario: Mise à jour immédiate d'un domaine autorisé
- **WHEN** un administrateur ajoute un nouveau domaine actif dans `app_auth.allowed_rules` via Supabase Studio
- **THEN** le Auth Hook accepte immédiatement ce domaine pour toute nouvelle inscription sans nécessiter de recompilation ou de redéploiement applicatif

#### Scenario: Mode permissif automatique en environnement local ou de test
- **WHEN** la table `app_auth.allowed_rules` ne contient aucune règle active (ex: base locale vierge)
- **THEN** l'Auth Hook autorise automatiquement toute création de compte afin de ne pas bloquer les développeurs et les suites de tests automatisées
