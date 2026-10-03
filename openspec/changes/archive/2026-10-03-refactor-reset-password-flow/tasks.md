## 1. Service d'authentification Supabase

- [x] 1.1 Ajouter la méthode `verifyRecoveryOtp(email: string, token: string)` dans `SupabaseService` pour valider le code OTP et établir la session sans modifier le mot de passe
- [x] 1.2 Vérifier que `updatePassword(newPassword: string)` met à jour le mot de passe sur la session active et réinitialise le flag `isPasswordRecovery`

## 2. Refonte du composant ResetPassword

- [x] 2.1 Définir la machine d'état séquentielle (`step = signal<'verify-otp' | 'new-password' | 'success'>`) et les signaux associés dans `ResetPasswordComponent`
- [x] 2.2 Implémenter la validation du code OTP (Étape 1) avec gestion du renvoi de code et transition vers l'Étape 2
- [x] 2.3 Implémenter la mise à jour du mot de passe (Étape 2) avec validation de longueur et concordance, sans restriction sur l'ancien mot de passe
- [x] 2.4 Mettre à jour l'écran de succès (Étape 3) avec le bouton d'accès direct à l'application (`router.navigate(['/'])`)
- [x] 2.5 Mettre à jour le template HTML `reset-password.component.html` avec la syntaxe de contrôle de flux native Angular (`@if` / `@else`)
- [x] 2.6 Ajuster le style CSS dans `reset-password.component.css` pour assurer la cohérence visuelle des différentes étapes
- [x] 2.7 Créer et intégrer l'utilitaire de masquage partiel d'adresse e-mail (`maskEmail`) dans `email-validator.ts` et `ResetPasswordComponent`
- [x] 2.8 Afficher l'e-mail masqué à l'Étape 1 et à l'Étape 2 pour renforcer la confidentialité visuelle

## 3. Validation et Contrôle Qualité

- [x] 3.1 Exécuter la compilation TypeScript et le build de l'application via `pnpm build`
- [x] 3.2 Valider le flux complet de réinitialisation sans régression
