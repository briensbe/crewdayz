# triskell-reconciliation Specification

## Purpose
Permet d'importer un export Excel Triskell (.xlsx ou .xlsm) pour comparer les jours d'activité consommés déclarés dans Triskell avec les jours travaillés calculés dans Crewdayz.

## Requirements

### Requirement: Parsing du fichier Triskell
Le système SHALL supporter les formats `.xlsx`, `.xlsm` et `.xls`.
Le système SHALL parser la matrice ou le tableau croisé dynamique à la volée côté client sans persistance en base de données.
Le système SHALL détecter l'année du document (dans les lignes d'en-tête ou par défaut l'année courante).
Le système SHALL identifier les blocs de mois (`JANV` à `DEC` ou colonnes numériques `1` à `12`) et localiser la colonne `Consommé`.
Le système SHALL extraire les données des sections `ESN` et `Interne` en ignorant les lignes d'en-têtes et de totaux.

#### Scenario: Parsing d'un classeur avec onglet tcd_conso ou matrice
- **WHEN** l'utilisateur dépose un fichier Triskell `.xlsx` ou `.xlsm`
- **THEN** le système analyse les feuilles (priorité à `tcd_conso`), extrait les ressources et calcule les totaux consommés par mois.

### Requirement: Matching automatique des collaborateurs
Le système SHALL normaliser le texte de la cellule "Ressource" (retrait des accents, passage en minuscules, normalisation des espaces).
Le système SHALL vérifier l'inclusion du prénom et du nom (ou nom et prénom) de chaque collaborateur de Crewdayz dans la chaîne Triskell.
Le système SHALL gérer les libellés enrichis de type "Prénom NOM (Fin de mission)".
Si aucun collaborateur Crewdayz ne correspond, la ligne SHALL être marquée comme "Non matché".

#### Scenario: Matching avec libellés enrichis ou ordre inversé
- **WHEN** une ressource est nommée `Florian RAOULBEAU (Fin de mission)`
- **THEN** le système identifie correctement le collaborateur `Florian RAOULBEAU` dans Crewdayz.

### Requirement: Calcul du référentiel Crewdayz & Écarts
Pour chaque collaborateur matché, le système SHALL calculer les jours ouvrés du mois (hors week-ends et jours fériés français).
Le système SHALL déduire les absences enregistrées dans Crewdayz (en excluant la catégorie `Formation` qui n'impacte pas le temps travaillé).
Le système SHALL respecter les dates d'arrivée et de départ du collaborateur.
L'écart est calculé selon : $\Delta = \text{Consommé Triskell} - \text{Jours Travaillés Crewdayz}$.
Un écart $\Delta \neq 0$ SHALL être signalé comme une anomalie.

#### Scenario: Calcul d'un écart avec déduction des absences
- **WHEN** un collaborateur a 21 jours ouvrés théoriques et 1 jour de CP
- **THEN** Crewdayz calcule 20 jours travaillés, et compare avec le consommé Triskell pour détecter tout écart.

### Requirement: Tableau de bord & Inspection
L'interface SHALL proposer un sélecteur d'onglets pour chaque mois disponible avec un badge indiquant le nombre d'anomalies.
L'interface SHALL afficher des cartes KPIs (total consommé, total travaillé, nombre d'écarts, non-matchés).
L'interface SHALL permettre de filtrer par statut (Tous, Écarts uniquement, Conformes, Non matchés) et par section (ESN, Interne).
Le clic sur une ligne SHALL ouvrir une vue détaillée présentant les absences Crewdayz du mois.
L'interface SHALL proposer un export du rapport de contrôle au format Excel (.xlsx).

#### Scenario: Consultation et inspection
- **WHEN** l'utilisateur consulte un mois et clique sur une ligne
- **THEN** la modale s'ouvre avec le détail des absences et les métadonnées du collaborateur.

### Requirement: Persistance de l'état de navigation (Session)
Le système SHALL conserver en mémoire le résultat du parsing, le nom du fichier et le mois sélectionné lors de la navigation vers d'autres routes de l'application.
Le retour sur la vue `/reconciliation` SHALL restaurer immédiatement l'état du dernier fichier analysé sans rechargement.
L'action "Changer de fichier" SHALL ouvrir une modale de confirmation avant de réinitialiser l'état en mémoire du service.

#### Scenario: Navigation inter-pages
- **WHEN** l'utilisateur navigue vers une autre page puis revient sur `/reconciliation`
- **THEN** les données du dernier fichier analysé sont immédiatement affichées.
