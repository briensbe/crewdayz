## Tasks

- [x] **1. Modèle de données & Types** <!-- id: 1-preferences-model -->
  - [x] 1.1 Définir les types `ScreenId` et `ScreenPreferences` dans `src/app/models/preferences.model.ts`
  - [x] 1.2 Étendre l'interface `UserPreferences` avec la propriété optionnelle `screens` et mettre à jour `DEFAULT_USER_PREFERENCES`

- [x] **2. Évolution du service PreferencesService** <!-- id: 2-preferences-service -->
  - [x] 2.1 Ajouter les méthodes d'accès et de mise à jour `getScreenPreference` et `setScreenPreference` dans `src/app/services/preferences.service.ts`
  - [x] 2.2 Vérifier la prise en compte dans le calcul réactif `isDirty` et la sérialisation vers Supabase
  - [x] 2.3 Ajouter les tests unitaires correspondants dans `src/app/services/preferences.service.spec.ts`

- [x] **3. Évolution transparente de storageSignal** <!-- id: 3-storage-signal -->
  - [x] 3.1 Implémenter le helper de détection et de parsing des clés de préférences d'écran dans `src/utils/storage-signal.ts`
  - [x] 3.2 Implémenter la lecture initiale depuis `PreferencesService` lors de l'initialisation du signal
  - [x] 3.3 Implémenter l'effet réactif de synchronisation vers `PreferencesService` lors d'une mutation du signal
  - [x] 3.4 Ajouter et enrichir les tests unitaires de `src/utils/storage-signal.spec.ts`

- [x] **4. Vérification globale et validation** <!-- id: 4-validation -->
  - [x] 4.1 Exécuter la suite complète de tests unitaires via `pnpm test`
  - [x] 4.2 Vérifier la compilation de l'application via `pnpm build`
