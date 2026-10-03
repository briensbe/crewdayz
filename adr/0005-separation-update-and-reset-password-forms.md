# ADR 0005: Séparation des Formulaires de Mise à Jour et de Réinitialisation de Mot de Passe

## Status
Accepted

## Date
2026-10-03

## Context
Auparavant, la mise à jour volontaire du mot de passe par un utilisateur authentifié et la réinitialisation de mot de passe suite à un email de récupération partageaient le même composant `UpdatePasswordComponent` et la même route `/update-password`.
Cette cohabitation reposait sur des paramètres d'URL (`?mode=change`), des conditions d'affichage multiples et compliquait l'application du garde d'authentification `AuthGuard`.

## Decision
Nous séparons strictement les deux flux d'authentification :
1. **Mise à jour connectée (`UpdatePasswordComponent` / `/update-password`)** :
   - Route protégée sous `AuthGuard`.
   - Exige la vérification du mot de passe actuel (`signInWithEmail`), le nouveau mot de passe et sa confirmation.
   - Suppression du paramètre d'URL `mode`.
2. **Réinitialisation publique (`ResetPasswordComponent` / `/reset-password`)** :
   - Route publique déclarée dans `publicRoutes`.
   - Accessible suite au clic sur le lien d'email de récupération (gestion PKCE et événement `PASSWORD_RECOVERY` de `SupabaseService`).
   - Demande uniquement le nouveau mot de passe et sa confirmation.
3. **Redirections Supabase** :
   - `resetPasswordForEmail`, les callbacks PKCE et l'événement `PASSWORD_RECOVERY` redirigent exclusivement vers `/reset-password`.

## Consequences
- **Positives** :
  - Séparation nette des responsabilités et respect du principe de responsabilité unique (SRP).
  - Code Angular plus propre, composants autonomes en 3 fichiers (`.html`, `.css`, `.ts`) sans logique conditionnelle mixte.
  - Protection déclarative claire par `AuthGuard` pour la modification connectée.
- **Précautions** :
  - L'URL `/reset-password` doit être autorisée dans la liste des Redirect URLs du projet Supabase.
