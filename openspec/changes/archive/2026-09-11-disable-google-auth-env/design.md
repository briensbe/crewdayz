## Context

L'application CrewDayz intègre actuellement deux modes d'authentification via Supabase :
1. Authentification standard par identifiants (email et mot de passe).
2. Authentification sociale via Google OAuth (`signInWithGoogle`).

Sur l'interface de connexion (`LoginComponent`), le bouton de connexion Google ainsi que la ligne de séparation visuelle (« ou continuer avec ») sont systématiquement affichés. Or, dans certains environnements (notamment en développement local ou sur des déploiements spécifiques ne disposant pas d'identifiants OAuth Google configurés dans Supabase), cette option échoue ou n'est pas souhaitée.

Il est donc nécessaire de pouvoir activer ou désactiver l'authentification Google via la configuration d'environnement Angular de manière propre et réactive.

## Goals / Non-Goals

**Goals:**
- Déclarer une propriété de configuration booléenne `enableGoogleAuth` dans `src/environments/environment.ts` et `src/environments/environment.prod.ts`.
- Conditionner l'affichage du bloc Google (bouton OAuth et séparateur) dans `LoginComponent` avec la syntaxe de contrôle de flux native Angular `@if`.
- Sécuriser l'exécution de la méthode `signInWithGoogle()` dans `LoginComponent` avec un garde-fou vérifiant l'état de la configuration.

**Non-Goals:**
- Modifier la configuration ou les politiques de sécurité (RLS / Auth settings) internes du serveur Supabase.
- Supprimer ou déprécier la méthode `signInWithGoogle()` du service `SupabaseService`.
- Introduire un système dynamique multi-fournisseurs complexe (ex. SAML, SSO Azure AD, GitHub) hors du périmètre immédiat.

## Decisions

### 1. Déclaration de `enableGoogleAuth: boolean` dans les fichiers d'environnement
- **Choix retenu :** Ajouter `enableGoogleAuth: true` (ou `false`) directement dans `src/environments/environment.ts` et `src/environments/environment.prod.ts`.
- **Justification :** Approche standard, typée et cohérente avec les options existantes (`production`, `enableAuth`).
- **Alternative rejetée :** Un tableau de chaînes `authProviders: ['email', 'google']`, jugé inutilement complexe pour le besoin actuel ciblant spécifiquement Google.

### 2. Contrôle d'affichage avec `@if` natif Angular dans le template
- **Choix retenu :** Englober le séparateur `<div class="divider">` et le bouton `<button class="google-btn">` dans un bloc `@if (enableGoogleAuth)` (ou signal associé).
- **Justification :** Respect strict des règles de codage du projet (utilisation exclusive du nouveau contrôle de flux natif Angular `@if` au lieu de `*ngIf`).

### 3. Contrôle défensif dans le composant `LoginComponent`
- **Choix retenu :** Dans `signInWithGoogle()`, vérifier `if (!this.enableGoogleAuth)` avant tout appel à `supabaseService.signInWithGoogle()`. Si désactivé, définir un message d'erreur informatif.
- **Justification :** Évite tout appel API inutile ou erreur non gérée en cas d'appel intempestif.

## Risks / Trade-offs

- **[Oubli de la propriété dans un fichier d'environnement]** → Définir la propriété explicitement dans `environment.ts` et `environment.prod.ts`, avec une valeur de repli (fallback par défaut à `false` ou `true`) dans le composant.
