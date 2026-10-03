## Why

Le formulaire de réinitialisation de mot de passe actuel regroupe sur un seul écran la saisie de l'e-mail, du code OTP à 6 chiffres et du nouveau mot de passe, ce qui surcharge l'expérience utilisateur et valide l'OTP uniquement lors de la soumission finale. De plus, une restriction empêche l'utilisateur de réutiliser son ancien mot de passe en cas d'oubli, et l'écran de succès propose un bouton de connexion redondant alors que l'utilisateur est déjà authentifié suite à la validation de l'OTP.

## What Changes

- **Séparation séquentielle du flux de réinitialisation** en étapes distinctes :
  1. Étape 1 : Saisie de l'adresse e-mail et validation du code OTP (avec possibilité de renvoi de code).
  2. Étape 2 : Saisie et confirmation du nouveau mot de passe (accessible uniquement après validation réussie de l'OTP).
  3. Étape 3 : Écran de succès proposant l'accès direct à l'application.
- **Masquage visuel partiel de l'adresse e-mail** : Obfuscation discrète (ex: `j***e@domaine.com`) sur l'écran de validation OTP et les messages de confirmation pour préserver la confidentialité.
- **Suppression du contrôle interdisant le même mot de passe** lors de la réinitialisation : l'utilisateur a le droit de ressaisir son mot de passe habituel sans blocage applicatif.
- **Accès direct à l'application** : Remplacement du bouton « Se connecter » par « Accéder à l'application » sur l'écran de succès pour rediriger immédiatement vers l'application (`/`).
- **Maintien de l'état de récupération** : Support de la reprise ou du rafraîchissement lorsque la session de récupération Supabase est déjà active.

## Capabilities

### New Capabilities
<!-- Aucune nouvelle capability globale requise -->

### Modified Capabilities
- `password-management`: Modification des exigences du formulaire de réinitialisation de mot de passe (`/reset-password`) pour intégrer le flux séquentiel en étapes, le masquage partiel de l'e-mail, autoriser la réutilisation de mot de passe lors du reset, et rediriger directement vers l'application post-réinitialisation.

## Impact

- **Composants modifiés** : `src/app/auth/reset-password/reset-password.component.ts`, `src/app/auth/reset-password/reset-password.component.html`, `src/app/auth/reset-password/reset-password.component.css`.
- **Services & Utilitaires modifiés** : `src/app/services/supabase.service.ts`, `src/app/utils/email-validator.ts` ou fonction de masquage dédiée.
- **Expérience utilisateur** : Parcours plus clair, guidé, sécurisé et confidentiel avec confirmation masquée de l'e-mail de destination.
