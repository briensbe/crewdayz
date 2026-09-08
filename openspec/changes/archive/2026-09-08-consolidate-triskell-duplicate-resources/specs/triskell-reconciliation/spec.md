## MODIFIED Requirements

### Requirement: Calcul du référentiel Crewdayz & Écarts
Pour chaque collaborateur matché, le système SHALL calculer les jours ouvrés du mois (hors week-ends et jours fériés français).
Le système SHALL déduire les absences enregistrées dans Crewdayz (en excluant la catégorie `Formation` qui n'impacte pas le temps travaillé).
Le système SHALL respecter les dates d'arrivée et de départ du collaborateur.
Lorsque plusieurs entrées Triskell correspondent au même collaborateur Crewdayz (ex: changement de statut ESN vers Interne ou affectation multi-unités), le système SHALL d'abord sommer l'ensemble des jours consommés Triskell pour ce collaborateur sur le mois avant d'effectuer la comparaison avec les jours travaillés Crewdayz.
L'écart consolidé est calculé selon : $\Delta = \sum(\text{Consommé Triskell}) - \text{Jours Travaillés Crewdayz}$.
Un écart consolidé $\Delta \neq 0$ SHALL être signalé comme une anomalie.
Le système SHALL ne comptabiliser chaque collaborateur matché qu'une seule fois dans le total des jours travaillés Crewdayz du mois.

#### Scenario: Calcul d'un écart pour un collaborateur sur une ligne unique
- **WHEN** un collaborateur a 21 jours ouvrés théoriques et 1 jour de CP
- **THEN** Crewdayz calcule 20 jours travaillés, et compare avec le consommé Triskell pour détecter tout écart.

#### Scenario: Consolidation d'un collaborateur externe devenu interne
- **WHEN** un collaborateur apparaît sur une ligne ESN avec 4 jours consommés et sur une ligne Interne avec 16 jours consommés sur le mois
- **THEN** le système calcule un consommé Triskell total de 20 jours, le compare aux jours travaillés Crewdayz (20 jours), et conclut à un écart de 0 jour (conforme).

#### Scenario: Évitement de fausse anomalie sur mois à 0 jour
- **WHEN** un collaborateur a 0 jour consommé sur son ancienne ligne ESN et 22 jours consommés sur sa nouvelle ligne Interne (pour 22 jours travaillés dans Crewdayz)
- **THEN** le système consolide les deux lignes en une seule entrée avec 22 jours consommés Triskell et 0 jour d'écart, sans générer d'anomalie pour la ligne à 0 jour.

### Requirement: Tableau de bord & Inspection
L'interface SHALL proposer un sélecteur d'onglets pour chaque mois disponible avec un badge indiquant le nombre d'anomalies.
L'interface SHALL afficher des cartes KPIs (total consommé, total travaillé, nombre d'écarts, non-matchés).
L'interface SHALL regrouper les doublons Triskell matchant un même collaborateur Crewdayz en une seule ligne consolidée dans le tableau de réconciliation.
La ligne consolidée SHALL afficher le statut de section (`ESN`, `Interne`), l'unité et le fournisseur de la ligne Triskell ayant une consommation active sur le mois (ou le statut dominant en cas de consommation sur plusieurs lignes).
L'interface SHALL permettre de filtrer par statut (Tous, Écarts uniquement, Conformes, Non matchés) et par section (ESN, Interne).
Le clic sur une ligne SHALL ouvrir une vue détaillée présentant les absences Crewdayz du mois ainsi que la décomposition des lignes Triskell sources et leurs consommations respectives.
L'interface SHALL proposer un export du rapport de contrôle au format Excel (.xlsx) reflétant la vue consolidée.

#### Scenario: Consultation et inspection d'un collaborateur consolidé
- **WHEN** l'utilisateur consulte un mois et clique sur la ligne d'un collaborateur ayant plusieurs entrées Triskell
- **THEN** la modale s'ouvre et affiche à la fois la décomposition des consommations Triskell (lignes ESN et Interne) et le détail des absences Crewdayz.

#### Scenario: Export Excel du rapport consolidé
- **WHEN** l'utilisateur exporte le rapport mensuel
- **THEN** le fichier Excel généré contient une ligne unique par collaborateur avec les jours consommés cumulés et les jours travaillés Crewdayz sans doublon.
