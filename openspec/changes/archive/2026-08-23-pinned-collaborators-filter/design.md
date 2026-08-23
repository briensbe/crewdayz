## Context

Crewdayz permet de visualiser les plannings et les congés des collaborateurs via des vues mensuelles, annuelles et des tableaux de bord. Actuellement, les filtres appliqués (service, équipe, site, contrat, profil, collaborateurs) fonctionnent selon une conjonction stricte (ET logique). Lorsqu'un utilisateur a des filtres actifs (ex: une équipe spécifique) et souhaite consulter le statut d'un collaborateur extérieur, il est contraint de réinitialiser tous ses filtres.

Ce document décrit la conception technique pour intégrer des collaborateurs "épinglés / hors filtre" avec une logique d'union additive, une persistance `localStorage`, et des indicateurs visuels dédiés.

## Goals / Non-Goals

**Goals:**
- Conserver intégralement les filtres standards existants et leur comportement actuel.
- Permettre la sélection multiple de collaborateurs à inclure en exception (épinglés).
- Appliquer la règle de visibilité : `(matchesStandardFilters || isPinned) && matchesSearch && matchesOnlyActive`.
- Afficher un badge/icône 📌 sur la ligne du tableau et fournir une action de désépinglage (`✖`) dans la barre de filtres.
- Intégrer les collaborateurs épinglés dans les calculs de disponibilité par profil et les totaux.
- Persister l'état des personnes épinglées dans `localStorage` via les signaux de stockage existants.

**Non-Goals:**
- Modifier la sémantique du sélecteur "Collaborateurs" existant (qui reste un filtre restrictif interne).
- Créer un système de groupes de collaborateurs personnalisés ou de vues sauvegardées multi-profils (hors de portée).

## Decisions

### 1. Extension de l'interface `FilterState`
Nous ajoutons `pinnedEmployees?: string[]` à l'interface `FilterState` dans `filters.component.ts`.
- *Raison* : Centraliser tout l'état de filtrage émis par `filterChange` et stocké par les signaux persistants de vue (`crewdayz_monthly_view_filters`, `crewdayz_annual_view_filters`, etc.).
- *Alternative considérée* : Gérer un signal séparé dans chaque composant parent. Rejeté car cela dupliquerait la logique de persistance et de synchronisation avec la barre de filtres.

### 2. Nouveau dropdown dédié `[📌 + Ajouter hors filtre]` dans `FiltersComponent`
Un menu déroulant avec champ de recherche interne (semblable au sélecteur collaborateur existant) permet de cocher/décocher les collaborateurs à épingler.
- *Raison* : Séparation claire entre les filtres catégoriels d'équipe/service et l'ajout explicite d'exceptions.
- *Alternative considérée* : Fusionner avec le filtre collaborateur standard. Rejeté conformément à la décision utilisateur pour éviter les ambiguïtés entre restriction et inclusion.

### 3. Logique de calcul `filteredEmployees` et détection `isPinned`
Chaque vue de planning adapte son `computed(() => filteredEmployees)` :
```typescript
const isPinned = (emp: Employee) => (filters.pinnedEmployees || []).includes(emp.id || '');
const matchesStandard = (emp: Employee) => {
  if (filters.service?.length && !filters.service.includes(emp.service)) return false;
  if (filters.team?.length && !filters.team.includes(emp.team)) return false;
  if (filters.work_site?.length && !filters.work_site.includes(emp.work_site)) return false;
  if (filters.contract_type?.length && !filters.contract_type.includes(emp.contract_type)) return false;
  if (filters.profile?.length && !filters.profile.includes(emp.profile)) return false;
  if (filters.employees?.length && !filters.employees.includes(emp.id || '')) return false;
  return true;
};

// Inclusion additive
const list = allEmployees.filter(emp => {
  if (filters.onlyActive && !isEmployeeActiveOnPeriod(emp)) return false;
  if (filters.search && !matchesSearchQuery(emp, filters.search)) return false;
  return matchesStandard(emp) || isPinned(emp);
});
```
Pour l'affichage visuel, un helper `isEmployeeHorsFiltre(emp)` détermine si un employé est présent uniquement grâce à son statut épinglé (`isPinned(emp) && !matchesStandard(emp)`).

### 4. Indicateurs visuels et interaction
- **Ligne du tableau** : Affichage d'une icône `Pin` (Lucide `Pin`) avec classe `.pinned-indicator-badge` pour repérer visuellement le statut hors-filtre, sans action de suppression directe dans la cellule.
- **Barre de filtres** : Section `Hors filtre :` affichant les pastilles des personnes épinglées avec bouton `✖` et gestion dans le menu déroulant dédié.

## Risks / Trade-offs

- **[Performance avec grand nombre d'employés]** → Les calculs restent dans des signaux `computed()` exécutés en mémoire locale sur la liste des collaborateurs sans requête réseau supplémentaire.
- **[Confusion visuelle si un employé épinglé correspond au filtre]** → Si l'utilisateur applique un filtre incluant le collaborateur épinglé, le badge `Hors filtre` n'est pas affiché afin de ne pas fausser la perception de conformité au filtre.
