## MODIFIED Requirements

### Requirement: Formulaire autonome de réinitialisation de mot de passe oublié
L'application DOIT proposer un formulaire de réinitialisation de mot de passe accessible sur la route publique `/reset-password`.

#### Scenario: Accès via un lien de récupération Supabase
- **WHEN** l'utilisateur accède à `/reset-password` suite à une demande de code ou directement
- **THEN** le formulaire affiche les champs « Adresse e-mail », « Code de confirmation (6 chiffres) », « Nouveau mot de passe » et « Confirmer le mot de passe »

#### Scenario: Réinitialisation réussie
- **WHEN** l'utilisateur soumet son adresse e-mail, un code OTP à 6 chiffres valide et un nouveau mot de passe conforme
- **THEN** l'application valide le code via `verifyOtp` puis met à jour le mot de passe via `updateUser` et affiche un écran de succès invitant à se connecter

#### Scenario: Code OTP invalide ou expiré
- **WHEN** l'utilisateur soumet un code OTP incorrect ou expiré
- **THEN** l'application affiche un message d'erreur clair et propose de renvoyer un nouveau code

### Requirement: Routage et flux de récupération Supabase vers reset-password
L'application DOIT acheminer les flux de récupération de mot de passe Supabase (liens d'email, redirection PKCE, événement `PASSWORD_RECOVERY`) vers `/reset-password`.

#### Scenario: Envoi d'un email de réinitialisation
- **WHEN** l'utilisateur demande une réinitialisation depuis la page mot de passe oublié
- **THEN** la méthode `resetPasswordForEmail` déclenche l'envoi d'un e-mail contenant le code OTP à 6 chiffres et l'application redirige l'utilisateur vers `/reset-password` avec son adresse e-mail pré-remplie

#### Scenario: Réception de l'événement PASSWORD_RECOVERY
- **WHEN** Supabase émet l'événement d'authentification `PASSWORD_RECOVERY`
- **THEN** l'application redirige automatiquement l'utilisateur vers la route `/reset-password`

#### Scenario: Renvoi d'un code depuis la page de réinitialisation
- **WHEN** l'utilisateur clique sur « Renvoyer un code » depuis `/reset-password`
- **THEN** un nouvel e-mail contenant un nouveau code est envoyé à l'adresse renseignée et un message de confirmation est affiché
