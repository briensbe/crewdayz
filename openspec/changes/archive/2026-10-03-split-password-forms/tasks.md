## 1. Service Supabase et Redirections

- [x] 1.1 Mettre à jour `resetPasswordForEmail` dans `src/app/services/supabase.service.ts` pour rediriger vers `/reset-password`
- [x] 1.2 Mettre à jour l'événement `PASSWORD_RECOVERY` et la détection PKCE dans `src/app/services/supabase.service.ts` pour router vers `/reset-password`

## 2. Création du Composant Reset Password

- [x] 2.1 Créer les fichiers du composant standalone `src/app/auth/reset-password/reset-password.component.ts`, `.html` et `.css`
- [x] 2.2 Implémenter le formulaire avec les champs nouveau mot de passe et confirmation, validation de longueur et correspondance
- [x] 2.3 Gérer l'état de soumission via `updatePassword`, l'affichage des messages d'erreur/succès et le bouton de redirection vers `/login`

## 3. Refactorisation du Composant Update Password

- [x] 3.1 Nettoyer `src/app/auth/update-password/update-password.component.ts` en supprimant `mode`, `isRecovery`, `requiresCurrentPassword` et la lecture des query parameters
- [x] 3.2 Rendre obligatoire la saisie et la vérification du mot de passe actuel via `signInWithEmail` avant l'appel à `updatePassword`
- [x] 3.3 Mettre à jour le template `update-password.component.html` pour simplifier l'affichage et conserver le lien de retour vers `/profile`

## 4. Configuration du Routage et de l'Application

- [x] 4.1 Ajouter la route `/reset-password` dans `src/app/app.routes.ts` et déplacer `/update-password` sous `AuthGuard` dans les routes protégées
- [x] 4.2 Mettre à jour `publicRoutes` dans `src/app/app.ts` pour inclure `/reset-password` et retirer `/update-password`
- [x] 4.3 Mettre à jour la méthode `goToUpdatePassword()` dans `src/app/auth/profile/profile.component.ts` pour naviguer vers `/update-password` sans paramètre `mode`

## 5. Validation et Build

- [x] 5.1 Vérifier la compilation de l'application avec `pnpm build`
