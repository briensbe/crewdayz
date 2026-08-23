# ADR 0002: Inclusion Additive de Collaborateurs Épinglés dans les Filtres de Planning

## Status
Accepted

## Date
2026-08-23

## Context
Dans Crewdayz, le filtrage des collaborateurs reposait jusqu'ici sur une conjonction stricte (ET logique) sur l'ensemble des critères (service, équipe, site, contrat, profil, collaborateur). Pour consulter la disponibilité d'une personne extérieure au filtre actif sans perdre son contexte, une architecture d'inclusion additive est requise.

## Decision
1. **Extension du contrat `FilterState`** : Ajout du champ optionnel `pinnedEmployees?: string[]` au sein de `FilterState`, garantissant la sérialisation et la persistance transparente via `localStorage` dans toutes les vues utilisant `storageSignal`.
2. **Règle de visibilité additive** :
   $$\text{Visible} = (\text{matchesStandardFilters} \;\mathbf{OU}\; \text{isPinned}) \;\mathbf{ET}\; \text{matchesSearch} \;\mathbf{ET}\; \text{matchesOnlyActive}$$
3. **Composant de filtre découplé** : Le sélecteur de collaborateurs standards reste restrictif au sein du filtre, tandis qu'un contrôle dédié permet l'épinglage hors-filtre.
4. **Intégration systématique dans les métriques** : Les calculs de disponibilité hebdomadaire et totaux de vue intègrent tous les collaborateurs effectivement affichés.

## Consequences
- **Positives** :
  - Fluidité d'usage : consultation instantanée sans réinitialiser les filtres.
  - Cohérence parfaite entre la grille visuelle et les compteurs de disponibilité.
  - Rétrocompatibilité avec les filtres sauvegardés existants.
- **Précautions** :
  - Toute nouvelle vue implémentant le filtrage doit intégrer la détection `isPinned` pour garantir l'uniformité de l'expérience utilisateur.
