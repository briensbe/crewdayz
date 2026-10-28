# Spécification absence-recurrence

## Purpose
Permet la configuration, la simulation et la génération directe d'absences régulières et périodiques (temps partiel à 80%, 50%, formations récurrentes, etc.) sur une plage temporelle donnée dans la modale de déclaration d'absence, en préservant automatiquement les jours fériés légaux et les événements déjà planifiés.

## Requirements

### Requirement: Activation et configuration de la récurrence dans la modale
Le système DOIT permettre à l'utilisateur d'activer une option de récurrence hebdomadaire lors de la saisie d'une absence sur une plage de dates, tout en maintenant l'option repliée et inactive par défaut pour préserver la saisie simple.

#### Scenario: Affichage par défaut sans récurrence
- **WHEN** l'utilisateur ouvre la modale de déclaration d'absence
- **THEN** la section de récurrence est repliée et non cochée par défaut
- **THEN** les champs usuels de date début, date fin, période et motif sont immédiatement accessibles sans friction

#### Scenario: Dépliage de la configuration de récurrence
- **WHEN** l'utilisateur coche la case "Répéter cette absence"
- **THEN** la section de configuration s'affiche et propose :
  - un intervalle de semaines (valeur minimale de 1, défaut à 1)
  - les boutons de sélection des jours ouvrés (Lundi, Mardi, Mercredi, Jeudi, Vendredi)
  - le choix de la période à appliquer (Journée entière, Matin, Après-midi)

### Requirement: Calcul et filtrage des dates récurrentes
Le système DOIT générer les dates correspondant aux jours cochés à l'intervalle hebdomadaire configuré entre la date de début et la date de fin, en excluant les jours fériés légaux et en préservant les absences existantes.

#### Scenario: Répétition hebdomadaire standard à 80%
- **GIVEN** une période du 01/01/2025 au 31/12/2025 avec un intervalle de 1 semaine et le jour "Mercredi" coché en journée entière
- **WHEN** le moteur calcule les dates de récurrence
- **THEN** chaque mercredi ouvré de la période est planifié pour être inséré
- **THEN** les mercredis correspondant à un jour férié chômé sont automatiquement exclus de l'insertion

#### Scenario: Répétition bimensuelle (toutes les 2 semaines)
- **GIVEN** une période avec un intervalle configuré à 2 semaines et le "Vendredi" coché
- **WHEN** le calcul est exécuté
- **THEN** seul un vendredi sur deux (semaines paires/impaires relatives à la date de début) est sélectionné pour l'insertion

#### Scenario: Préservation des absences existantes en cas de conflit
- **GIVEN** une date récurrente cible sur laquelle le collaborateur a déjà un événement posé (ex. Congé Payé ou Maladie)
- **WHEN** le calcul des absences à insérer est effectué
- **THEN** cette date est exclue de la liste d'insertion
- **THEN** l'absence préexistante est conservée intacte sans écrasement

### Requirement: Simulation en temps réel dans la modale
Le système DOIT afficher dynamiquement à l'utilisateur le nombre d'occurrences qui seront créées et le nombre de jours ignorés (fériés ou conflits).

#### Scenario: Mise à jour du résumé prévisionnel
- **WHEN** l'utilisateur modifie les jours cochés, l'intervalle ou la période de dates
- **THEN** un bandeau affiche en temps réel le nombre de jours qui seront insérés et le nombre de jours ignorés avec le motif (férié ou absence déjà présente)
- **THEN** le bouton de soumission est désactivé si aucune date valide n'est sélectionnée

### Requirement: Enregistrement et matérialisation directe
Le système DOIT enregistrer les absences récurrentes sous forme de lignes individuelles concrètes dans la table `cd_absences` via `AbsenceService`.

#### Scenario: Validation et persistance des absences
- **WHEN** l'utilisateur clique sur "Enregistrer" avec la récurrence active
- **THEN** toutes les dates calculées sont enregistrées via un appel d'upsert dans Supabase avec la catégorie sélectionnée (ex. "Temps partiel")
- **THEN** la vue calendrier mensuelle et annuelle se met à jour instantanément avec les nouveaux événements
- **THEN** chaque jour généré peut ensuite être modifié ou supprimé individuellement par l'utilisateur

### Requirement: Affichage compact et synthétique des événements existants
Le système DOIT adapter l'affichage de la liste des événements déjà planifiés sur la période sélectionnée pour éviter l'encombrement vertical de la modale lors de sélections étendues (ex. année complète).

#### Scenario: Moins ou égal à 4 événements existants
- **GIVEN** une période sélectionnée comportant 4 événements ou moins
- **WHEN** la modale affiche les événements planifiés
- **THEN** la totalité des événements (jusqu'à 4) est affichée directement sans repli

#### Scenario: Plus de 4 événements existants (Mode synthétique & déroulant)
- **GIVEN** une période sélectionnée comportant plus de 4 événements
- **WHEN** la modale affiche les événements planifiés
- **THEN** les 4 premiers événements sont affichés directement
- **THEN** un bandeau de synthèse affiche le nombre total et la répartition par badge de catégorie (ex. 16 Temps partiel, 2 CP)
- **THEN** un bouton d'action permet de déplier/replier les événements restants dans une zone à défilement vertical limité
