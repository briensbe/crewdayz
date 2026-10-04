## Why

Actuellement, l'application Crewdayz permet d'exporter soit un récapitulatif annuel très synthétique (un seul classeur d'une seule feuille avec uniquement les totaux mensuels de jours travaillés par collaborateur), soit des relevés mensuels individuels collaborateur par collaborateur. Il manque un export consolidé permettant d'avoir la vision détaillée complète de l'année dans un unique classeur Excel : un onglet de synthèse annuelle et 12 onglets mensuels détaillés (un par mois) contenant le calendrier matriciel de présence et d'absence pour l'ensemble des collaborateurs.

Cette fonctionnalité répond au besoin des gestionnaires RH et managers qui souhaitent auditer ou archiver l'activité d'une année entière sans avoir à générer des dizaines d'exports mensuels individuels.

## What Changes

- Ajout d'une option d'export « Export annuel détaillé (multi-onglets) » dans le menu déroulant d'export de la vue annuelle (`annual-view`), avec distinction entre données filtrées et tous les collaborateurs.
- Génération d'un classeur Excel (`.xlsx`) structuré en 13 onglets :
  - **Onglet 1 (« Synthèse [Année] »)** : Vue d'ensemble annuelle avec totaux mensuels de jours travaillés par collaborateur, solde en fin d'année et total annuel.
  - **Onglets 2 à 13 (« 01 - Janvier », « 02 - Février », ..., « 12 - Décembre »)** : Matrice détaillée pour chaque mois comprenant les colonnes collaborateurs (nom, service, équipe, site, contrat), les colonnes de chaque jour du mois (1 à 28/29/30/31 avec jour de la semaine), et les colonnes de synthèse mensuelle (jours ouvrés, jours travaillés, total absences).
- Formatage visuel des cellules quotidiennes dans les onglets mensuels :
  - Jour ouvré travaillé : cellule vide (fond standard).
  - Absence : valeur numérique `1` (journée complète) ou `0.5` (demi-journée), avec coloration de fond pastel selon la catégorie d'absence (CP, RTT, Maladie, Maternité, Formation, Autre, etc.) basée sur le thème clair.
  - Week-ends : colonnes grisées sans valeur.
  - Jours fériés : colonnes grisées ou bleutées distinctes.
  - Ligne de totalisation en bas de tableau.
- Organisation et restructuration du menu déroulant du bouton « Exporter » de la vue annuelle en sections distinctes pour clarifier le choix entre synthèse simple et export détaillé multi-onglets.

## Capabilities

### New Capabilities
- `annual-presence-export`: Gestion de la génération et du téléchargement du classeur Excel multi-onglets pour une année complète, avec matrice détaillée mensuelle par collaborateur, codes couleurs pastels pour les absences, et récapitulatif annuel consolidé.

### Modified Capabilities
<!-- Aucune exigence existante n'est modifiée -->

## Impact

- **Services** : Création ou enrichissement d'un service d'exportation dédié (ex. extension de `CollaboratorPresenceExportService` ou nouveau service `AnnualPresenceExportService`) exploitant `xlsx-js-style`.
- **Composants** : Mise à jour de `AnnualViewComponent` (template HTML, CSS et contrôleur TS) pour proposer les nouvelles options d'export et orchestrer la génération avec indicateur de chargement/toast.
- **Modèles et calculs** : Réutilisation des fonctions de calcul d'absences, de jours fériés (`holidays.ts`) et des catégories d'absence existantes.
