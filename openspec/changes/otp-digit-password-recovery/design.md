## Context

Les filtres anti-phishing et scanners d'emails (Microsoft Defender / Safe Links, Google Workspace, etc.) effectuent des requêtes HTTP `GET` automatiques sur les liens reçus dans les e-mails entrants. Dans l'architecture Supabase par défaut utilisant `{{ .ConfirmationURL }}`, ce `GET` automatique valide et consomme immédiatement le token à usage unique, ce qui invalide le lien avant même que l'utilisateur n'ait pu cliquer dessus.

Pour pallier ce problème sans dépendre de mécanismes complexes d'inspection de requêtes ou de reverse proxies, nous adaptons le flux de réinitialisation vers un modèle à **code OTP à 6 chiffres (`{{ .Token }}`)**.

## Goals / Non-Goals

**Goals :**
- Rendre le processus de réinitialisation de mot de passe totalement insensible aux requêtes automatiques `GET` des scanners et filtres de messagerie.
- Permettre à l'utilisateur de recevoir un code à 6 chiffres par e-mail et de le saisir directement sur la page `/reset-password` avec son nouveau mot de passe.
- Pré-remplir l'adresse e-mail sur `/reset-password` lors de la redirection depuis `/forgot-password`, tout en permettant sa modification manuelle.
- Proposer un bouton de renvoi de code en cas de non-réception ou d'expiration.
- Documenter précisément la configuration du tableau de bord Supabase (modèle d'e-mail, variables, expirations).

**Non-Goals :**
- Modifier le flux de changement de mot de passe pour utilisateur connecté (`/update-password`).
- Modifier la politique de sécurité des mots de passe existante (longueur minimale de 6 caractères, différence avec l'ancien mot de passe).

## Decisions

### 1. Utilisation du code OTP Supabase (`type: 'recovery'`)
- **Choix** : Utiliser `supabase.auth.verifyOtp({ email, token, type: 'recovery' })` suivi de `supabase.auth.updateUser({ password })`.
- **Raison** : Les filtres de messagerie ne peuvent pas soumettre de formulaire ; seul un utilisateur humain peut lire le code numérique et le renseigner sur le site.
- **Alternative rejetée** : Modifier le template pour insérer `{{ .TokenHash }}` dans un lien direct vers Angular. Bien que fonctionnel face à de simples requêtes HTTP GET, cette approche reste vulnérable aux scanners plus agressifs (sandboxes headless avec exécution JS) et aux problématiques de session multi-navigateurs.

### 2. Transition fluide `/forgot-password` vers `/reset-password`
- **Choix** : Dès la soumission de l'e-mail sur `/forgot-password`, l'utilisateur est redirigé vers `/reset-password` avec son adresse e-mail transmise via l'état de navigation (`Router.navigate(['/reset-password'], { state: { email } })`) ou `queryParams` de secours.
- **Raison** : Offrir un parcours direct et fluide sans étape intermédiaire superflue.

### 3. Interface utilisateur de saisie OTP et mot de passe
- **Choix** : Un formulaire unifié sur `/reset-password` contenant :
  - Champ e-mail (éditable).
  - Champ code de confirmation à 6 chiffres (`type="text"`, `inputmode="numeric"`, `maxlength="6"`).
  - Champ nouveau mot de passe et confirmation (avec bascule affichage/masquage).
  - Bouton de soumission "Réinitialiser le mot de passe".
  - Lien/bouton "Renvoyer un code".

### 4. Configuration Supabase (Dashboard & Auth)

#### A. Emplacement du modèle d'e-mail
- **Navigation** : `Dashboard Supabase` > `Authentication` > `Email Templates` > Sélectionner `Reset Password` (ou `Recovery`).

#### B. Paramétrage du Sujet et du Corps HTML
- **Sujet** : `Code de réinitialisation de votre mot de passe CrewDayz`
- **Variables GoTrue disponibles** : Supabase Auth (moteur GoTrue) expose les variables `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .Email }}`, `{{ .SiteURL }}` et `{{ .Data }}`. Il n'expose pas de variable dynamique d'horodatage (`{{ .ExpiresAt }}`). L'heure de génération correspond donc à l'horodatage d'émission du courriel (en-tête standard SMTP `Date:`).
- **Corps du message (HTML)** :
  Remplacement intégral du modèle par défaut pour **supprimer tout lien `<a>` ou variable `{{ .ConfirmationURL }}`**, et afficher uniquement le code à 6 chiffres via la variable `{{ .Token }}` avec mention explicite du délai de validité et de l'invalidation des codes antérieurs :
  ```html
  <h2>Réinitialisation de votre mot de passe</h2>
  <p>Bonjour,</p>
  <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte CrewDayz ({{ .Email }}).</p>
  <p>Voici votre code de confirmation à 6 chiffres :</p>
  <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px; text-align: center;">
    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e40af; font-family: monospace;">
      {{ .Token }}
    </span>
  </div>
  <p>Saisissez ce code sur la page de réinitialisation de l'application avec votre nouveau mot de passe.</p>
  <p style="color: #6b7280; font-size: 13px;">
    ⏱️ <strong>Validité :</strong> Ce code expire <strong>10 minutes</strong> après l'heure d'envoi de cet e-mail.<br>
    ⚠️ <em>En cas de demandes successives, seul le dernier code généré est valide.</em><br>
    Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
  </p>
  ```

#### C. Paramètres de Sécurité & Expiration (Rate Limits)
- **Durée de validité de l'OTP (TTL)** : Configurée à `600` secondes (10 minutes) sous `Authentication` > `Rate Limits / Email Auth` (compromis optimal entre tolérance aux délais d'acheminement/greylisting et minimisation de la fenêtre de risque).
- **Protection Brute-force & Rate Limiting** : Supabase applique automatiquement un plafond de tentatives par adresse IP et par compte sur `verifyOtp`.

## Risks / Trade-offs

- **[Risque] Omission de mise à jour du template dans Supabase** → *Atténuation* : Si le template continue d'envoyer `{{ .ConfirmationURL }}`, le code ne sera pas visible dans le mail. La modification du template dans la console Supabase fait partie intégrante de la procédure de déploiement (tâche 4.2).
- **[Risque] Code expiré ou tentatives répétées** → *Atténuation* : Supabase applique un rate-limiting natif et renvoie une erreur explicite, traduite en message convivial dans l'UI avec possibilité de renvoyer un code.

## Migration Plan

1. Mettre à jour `SupabaseService` pour implémenter `resetPasswordWithOtp` et adapter `resetPasswordForEmail`.
2. Mettre à jour `ForgotPasswordComponent` pour router vers `/reset-password` après soumission.
3. Mettre à jour `ResetPasswordComponent` (.ts, .html, .css) pour intégrer la saisie du code OTP et l'orchestration de la validation.
4. Mettre à jour le template d'e-mail dans le Dashboard Supabase (copier le snippet ci-dessus).

## Open Questions

- Aucune question bloquante identifiée.
