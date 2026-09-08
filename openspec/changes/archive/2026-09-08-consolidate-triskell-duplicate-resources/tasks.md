## 1. Modèles & Logique de consolidation dans le Service

- [x] 1.1 Enrichir les interfaces (`TriskellSourceEntry`, `ReconciliationRow`) dans `triskell-reconciliation.service.ts` pour inclure la liste des entrées sources Triskell associées à chaque ligne.
- [x] 1.2 Refactorer `buildMonthReconciliation` dans `triskell-reconciliation.service.ts` pour regrouper les lignes Triskell par collaborateur Crewdayz matché et additionner leurs consommations mensuelles.
- [x] 1.3 Déterminer dynamiquement le statut de section (`ESN`, `Interne`), l'unité et le fournisseur affichés sur la ligne consolidée en fonction de la ligne Triskell active sur le mois.
- [x] 1.4 Mettre à jour `exportReconciliationToExcel` pour exporter le rapport avec les lignes et totaux consolidés.

## 2. Interface Utilisateur & Modale d'Inspection

- [x] 2.1 Adapter l'affichage du tableau de réconciliation dans `triskell-reconciliation.component.html` et la gestion des filtres.
- [x] 2.2 Ajouter un bloc de visualisation dans la modale de détail présentant la décomposition des sous-lignes Triskell sources (ID Triskell, libellé, fournisseur, jours consommés) lorsqu'un collaborateur a plusieurs entrées.

## 3. Validation & Vérification

- [x] 3.1 Vérifier la compilation TypeScript (`ng build` ou `npm run build`).
- [x] 3.2 Valider le calcul des écarts $\Delta$, des KPIs globaux et l'absence de fausses anomalies sur des cas de transition ESN ➔ Interne.
