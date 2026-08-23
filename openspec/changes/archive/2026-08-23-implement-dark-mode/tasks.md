## 1. Service de Thème (ThemeService)

- [x] 1.1 Créer `src/app/services/theme.service.ts` avec les signaux Angular (`preference`, `systemPrefersDark`, `effectiveTheme`, `isDarkMode`), l'écoute de `window.matchMedia('(prefers-color-scheme: dark)')`, la persistance `localStorage` (`crewdayz_theme_preference`) et l'application réactive de la classe `.dark-mode` sur `body` et `html`.
- [x] 1.2 Créer le fichier de test unitaire `src/app/services/theme.service.spec.ts` pour valider la résolution de thème, la synchronisation du stockage et les bascules de mode.

## 2. Variables CSS et Thème Global

- [x] 2.1 Mettre à jour `src/styles.css` pour déclarer les variables CSS sous `body.dark-mode` (`--background`, `--surface`, `--text-main`, `--text-muted`, `--border`, `--border-light`, styles des formulaires, tableaux, cartes, alertes et modales).
- [x] 2.2 Configurer les transitions douces de fond et de couleur sur `body` lors du basculement de thème.

## 3. Sélecteur de Thème dans le Profil Utilisateur

- [x] 3.1 Mettre à jour `src/app/auth/profile/profile.component.ts` pour injecter `ThemeService`, importer les icônes Lucide (`Sun`, `Moon`, `Monitor`) et exposer `themeOptions` ainsi que la méthode de sélection.
- [x] 3.2 Mettre à jour `src/app/auth/profile/profile.component.html` avec la syntaxe de contrôle de flux native Angular `@for` pour afficher les options de thème (Clair / Sombre / Système).
- [x] 3.3 Mettre à jour `src/app/auth/profile/profile.component.css` pour styliser la section de sélection de thème (`.theme-selector`, `.theme-buttons`, `.theme-btn`, `.active`).

## 4. Audit & Validation des Composants

- [x] 4.1 Auditer et adapter les composants de l'application (`monthly-view`, `annual-view`, `sidebar`, `absence-modal`, `filters`, `release-notes`, `toast-container`) afin d'assurer l'absence de couleurs codées en dur et la parfaite lisibilité des contrastes.
- [x] 4.2 Valider la compilation (`ng build`) et exécuter les tests pour garantir l'absence de régression.

## 5. Raccourci de Thème dans le Footer de la Sidebar

- [x] 5.1 Mettre à jour `src/app/layout/sidebar/sidebar.component.ts` pour injecter `ThemeService`, importer les icônes `Sun` et `Moon` et exposer `toggleTheme()`.
- [x] 5.2 Mettre à jour `src/app/layout/sidebar/sidebar.component.html` pour intégrer le bouton de bascule dans `.sidebar-footer`.
- [x] 5.3 Mettre à jour `src/app/layout/sidebar/sidebar.component.css` pour styliser le bouton de bascule (`.theme-toggle-btn`, label, mode réduit, effets de survol).
- [x] 5.4 Valider le build avec `pnpm build` et vérifier les tests.

## 6. Ajustement des Contrastes de la Vue Mensuelle & Badges Équipes

- [x] 6.1 Mettre à jour `src/styles.css` pour déclarer les variables de badges d'équipes (`--team-bg-0..11`, etc.) et les variables de grille calendrier (`--weekend-bg`, `--weekend-cell-bg`, `--worked-col-hover-bg`, `--zone-*-strip-*`) en modes clair et sombre.
- [x] 6.2 Mettre à jour `src/app/shared/utils/color-utils.ts` pour brancher `TEAM_PALETTE` sur les variables CSS `--team-*`.
- [x] 6.3 Mettre à jour `src/app/views/monthly-view/monthly-view.component.css` pour utiliser les variables CSS pour les week-ends, jours fériés, cellule "Jours Trav." au survol et bandes de vacances scolaires.
- [x] 6.4 Valider le build avec `pnpm build`.
