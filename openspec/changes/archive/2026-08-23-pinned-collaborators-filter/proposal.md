## Why

Lors de l'utilisation de Crewdayz, l'utilisateur a fréquemment des filtres positionnés (ex: par équipe, service ou site). Lorsqu'un collègue demande ponctuellement la disponibilité d'une personne située en dehors du périmètre filtré, l'utilisateur est contraint de supprimer l'ensemble de ses filtres pour retrouver cette personne, puis de reconfigurer manuellement ses filtres précédents.

Cette fonctionnalité permet d'épingler/ajouter explicitement un ou plusieurs collaborateurs au tableau indépendamment des filtres actifs, sans altérer ni réinitialiser la configuration de filtrage en cours.

## What Changes

- **Nouveau sélecteur d'épinglage dans la barre de filtres** : Ajout d'un contrôle dédié `[📌 + Ajouter hors filtre]` permettant de rechercher et cocher un ou plusieurs collaborateurs à afficher en exception.
- **Logique d'inclusion additive** : Les personnes épinglées sont affichées dans la grille même si elles ne correspondent pas aux filtres d'équipe, service, site, contrat ou profil actifs.
- **Filtrage textuel global préservé** : La saisie dans la barre de recherche textuelle rapide continue de s'appliquer à tous les éléments affichés (y compris les personnes épinglées).
- **Intégration dans les disponibilités et compteurs** : Les personnes épinglées sont incluses dans les calculs de disponibilité hebdomadaires par profil et les totaux.
- **Indicateurs visuels et actions rapides** :
  - Icône et badge 📌 sur la ligne du collaborateur épinglé dans le tableau (uniquement s'il ne répond pas déjà aux filtres actifs).
  - Badges / pastilles dans la barre de filtres avec bouton de suppression rapide `✖`.
- **Persistance locale** : Sauvegarde des collaborateurs épinglés dans le `localStorage` de chaque vue (`crewdayz_monthly_view_filters`, etc.).

## Capabilities

### New Capabilities
- `collaborator-pinning`: Permet d'épingler et d'inclure des collaborateurs spécifiques hors des critères de filtre actifs, avec indicateur visuel distinct, inclusion dans les métriques de disponibilité et persistance locale.

### Modified Capabilities
<!-- None -->

## Impact

- **Composant partagé de filtres** : `src/app/shared/filters/filters.component.{ts,html,css}` mis à jour avec `pinnedEmployees` dans `FilterState` et nouveau dropdown dédié.
- **Vues de planning** :
  - `src/app/views/monthly-view/monthly-view.component.{ts,html,css}`
  - `src/app/views/annual-view/annual-view.component.{ts,html,css}`
  - `src/app/views/dashboard/dashboard.component.{ts,html}`
  - `src/app/views/employee-list/employee-list.component.{ts,html}`
- **Calculs et modèles** :
  - Calcul `filteredEmployees` adapté pour inclure l'union `(matchesFilters || isPinned) && matchesSearch && matchesOnlyActive`.
  - Calculs de disponibilité (`profileWeeklyAvailability`) automatiquement enrichis avec les collaborateurs épinglés.
