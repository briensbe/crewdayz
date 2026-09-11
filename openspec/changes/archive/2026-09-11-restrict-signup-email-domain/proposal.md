## Why

Actuellement, le formulaire d'inscription permet à n'importe quel utilisateur de créer un compte avec n'importe quelle adresse e-mail valide. Afin de réserver l'accès à l'organisation et d'empêcher les inscriptions avec des adresses personnelles ou non autorisées, il est nécessaire de restreindre la création de compte aux seules adresses e-mail appartenant à un ou plusieurs domaines autorisés configurables.

## What Changes

- **Configuration des domaines autorisés** : Ajout d'un paramètre de configuration dans les fichiers d'environnement (`src/environments/environment.ts` et `src/environments/environment.prod.ts`) définissant le ou les domaines autorisés (ex: `allowedEmailDomains: ['mon-entreprise.com']` ou un domaine unique).
- **Validation du domaine à l'inscription** : Validation stricte de l'adresse e-mail saisie dans le formulaire d'inscription (`SignupComponent`) et dans le service d'authentification (`SupabaseService`) pour s'assurer que le suffixe du domaine correspond à un domaine autorisé.
- **Retour utilisateur clair** : Affichage d'un message d'erreur clair et explicite lorsque l'utilisateur tente de s'inscrire avec une adresse e-mail dont le domaine n'est pas autorisé.

## Capabilities

### New Capabilities
- `email-domain-restriction` : Définition des règles de restriction de domaine d'adresse e-mail pour l'inscription, incluant la configuration d'environnement, la validation syntaxique et métier, ainsi que les retours d'erreur utilisateur.

### Modified Capabilities
<!-- Aucune modification de spécification existante -->

## Impact

- **Configuration** : Fichiers d'environnement (`src/environments/environment.ts`, `src/environments/environment.prod.ts`).
- **Composants d'authentification** : `src/app/auth/signup/signup.component.ts` et `src/app/auth/signup/signup.component.html`.
- **Services** : `src/app/services/supabase.service.ts`.
- **Tests** : Tests unitaires associés aux composants et services d'authentification.
