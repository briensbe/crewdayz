## 1. Mise à Jour du Service Supabase

- [ ] 1.1 Ajouter la méthode `resetPasswordWithOtp(email, token, newPassword)` dans `src/app/services/supabase.service.ts` qui orchestre `verifyOtp({ email, token, type: 'recovery' })` puis `updateUser({ password })`
- [ ] 1.2 Nettoyer et adapter `resetPasswordForEmail(email)` dans `src/app/services/supabase.service.ts` pour déclencher l'envoi du code OTP

## 2. Adaptation du Composant Mot de Passe Oublié

- [ ] 2.1 Mettre à jour `src/app/auth/forgot-password/forgot-password.component.ts` pour router automatiquement vers `/reset-password` avec l'adresse e-mail dans l'état de navigation (`state: { email }`)

## 3. Évolution du Composant Reset Password

- [ ] 3.1 Adapter `src/app/auth/reset-password/reset-password.component.ts` pour gérer la saisie de l'e-mail, du code OTP (6 chiffres), des mots de passe et la logique de renvoi de code
- [ ] 3.2 Mettre à jour `src/app/auth/reset-password/reset-password.component.html` avec le champ code OTP, les contrôles d'accessibilité et le bouton de renvoi de code
- [ ] 3.3 Ajuster `src/app/auth/reset-password/reset-password.component.css` pour la mise en page du formulaire et des alertes

## 4. Vérification et Documentation

- [ ] 4.1 Vérifier la compilation globale du projet via `pnpm build`
- [ ] 4.2 Documenter la configuration requise pour le template d'e-mail dans le Dashboard Supabase (`{{ .Token }}`)
