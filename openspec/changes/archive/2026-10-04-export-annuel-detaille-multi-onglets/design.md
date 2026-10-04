## Context

L'application Crewdayz permet aujourd'hui d'exporter :
- Une synthèse annuelle sur 1 seule feuille Excel récapitulant les jours travaillés par mois.
- Un relevé mensuel individuel pour un collaborateur donné (`CollaboratorPresenceExportService`).

Les gestionnaires ont besoin d'archiver ou de partager une vision détaillée complète de l'année pour l'ensemble des collaborateurs en un seul document. Ce document doit contenir un onglet de synthèse et 12 onglets mensuels détaillés (un par mois) au format matriciel (lignes = collaborateurs, colonnes = jours du mois).

## Goals / Non-Goals

**Goals :**
- Générer un classeur Excel unique (`.xlsx`) composé de 13 onglets (1 synthèse annuelle + 12 onglets mensuels détaillés).
- Pour chaque mois, présenter une matrice claire des collaborateurs avec les jours du mois (1 à 28/29/30/31) et les totaux mensuels (jours ouvrés, travaillés, absences).
- Laisser vides les cellules des jours ouvrés travaillés afin d'alléger la lecture.
- Afficher uniquement la valeur numérique `1` ou `0.5` en cas d'absence, avec un fond pastel selon la catégorie d'absence (thème clair).
- Griser visuellement les week-ends et distinguer les jours fériés.
- Permettre l'export soit pour l'ensemble des collaborateurs actifs, soit uniquement pour ceux correspondant aux filtres appliqués dans l'interface.
- Fournir un menu déroulant clair et structuré dans la vue annuelle pour déclencher les différents types d'exports.

**Non-Goals :**
- Réexporter les commentaires textuels détaillés au sein des cellules de la matrice mensuelle (pour éviter d'alourdir la feuille).
- Modifier le format de l'export individuel existant de la vue mensuelle.

## Decisions

### 1. Création d'un service dédié `AnnualPresenceExportService`
- **Décision :** Créer un service dédié `AnnualPresenceExportService` (injectable en `root`) pour gérer la génération des exports annuels (synthèse simple et détaillé multi-onglets), plutôt que de surcharger le composant `AnnualViewComponent` ou le service de relevé individuel `CollaboratorPresenceExportService`.
- **Rationnel :** Séparation des responsabilités, testabilité unitaire isolée et allègement du composant d'interface.
- **Alternative considérée :** Mettre la logique directement dans `AnnualViewComponent`. Rejeté car le code de mise en forme `xlsx-js-style` est volumineux et polluerait le composant de vue.

### 2. Formatage visuel basé sur `xlsx-js-style`
- **Décision :** Utiliser la librairie existante `xlsx-js-style` déjà installée et éprouvée dans le projet pour styliser les cellules (couleurs d'en-tête, bordures fines, fonds pastels, alignements).
- **Palette pastel (thème clair) :**
  - En-tête : Bleu marine foncé (`#1E3A8A`) avec texte blanc.
  - Absence CP : Fond violet très clair (`#F3E8FF`), texte violet (`#6B21A8`).
  - Absence RTT : Fond orange/ambre très clair (`#FEF3C7`), texte ambre (`#B45309`).
  - Absence Maladie : Fond rose/rouge très clair (`#FEE2E2`), texte rouge (`#B91C1C`).
  - Absence Maternité : Fond rose très clair (`#FCE7F3`), texte rose foncé (`#BE185D`).
  - Absence Formation : Fond vert très clair (`#DCFCE7`), texte vert foncé (`#15803D`).
  - Absence Autre / Exceptionnel : Fond gris-bleu très clair (`#F1F5F9`), texte ardoise (`#334155`).
  - Week-ends : Fond gris neutre (`#F1F5F9`).
  - Jours fériés : Fond bleu ciel (`#E0F2FE`).
  - Totaux et pieds de tableau : Fond ardoise clair (`#E2E8F0`) avec texte gras.

### 3. Calculs et structure des données
- Les absences de l'année courante sont déjà chargées en mémoire via `AbsenceService.fetchAbsencesForYear(year)`.
- Pour chaque mois, la boucle itère sur les jours calendaires (1 à N) :
  - Détection week-end via `date.getDay() === 0 || date.getDay() === 6`.
  - Détection jour férié via la fonction existante `isFrenchPublicHoliday(date)`.
  - Détection des absences du collaborateur sur le jour concerné.
  - Calcul cumulé des jours ouvrés théoriques, jours travaillés et absences.

### 4. Structuration du menu déroulant dans `AnnualViewComponent`
- Le menu déroulant du bouton « Exporter » présentera deux sections clairement séparées :
  - Section 1 : « Synthèse annuelle » (options : Données filtrées / Tous les collaborateurs).
  - Section 2 : « Export annuel détaillé multi-onglets » (options : Données filtrées / Tous les collaborateurs).

## Risks / Trade-offs

- **[Performance génération multi-onglets]** : Générer 13 onglets contenant chacun 30 à 100 collaborateurs et jusqu'à 31 jours représente plusieurs dizaines de milliers de cellules.
  - *Atténuation :* `xlsx-js-style` génère le classeur en mémoire en moins de 1 à 2 secondes pour ces volumes côté client. Un toast ou état de chargement informe l'utilisateur pendant la génération.
- **[Taille du fichier Excel]** : L'ajout de styles sur chaque cellule peut légèrement augmenter le poids du fichier `.xlsx`.
  - *Atténuation :* L'omission des styles sur les cellules travaillées vides et l'optimisation des objets de style partagés permet de maintenir une taille de fichier très raisonnable (< 2 Mo).

## Open Questions

- Aucune question ouverte bloquante identifiée. Les choix techniques et fonctionnels ont été validés lors de la phase d'exploration.
