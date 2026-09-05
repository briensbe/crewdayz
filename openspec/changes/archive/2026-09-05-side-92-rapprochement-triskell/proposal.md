## Why

Les déclarations de temps et de consommation d'activité des collaborateurs sont saisies mensuellement dans l'outil Triskell (pour le suivi budgétaire, prévisionnel et la facturation), tandis que les présences et absences réelles sont gérées dans Crewdayz.
Actuellement, le contrôle de cohérence entre le "Consommé" Triskell et les jours réellement travaillés calculés dans Crewdayz est manuel, fastidieux et source d'erreurs lors des clôtures mensuelles.
Cette fonctionnalité permet d'importer un export Excel Triskell (.xlsx ou .xlsm) pour détecter immédiatement à la volée les écarts et anomalies de saisie, mois par mois.

## What Changes

- **Service de parsing & rapprochement Triskell** :
  - Lecture et parsing en mémoire (à la volée) des fichiers Excel (.xlsx et .xlsm) issus de l'export Triskell (sections ESN et Internes, gestion des en-têtes de mois fusionnés `JANV` à `DEC` et des sous-colonnes `Consommé`).
  - Normalisation automatique du libellé "Ressource" et matching par vérification d'inclusion du prénom et du nom du collaborateur avec la base Crewdayz.
  - Calcul et comparaison des jours travaillés Crewdayz (jours ouvrés hors fériés - absences décomptées) face au `Consommé` Triskell.
- **Nouvelle vue dédiée Rapprochement Triskell** (`/reconciliation`) :
  - Zone de dépôt (drag & drop / sélection) du fichier Excel.
  - Sélecteur de mois avec indicateurs visuels des anomalies par mois.
  - Cartes de synthèse KPI (total consommé, total travaillé, nombre d'écarts, collaborateurs non réconciliés).
  - Tableau comparatif détaillé avec code couleur (vert si conforme, rouge/orange si écart, gris si collaborateur inconnu).
  - Modal d'inspection au clic sur une ligne affichant la répartition des absences Crewdayz du mois pour expliquer l'écart.
  - Possibilité d'exporter le rapport d'anomalies au format Excel.
- **Navigation** :
  - Ajout de la route `/reconciliation` et du lien dans la barre latérale.

## Capabilities

### New Capabilities
- `triskell-reconciliation`: Import à la volée d'un export Triskell, matching automatique des collaborateurs, calcul des écarts mensuels entre le consommé Triskell et les jours travaillés Crewdayz, et tableau de bord de réconciliation avec détail des absences.

### Modified Capabilities
<!-- None -->

## Impact

- **Nouvelles dépendances / code** :
  - Création du service [`src/app/services/triskell-reconciliation.service.ts`](file:///c:/Users/brien/Documents/Devs/angular/crewdayz/src/app/services/triskell-reconciliation.service.ts).
  - Création du composant [`src/app/views/triskell-reconciliation/...`](file:///c:/Users/brien/Documents/Devs/angular/crewdayz/src/app/views/triskell-reconciliation/).
  - Mise à jour de [`src/app/app.routes.ts`](file:///c:/Users/brien/Documents/Devs/angular/crewdayz/src/app/app.routes.ts) et [`src/app/layout/sidebar/sidebar.component.ts`](file:///c:/Users/brien/Documents/Devs/angular/crewdayz/src/app/layout/sidebar/sidebar.component.ts).
- **Sécurité & Données** :
  - Traitement 100% à la volée côté navigateur : aucune donnée de fichier n'est persistée sur le serveur ni en base Supabase.
- **Régression** :
  - Aucune modification des pages existantes (tableau de bord, vue annuelle, vue mensuelle).
