## Context

Dans Crewdayz, la gestion des absences et des présences s'appuie sur la table `cd_absences` stockée dans PostgreSQL / Supabase.
Actuellement, la déclaration d'une absence via `AbsenceModalComponent` permet de choisir une date de début et une date de fin, et génère systématiquement chaque jour ouvré consécutif sur l'intervalle.
Pour les collaborateurs à temps partiel (ex. 80% le mercredi, 50% sur plusieurs jours, ou 90% un vendredi sur deux), les gestionnaires doivent aujourd'hui poser chaque semaine ou chaque date une par une, ce qui est extrêmement fastidieux.

La solution retenue consiste à introduire une option de récurrence hebdomadaire paramétrable (inspirée du comportement d'Outlook / Google Calendar) intégrée directement dans la modale d'absence, tout en restant discrète et repliée par défaut pour ne pas alourdir la saisie standard.

## Goals / Non-Goals

**Goals:**
- Permettre la génération en masse d'absences régulières sur une plage temporelle (ex. toute une année calendaire).
- Supporter la périodicité en semaines (*toutes les X semaines*) et la sélection multiple de jours ouvrés (Lun, Mar, Mer, Jeu, Ven).
- Supporter la pose de demi-journées récurrentes (Matin, Après-midi ou Journée entière).
- Préserver strictement les jours fériés légaux français (`isFrenchPublicHoliday`).
- Préserver les événements et absences déjà saisis pour l'employé sur la période ciblée (aucun écrasement non sollicité).
- Fournir un aperçu prévisionnel immédiat dans la modale (*"X dates créées, Y dates ignorées"*).
- Enregistrer directement les absences individuelles dans `cd_absences` pour que chaque occurrence reste modifiable/supprimable manuellement à l'unité sans logique complexe de désynchronisation.
- Respecter le principe du "Deep Module" : extraire la logique algorithmique de génération dans un helper pur et testable unitairement (`recurrence-generator.ts`).

**Non-Goals:**
- Créer un moteur de récurrence virtuel ou dynamique (les absences sont matérialisées concrètement en base).
- Gérer un suivi de série d'événements liés avec identifiant de récurrence unique (la suppression se fait manuellement jour par jour selon les souhaits validés).
- Gérer des récurrences mensuelles complexes (ex. "le 2e mardi du mois"). Le besoin est focalisé sur le rythme hebdomadaire de travail (80%, 50%, etc.).

## Decisions

### 1. Extraction de la logique dans un module pur (`recurrence-generator.ts`)
- **Choix** : Découpler le calcul des dates de la couche composant Angular en créant `src/app/shared/utils/recurrence-generator.ts`.
- **Raison** : Respect strict du SRP (Single Responsibility Principle) et des Deep Modules. La fonction `generateRecurringDates(...)` est une fonction pure, déterministe, sans dépendance au DOM ni au framework, facilement testable avec Jest/Vitest.
- **Alternatives écartées** : Implémenter la boucle directement dans `AbsenceModalComponent` ou `MonthlyViewComponent`, ce qui surchargerait le composant au-delà de sa limite de responsabilité.

### 2. Option B pour les demi-journées (Période globale sur les jours cochés)
- **Choix** : L'utilisateur coche les jours souhaités (ex. [Mercredi] et [Vendredi]) et applique une période globale (Journée entière, Matin, ou Après-midi) pour ces jours.
- **Raison** : Simplicité ergonomique maximale. Cela évite d'encombrer l'interface avec des sous-sélecteurs radio pour chaque jour de la semaine. Si un employé a un rythme hybride (ex: mercredi journée entière + jeudi après-midi), deux soumissions rapides couvrent le besoin sans alourdir l'UI.

### 3. Matérialisation concrète dans `cd_absences` sans migration DB
- **Choix** : Chaque occurrence générée est enregistrée comme une ligne classique dans `cd_absences` avec sa date, sa période et sa catégorie (`Temps partiel` ou autre catégorie choisie).
- **Raison** : Compatibilité immédiate à 100% avec les écrans existants (vue mensuelle, vue annuelle, exports Excel/Triskell, calcul des soldes). Zéro impact sur la structure de la base Supabase.

### 4. Algorithme de calcul et intervalle en semaines
- **Choix** : L'intervalle de répétition ($N$ semaines) est calculé par rapport à la date de début sélectionnée :
  $$\text{semaineRelative} = \lfloor \frac{\text{différence en jours entre date et dateDébut}}{7} \rfloor$$
  Le jour est éligible si $(\text{semaineRelative} \pmod N) == 0$ et si son jour de la semaine (`getDay()`) fait partie des jours cochés.
- **Filtres de sécurité** :
  1. Si `isFrenchPublicHoliday(date)` est vrai $\rightarrow$ exclu.
  2. Si une absence existe déjà pour cet employé à cette date (et sur cette période) $\rightarrow$ exclu.

## Risks / Trade-offs

- **[Performance d'insertion en masse sur une année entière]** : Poser 52 semaines peut représenter jusqu'à ~100 ou 150 enregistrements d'un coup.
  - *Atténuation* : `AbsenceService.upsertAbsences` effectue déjà un upsert par lot (batch) dans Supabase en une seule requête HTTP. De plus, `cd_absences` dispose d'un index unique sur `(employee_id, date, period)`.
- **[Confusion possible si des absences existantes sont ignorées]** : L'utilisateur pourrait se demander pourquoi certains jours ne sont pas renseignés.
  - *Atténuation* : La simulation en direct dans la modale précise explicitement : *"X jours seront créés (Y jours ignorés car déjà posés ou fériés)"*.
