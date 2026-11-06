# ADR 0010: Persistance Distante des Préférences Utilisateur dans Supabase via Flush Événementiel

## Status
Accepted

## Date
2026-11-04

## Context
Dans le contexte d'utilisation en entreprise de Crewdayz, les postes des collaborateurs sont soumis à des politiques de sécurité strictes (GPO) et des scripts de nettoyage automatique à chaque fermeture de session ou de navigateur.
Auparavant, les préférences visuelles et d'affichage (thème clair/sombre, largeurs des colonnes des tableaux, filtres actifs par vue, options de tri, et état de consultation des notes de version) étaient stockées directement dans le `localStorage` du navigateur via des clés isolées ou `storageSignal`.
Par conséquent, toutes les préférences étaient perdues quotidiennement, forçant les utilisateurs à reconfigurer leur espace de travail à chaque nouvelle connexion.

Il était nécessaire d'adopter une stratégie de persistance pérenne pour les préférences structurelles (thème, colonnes de tableaux, état de consultation des versions), tout en maîtrisant strictement le volume d'appels réseau vers la base de données Supabase et en évitant d'enregistrer des états d'interface hyper-volatils comme les filtres de recherche.

## Decision
Nous adoptons l'architecture suivante :

1. **Table PostgreSQL dédiée `cd_user_preferences` avec colonne `JSONB`** :
   - Création de la table `crewdayz.cd_user_preferences (user_id UUID PK, preferences JSONB, updated_at TIMESTAMPTZ)`.
   - Politiques RLS étanches limitées à `auth.uid() = user_id`, permettant à tout utilisateur authentifié (quel que soit son rôle applicatif `viewer`, `editor` ou `admin`) de lire et mettre à jour ses réglages sans risque d'élévation de privilèges sur `cd_user_profiles`.
   - Modèle JSON extensible permettant l'ajout de nouvelles préférences futures sans migration SQL.

2. **Store réactif en mémoire (`PreferencesService`)** :
   - Les composants et directives manipulent un état réactif en mémoire basé sur les Signaux Angular (`signal`, `computed`).
   - Zéro latence pour l'interface utilisateur (rendu fluide à 60fps).

3. **Stratégie d'écriture par Flush Événementiel (Levier D)** :
   - Aucun appel réseau en cours d'utilisation active de l'application.
   - Déclenchement de la synchronisation en base uniquement sur des événements clés du cycle de vie du navigateur :
     - Changement de visibilité de l'onglet : `document.addEventListener('visibilitychange')` (lorsque `document.visibilityState === 'hidden'`).
     - Déchargement / fermeture de page : `window.addEventListener('pagehide')`.
     - Déconnexion explicite : `SupabaseService.signOut()`.

4. **Vérification d'égalité profonde (Deep Diff) préalable** :
   - Avant tout envoi en base, comparaison de l'état mémoire avec l'instantané du dernier enregistrement.
   - Si aucune valeur n'a changé (ou si l'utilisateur a rétabli les valeurs d'origine au cours de la session), la requête `UPSERT` est annulée (0 requête réseau).

## Options Écartées au Final

Au cours de la phase d'exploration, plusieurs approches alternatives ont été examinées puis écartées :

1. **Conservation de `localStorage` ou migration vers `IndexedDB`** :
   - *Raison du rejet* : Les scripts d'entreprise et les GPO de fermeture de session purgent indifféremment `localStorage`, `sessionStorage` et les bases `IndexedDB`. Le problème de perte quotidienne persistait.
2. **Utilisation de Cookies HTTP / Cookies signés** :
   - *Raison du rejet* : Capacité restreinte (4 Ko max), injection systématique dans les en-têtes HTTP de chaque requête réseau de l'application, et risque d'être également purgés par les règles d'hygiène navigateur de l'entreprise.
3. **Stockage dans les métadonnées d'authentification Supabase (`raw_user_meta_data`)** :
   - *Raison du rejet* : L'API `supabase.auth.updateUser()` regénère le jeton JWT et rafraîchit la session auth à chaque écriture. Ce mécanisme n'est pas conçu pour stocker des états d'interface et alourdit inutilement le token d'authentification.
4. **Ajout d'une colonne `preferences` dans la table existante `cd_user_profiles`** :
   - *Raison du rejet* : La table `cd_user_profiles` est protégée par la politique RLS `Only admin can update profiles` pour empêcher la falsification du rôle (`admin`, `editor`, `viewer`). Ouvrir l'accès en écriture aux utilisateurs standards sur leur propre ligne aurait créé un risque d'élévation de privilèges ou nécessité des triggers complexes. La table dédiée garantit une séparation des responsabilités stricte.
5. **Stratégie d'écriture continue par Debounce court (ex: 300ms à 1s)** :
   - *Raison du rejet* : Aurait généré trop d'appels intermédiaires à la base de données lors des manipulations d'interface (ex: redimensionnements successifs de colonnes, bascules de thème), consommant inutilement du quota réseau et des connexions Supabase.
6. **Persistance en base de données des filtres et critères de recherche des tableaux** :
   - *Raison du rejet* : Les filtres de recherche et de sélection (`FilterState`, texte de recherche, collaborateurs épinglés) sont des états d'exploration très volatils et changeants au cours d'une session. Les sauvegarder en base de données augmenterait considérablement le volume de synchronisation et la fréquence des modifications d'état. Ils demeurent donc gérés localement dans le navigateur (mémoire / stockage local) et sont exclus de `cd_user_preferences`.

## Consequences

- **Positives** :
  - **Résilience absolue** : Les préférences survivent à tous les nettoyages de postes, changements de machines ou sessions en navigation privée.
  - **Économie maximale de requêtes** : Zéro écriture pendant l'activité normale, 0 écriture si aucun paramètre n'a changé, et au maximum 1 unique requête consolidée par session utilisateur.
  - **Sécurité et étanchéité** : Aucun risque d'escalade de privilèges grâce à la table dédiée `cd_user_preferences`.
  - **Extensibilité** : Le format JSONB permet d'ajouter de futurs réglages (ex: filtres favoris, colonnes masquées) sans toucher au schéma SQL.
- **Négatives / Précautions** :
  - Nécessite une session authentifiée pour récupérer les préférences distantes. Un cache local optimiste est maintenu en fallback pour éviter le clignotement (*anti-flicker*) sur la page de connexion initiale.
  - Comportement *last-hidden-wins* en cas d'ouverture simultanée de l'application sur plusieurs onglets.
