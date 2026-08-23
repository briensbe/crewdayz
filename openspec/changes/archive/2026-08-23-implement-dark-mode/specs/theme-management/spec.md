## ADDED Requirements

### Requirement: Theme preference state management
The application SHALL provide a `ThemeService` using Angular Signals to manage the user's theme preference (`'light'`, `'dark'`, `'system'`), the OS system preference (`systemPrefersDark`), the effective computed theme (`'light'` | `'dark'`), and a convenience boolean `isDarkMode`.

#### Scenario: Initial theme resolution from localStorage
- **WHEN** the application initializes and `localStorage` contains a valid preference (`'light'`, `'dark'`, or `'system'`) under key `crewdayz_theme_preference`
- **THEN** `ThemeService` initializes `preference` signal with the saved value and computes `effectiveTheme` accordingly.

#### Scenario: Default initial theme resolution when no storage exists
- **WHEN** the application initializes without a stored theme preference in `localStorage`
- **THEN** `ThemeService` initializes `preference` signal to `'system'` and derives `effectiveTheme` from the OS `(prefers-color-scheme: dark)` media query.

#### Scenario: Explicit theme preference change
- **WHEN** a user selects a preference (`'light'`, `'dark'`, or `'system'`) via `setPreference`
- **THEN** `preference` signal updates, `effectiveTheme` recomputes, and the new preference is persisted into `localStorage`.

#### Scenario: OS theme changes while in system mode
- **WHEN** the user preference is `'system'` and the OS color scheme changes
- **THEN** `ThemeService` detects the change via `MediaQueryList` event listener, updates `systemPrefersDark`, and immediately recomputes `effectiveTheme`.

### Requirement: DOM Theme application
The application SHALL dynamically toggle the `.dark-mode` CSS class on `document.body` and `document.documentElement` according to the `effectiveTheme`.

#### Scenario: Applying dark mode
- **WHEN** `effectiveTheme` becomes `'dark'`
- **THEN** the class `dark-mode` MUST be present on both `document.body` and `document.documentElement`.

#### Scenario: Removing dark mode
- **WHEN** `effectiveTheme` becomes `'light'`
- **THEN** the class `dark-mode` MUST be removed from both `document.body` and `document.documentElement`.

### Requirement: Theme selector UI in profile page
The application SHALL provide an accessible theme selection control in the user profile page (`ProfileComponent`) allowing users to choose between Clair (Light), Sombre (Dark), and Système (System).

#### Scenario: Displaying theme selector options
- **WHEN** the user visits the profile page
- **THEN** the theme selector displays three options (Clair, Sombre, Système) with their respective Lucide icons (`Sun`, `Moon`, `Monitor`).

#### Scenario: Active state indicator
- **WHEN** a theme is active
- **THEN** the corresponding button in the theme selector displays an active state visually distinguishing it from other options.

#### Scenario: Switching theme from profile UI
- **WHEN** the user clicks one of the theme buttons
- **THEN** the theme preference updates immediately without requiring a page reload.

### Requirement: Quick theme toggle in sidebar footer
The application SHALL provide a quick theme toggle button in the sidebar footer allowing users to switch between light and dark themes with a single click.

#### Scenario: Toggling theme from sidebar footer
- **WHEN** user clicks the theme toggle button in sidebar footer
- **THEN** `ThemeService` toggles effective theme (light to dark, or dark to light) and updates the button icon/label accordingly.

#### Scenario: Display in collapsed vs expanded sidebar
- **WHEN** sidebar is expanded
- **THEN** button displays current theme icon and descriptive label ("Thème clair" / "Thème sombre").
- **WHEN** sidebar is collapsed
- **THEN** button displays only the icon with appropriate tooltip title.

### Requirement: Dark mode visual styling and contrast
The application SHALL define CSS variables under `body.dark-mode` ensuring contrast and consistency across all layout containers, cards, tables, inputs, modals, toasts, filters, and views.

#### Scenario: Dark theme background and text rendering
- **WHEN** dark mode is active
- **THEN** `--background`, `--surface`, `--text-main`, `--text-muted`, and `--border` variables resolve to dark mode palette values (e.g. slate dark tones and light text).

#### Scenario: Modal and table styling in dark mode
- **WHEN** dark mode is active and the user opens a modal or views a table
- **THEN** modals, table headers, table rows, and borders render with dark mode surface colors and legible contrast.

#### Scenario: Calendar table weekend and holiday shading in dark mode
- **WHEN** dark mode is active
- **THEN** weekend column headers and cells render with a darker shade than weekday cells (rather than light/white), and holidays render with dark-tinted backgrounds.

#### Scenario: Team badges and worked days cells contrast in dark mode
- **WHEN** dark mode is active
- **THEN** team badges render with dark background tones and clear text, and "Jours Trav." cell background on row hover preserves a dark primary tint.

#### Scenario: School holiday strips contrast in dark mode
- **WHEN** dark mode is active
- **THEN** Zone A, B, C strips render with subdued dark tones preserving legibility without glare.
