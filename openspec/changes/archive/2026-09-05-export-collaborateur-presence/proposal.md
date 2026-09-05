## Why

Certains managers et parties prenantes (RH, clients, prestataires externes, etc.) n'ont pas accès direct à l'outil Crewdayz mais ont besoin d'une synthèse détaillée et fiable des présences et des absences des collaborateurs, en particulier sur le mois écoulé (mois précédent ou mois sélectionné).

Actuellement, l'application ne propose qu'un export annuel agrégé de toute l'équipe. Il manque un moyen d'exporter une synthèse individuelle claire d'un collaborateur (au format Excel `.xlsx`), détaillant les jours travaillés, les absences par catégorie et période (matin/après-midi/journée), les jours fériés et les soldes de congés/RTT, afin d'être partagée en dehors des utilisateurs de l'application.

## What Changes

- **Export Excel individuel d'un collaborateur** :
  - Génération d'un fichier Excel `.xlsx` soigné et prêt à diffuser (feuille récapitulative du mois sélectionné).
  - Détail journalier du mois (date, jour de la semaine, statut : Travaillé / Absence / Férié / Week-end, type d'absence, période matin/après-midi, commentaire).
  - Synthèse globale du mois (Nombre de jours ouvrés, Nombre de jours travaillés, Total jours d'absence ventilés par catégorie : CP, RTT, Maladie, Formation, etc.).
  - Informations d'en-tête claires : Identité du collaborateur, Service, Équipe/Îlot, Site, Type de contrat, Société prestataire si externe, Période concernée (Mois/Année).
- **Points d'accès dans l'interface** :
  - Dans la **Vue Mensuelle** (`monthly-view`) : Possibilité d'exporter la synthèse du mois affiché pour un collaborateur spécifique (via un bouton d'action dédié au niveau de la ligne du collaborateur).

## Capabilities

### New Capabilities
- `collaborator-presence-export`: Génération et téléchargement d'un export Excel individuel de la présence et des absences d'un collaborateur sur une période mensuelle dans la vue mensuelle.

### Modified Capabilities
<!-- None -->

## Impact

- Dépendance `xlsx-js-style` déjà présente dans le projet pour le formatage et le style de l'export.
- Composant Angular impacté : `monthly-view` (nouvelle action d'export collaborateur).
- Nouveau service utilitaire dédié `CollaboratorPresenceExportService` pour isoler la logique de construction du classeur Excel et le calcul des métriques du mois.
