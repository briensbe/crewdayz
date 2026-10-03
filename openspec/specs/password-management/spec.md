## Purpose

Définir les exigences relatives à la gestion des mots de passe dans CrewDayz, séparant la mise à jour connectée par l'utilisateur de la réinitialisation de mot de passe oublié.

## Requirements

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
