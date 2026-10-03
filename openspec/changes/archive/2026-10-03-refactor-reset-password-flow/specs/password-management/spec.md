## MODIFIED Requirements

### Requirement: Formulaire autonome de réinitialisation de mot de passe oublié
L'application DOIT proposer un parcours de réinitialisation de mot de passe en plusieurs étapes séquentielles accessible sur la route publique `/reset-password`.

#### Scenario: Accès via un lien de récupération Supabase
- **WHEN** l'utilisateur accède à `/reset-password` suite à une demande de code ou directement
- **THEN** l'interface affiche l'Étape 1 avec les champs « Adresse e-mail » (avec affichage masqué partiel type `j***e@domaine.com` en confirmation) et « Code de confirmation (6 chiffres) », ainsi qu'un bouton « Renvoyer un code » et un bouton « Valider le code »

#### Scenario: Réinitialisation réussie
- **WHEN** l'utilisateur valide son code OTP à l'Étape 1 puis saisit son nouveau mot de passe à l'Étape 2 (sans restriction sur l'ancien mot de passe)
- **THEN** l'application met à jour le mot de passe via `supabase.auth.updateUser` et affiche l'Étape 3 avec un bouton « Accéder à l'application » redirigeant directement vers `/`

#### Scenario: Code OTP invalide ou expiré
- **WHEN** l'utilisateur soumet un code OTP incorrect ou expiré
- **THEN** l'application reste à l'Étape 1, affiche un message d'erreur clair et propose de renvoyer un nouveau code

#### Scenario: Étape 2 - Saisie du nouveau mot de passe conforme
- **WHEN** l'utilisateur saisit un nouveau mot de passe d'au moins 6 caractères et sa confirmation identique après validation de l'OTP
- **THEN** l'application met à jour le mot de passe dans Supabase et bascule vers l'Étape 3

#### Scenario: Étape 2 - Erreur de concordance ou mot de passe trop court
- **WHEN** l'utilisateur saisit un mot de passe de moins de 6 caractères ou non identique à la confirmation
- **THEN** l'application affiche un message d'erreur de validation approprié et ne procède à aucune mise à jour

#### Scenario: Étape 3 - Écran de succès et accès direct à l'application
- **WHEN** la mise à jour du mot de passe a réussi
- **THEN** l'interface affiche un écran de confirmation avec un bouton « Accéder à l'application » qui redirige directement l'utilisateur vers son espace de travail (`/`) sans repasser par l'écran de connexion
