## Context

L'ADR 0006 a introduit la récupération de mot de passe par code OTP à 6 chiffres (`{{ .Token }}`) via Supabase Auth pour neutraliser les scanners d'e-mails d'entreprise.
Actuellement, le composant `ResetPasswordComponent` a été structuré en 3 étapes.
Pour optimiser la sécurité visuelle et la confidentialité (ex: écran partagé ou en open space), l'adresse e-mail saisie/pré-remplie à l'étape 1 et rappelée à l'étape 2 doit faire l'objet d'un masquage partiel (obfuscation) élégant.

## Goals / Non-Goals

**Goals:**
- Découper l'expérience de `/reset-password` en 3 étapes d'état claires : Étape 1 (`verify-otp`), Étape 2 (`new-password`), Étape 3 (`success`).
- Obfusquer partiellement l'adresse e-mail (ex: `j***e@entreprise.com` ou `b***n@gmail.com`) via une fonction utilitaire `maskEmail`.
- Valider le code OTP dès l'étape 1 via `supabase.auth.verifyOtp` pour sécuriser et initialiser la session Supabase avant la saisie du nouveau mot de passe.
- Autoriser la réutilisation de l'ancien mot de passe lors de la réinitialisation (pas de contrôle bloquant côté client).
- Fournir un bouton « Accéder à l'application » sur l'écran de succès redirigeant directement vers `/` grâce à la session établie.
- Découpler les méthodes du service `SupabaseService` (`verifyOtp` puis `updatePassword`).

**Non-Goals:**
- Modifier le flux de changement de mot de passe pour utilisateur connecté (`/update-password`), qui conserve son exigence de vérification du mot de passe actuel.
- Modifier la méthode d'envoi du code OTP par e-mail (`resetPasswordForEmail`).

## Decisions

### 1. State machine interne au composant Angular standalone
- **Décision** : Gérer les étapes via un signal typé `currentStep = signal<'verify-otp' | 'new-password' | 'success'>('verify-otp')` dans `ResetPasswordComponent`.
- **Rationale** : Permet de conserver l'adresse e-mail et l'état réactif en mémoire sans synchronisation complexe de routing URL, tout en restant sur la route canonique `/reset-password`.

### 2. Fonction utilitaire de masquage d'email (`maskEmail`)
- **Décision** : Implémenter une fonction `maskEmail(email: string): string` qui conserve la première lettre et la dernière lettre de la partie locale (nom d'utilisateur), remplace les caractères intermédiaires par `***` et conserve le domaine (ex: `jean.dupont@domain.com` -> `j***t@domain.com`).
- **Rationale** : Confirme à l'utilisateur où le code a été expédié sans dévoiler l'intégralité de l'e-mail aux regards indiscrets.

### 3. Découplage des opérations Supabase
- **Décision** :
  - Étape 1 : Appel de `supabase.auth.verifyOtp({ email, token, type: 'recovery' })`.
  - Étape 2 : Appel de `supabase.auth.updateUser({ password: newPassword })`.
- **Rationale** : Donne un feedback immédiat sur la validité du code OTP. Dès que l'OTP est validé, Supabase configure le token de session en local.

### 4. Suppression de la restriction d'ancien mot de passe en mode Reset
- **Décision** : Ne pas bloquer l'enregistrement si l'utilisateur saisit le même mot de passe que son mot de passe précédent lors d'une réinitialisation.
- **Rationale** : En cas d'oubli ou de doute, un utilisateur a le droit de choisir le mot de passe dont il se souvient.

### 5. Accès direct post-réinitialisation
- **Décision** : Proposer un bouton « Accéder à l'application » qui effectue `router.navigate(['/'])`.
- **Rationale** : L'utilisateur est déjà authentifié par la session Supabase issue de la validation de l'OTP et de l'update password.

## Risks / Trade-offs

- **[Risque] Perte de session si rechargement de page sur l'étape 2** → **Atténuation** : À l'initialisation du composant (`ngOnInit`), si une session Supabase active ou un état de récupération est détecté (`supabaseService.isPasswordRecovery()`), le composant s'initialise directement sur `currentStep = 'new-password'`.
- **[Risque] Modification de l'adresse e-mail si pré-remplie et masquée** → **Atténuation** : Permettre à l'utilisateur d'éditer ou de changer l'adresse e-mail si besoin à l'étape 1.
