## ADDED Requirements

### Requirement: Formulaire autonome de modification du mot de passe pour utilisateur connecté
L'application DOIT proposer un formulaire dédié à la modification du mot de passe accessible sur la route `/update-password` uniquement pour les utilisateurs authentifiés.

#### Scenario: Accès par un utilisateur connecté
- **WHEN** un utilisateur authentifié navigue vers `/update-password`
- **THEN** le formulaire affiche les champs « Mot de passe actuel », « Nouveau mot de passe » et « Confirmer le mot de passe » ainsi qu'un bouton de retour vers son profil `/profile`

#### Scenario: Tentative d'accès non authentifié
- **WHEN** un utilisateur non authentifié tente d'accéder à `/update-password`
- **THEN** le garde `AuthGuard` bloque l'accès et redirige l'utilisateur vers `/login`

### Requirement: Vérification de l'ancien mot de passe lors de la mise à jour
L'application DOIT exiger et vérifier la validité du mot de passe actuel de l'utilisateur avant d'autoriser la mise à jour du mot de passe.

#### Scenario: Saisie d'un mot de passe actuel incorrect
- **WHEN** l'utilisateur soumet le formulaire avec un mot de passe actuel non valide
- **THEN** la mise à jour est rejetée et un message d'erreur indique que le mot de passe actuel est incorrect

#### Scenario: Saisie d'un mot de passe actuel valide et nouveau mot de passe conforme
- **WHEN** l'utilisateur saisit son mot de passe actuel valide et un nouveau mot de passe différent d'au moins 6 caractères identique au champ de confirmation
- **THEN** le mot de passe est mis à jour dans Supabase et un écran de succès propose de revenir au profil

### Requirement: Formulaire autonome de réinitialisation de mot de passe oublié
L'application DOIT proposer un formulaire de réinitialisation de mot de passe accessible sur la route publique `/reset-password`.

#### Scenario: Accès via un lien de récupération Supabase
- **WHEN** l'utilisateur accède à `/reset-password` suite à la redirection d'un lien de réinitialisation Supabase
- **THEN** le formulaire affiche uniquement les champs « Nouveau mot de passe » et « Confirmer le mot de passe », sans demander d'ancien mot de passe

#### Scenario: Réinitialisation réussie
- **WHEN** l'utilisateur soumet un nouveau mot de passe valide et confirmé
- **THEN** le mot de passe est mis à jour via Supabase Auth et un écran de succès propose de se connecter via `/login`

### Requirement: Routage et flux de récupération Supabase vers reset-password
L'application DOIT acheminer les flux de récupération de mot de passe Supabase (liens d'email, redirection PKCE, événement `PASSWORD_RECOVERY`) vers `/reset-password`.

#### Scenario: Envoi d'un email de réinitialisation
- **WHEN** l'utilisateur demande une réinitialisation depuis la page mot de passe oublié
- **THEN** la méthode `resetPasswordForEmail` configure l'URL de redirection pointant vers `/reset-password`

#### Scenario: Réception de l'événement PASSWORD_RECOVERY
- **WHEN** Supabase émet l'événement d'authentification `PASSWORD_RECOVERY`
- **THEN** l'application redirige automatiquement l'utilisateur vers la route `/reset-password`
