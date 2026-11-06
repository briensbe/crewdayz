## ADDED Requirements

### Requirement: Screen-Specific Preferences Persistence
Le système DOIT persister en base de données Supabase dans la table `crewdayz.cd_user_preferences` les préférences visuelles et d'organisation spécifiques à chaque écran de l'application (`monthly`, `annual`, `employeeList`).

#### Scenario: Restoring screen name display format
- **GIVEN** un utilisateur s'étant connecté et ayant configuré l'affichage `Prénom NOM` sur la vue annuelle et `NOM Prénom` sur la vue mensuelle
- **WHEN** l'utilisateur recharge l'application ou se connecte depuis un autre navigateur
- **THEN** la vue annuelle restaure le format `Prénom NOM` et la vue mensuelle conserve le format `NOM Prénom`.

#### Scenario: Restoring expanded or collapsed extra columns
- **GIVEN** un utilisateur ayant replié (masqué) les colonnes Service, Équipe, Site et Type sur la vue mensuelle (`showColumns = false`)
- **WHEN** l'utilisateur revient sur la vue mensuelle lors d'une session ultérieure
- **THEN** les colonnes secondaires Service, Équipe, Site et Type restent masquées.
- **AND** l'état d'affichage des colonnes de la vue annuelle n'est pas impacté.

#### Scenario: Restoring employee sort preferences independently per screen
- **GIVEN** un utilisateur ayant trié les collaborateurs par ordre décroissant (`desc`) sur la liste des collaborateurs et par ordre croissant (`asc`) sur la vue mensuelle
- **WHEN** les préférences distantes sont chargées depuis `crewdayz.cd_user_preferences`
- **THEN** chaque écran applique son propre sens et champ de tri persisté sans conflit.

### Requirement: Transparent Storage Signal Synchronization for Screen Preferences
L'utilitaire `storageSignal` DOIT synchroniser de manière transparente les clés associées aux préférences d'écrans avec le service `PreferencesService` tout en conservant le cache local dans `localStorage`.

#### Scenario: Synchronizing screen signal update to PreferencesService
- **WHEN** un composant modifie la valeur d'un `storageSignal` lié à un format de nom, à l'affichage des colonnes ou à un tri
- **THEN** la nouvelle valeur est écrite dans `localStorage`
- **AND** la méthode adéquate de `PreferencesService` est notifiée pour marquer l'état en mémoire comme modifié (`isDirty`).
