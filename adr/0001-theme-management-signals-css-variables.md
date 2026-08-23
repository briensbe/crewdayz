# ADR 0001: Gestion du Thème (Dark Mode) avec Signaux Angular et Variables CSS

## Status
Accepted

## Date
2026-08-23

## Context
L'application CrewDayz nécessite la prise en charge d'un mode sombre (Dark Mode) en plus du mode clair existant, avec synchronisation dynamique avec les préférences du système d'exploitation et persistance du choix de l'utilisateur.

## Decision
Nous adoptons la même architecture que le projet de référence `roadmap` :
1. **Service centralisé réactif (`ThemeService`)** : Utilisation exclusive des signaux Angular (`signal`, `computed`, `effect`) pour gérer les états (`preference`, `systemPrefersDark`, `effectiveTheme`, `isDarkMode`), l'écoute de `window.matchMedia('(prefers-color-scheme: dark)')` et la persistance dans `localStorage` sous la clé `crewdayz_theme_preference`.
2. **Application CSS par classe globale** : La classe `.dark-mode` est appliquée sur `document.body` et `document.documentElement` par un `effect()` réactif.
3. **Theming par surcharge de variables CSS** : Les styles de l'application s'appuient sur des variables CSS déclarées dans `:root` pour le thème clair et surchargées sous `body.dark-mode` pour le thème sombre.

## Consequences
- **Positives** :
  - Zéro dépendance externe supplémentaire.
  - Bascule instantanée du thème sans rechargement de page.
  - Tous les composants utilisant les variables CSS (`var(--...)`) s'adaptent automatiquement au mode sombre.
  - Code modulaire, typé et testable.
- **Négatives / Précautions** :
  - Tout composant utilisant des couleurs codées en dur (hardcoded hex/rgb) doit être migré vers les variables CSS standardisées.
