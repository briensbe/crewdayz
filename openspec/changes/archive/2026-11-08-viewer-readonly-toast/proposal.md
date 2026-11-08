## Why

Dans la vue mensuelle, les utilisateurs ayant le profil `viewer` (lecture seule) ne peuvent pas saisir ni modifier d'absences. Cependant, lorsqu'ils cliquent sur une cellule de date ou tentent une sélection par glisser-déposer, l'action est ignorée silencieusement par le code. Ce silence donne l'impression d'un bug d'affichage ou d'un gel de l'application, tandis qu'un affichage permanent de cadenas ou de messages d'interdiction sur chaque cellule surchargerait l'interface. Un toast informatif déclenché lors d'une tentative d'interaction et plafonné à une seule notification par visite de la vue (remis à zéro à chaque changement de page) permet de clarifier immédiatement le comportement sans perturber la consultation.

## What Changes

- **Notification informative au clic pour le profil Viewer** : Lors d'une tentative de sélection ou de clic sur une case du calendrier mensuel par un utilisateur en lecture seule (`isReadOnly`), afficher un toast de type `info` expliquant que la saisie d'absences est réservée aux profils éditeurs.
- **Plafonnement à une seule notification par visite de la vue** : Conserver l'état de notification au niveau de l'instance du composant pour ne pas spammer l'utilisateur s'il clique sur plusieurs cellules au cours de sa consultation, tout en réinitialisant le compteur s'il quitte la vue et y revient ultérieurement.
- **Harmonisation de l'affordance des cellules** : Adapter le curseur CSS (remplacement du curseur de sélection `cell` par `default`) et désactiver l'effet de surbrillance d'édition trompeur lorsque l'utilisateur est en mode lecture seule.

## Capabilities

### New Capabilities

### Modified Capabilities
- `role-based-access-control`: Précision des exigences du mode lecture seule pour fournir un retour utilisateur clair (toast unique par consultation de la vue) et une affordance non trompeuse lors de tentatives d'interaction sur les plannings.

## Impact

- **Frontend Angular** :
  - `src/app/views/monthly-view/monthly-view.component.ts` : Détection de tentative d'interaction sous rôle `viewer`, mémorisation locale dans l'instance du composant, et appel à `ToastService.info()`.
  - `src/app/views/monthly-view/monthly-view.component.html` et `.css` : Neutralisation du curseur et de la surbrillance d'action d'édition en lecture seule.
- **Services** : Utilisation du `ToastService` existant.
- **Données & API** : Aucun impact backend ni migration de base de données requise.
