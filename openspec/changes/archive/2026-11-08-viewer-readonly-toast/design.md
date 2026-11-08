## Context

Les utilisateurs disposant du rôle `viewer` sont restreints au mode lecture seule par les guards et par la méthode `isReadOnly()` exposée par `SupabaseService`. Sur la vue mensuelle (`MonthlyViewComponent`), toute action d'écriture (`onCellMouseDown`, `openAddAbsenceModal`, `openEditAbsenceModal`) est interrompue par un retour prématuré `if (this.supabaseService.isReadOnly()) return;`.

Actuellement, ce blocage est silencieux et les cellules conservent les styles d'interaction d'un calendrier éditable (curseur de sélection `cursor: cell`, surbrillance bleue au survol).

L'objectif de cette conception est de fournir un retour utilisateur juste-à-temps (*just-in-time feedback*) clair et bienveillant : un toast informatif au premier clic de chaque visite de la vue, qui ne se répète pas lors des clics successifs mais se réinitialise si l'utilisateur change de page et revient.

## Goals / Non-Goals

**Goals:**
- Avertir l'utilisateur avec un message informatif (via `ToastService.info()`) lorsqu'il tente d'interagir avec les cellules en lecture seule.
- Limiter strictement cette notification à une seule fois par consultation de la vue (réinitialisation automatique lorsque l'utilisateur quitte la page et y revient).
- Adapter les styles de survol et de curseur des cellules du tableau pour refléter l'état de consultation lorsque `isReadOnly` est actif.

**Non-Goals:**
- Ne pas modifier le modèle de permissions Supabase ni les politiques RLS existantes.
- Ne pas bloquer la consultation des infobulles existantes (commentaires ou détails d'absences déjà planifiées).
- Ne pas persister l'état sur plusieurs pages ou après fermeture de session (le périmètre est la visite courante du composant).

## Decisions

### 1. Utilisation du service existant `ToastService`
- **Choix** : Déclencher un toast informatif via `ToastService.info("Mode lecture seule : la saisie d’absences est réservée aux profils éditeurs.", 5000)`.
- **Raison** : Signalétique sobre, pédagogique et non intrusive, déjà intégrée dans le layout global.

### 2. Mémorisation au niveau de l'instance du composant (`MonthlyViewComponent`)
- **Choix** : Utiliser un champ d'instance privé `readOnlyToastShown = false` dans `MonthlyViewComponent`.
- **Raison** :
  - Lors d'une même visite, le premier clic passe le drapeau à `true`, évitant tout spam si l'utilisateur clique plusieurs fois.
  - Lorsque l'utilisateur navigue vers une autre vue (ex: Mon Profil) et revient, le composant est détruit puis recréé, remettant naturellement le drapeau à `false`.
  - Évite le recours à `sessionStorage`, rendant la gestion purement liée au cycle de vie du composant sans effets de bord de persistance globale.

### 3. Ajustement de l'affordance CSS en lecture seule
- **Choix** : Appliquer la classe `readonly-calendar` sur la table lorsque `isReadOnly()` est actif, pour afficher `cursor: default` et neutraliser le `background-color` au survol des cellules non renseignées.
- **Raison** : Évite de tromper l'utilisateur sur la cliquabilité des cases.

## Risks / Trade-offs

- **[Risque] Affichage répété si l'utilisateur fait de nombreux allers-retours entre pages**  
  → *Mitigation* : Le message est doux (`info`, bleu) et légitime comme rappel de contexte lors d'une nouvelle visite si une action interdite est tentée.
