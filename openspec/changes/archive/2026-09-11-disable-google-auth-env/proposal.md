## Why

Actuellement, le bouton de connexion Google OAuth et le mécanisme d'authentification associé sont affichés et actifs par défaut sur l'écran de connexion (`LoginComponent`), sans possibilité de les désactiver facilement selon l'environnement de déploiement (ex. environnement local sans configuration OAuth Supabase Google valide, ou déploiements restreints aux seuls identifiants email/mot de passe).
L'introduction d'une propriété de configuration explicite dans les fichiers d'environnement Angular permet de contrôler la disponibilité de Google OAuth de manière flexible et sécurisée selon la cible (développement local, recette, production).

## What Changes

- Ajout d'une propriété de configuration booléenne `enableGoogleAuth` dans `src/environments/environment.ts` et `src/environments/environment.prod.ts`.
- Conditionnement de l'affichage du bouton de connexion Google OAuth et de son séparateur (« ou continuer avec ») dans le composant `LoginComponent` en fonction de cette propriété d'environnement.
- Sécurisation de la méthode d'authentification `signInWithGoogle` pour empêcher son exécution si la fonctionnalité est désactivée.

## Capabilities

### New Capabilities
- `auth-configuration`: Configuration et activation conditionnelle des fournisseurs d'authentification (spécifiquement Google OAuth) via les fichiers d'environnement.

### Modified Capabilities

## Impact

- Fichiers d'environnement : `src/environments/environment.ts` et `src/environments/environment.prod.ts`.
- Interface utilisateur et logique d'authentification : `src/app/auth/login/login.component.ts`, `src/app/auth/login/login.component.html`.
- Aucun impact bloquant ou régressif sur l'authentification standard par email/mot de passe.
