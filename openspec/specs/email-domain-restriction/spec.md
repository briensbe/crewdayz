## Purpose

Fournir un mécanisme de restriction et de validation des domaines des adresses e-mail autorisées lors de la création de compte (inscription) via les fichiers de configuration d'environnement.

## Requirements

### Requirement: Configuration des domaines d'e-mails autorisés dans l'environnement
L'application DOIT permettre de définir les domaines d'e-mails autorisés pour la création de compte via une propriété `allowedEmailDomains` (tableau de chaînes de caractères) dans les fichiers d'environnement (`src/environments/environment.ts` et `src/environments/environment.prod.ts`).

#### Scenario: Configuration avec un ou plusieurs domaines autorisés
- **WHEN** la propriété `allowedEmailDomains` contient une liste de domaines (ex: `['soprasteria.com', 'orange.com']`)
- **THEN** seules les adresses e-mail se terminant par `@` suivi d'un des domaines listés sont considérées comme valides pour l'inscription

#### Scenario: Configuration non restrictive ou liste vide
- **WHEN** la propriété `allowedEmailDomains` est absente, indéfinie ou vide (`[]`)
- **THEN** aucune restriction de domaine n'est appliquée et toute adresse e-mail valide est acceptée pour l'inscription

### Requirement: Validation du domaine d'adresse e-mail lors de la création de compte
Le composant d'inscription `SignupComponent` ainsi que le service d'authentification `SupabaseService` DOIVENT valider que l'adresse e-mail fournie se termine exactement par un domaine autorisé (insensible à la casse) avant de tenter d'enregistrer l'utilisateur via Supabase.

#### Scenario: Inscription réussie avec une adresse du domaine autorisé
- **WHEN** l'utilisateur soumet le formulaire d'inscription avec une adresse e-mail valide appartenant à un domaine autorisé (ex: `jean.dupont@entreprise.com` avec le domaine `entreprise.com`)
- **THEN** la validation réussit et la requête de création de compte `signUpWithEmail` est transmise au service d'authentification

#### Scenario: Inscription avec respect de l'insensibilité à la casse
- **WHEN** l'utilisateur saisit une adresse e-mail contenant des majuscules (ex: `Jean.Dupont@ENTREPRISE.COM`)
- **THEN** le domaine est normalisé en minuscules et validé avec succès contre les domaines autorisés

#### Scenario: Tentative d'inscription avec un domaine non autorisé
- **WHEN** l'utilisateur soumet le formulaire d'inscription avec une adresse e-mail dont le domaine n'est pas dans la liste autorisée (ex: `jean.dupont@gmail.com`)
- **THEN** la soumission est bloquée, aucun appel de création de compte n'est émis vers Supabase, et un message d'erreur est affiché à l'utilisateur

#### Scenario: Tentative de contournement par sous-domaine ou nom partiel
- **WHEN** l'utilisateur soumet une adresse avec un domaine contenant le nom autorisé sans correspondance exacte (ex: `user@faux-entreprise.com` ou `user@entreprise.com.attacker.com`)
- **THEN** la validation échoue et l'inscription est bloquée

### Requirement: Affichage des messages d'erreur et indication visuelle
L'interface d'inscription DOIT informer clairement l'utilisateur lorsque le domaine de son e-mail n'est pas autorisé, en précisant si nécessaire le ou les domaines acceptés.

#### Scenario: Affichage du message d'erreur explicite
- **WHEN** la validation de domaine échoue lors de la soumission du formulaire
- **THEN** le composant affiche un message d'alerte indiquant que seules les adresses e-mail appartenant aux domaines autorisés sont acceptées

#### Scenario: Disparition de l'erreur lors d'une nouvelle saisie
- **WHEN** l'utilisateur modifie son adresse e-mail et soumet à nouveau avec une adresse valide
- **THEN** le message d'erreur de domaine est effacé
