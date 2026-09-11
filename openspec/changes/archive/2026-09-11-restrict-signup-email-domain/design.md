## Context

L'application CrewDayz dispose d'une page d'inscription (`SignupComponent`) permettant aux utilisateurs de créer un compte avec leur nom, adresse e-mail et mot de passe via l'API Supabase Auth. Afin de limiter l'accès aux membres de l'organisation et d'éviter les inscriptions non désirées avec des adresses personnelles ou externes, il est nécessaire d'introduire un mécanisme de contrôle sur les domaines des adresses e-mail autorisées à la création de compte.

## Goals / Non-Goals

**Goals:**
- Configurer une liste de domaines e-mail autorisés dans les fichiers d'environnement (`src/environments/environment.ts` et `src/environments/environment.prod.ts`).
- Valider le domaine de l'adresse e-mail avant toute création de compte dans le formulaire d'inscription (`SignupComponent`) et dans la méthode `signUpWithEmail` de `SupabaseService`.
- Afficher un message d'erreur clair et contextualisé à l'utilisateur si son adresse e-mail n'appartient pas aux domaines autorisés.
- Permettre la configuration d'un ou plusieurs domaines (tableau `string[]`).
- Si aucun domaine n'est configuré (tableau vide ou absent), autoriser par défaut tous les domaines pour préserver la rétrocompatibilité des environnements de développement ouverts.

**Non-Goals:**
- Restreindre la connexion des comptes déjà existants : les utilisateurs déjà créés peuvent continuer à se connecter quel que soit leur domaine.
- Créer une interface d'administration dynamique des domaines en base de données (la gestion par configuration d'environnement suffit et reste immuable au déploiement).
- Restreindre la réinitialisation de mot de passe (`forgot-password`) pour les comptes déjà inscrits.

## Decisions

### 1. Configuration via les fichiers d'environnement (`allowedEmailDomains: string[]`)
- **Choix** : Ajouter un tableau `allowedEmailDomains: string[]` dans `src/environments/environment.ts` et `src/environments/environment.prod.ts`.
- **Raison** : Cohérence avec l'architecture existante (`enableAuth`, `enableGoogleAuth`, `authRedirectUrl`). Permet de configurer facilement des domaines différents en local, en test ou en production sans secret ni dépendance DB.
- **Alternatives considérées** :
  - *Chaîne unique (`allowedEmailDomain: string`)* : Moins flexible lorsqu'une organisation possède plusieurs domaines (ex: filiales, fusions ou domaines de transition).
  - *Table de configuration en base de données* : Introduirait une complexité inutile (requête réseau préalable, cache, RLS) pour une règle statique liée au déploiement.

### 2. Fonction utilitaire de validation de domaine d'e-mail
- **Choix** : Créer une fonction de validation dédiée (ex: `validateEmailDomain(email: string, allowedDomains: string[]): { isValid: boolean; error?: string }` ou `isAllowedEmailDomain(email: string, allowedDomains: string[]): boolean`) dans un module utilitaire (`src/app/utils/email-validator.ts` ou dans le service d'authentification).
- **Raison** : Isole la logique métier, garantit un traitement robuste (insensibilité à la casse via `toLowerCase()`, suppression des espaces via `trim()`, extraction précise du domaine après le `@`), et facilite l'écriture de tests unitaires exhaustifs.
- **Alternatives considérées** :
  - *Validation inline dans le composant* : Moins maintenable et impossible à réutiliser proprement dans `SupabaseService`.

### 3. Double validation défensive (Composant & Service)
- **Choix** :
  1. Validation dans `SignupComponent` lors de la soumission du formulaire, avec affichage d'un message explicite pour l'utilisateur.
  2. Validation dans `SupabaseService.signUpWithEmail` comme garde-fou programmatique avant l'appel à `supabase.auth.signUp`.
- **Raison** : Défense en profondeur au niveau applicatif Angular.

## Risks / Trade-offs

- **[Risque] Appel direct à l'API Supabase par contournement du front-end**
  - *Mitigation* : Pour l'application web Angular, la validation front-end bloque 100% des inscriptions via l'interface. Si un verrouillage strict au niveau du serveur Supabase s'avère nécessaire à terme, un hook PostgreSQL / Supabase Auth pourra être ajouté en complément.
- **[Risque] Mauvais formatage ou casse dans la saisie (ex: `User@MonDomaine.COM `)**
  - *Mitigation* : Normalisation systématique de l'e-mail (`trim().toLowerCase()`) avant comparaison avec la liste des domaines autorisés (eux-mêmes normalisés en minuscules sans `@` initial).
- **[Risque] Faux positifs / Faux négatifs sur les sous-domaines (ex: `user@evil-domaine.com` ou `user@sub.domaine.com`)**
  - *Mitigation* : L'extraction du domaine se base sur la sous-chaîne située après le dernier caractère `@` et compare par égalité exacte (ou correspondance stricte avec le domaine ou sous-domaine autorisé explicite).
