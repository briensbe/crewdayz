## 1. Base de données & Sécurité Supabase

- [x] 1.1 Créer le script de migration `supabase/scripts/0004_user_preferences.sql` définissant la table `crewdayz.cd_user_preferences` (`user_id`, `preferences jsonb`, `updated_at`).
- [x] 1.2 Configurer les politiques RLS permettant aux utilisateurs authentifiés de lire et d'insérer/mettre à jour uniquement leurs propres préférences (`auth.uid() = user_id`).

## 2. Modèle de données & Service Centralisé des Préférences

- [x] 2.1 Définir l'interface TypeScript `UserPreferences` dans `src/app/models/preferences.model.ts`.
- [x] 2.2 Créer `PreferencesService` dans `src/app/services/preferences.service.ts` avec gestion d'état par Signaux Angular (`signal`, `computed`).
- [x] 2.3 Implémenter l'algorithme d'égalité profonde (*deep diff*) et la méthode `flush()` conditionnelle (0 requête si inchangé).
- [x] 2.4 Enregistrer les écouteurs d'événements de cycle de vie du navigateur (`visibilitychange` vers `hidden`, et `pagehide`) pour déclencher le flush automatique.
- [x] 2.5 Développer la suite de tests unitaires complète `src/app/services/preferences.service.spec.ts`.

## 3. Intégration dans le Cycle de Connexion / Déconnexion

- [x] 3.1 Raccorder `SupabaseService` pour charger les préférences distantes au démarrage d'une session authentifiée.
- [x] 3.2 Intercepter l'action de déconnexion dans `SupabaseService.signOut()` pour attendre le `flush()` avant d'invalider la session.

## 4. Raccordement des Composants & Directives Existants

- [x] 4.1 Adapter `ThemeService` pour synchroniser le thème utilisateur avec `PreferencesService` tout en maintenant le cache anti-flicker.
- [x] 4.2 Adapter `ResizableDirective` pour déléguer la mémorisation des largeurs de colonnes à `PreferencesService` sans écriture directe unitaire.
- [x] 4.3 Mettre à jour les vues de tableaux (`AnnualViewComponent`, `MonthlyViewComponent`, `EmployeeListComponent`) pour initialiser leurs largeurs depuis `PreferencesService`.
- [x] 4.4 Découpler les filtres et options de recherche des vues (`AnnualViewComponent`, `MonthlyViewComponent`, `EmployeeListComponent`, `DashboardComponent`) de `PreferencesService` / Supabase afin qu'ils ne déclenchent aucune écriture en BDD (gestion locale uniquement).
- [x] 4.5 Adapter `ReleaseNotesComponent` pour lire et enregistrer la dernière version consultée via `PreferencesService`.

## 5. Vérification & Tests de Non-Régression

- [x] 5.1 Exécuter la compilation TypeScript et le build de production via `pnpm build`.
- [x] 5.2 Exécuter l'ensemble des tests unitaires via `pnpm test`.
