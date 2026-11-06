# ADR: Persistance des préférences d'écran par enrichissement transparent de storageSignal

## Context

L'application Crewdayz gère plusieurs préférences d'écrans (format d'affichage des noms, masquage des colonnes secondaires, tris des collaborateurs) via des signaux Angular créés avec `storageSignal`.
Par défaut, ces valeurs étaient sauvegardées uniquement dans le `localStorage` du navigateur. Les utilisateurs subissant des nettoyages automatiques de cache en entreprise perdaient leur configuration.

Deux approches étaient envisageables :
1. **Modifier tous les composants de vues** (`MonthlyViewComponent`, `AnnualViewComponent`, `EmployeeListComponent`) pour qu'ils injectent `PreferencesService` et gèrent manuellement des signaux reliés au service.
2. **Étendre `storageSignal`** pour détecter automatiquement les clés de préférences d'écran et se synchroniser de manière bidirectionnelle avec `PreferencesService` (comme cela est déjà fait pour les largeurs de colonnes).

## Decision

Nous choisissons l'**Option 2 : Enrichissement transparent de `storageSignal`**.

L'utilitaire `storageSignal` :
- Reçoit le `PreferencesService` optionnellement via le contexte d'injection.
- Détecte les clés de type format de nom, état des colonnes ou tri par collaborateur.
- Lit en priorité la valeur distante lors de l'initialisation si elle est disponible, tout en assurant un fallback instantané sur le `localStorage`.
- Propage automatiquement toute mise à jour du signal vers `PreferencesService` (qui différera la sauvegarde selon sa stratégie sobre de flush sur les événements de visibilité/déconnexion).

## Consequences

### Positives
- **Principe Ouvert/Fermé (OCP)** : Zéro modification requise dans le template HTML et la logique TypeScript des 3 vues existantes (`MonthlyViewComponent`, `AnnualViewComponent`, `EmployeeListComponent`).
- **Cohérence d'architecture** : Toutes les données d'affichage persistent de manière uniforme (largeurs de colonnes, thèmes, affichages des noms, états des colonnes, tris).
- **Sobriété réseau** : Bénéficie immédiatement de la comparaison d'égalité profonde (`deepEqual`) et du mécanisme de flush événementiel sans alourdir la bande passante.

### Négatives / Compromis
- La fonction `storageSignal` porte la logique de parsing/mappage des clés d'écrans. Cette logique doit être bien isolée dans des helpers dédiés et testée unitairement.
