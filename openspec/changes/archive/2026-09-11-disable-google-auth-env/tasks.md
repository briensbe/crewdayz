## 1. Configuration des environnements

- [x] 1.1 Ajouter la propriété `enableGoogleAuth` dans `src/environments/environment.ts` (définie à `false` ou `true` selon le besoin local)
- [x] 1.2 Ajouter la propriété `enableGoogleAuth` dans `src/environments/environment.prod.ts` (définie à `true`)

## 2. Adaptation du composant de connexion (LoginComponent)

- [x] 2.1 Exposer la propriété `enableGoogleAuth` (issue d'environment) dans `src/app/auth/login/login.component.ts`
- [x] 2.2 Conditionner l'affichage du bloc Google (bouton OAuth et séparateur « ou continuer avec ») avec le bloc `@if (enableGoogleAuth)` dans `src/app/auth/login/login.component.html`
- [x] 2.3 Ajouter un contrôle défensif dans `signInWithGoogle()` pour empêcher l'exécution si `enableGoogleAuth` est inactif

## 3. Validation et compilation

- [x] 3.1 Vérifier la bonne prise en compte du masquage et de l'affichage du bouton Google selon la configuration
- [x] 3.2 Vérifier le build du projet (`pnpm build`) et l'absence d'erreurs de typage TypeScript
