## 1. Modèle & Composant de Filtres

- [x] 1.1 Mettre à jour l'interface `FilterState` dans `filters.component.ts` pour ajouter `pinnedEmployees?: string[]`.
- [x] 1.2 Ajouter l'état réactif et les handlers (`selectedPinnedEmployees`, `togglePinnedEmployee`, `clearPinnedEmployees`) dans `FiltersComponent`.
- [x] 1.3 Intégrer le dropdown de sélection dédié `[📌 + Ajouter hors filtre]` avec recherche interne et cases à cocher dans `filters.component.html` et `filters.component.css`.
- [x] 1.4 Ajouter la section des badges actifs pour les personnes épinglées sous la barre de filtres avec boutons de suppression individuelle (`✖`).

## 2. Intégration dans la Vue Mensuelle (Monthly View)

- [x] 2.1 Mettre à jour `filteredEmployees` dans `monthly-view.component.ts` pour implémenter la logique d'inclusion additive `(matchesStandard || isPinned) && matchesSearch && matchesOnlyActive`.
- [x] 2.2 Ajouter la méthode/helper de détection `isHorsFiltre(emp)` dans `monthly-view.component.ts`.
- [x] 2.3 Ajouter le badge/icône 📌 indicateur sur la colonne du collaborateur dans `monthly-view.component.html` et `monthly-view.component.css`.
- [x] 2.4 Vérifier la bonne prise en compte des collaborateurs épinglés dans les calculs `profileWeeklyAvailability` et les totaux d'absences.

## 3. Intégration dans la Vue Annuelle et les Autres Vues

- [x] 3.1 Mettre à jour `filteredEmployees`, la détection `isHorsFiltre(emp)` et les indicateurs visuels dans `annual-view.component.ts` et `annual-view.component.html`.
- [x] 3.2 Harmoniser le comportement de filtrage additif et la persistance dans `dashboard.component.ts` et `employee-list.component.ts`.

## 4. Tests et Validation

- [x] 4.1 Vérifier la persistance dans `localStorage` après rechargement de page.
- [x] 4.2 Tester les combinaisons de filtres (équipe filtrée + collaborateur extérieur épinglé, recherche textuelle, désépinglage).
- [x] 4.3 Vérifier l'absence d'erreurs de compilation TypeScript et de linter.
