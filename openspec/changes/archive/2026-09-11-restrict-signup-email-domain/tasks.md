## 1. Configuration des environnements

- [x] 1.1 Ajouter la propriété de configuration `allowedEmailDomains` dans `src/environments/environment.ts`
- [x] 1.2 Ajouter la propriété de configuration `allowedEmailDomains` dans `src/environments/environment.prod.ts`

## 2. Utilitaire de validation des domaines e-mails

- [x] 2.1 Créer la fonction utilitaire de validation de domaine e-mail (`src/app/utils/email-validator.ts`)
- [x] 2.2 Créer les tests unitaires pour la fonction de validation (`src/app/utils/email-validator.spec.ts`)

## 3. Intégration dans le flux d'inscription

- [x] 3.1 Intégrer la validation du domaine e-mail dans `SupabaseService.signUpWithEmail` (`src/app/services/supabase.service.ts`)
- [x] 3.2 Intégrer la validation et les messages d'erreur contextuels dans `SignupComponent` (`src/app/auth/signup/signup.component.ts`)
- [x] 3.3 Adapter le template `SignupComponent` (`src/app/auth/signup/signup.component.html`) si besoin pour améliorer le retour visuel

## 4. Tests et validation globale

- [x] 4.1 Ajouter/mettre à jour les tests unitaires de `SignupComponent` (`src/app/auth/signup/signup.component.spec.ts`)
- [x] 4.2 Exécuter la suite de tests et valider le build Angular avec `pnpm build`
