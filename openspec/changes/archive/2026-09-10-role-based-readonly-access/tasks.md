## 1. Modèle de Données & Politiques RLS Supabase

- [x] 1.1 Créer le script de migration SQL pour la table de profils utilisateurs `crewdayz.user_profiles` (avec colonne `role` valant par défaut `'viewer'`)
- [x] 1.2 Ajouter le trigger PostgreSQL sur `auth.users` pour initialiser automatiquement le profil `viewer` à l'inscription
- [x] 1.3 Mettre en place les politiques Row Level Security (RLS) : `SELECT` ouvert aux utilisateurs connectés, `INSERT`/`UPDATE`/`DELETE` réservés aux rôles `editor` et `admin`

## 2. Services & Gestion Réactive du Rôle

- [x] 2.1 Mettre à jour les types TypeScript (`UserRole`, `UserProfile`) dans `src/app/models/types.ts`
- [x] 2.2 Enrichir `SupabaseService` avec le chargement du profil utilisateur, un signal `userRole` et un signal dérivé `isReadOnly`
- [x] 2.3 Gérer la réinitialisation de l'état du rôle lors de la déconnexion

## 3. Routage, Guards & Redirection

- [x] 3.1 Créer un guard fonctionnel `RoleGuard` dans `src/app/guards/role.guard.ts` pour filtrer l'accès selon les rôles autorisés
- [x] 3.2 Mettre à jour `src/app/app.routes.ts` en protégeant les routes restreintes (`/dashboard`, `/collaborateurs`, `/reconciliation`, `/audit`)
- [x] 3.3 Configurer la redirection de la route racine `/` vers `/mensuel` pour les utilisateurs `viewer` et `/dashboard` pour les `editor`/`admin`

## 4. Adaptation de la Barre Latérale (Sidebar)

- [x] 4.1 Mettre à jour `SidebarComponent` pour filtrer dynamiquement les éléments de navigation (`navigationItems`) selon le rôle actif de l'utilisateur
- [x] 4.2 Vérifier l'affichage du menu réduit / étendu pour un profil `viewer`

## 5. Mode Lecture Seule dans les Vues de Planning

- [x] 5.1 Désactiver les interactions d'ajout/modification d'absence au clic calendrier dans `MonthlyViewComponent` lorsque l'utilisateur est `viewer`
- [x] 5.2 Désactiver ou masquer les boutons d'action de modification dans `AnnualViewComponent` en mode `viewer`

## 6. Vérification & Validation

- [x] 6.1 Exécuter la suite de tests unitaires et le build (`pnpm build`)
- [x] 6.2 Valider le comportement complet pour un compte `viewer` (accès, navigation, lecture seule, redirection) et un compte `editor`/`admin`
