## Context

Dans Crewdayz, le suivi des présences et absences permet de piloter l'activité au mois ou à l'année. Les managers ont fréquemment besoin de transmettre une attestation ou un relevé mensuel officiel d'un collaborateur (ex: prestataire externe pour facturation, RH pour paie/contrôle des absences, client). Actuellement, seule une extraction annuelle consolidée de l'ensemble de l'effectif existe dans `AnnualViewComponent`.

Ce design décrit la création d'un service d'exportation dédié (`CollaboratorPresenceExportService`) produisant une feuille de calcul Excel `.xlsx` professionnelle, stylisée avec `xlsx-js-style`, directement exploitable et partageable depuis la vue mensuelle.

## Goals / Non-Goals

**Goals:**
- Générer un fichier Excel `.xlsx` individuel hautement lisible et formaté professionnellement pour un collaborateur donné sur un mois cible.
- Fournir un bloc de métadonnées complet : Collaborateur, Service, Équipe/Îlot, Site, Contrat, Société prestataire, Période (Mois Année).
- Fournir un récapitulatif KPI clair : Jours ouvrés réels, Jours travaillés, Total jours d'absences, Répartition par motif d'absence (CP, RTT, Maladie, Temps partiel, etc.).
- Fournir le calendrier journalier détaillé du mois : Jour, Date, Statut présence/absence, Période, Jours travaillés comptabilisés, Commentaire éventuel.
- Intégrer le déclencheur d'export dans la Vue Mensuelle (`monthly-view`) au niveau de la ligne du collaborateur.

**Non-Goals:**
- Exporter en format PDF (l'export Excel `.xlsx` permet des vérifications ou recalculs par les destinataires et correspond au standard de l'entreprise).
- Proposer l'export individuel depuis la liste globale des collaborateurs (`employee-list`).
- Modifier la structure de la base de données Supabase.

## Decisions

### 1. Utilisation de la librairie `xlsx-js-style`
- **Choix** : Réutiliser `xlsx-js-style` déjà installée et éprouvée dans `annual-view`.
- **Raison** : Permet d'appliquer des styles visuels complets (couleurs de fond pour les week-ends / fériés / absences, bordures, polices grasses, alignements) sans ajouter de dépendance externe lourde.

### 2. Création d'un service Angular dédié `CollaboratorPresenceExportService`
- **Choix** : Isoler la logique de calcul mensuel, d'agrégation d'absences et de mise en forme XLSX dans `src/app/services/collaborator-presence-export.service.ts`.
- **Raison** : Isole les règles de calcul et garantit la testabilité unitaire de la génération de fichier.

### 3. Calcul précis des statuts journaliers et des jours fériés
- **Choix** : Utiliser les fonctions de `src/utils/holidays.ts` (`isFrenchPublicHoliday`, `getFrenchPublicHolidayName`) et les absences issues de `AbsenceService`.
- **Raison** : Cohérence totale avec le comportement affiché dans les vues graphiques de l'application.

### 4. Structure de la feuille Excel générée
- **En-tête (Lignes 1-5)** : Carte d'identité du collaborateur et période concernée.
- **Bloc Synthèse (Lignes 7-13)** : Tableau synthétique des métriques du mois (Ouvrés, Travaillés, Absences avec sous-totaux par motif).
- **Tableau détaillé (Lignes 15+)** : Colonnes `Jour`, `Date`, `Statut`, `Période`, `Jours Travaillés`, `Type d'absence`, `Commentaire`.

## Risks / Trade-offs

- **[Absences non chargées en mémoire]** : Si l'export est déclenché pour une année non chargée dans le signal `AbsenceService`, le service s'assure que les absences de l'année cible sont bien récupérées via `AbsenceService.fetchAbsencesForYear(...)`.
