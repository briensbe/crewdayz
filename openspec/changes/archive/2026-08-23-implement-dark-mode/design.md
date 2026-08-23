## Context

L'application CrewDayz est construite avec Angular 21 et utilise une architecture de style centralisée reposant sur des variables CSS dans `src/styles.css` (`:root { --background, --surface, --text-main, --border, ... }`).
L'objectif est d'implémenter le mode sombre en reproduisant fidèlement l'architecture éprouvée du projet de référence `roadmap` (`roadmap-vision`), composée d'un `ThemeService` basé sur les signaux Angular, de l'application de la classe `.dark-mode` et de la redéfinition des variables de thème, ainsi que d'un sélecteur complet sur la page profil, d'un raccourci rapide dans la barre latérale et d'une gestion soignée des contrastes sur les tableaux de planning et badges équipes.

## Goals / Non-Goals

**Goals:**
- Implémenter un service Angular `ThemeService` réactif utilisant les signaux (`signal`, `computed`, `effect`).
- Gérer 3 options de préférence : `'light'`, `'dark'`, `'system'`.
- Détecter et écouter en temps réel les changements du thème OS via `window.matchMedia('(prefers-color-scheme: dark)')`.
- Persister le choix de l'utilisateur dans `localStorage` sous la clé `crewdayz_theme_preference`.
- Appliquer/retirer dynamiquement la classe `.dark-mode` sur `document.body` et `document.documentElement`.
- Définir dans `src/styles.css` le jeu complet de variables pour `body.dark-mode` (palette sombre type Slate, adaptée aux contrastes pour la lisibilité des plannings, tableaux, modales et formulaires).
- Assurer un contraste sombre optimal sur la grille du planning mensuel : fonds de week-ends plus sombres (`--weekend-bg`, `--weekend-cell-bg`), jours fériés (`--holiday-bg`), cellule de jours travaillés (`--worked-col-bg`, `--worked-col-hover-bg`) et bandeaux de zones de vacances scolaires (`--zone-*-strip-*`).
- Définir la palette des badges d'équipes via des variables CSS (`--team-bg-0..11`, `--team-color-0..11`, `--team-border-0..11`) pour un rendu sombre élégant et réactif sans refactorisation des vues.
- Ajouter un composant de sélection de thème dans `ProfileComponent` avec les icônes Lucide (`Sun`, `Moon`, `Monitor`).
- Ajouter un bouton de basculement rapide dans le pied de page de `SidebarComponent` avec icône adaptative (`Sun`/`Moon`) et libellé contextuel.

**Non-Goals:**
- Ajout de bibliothèques CSS tierces (Tailwind CSS, DaisyUI) : le projet conserve son architecture CSS native et légère.
- Multi-thèmes personnalisés au-delà du mode clair et sombre.

## Decisions

### 1. Architecture réactive par Signals et Effects
- **Décision** : Utiliser `signal<ThemePreference>`, `computed<EffectiveTheme>`, et des `effect()` pour la synchronisation DOM et `localStorage`.
- **Raison** : Cohérence avec Angular 21, simplification de la gestion de l'état sans fuite mémoire d'abonnements RxJS manuels, et stricte conformité avec le modèle de `roadmap/src/services/theme.service.ts`.
- **Alternatives considérées** : `BehaviorSubject` / RxJS (trop verbeux et moins performant avec le nouveau modèle de réactivité d'Angular).

### 2. Surcharge des variables CSS sous `body.dark-mode`
- **Décision** : Redéfinir les variables CSS existantes (`--background`, `--surface`, `--text-main`, `--text-muted`, `--border`, `--shadow-*`, etc.) sous `body.dark-mode`.
- **Raison** : Permet une bascule instantanée et globale du thème pour l'ensemble des composants existants sans nécessiter de refactoriser chaque composant individuellement.
- **Alternatives considérées** : Attribut `data-theme="dark"` (valide mais `.dark-mode` assure la cohérence avec le projet de référence `roadmap`).

### 3. Palette dynamique pour les badges d'équipes et les colonnes de planning
- **Décision** : Configurer la palette d'équipes dans `color-utils.ts` avec des références `var(--team-bg-N)`, `var(--team-color-N)`, `var(--team-border-N)` définies en modes clair et sombre dans `styles.css`.
- **Raison** : Évite les fonds pastel aveuglants en mode sombre tout en préservant l'identité chromatique propre à chaque équipe.

### 4. Raccourci rapide dans la barre latérale
- **Décision** : Positionner le bouton de basculement rapide dans `.sidebar-footer` au-dessus de la version.
- **Raison** : Offre un accès universel et immédiat depuis n'importe quelle vue de l'application, en s'adaptant élégamment à l'état réduit/déployé de la barre latérale.

### 5. Isolation et résilience côté navigateur
- **Décision** : Encapsuler tout accès à `window`, `document` et `localStorage` avec des vérifications `typeof ... !== 'undefined'` et des blocs `try/catch`.
- **Raison** : Prévient les erreurs d'exécution en environnement sans DOM ou en cas de restriction des cookies/stockage local.

## Risks / Trade-offs

- **[Risque] Couleurs codées en dur dans certains composants** → *Atténuation* : Audit des composants (`monthly-view`, `annual-view`, `sidebar`, `absence-modal`, `filters`, `release-notes`, `toast-container`) pour s'assurer que les propriétés `background-color`, `color` et `border-color` utilisent toutes `var(...)`.
- **[Risque] Contraste insuffisant sur les badges de types d'absences** → *Atténuation* : Conserver les teintes d'absences distinctes tout en ajustant leurs fonds atténués (`--abs-*-bg`) et bordures en mode sombre pour une visibilité optimale.
