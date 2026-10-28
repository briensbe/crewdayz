# ADR 0009: Génération Matérialisée Directe des Absences Récurrentes

## Status
Accepted

## Date
2026-10-28

## Context
Dans Crewdayz, les absences des collaborateurs (CP, RTT, Maladie, Temps partiel, etc.) sont stockées sous forme de lignes discrètes dans la table PostgreSQL `cd_absences`.
Pour les collaborateurs ayant un rythme de travail à temps partiel (80% avec un jour non travaillé par semaine, 50%, etc.), la saisie manuelle de chaque occurrence est rébarbative.
Deux approches d'architecture étaient envisageables :
1. **Moteur dynamique / virtuel de récurrence** : enregistrer une règle contractuelle (ex: `weekly on wednesday`) et calculer virtuellement les absences à la volée dans chaque vue (calendrier mensuel, annuel, exports, soldes).
2. **Génération matérialisée directe** : un générateur calcule et persiste les lignes d'absence concrètes dans `cd_absences` sur une plage temporelle donnée, avec filtres de non-écrasement.

## Decision
Nous choisissons la **Génération Matérialisée Directe** :
1. **Persistance unitaire standard** :
   - Chaque jour récurrent est inséré comme une ligne réelle dans `cd_absences` via `AbsenceService.upsertAbsences`.
   - Aucun schéma ni table supplémentaire n'est requis dans Supabase.
   - Compatibilité totale et immédiate avec tous les écrans, modules de calcul, exports Excel/Triskell et synchronisation Realtime existants.
2. **Isolation fonctionnelle (Deep Module)** :
   - L'algorithme de calcul des dates, des intervalles hebdomadaires et des règles d'exclusion (jours fériés et absences existantes) est strictement isolé dans une fonction utilitaire pure `recurrence-generator.ts`, indépendante de la couche UI et testable unitairement à 100%.
3. **Contrôle et flexibilité utilisateur** :
   - Préservation stricte des jours fériés légaux français et des absences préexistantes.
   - Chaque absence générée reste modifiable ou supprimable manuellement à l'unité.

## Consequences
- **Positives** :
  - Zéro dette technique sur les moteurs d'affichage et d'export existants.
  - Pas de complexité liée à la gestion d'exceptions virtuelles d'un moteur de règles récurrentes.
  - Découplage fort entre le calcul métier des dates et les composants Angular.
- **Négatives / Précautions** :
  - Si le rythme d'un employé change (ex. changement de jour off), la suppression des anciennes absences doit être effectuée manuellement sur les jours concernés ou via un filtrage d'administration.
