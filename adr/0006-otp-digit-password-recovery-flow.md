# ADR 0006: Flux de Récupération de Mot de Passe par Code OTP à 6 Chiffres

## Status
Accepted, supersedes ADR-0005 (sur le mécanisme d'échange de lien de récupération)

## Supersedes
ADR-0005

## Date
2026-10-03

## Context
Dans l'ADR 0005, la réinitialisation de mot de passe reposait sur des liens de redirection Supabase cliquables dans les e-mails (`ConfirmationURL` ou redirection PKCE).
Cependant, les filtres et scanners de sécurité de messagerie d'entreprise (Safe Links, Google Workspace, Defender) pré-visitent systématiquement les liens via des requêtes HTTP `GET`, ce qui consomme et invalide le jeton à usage unique avant que l'utilisateur n'ait pu ouvrir la page.

## Decision
Nous adoptons un mécanisme de récupération fondé sur un **code OTP numérique à 6 chiffres (`{{ .Token }}`)** :
1. **Émission** : Supabase transmet un code numérique à 6 chiffres dans l'e-mail de réinitialisation sans aucun lien d'authentification directe à usage unique.
2. **Saisie & Validation** : L'utilisateur renseigne son e-mail, son code OTP et son nouveau mot de passe sur `/reset-password`.
3. **Orchestration Client** :
   - Appel de `supabase.auth.verifyOtp({ email, token, type: 'recovery' })` pour valider le code et ouvrir la session temporaire de récupération.
   - Appel de `supabase.auth.updateUser({ password })` pour enregistrer le nouveau mot de passe.
4. **Transition** : L'écran `/forgot-password` achemine automatiquement l'utilisateur vers `/reset-password` avec l'e-mail pré-rempli.

## Consequences
- **Positives** :
  - Insensibilité totale aux scanners HTTP `GET` de messagerie d'entreprise.
  - Fonctionnement multi-terminaux (l'utilisateur peut lire le code sur mobile et le saisir sur ordinateur).
  - Suppression de la fragilité liée aux expirations silencieuses de tokens pré-visités.
- **Précautions** :
  - Le template d'e-mail de réinitialisation dans Supabase Auth doit être configuré avec la variable `{{ .Token }}`.
