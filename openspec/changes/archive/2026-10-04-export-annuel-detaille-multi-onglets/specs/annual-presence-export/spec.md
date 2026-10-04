## ADDED Requirements

### Requirement: Export annuel multi-onglets au format XLSX
Le système DOIT permettre de générer et de télécharger un classeur Excel (`.xlsx`) consolidé couvrant l'ensemble de l'année sélectionnée, composé d'un onglet de synthèse annuelle et de 12 onglets mensuels détaillés (de janvier à décembre).

#### Scenario: Génération du classeur complet pour une année
- **WHEN** l'utilisateur sélectionne l'option d'export annuel détaillé multi-onglets (pour tous les collaborateurs ou les collaborateurs filtrés)
- **THEN** le système génère un fichier `.xlsx` unique contenant 13 feuilles : « Synthèse [Année] » suivie de « 01 - Janvier », « 02 - Février », ..., « 12 - Décembre ».

### Requirement: Structure et contenu des onglets mensuels détaillés
Chaque onglet mensuel DOIT présenter une matrice détaillée affichant les collaborateurs en lignes et chaque jour calendaire du mois concerné en colonnes, complétée par des colonnes de métriques récapitulatives en bout de ligne.

#### Scenario: Affichage des colonnes collaborateur et colonnes journalières
- **WHEN** un onglet mensuel est consulté
- **THEN** les premières colonnes affichent les informations du collaborateur (Collaborateur, Service, Équipe, Site, Type de contrat) suivies d'une colonne par jour du mois (du 1er au dernier jour du mois avec l'en-tête du jour de la semaine).

#### Scenario: Affichage des totaux mensuels en bout de ligne et ligne de total
- **WHEN** la matrice mensuelle est générée
- **THEN** les dernières colonnes affichent pour chaque collaborateur : « Jours ouvrés », « Jours travaillés » et « Total absences », et une ligne de total en bas calcule la somme globale pour l'équipe sur le mois.

### Requirement: Formatage et encodage visuel des cellules quotidiennes
Les cellules correspondant aux jours ouvrés travaillés DOIVENT rester vides, tandis que les cellules d'absence DOIVENT afficher uniquement la valeur numérique de l'absence (`1` ou `0.5`) avec un fond coloré pastel adapté au thème clair selon la catégorie d'absence.

#### Scenario: Cellule d'un jour ouvré travaillé
- **WHEN** un collaborateur est présent et travaille lors d'un jour ouvré (hors week-end et jour férié)
- **THEN** la cellule du jour reste vide avec un fond neutre standard.

#### Scenario: Cellule d'une absence journée complète
- **WHEN** un collaborateur a une absence posée pour la journée entière
- **THEN** la cellule affiche la valeur numérique `1` et applique un fond coloré pastel correspondant à la catégorie de l'absence (violet très clair pour CP, orange clair pour RTT, rose/rouge clair pour Maladie, vert clair pour Formation, gris/bleu pour Autre/Exceptionnel).

#### Scenario: Cellule d'une absence demi-journée
- **WHEN** un collaborateur a une absence posée pour une demi-journée (matin ou après-midi)
- **THEN** la cellule affiche la valeur numérique `0.5` avec le fond coloré pastel de la catégorie correspondante.

#### Scenario: Formatage des week-ends et jours fériés
- **WHEN** une colonne correspond à un samedi ou un dimanche
- **THEN** les cellules de la colonne sont grisées sans texte de présence.
- **WHEN** une colonne correspond à un jour férié officiel français
- **THEN** la colonne est visuellement distinguée (fond grisé ou bleuté clair) et exclue du décompte des jours travaillés.

### Requirement: Onglet de synthèse annuelle consolidé
Le premier onglet du classeur DOIT présenter la synthèse annuelle récapitulant les jours travaillés mois par mois pour chaque collaborateur.

#### Scenario: Présentation de la synthèse annuelle
- **WHEN** le classeur est ouvert sur le premier onglet « Synthèse [Année] »
- **THEN** le tableau affiche pour chaque collaborateur les jours travaillés pour chacun des 12 mois (Janvier à Décembre), le solde de congés restant au mois de décembre et le total annuel cumulé de jours travaillés.

### Requirement: Intégration ergonomique dans la vue annuelle
Le système DOIT proposer l'accès aux exports annuels (synthèse ou détaillé multi-onglets) directement dans le menu déroulant du bouton « Exporter » de la vue annuelle.

#### Scenario: Sélection du mode d'export dans la vue annuelle
- **WHEN** l'utilisateur clique sur le bouton « Exporter » dans la vue annuelle
- **THEN** un menu déroulant structuré présente distinctement les options de synthèse annuelle (filtré / complet) et les options d'export annuel détaillé multi-onglets (filtré / complet).
