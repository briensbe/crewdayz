## 1. Module métier de calcul des récurrences (Deep Module & TDD)

- [x] 1.1 Créer l'utilitaire `src/app/shared/utils/recurrence-generator.ts` avec les interfaces `RecurrenceConfig`, `RecurrenceResult` et la fonction pure `generateRecurringDates`
- [x] 1.2 Implémenter le filtrage des jours fériés légaux français via `isFrenchPublicHoliday`
- [x] 1.3 Implémenter l'exclusion et la détection des conflits avec les absences préexistantes du collaborateur
- [x] 1.4 Écrire la suite de tests unitaires complète dans `src/app/shared/utils/recurrence-generator.spec.ts` (test 80% hebdo, test 2 semaines, exclusion jours fériés, conflits)

## 2. Évolution de l'interface utilisateur de la modale d'absence

- [x] 2.1 Ajouter les signaux réactifs dans `src/app/shared/absence-modal/absence-modal.component.ts` pour gérer le toggle de récurrence, les jours de la semaine cochés, l'intervalle et la période
- [x] 2.2 Implémenter le calcul en direct (computed signal) de la prévisualisation (*"X jours seront créés, Y ignorés"*)
- [x] 2.3 Adapter le payload de sortie `AbsenceSavePayload` ou étendre l'émission de sauvegarde pour transmettre la liste des dates récurrentes
- [x] 2.4 Intégrer les éléments d'interface dans `src/app/shared/absence-modal/absence-modal.component.html` (toggle récurrence, sélecteur de jours, période globale, indicateurs de simulation)
- [x] 2.5 Ajouter les styles CSS associés dans `src/app/shared/absence-modal/absence-modal.component.css` en respectant le thème clair et sombre

## 3. Intégration de la sauvegarde en masse dans les vues

- [x] 3.1 Adapter `onModalSave` dans `src/app/views/monthly-view/monthly-view.component.ts` pour traiter la génération par récurrence et déléguer à `AbsenceService.upsertAbsences`
- [x] 3.2 Notifier l'utilisateur via `ToastService` du succès de la génération et du nombre de jours enregistrés

## 4. Validation, Tests & Qualité de code

- [x] 4.1 Exécuter la suite de tests unitaires via `pnpm test`
- [x] 4.2 Vérifier la compilation et le build complet via `pnpm build`
- [x] 4.3 Contrôler la conformité aux règles d'architecture (limite de taille des fichiers, composants standalone, typage strict)
