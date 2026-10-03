# ADR 0007: Parcours Séquentiel Multi-Étapes de Réinitialisation de Mot de Passe et Connexion Directe

## Status
Accepted

## Date
2026-10-03

## Context
L'ADR 0006 a instauré la récupération de mot de passe par code OTP à 6 chiffres via Supabase.
Toutefois, l'implémentation regroupait tous les champs (email, OTP, nouveau mot de passe, confirmation) dans un formulaire unique, imposait à tort l'interdiction de réutiliser l'ancien mot de passe lors de la réinitialisation, et proposait un bouton de reconnexion inutile alors qu'une session authentifiée est déjà ouverte après validation de l'OTP et mise à jour du mot de passe.

## Decision
1. **Machine à états à 3 étapes** : Le composant de réinitialisation (`ResetPasswordComponent`) structure l'expérience en 3 étapes séquentielles :
   - Étape 1 (`verify-otp`) : Saisie e-mail et validation immédiate du code OTP à 6 chiffres via `supabase.auth.verifyOtp`.
   - Étape 2 (`new-password`) : Saisie du nouveau mot de passe et confirmation, sans contrôle interdisant l'ancien mot de passe, suivie de l'appel à `supabase.auth.updateUser`.
   - Étape 3 (`success`) : Écran de confirmation avec accès direct à l'application via `router.navigate(['/'])`.
2. **Autorisation du même mot de passe lors du reset** : Aucun blocage applicatif n'empêche un utilisateur de reconduire son mot de passe habituel lors d'une réinitialisation.
3. **Maintien de session active** : Exploitation directe de la session Supabase établie par la vérification OTP pour rediriger l'utilisateur directement dans son espace applicatif.

## Consequences
- **Positives** :
  - Feedback immédiat en cas de code OTP erroné sans perte des champs de mot de passe.
  - Parcours utilisateur allégé et moderne en étapes progressives.
  - Connexion fluide sans double saisie post-réinitialisation.
- **Négatives / Précautions** :
  - La session de récupération temporaire Supabase doit être convenablement consommée par `updateUser`.
