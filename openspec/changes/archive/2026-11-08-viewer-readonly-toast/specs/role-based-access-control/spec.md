## MODIFIED Requirements

### Requirement: Mode lecture seule sur les vues de planning
Dans les vues autorisées en consultation (« Vue Mensuelle » et « Vue Annuelle »), le système DOIT désactiver les interactions de création, modification ou suppression d'absences pour les profils `viewer`, tout en informant l'utilisateur de manière non intrusive lors d'une tentative de saisie.

#### Scenario: Clic sur une case de calendrier par un Viewer
- **GIVEN** un utilisateur connecté avec le rôle `viewer` sur la vue mensuelle
- **WHEN** l'utilisateur clique sur une case de date d'un collaborateur
- **THEN** aucune modale de saisie ou de modification d'absence ne s'ouvre

#### Scenario: Boutons d'action administrative masqués
- **GIVEN** un utilisateur connecté avec le rôle `viewer`
- **WHEN** la vue mensuelle ou annuelle est affichée
- **THEN** les boutons de modification de données ou de synchronisation sont masqués ou désactivés

#### Scenario: Notification informative lors de la première tentative d'interaction sur la vue
- **GIVEN** un utilisateur connecté avec le rôle `viewer` consultant la vue mensuelle
- **WHEN** l'utilisateur tente de cliquer ou de sélectionner une cellule de calendrier pour la première fois lors de sa visite
- **THEN** un message informatif (toast) lui indique que la saisie d'absences est réservée aux éditeurs
- **THEN** la notification est marquée comme affichée pour la consultation courante de la vue

#### Scenario: Absence de notification répétée lors des clics ultérieurs sur la même visite
- **GIVEN** un utilisateur connecté avec le rôle `viewer` ayant déjà reçu la notification lors de sa visite de la vue
- **WHEN** l'utilisateur effectue de nouveaux clics ou sélections sur d'autres cellules sans changer de page
- **THEN** l'action reste bloquée sans réafficher de nouveau toast informatif

#### Scenario: Réinitialisation du toast lors d'une nouvelle consultation de la vue
- **GIVEN** un utilisateur connecté avec le rôle `viewer` ayant déjà reçu la notification sur la vue mensuelle
- **WHEN** l'utilisateur navigue vers une autre page (ex: Mon Profil) puis revient sur la Vue Mensuelle
- **THEN** une nouvelle tentative d'interaction affiche à nouveau le toast informatif une seule fois
