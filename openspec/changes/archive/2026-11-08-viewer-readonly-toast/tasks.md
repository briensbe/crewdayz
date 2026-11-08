## 1. Gestion de la notification de lecture seule par visite de la vue

- [x] 1.1 Ajouter la gestion du drapeau d'instance (`readOnlyToastShown`) dans `MonthlyViewComponent`.
- [x] 1.2 Déclencher `ToastService.info()` lors de la première tentative d'interaction sur une cellule en mode `isReadOnly()` (`onCellMouseDown`, `openAddAbsenceModal`, `openEditAbsenceModal`) et réinitialiser naturellement au changement de page.

## 2. Harmonisation de l'affordance visuelle dans la vue mensuelle

- [x] 2.1 Appliquer une classe conditionnelle de lecture seule sur la table de la vue mensuelle lorsque `isReadOnly()` est actif.
- [x] 2.2 Adapter les styles CSS pour afficher un curseur par défaut (`cursor: default`) et désactiver la surbrillance d'édition trompeuse sur les cellules vides.

## 3. Validation et non-régression

- [x] 3.1 Vérifier le comportement avec le profil `viewer` (affichage unique du toast par consultation de la vue, réinitialisé au changement de page).
- [x] 3.2 Vérifier la persistance du comportement normal d'édition pour les rôles `editor` et `admin`.
- [x] 3.3 Valider la compilation de l'application via `pnpm build`.
