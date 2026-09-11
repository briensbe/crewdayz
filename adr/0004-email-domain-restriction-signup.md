# ADR 0004: Restriction des Domaines E-mail à l'Inscription

## Status
Accepted

## Date
2026-09-11

## Context
L'application CrewDayz est destinée à un usage interne ou organisationnel. Afin de restreindre les inscriptions de nouveaux utilisateurs aux membres de l'organisation et d'éviter la création de comptes non autorisés avec des adresses personnelles ou tierces, un contrôle sur les domaines des adresses e-mail doit être mis en place lors de l'inscription.

## Decision
Nous adoptons la stratégie suivante pour la restriction du domaine e-mail :
1. **Configuration déclarative par environnement** : Définition d'un tableau `allowedEmailDomains: string[]` dans `src/environments/environment.ts` et `src/environments/environment.prod.ts`. Si le tableau est vide ou non défini, aucune restriction n'est appliquée (mode permissif par défaut pour le développement).
2. **Utilitaire de validation dédié et normalisation** : Création d'une fonction de validation isolée normalisant les adresses (insensibilité à la casse, suppression des espaces) et extrayant strictement la portion de domaine après le `@` pour prévenir les contournements de sous-domaines.
3. **Double validation applicative** :
   - *Composant d'inscription (`SignupComponent`)* : Blocage avant soumission et affichage d'un message d'erreur explicite guidant l'utilisateur.
   - *Service Supabase (`SupabaseService.signUpWithEmail`)* : Garde-fou logique empêchant tout appel réseau de création de compte si l'e-mail n'est pas conforme aux domaines autorisés.

## Consequences
- **Positives** :
  - Empêche les inscriptions avec des adresses non autorisées directement depuis l'interface utilisateur.
  - Flexibilité pour supporter un ou plusieurs domaines autorisés selon les environnements (dev, prod).
  - Code facilement testable unitairement via la fonction de validation isolée.
- **Négatives / Précautions** :
  - Cette protection opère au niveau de l'application cliente ; si un verrouillage complet au niveau de l'infrastructure Supabase est requis ultérieurement, un trigger ou hook d'authentification PostgreSQL/Supabase pourra être configuré.
