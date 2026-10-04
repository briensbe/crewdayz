## 1. Service d'export annuel

- [x] 1.1 Créer `src/app/services/annual-presence-export.service.ts` avec l'injection des dépendances (`AbsenceService`, `ToastService`).
- [x] 1.2 Implémenter la génération de la feuille de synthèse annuelle (« Synthèse [Année] ») reprenant le total mensuel travaillé par collaborateur et les soldes de fin d'année.
- [x] 1.3 Implémenter la construction des 12 feuilles mensuelles (« 01 - Janvier » à « 12 - Décembre ») avec colonnes collaborateurs, jours calendaires (1 à N), détection des week-ends et jours fériés français.
- [x] 1.4 Appliquer les styles et le formatage des cellules : cellule vide pour les jours travaillés, valeur numérique `1` ou `0.5` pour les absences avec fond pastel thématique clair selon la catégorie (`xlsx-js-style`), week-ends grisés et colonnes de totaux.
- [x] 1.5 Assembler les 13 onglets dans un classeur unique, générer le fichier `.xlsx` et gérer le retour utilisateur via toast.

## 2. Intégration dans la vue annuelle

- [x] 2.1 Injecter `AnnualPresenceExportService` dans `src/app/views/annual-view/annual-view.component.ts` et relier les actions d'export détaillé et de synthèse (modes filtré et complet).
- [x] 2.2 Refondre le menu déroulant du bouton « Exporter » dans `src/app/views/annual-view/annual-view.component.html` avec deux sections distinctes (« Synthèse annuelle » et « Export annuel détaillé multi-onglets »).
- [x] 2.3 Ajuster les styles CSS du menu déroulant dans `src/app/views/annual-view/annual-view.component.css` pour les séparateurs et en-têtes de section.

## 3. Tests et validation

- [x] 3.1 Ajouter des tests unitaires pour `AnnualPresenceExportService` couvrant la structure du classeur et le bon calcul des cellules d'absence.
- [x] 3.2 Exécuter la compilation du projet via `pnpm build` et s'assurer de l'absence de toute régression ou avertissement.
