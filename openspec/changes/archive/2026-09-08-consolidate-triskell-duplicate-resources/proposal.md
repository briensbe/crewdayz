## Why

Dans les exports d'activité Triskell, un collaborateur qui change de statut en cours d'année (par exemple, un prestataire ESN embauché en interne) apparaît sur plusieurs lignes distinctes avec des identifiants et libellés Triskell différents (ex: `1203 - Camille CHEVRAIN (ACENSI)` et `1628 - Camille CHEVRAIN`).

Actuellement, le module de réconciliation traite chaque ligne Triskell individuellement. Cela génère de fausses anomalies (ex: la ligne ESN affiche 0j de consommé face à 22j travaillés dans Crewdayz), double le total des jours travaillés Crewdayz dans les KPIs globaux, et rend l'analyse des mois de transition erronée.

Cette évolution permet de consolider automatiquement toutes les lignes Triskell associées à un même collaborateur Crewdayz en une ligne unique consolidée, en additionnant d'abord les jours consommés avant de comparer aux saisies Crewdayz.

## What Changes

- **Consolidation automatique par collaborateur Crewdayz** : Toutes les entrées Triskell qui matchent le même collaborateur Crewdayz sont sommées pour le mois sélectionné.
- **Affichage en ligne unique** : Une seule ligne par collaborateur matché apparaît dans le tableau de réconciliation.
- **Statut & Métadonnées dynamiques au mois** : La section (`ESN`, `Interne` ou `Mixte`), le fournisseur et l'unité affichés sur la ligne consolidée reflètent la ligne Triskell active sur le mois (ou le statut dominant en cas de transition multi-lignes sur le même mois).
- **KPIs globaux corrigés** : Le total travaillé Crewdayz et le décompte des collaborateurs ne comptent chaque collaborateur qu'une seule fois.
- **Détail enrichi dans la modale** : La modale détail affiche la liste des sous-lignes Triskell sources et leurs consommations respectives en complément des absences.
- **Export Excel consolidé** : Le rapport Excel exporté reflète la vue consolidée par collaborateur avec la mention des lignes et statuts réconciliés.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `triskell-reconciliation`: Prise en compte de la consolidation et de l'addition des jours consommés pour les doublons Triskell matchant un même collaborateur Crewdayz.

## Impact

- `src/app/services/triskell-reconciliation.service.ts`: Refonte de la fonction `buildMonthReconciliation` et de l'export Excel pour agréger les lignes Triskell par collaborateur.
- `src/app/views/triskell-reconciliation/triskell-reconciliation.component.html` & `.ts`: Affichage de la ligne consolidée et affichage du détail des sous-lignes Triskell dans la modale d'inspection.
- Modèles TypeScript (`ReconciliationRow`, `TriskellRawEntry` ou nouveau type `TriskellSourceEntry`).
