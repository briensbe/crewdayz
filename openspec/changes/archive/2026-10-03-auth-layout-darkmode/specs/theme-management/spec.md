## ADDED Requirements

### Requirement: Early theme resolution and anti-flicker initialization
L'application DOIT appliquer le thème stocké ou la préférence système sur le document DOM avant le démarrage d'Angular via un script inline anti-flicker, et DOIT instancier `ThemeService` au démarrage de l'application via `provideAppInitializer`.

#### Scenario: Anti-flicker initial render before bootstrap
- **WHEN** le navigateur charge et exécute le script d'en-tête dans `index.html`
- **THEN** le script lit la clé `crewdayz_theme_preference` dans `localStorage` (ou détecte `prefers-color-scheme: dark`) et applique immédiatement la classe `dark-mode` sur l'élément racine `<html>` avant le bootstrap d'Angular.

#### Scenario: Theme service eager initialization
- **WHEN** l'application Angular démarre
- **THEN** `ThemeService` est instancié dès l'initialisation de l'application via `provideAppInitializer`, synchronisant les signaux réactifs (`preference`, `effectiveTheme`, `isDarkMode`) sur toutes les pages y compris les pages publiques non authentifiées (`/login`).
