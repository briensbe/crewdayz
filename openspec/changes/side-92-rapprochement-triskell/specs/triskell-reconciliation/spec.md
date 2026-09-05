# Spec: Rapprochement Triskell & Crewdayz

## Overview

Permet d'importer un export Excel Triskell (.xlsx ou .xlsm) pour comparer les jours d'activité consommés déclarés dans Triskell avec les jours travaillés calculés dans Crewdayz.

## Requirements

### Requirement: Parsing du fichier Triskell
- Le système DOIT supporter les formats `.xlsx`, `.xlsm` et `.xls`.
- Le système DOIT parser la matrice à la volée côté client sans persistance en base de données.
- Le système DOIT détecter l'année du document (dans les lignes d'en-tête ou par défaut l'année courante).
- Le système DOIT identifier les blocs de mois (`JANV` à `DEC`) et localiser la colonne `Consommé`.
- Le système DOIT extraire les données des sections `ESN` et `Interne` en ignorant les lignes d'en-têtes et de totaux.

### Requirement: Matching automatique des collaborateurs
- Le système DOIT normaliser le texte de la cellule "Ressource" (retrait des accents, passage en minuscules, normalisation des espaces).
- Le système DOIT vérifier l'inclusion du prénom et du nom (ou nom et prénom) de chaque collaborateur de Crewdayz dans la chaîne Triskell.
- Le système DOIT gérer les libellés enrichis de type "Prénom NOM (Fin de mission)".
- Si aucun collaborateur Crewdayz ne correspond, la ligne DOIT être marquée comme "Non matché".

### Requirement: Calcul du référentiel Crewdayz & Écarts
- Pour chaque collaborateur matché, le système DOIT calculer les jours ouvrés du mois (hors week-ends et jours fériés français).
- Le système DOIT déduire les absences enregistrées dans Crewdayz (en excluant la catégorie `Formation` qui n'impacte pas le temps travaillé).
- Le système DOIT respecter les dates d'arrivée et de départ du collaborateur.
- L'écart est calculé selon : $\Delta = \text{Consommé Triskell} - \text{Jours Travaillés Crewdayz}$.
- Un écart $\Delta \neq 0$ DOIT être signalé comme une anomalie.

### Requirement: Tableau de bord & Inspection
- L'interface DOIT proposer un sélecteur d'onglets pour chaque mois disponible avec un badge indiquant le nombre d'anomalies.
- L'interface DOIT afficher des cartes KPIs (total consommé, total travaillé, nombre d'écarts, non-matchés).
- L'interface DOIT permettre de filtrer par statut (Tous, Écarts uniquement, Conformes, Non matchés) et par section (ESN, Interne).
- Le clic sur une ligne DOIT ouvrir une vue détaillée présentant les absences Crewdayz du mois.
- L'interface DOIT proposer un export du rapport de contrôle au format Excel (.xlsx).

### Requirement: Persistance de l'état de navigation (Session)
- Le système DOIT conserver en mémoire le résultat du parsing, le nom du fichier et le mois sélectionné lors de la navigation vers d'autres routes de l'application.
- Le retour sur la vue `/reconciliation` DOIT restaurer immédiatement l'état du dernier fichier analysé sans rechargement.
- L'action "Changer de fichier" DOIT réinitialiser l'état en mémoire du service.
