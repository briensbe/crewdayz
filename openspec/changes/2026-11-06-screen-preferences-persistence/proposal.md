## Why

Actuellement, l'application Crewdayz persiste déjà dans Supabase (`cd_user_preferences`) le thème utilisateur, les largeurs de colonnes personnalisées ainsi que la dernière version vue des release notes.

Cependant, plusieurs préférences de confort visuel propres à chaque écran restent cantonnées exclusivement au stockage local (`localStorage`) via `storageSignal` :
- Le format d'affichage du nom du collaborateur (**NOM Prénom** ou **Prénom NOM**).
- L'état déplié ou replié (**expand / collapse**) des colonnes supplémentaires (*Service*, *Équipe*, *Site*, *Type*) sur les vues Annuelle et Mensuelle.
- Le critère et sens de **tri par collaborateur** sur chaque écran.

En entreprise, les postes clients subissent fréquemment des purges automatiques de leur stockage local (`localStorage`) lors de la fermeture du navigateur ou de l'application de stratégies de groupe (GPO). Les utilisateurs perdent ainsi systématiquement leur configuration d'affichage et doivent la reparamétrer à chaque session.

L'objectif de cette évolution est d'intégrer ces préférences d'écrans dans la structure persistée en base de données Supabase (`cd_user_preferences`), de manière indépendante pour chaque écran, tout en conservant une synchronisation transparente et sans rupture pour les composants existants via l'utilitaire `storageSignal`.

## What Changes

- **Extension du modèle de données `UserPreferences`** (`src/app/models/preferences.model.ts`) :
  - Définition d'une structure dédiée aux réglages par écran `ScreenPreferences` contenant :
    - `nameDisplayFormat` : `'last_first'` | `'first_last'`
    - `showExtraColumns` : `boolean` (spécifique aux vues Mensuelle et Annuelle)
    - `sortField` : champ de tri actif
    - `sortDirection` : `'asc'` | `'desc'`
  - Ajout du bloc `screens?: { monthly?: ScreenPreferences; annual?: ScreenPreferences; employeeList?: ScreenPreferences; }` dans `UserPreferences`.
- **Enrichissement du service de préférences `PreferencesService`** (`src/app/services/preferences.service.ts`) :
  - Ajout de méthodes d'accès et de mise à jour pour les préférences d'écrans (`getScreenPreference`, `setScreenPreference`).
  - Prise en compte de ces réglages dans la détection des modifications (`isDirty`) et la synchronisation événementielle vers Supabase (flush on visibilitychange, pagehide, signout).
- **Évolution transparente de l'utilitaire `storageSignal`** (`src/utils/storage-signal.ts`) :
  - Détection automatique des clés correspondant aux formats de noms, à l'affichage des colonnes et aux tris d'écrans (`crewdayz_*_name_display_format`, `crewdayz_*_show_columns`, `crewdayz_*_sort_field`, `crewdayz_*_sort_direction`).
  - Initialisation prioritaire à partir de `PreferencesService` si les données distantes sont déjà chargées, avec fallback vers `localStorage`.
  - Propagation automatique de tout changement de signal vers `PreferencesService` pour planification de la sauvegarde en base.
  - Conservation de l'écriture miroir dans `localStorage` pour assurer la rapidité du premier rendu avant chargement réseau.
- **Zéro modification intrusive des templates de vues** :
  - Les composants `AnnualViewComponent`, `MonthlyViewComponent` et `EmployeeListComponent` continuent d'utiliser leurs `storageSignal` actuels sans modifier leur template HTML ou leur logique interne.

## Capabilities

### New Capabilities
<!-- Aucune nouvelle capability de haut niveau n'est créée -->

### Modified Capabilities
- `user-preferences`: Extension de la spécification pour couvrir la gestion et la persistance des préférences de vue par écran (format du nom, affichage des colonnes secondaires, état du tri).

## Impact

- **Modèles TypeScript** : `src/app/models/preferences.model.ts`
- **Services applicatifs** : `src/app/services/preferences.service.ts` et tests unitaires `src/app/services/preferences.service.spec.ts`
- **Utilitaires** : `src/utils/storage-signal.ts` et tests unitaires `src/utils/storage-signal.spec.ts`
- **Base de données Supabase** : Aucune modification de schéma SQL requise (la colonne existante `preferences jsonb` de `cd_user_preferences` accueille naturellement les nouvelles propriétés de manière rétrocompatible).
