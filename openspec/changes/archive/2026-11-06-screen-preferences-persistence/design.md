## Context

L'application Crewdayz utilise un store de préférences centralisé [`PreferencesService`](src/app/services/preferences.service.ts) qui enregistre un objet JSON dans la table Supabase `crewdayz.cd_user_preferences`.

Jusqu'à présent, seules les largeurs de colonnes redimensionnées (`columnWidths`), le thème (`theme`) et les notes de version (`releaseNotes`) étaient pris en charge par `PreferencesService`. Les composants de vue (`AnnualViewComponent`, `MonthlyViewComponent`, `EmployeeListComponent`) utilisent l'utilitaire réactif [`storageSignal`](src/utils/storage-signal.ts) pour gérer :
- Le format d'affichage du nom (`crewdayz_annual_name_display_format`, etc.)
- Le masquage des colonnes secondaires (*Service*, *Équipe*, *Site*, *Type*) (`crewdayz_annual_show_columns`, `crewdayz_monthly_show_columns`)
- Le tri des collaborateurs (`crewdayz_annual_list_sort_field`, `crewdayz_annual_list_sort_direction`, etc.)

Ces valeurs restaient confinées à `localStorage`. Dans des contextes de postes d'entreprise réinitialisant le cache local à chaque fermeture, l'utilisateur perd ses réglages.

## Goals / Non-Goals

### Goals
- Étendre le modèle de données `UserPreferences` avec un dictionnaire `screens` structuré par écran (`monthly`, `annual`, `employeeList`).
- Gérer l'indépendance stricte des réglages entre chaque écran (ex: `nameDisplayFormat`, `showExtraColumns`, `sortField`, `sortDirection`).
- Intégrer la synchronisation directement dans `storageSignal` pour que les composants existants bénéficient de la persistance en base sans modification de leurs templates ou de leurs signatures internes.
- Garantir le respect des règles de sobriété d'écriture existantes (pas d'appels réseau intempestifs, flush sur `visibilitychange`, `pagehide`, `signOut` et comparaison d'état `deepEqual`).

### Non-Goals
- Ajouter un bouton chevron de repli des colonnes sur la liste des collaborateurs (`employee-list`) : les colonnes y restent fixes.
- Persister les filtres de recherche textuels ou de sélection (qui doivent rester éphémères pour offrir une vue propre au démarrage de chaque journée).

## Decisions

### 1. Structure du modèle `UserPreferences`

Nous enrichissons `UserPreferences` avec une sous-structure typée :
```typescript
export type ScreenId = 'monthly' | 'annual' | 'employeeList';

export interface ScreenPreferences {
  nameDisplayFormat?: 'last_first' | 'first_last';
  showExtraColumns?: boolean;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface UserPreferences {
  theme?: ThemePreference;
  columnWidths?: { [key: string]: number | undefined };
  releaseNotes?: { lastSeenVersion?: string };
  screens?: {
    monthly?: ScreenPreferences;
    annual?: ScreenPreferences;
    employeeList?: ScreenPreferences;
  };
}
```

### 2. Mappage des clés `storageSignal`

Pour conserver la totale transparence vis-à-vis des composants, `storageSignal` analyse les clés passées :
- Clés de format de nom : `crewdayz_{screen}_name_display_format`
- Clés d'affichage des colonnes : `crewdayz_{screen}_show_columns`
- Clés de tri : `crewdayz_{screen}_list_sort_field` et `crewdayz_{screen}_list_sort_direction`

Une fonction d'extraction associe chaque clé à l'écran cible (`ScreenId`) et à la propriété correspondante dans `PreferencesService`.

```
┌────────────────────────────────────────────────────────┐
│             storageSignal(key, initialValue)           │
├────────────────────────────────────────────────────────┤
│ 1. Détection du type de clé :                          │
│    - isColumnWidthKey(key)                             │
│    - isScreenPreferenceKey(key)                        │
│ 2. Lecture initiale :                                  │
│    PreferencesService (si chargé) -> localStorage      │
│ 3. Signal réactif créé                                 │
│ 4. Effect de synchronisation :                         │
│    -> localStorage.setItem                             │
│    -> PreferencesService.setScreenPreference(screen,...) │
└────────────────────────────────────────────────────────┘
```

### 3. Cycle de vie & rétrocompatibilité

- Lors du premier chargement ou si la BDD ne contient pas encore la clé `screens`, le système retombe élégamment sur les valeurs par défaut ou les valeurs déjà présentes dans le `localStorage`.
- Aucune migration de schéma SQL Supabase n'est requise : PostgreSQL stocke `preferences` en type `jsonb`, permettant une extension de structure sans impact sur les données existantes.

## Risks / Trade-offs

- **Délai d'initialisation asynchrone** : Au démarrage immédiat de l'application (avant que le premier appel Supabase ne revienne), le composant lit d'abord le `localStorage`. Dès que `PreferencesService` termine son chargement depuis Supabase, les valeurs du signal peuvent être synchronisées. L'expérience reste instantanée sans clignotement visible pour l'utilisateur.
