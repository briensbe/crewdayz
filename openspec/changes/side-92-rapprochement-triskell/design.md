# Design Document: Rapprochement Triskell & Crewdayz

## Context & Architecture

Le besoin consiste à automatiser le contrôle de cohérence entre les déclarations mensuelles Triskell et les présences réelles de Crewdayz sans impacter les pages existantes.

### Architecture globale

```
[ Export Excel Triskell (.xlsx/.xlsm) ]
                  │
                  ▼
   TriskellReconciliationService
   ├── parseTriskellWorkbook() (XLSX ArrayBuffer -> TriskellRawEntry[])
   ├── matchEmployee() (Inclusion & Normalisation de nom)
   ├── computeCrewdayzWorkedDays() (Jours ouvrés - Absences)
   ├── buildMonthReconciliation() (Synthèse & Détection d'écarts)
   └── exportReconciliationToExcel() (Génération du rapport XLSX)
                  │
                  ▼
   TriskellReconciliationComponent (/reconciliation)
   ├── Upload Dropzone
   ├── Navigation par onglets mensuels
   ├── Cartes KPIs
   ├── Barre de filtres & recherche
   ├── Tableau de données réactif
   └── Modal d'inspection détaillée des absences
```

## Key Decisions

1. **Traitement côté client à la volée** : Utilisation de `xlsx` et `xlsx-js-style` dans le navigateur pour garantir une exécution rapide, confidentielle et sans persistance en base de données.
2. **Matching par inclusion de tokens normalisés** : Au lieu d'expressions régulières figées, la normalisation (`normalizeString`) supprime accents, diacritiques et majuscules, puis vérifie que la chaîne Triskell contient le prénom et le nom de l'employé.
3. **Même référentiel de calcul que la Vue Annuelle** : Cohérence totale avec les règles métiers déjà éprouvées (jours ouvrés hors fériés/we, exclusions des formations, calcul des demi-journées, dates d'arrivée/départ).
