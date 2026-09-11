## ADDED Requirements

### Requirement: Contrôle de l'activation de l'authentification Google via l'environnement
L'application DOIT exposer une propriété booléenne de configuration nommée `enableGoogleAuth` au sein des fichiers d'environnement (`environment.ts` et `environment.prod.ts`) permettant d'activer ou désactiver l'authentification Google OAuth.

#### Scenario: Authentification Google activée par configuration
- **WHEN** la propriété `enableGoogleAuth` est définie à `true` dans l'environnement actif
- **THEN** le fournisseur d'authentification Google est considéré comme disponible dans l'application

#### Scenario: Authentification Google désactivée par configuration
- **WHEN** la propriété `enableGoogleAuth` est définie à `false` dans l'environnement actif
- **THEN** le fournisseur d'authentification Google est considéré comme indisponible et désactivé dans l'application

### Requirement: Affichage conditionnel de l'option de connexion Google sur l'écran de connexion
Le composant de connexion `LoginComponent` DOIT adapter l'affichage du formulaire selon l'état du paramètre `enableGoogleAuth`.

#### Scenario: Masquage du bouton Google et du séparateur
- **WHEN** l'utilisateur accède à la page de connexion et que `enableGoogleAuth` vaut `false`
- **THEN** le bouton de connexion Google ainsi que le séparateur « ou continuer avec » NE SONT PAS affichés dans le DOM

#### Scenario: Affichage complet du bouton Google et du séparateur
- **WHEN** l'utilisateur accède à la page de connexion et que `enableGoogleAuth` vaut `true`
- **THEN** le bouton de connexion Google ainsi que le séparateur « ou continuer avec » SONT affichés sous le formulaire de connexion

### Requirement: Sécurisation contre l'exécution de l'authentification Google
L'application DOIT empêcher le déclenchement de la méthode de connexion Google OAuth lorsque la fonctionnalité est désactivée.

#### Scenario: Tentative d'appel lorsque Google Auth est désactivé
- **WHEN** la méthode `signInWithGoogle` est appelée alors que `enableGoogleAuth` vaut `false`
- **THEN** l'appel vers l'API OAuth Supabase n'est pas exécuté et un message d'erreur ou d'avertissement informe que la méthode de connexion est indisponible
