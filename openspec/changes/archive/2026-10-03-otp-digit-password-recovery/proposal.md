## Why

Les e-mails de réinitialisation de mot de passe utilisant des liens directs cliquables (`ConfirmationURL`) sont fréquemment interceptés et pré-visités par des filtres de sécurité de messagerie (Microsoft Defender / Safe Links, Google Workspace, antivirus ou extensions). Ces robots effectuent une requête HTTP `GET` qui valide et consomme immédiatement le jeton à usage unique de Supabase avant même que l'utilisateur humain ne clique sur le lien, rendant le lien expiré ou invalide.
Pour garantir un flux de réinitialisation robuste et insensible aux scanners, l'application doit passer à une vérification par code OTP à 6 chiffres (`{{ .Token }}`).

## What Changes

- **Flux de demande de réinitialisation (`/forgot-password`)** : La demande envoie désormais un e-mail contenant un code numérique à 6 chiffres via Supabase Auth (`{{ .Token }}`) et redirige automatiquement l'utilisateur vers `/reset-password` en pré-remplissant son e-mail.
- **Formulaire de réinitialisation (`/reset-password`)** : Le formulaire est adapté pour demander l'e-mail, le code OTP à 6 chiffres, le nouveau mot de passe et sa confirmation, avec possibilité de renvoyer un code.
- **Service Supabase (`SupabaseService`)** : Ajout d'une méthode de réinitialisation avec code OTP combinant `verifyOtp({ email, token, type: 'recovery' })` et `updateUser({ password })`.

## Capabilities

### New Capabilities
<!-- Aucune nouvelle capability globale requise -->

### Modified Capabilities
- `password-management`: Adaptation des exigences de réinitialisation de mot de passe pour utiliser la saisie et la validation d'un code OTP à 6 chiffres plutôt que l'accès exclusif par lien magique / PKCE direct.

## Impact

- **Code affecté** :
  - `src/app/services/supabase.service.ts` : Méthode de validation OTP (`resetPasswordWithOtp`) et envoi de code (`resetPasswordForEmail`).
  - `src/app/auth/forgot-password/` : Navigation vers `/reset-password` avec transfert de l'e-mail après demande.
  - `src/app/auth/reset-password/` : Composant, template HTML et CSS enrichis avec saisie du code OTP à 6 chiffres et bouton de renvoi.
- **Configuration Supabase** : Modèle d'e-mail de réinitialisation dans Supabase Auth adapté pour inclure `{{ .Token }}` au lieu de `{{ .ConfirmationURL }}`.
