# ADR Review Manifest

## ADR Review Completed

- Date: 2026-11-04
- Reviewer: AI Assistant & Utilisateur
- Change: user-preferences-persistence

## In-Force ADR Context Reviewed

- adr/0001-theme-management-signals-css-variables.md - Gestion du thème et signaux Angular (étendu par ADR-0010 pour la persistance distante)
- adr/0002-additive-filter-pinning.md - Épinglage de collaborateurs et filtres
- adr/0003-role-based-access-control-and-readonly-mode.md - Rôles et politiques RLS sur `cd_user_profiles`
- adr/0004-email-domain-restriction-signup.md - Restriction de domaine e-mail
- adr/0005-separation-update-and-reset-password-forms.md - Séparation des formulaires mot de passe
- adr/0006-otp-digit-password-recovery-flow.md - Récupération par OTP
- adr/0007-multi-step-otp-password-reset-and-direct-login.md - Flux multi-étapes mot de passe
- adr/0008-authenticated-main-layout-and-anti-flicker-dark-mode.md - Architecture MainLayout et script anti-flicker
- adr/0009-materialized-recurring-absences-generator.md - Génération matérialisée des absences récurrentes

## Repository-Level ADRs Created

- adr/0010-user-preferences-remote-persistence.md - Persistance distante des préférences utilisateur dans Supabase via une table dédiée `cd_user_preferences` (JSONB) et synchronisation par flush événementiel (`visibilitychange`, `pagehide`, `signOut`) avec Deep Diff.

## Notes

L'ADR 0010 consigne explicitement les 6 options d'architecture écartées au terme de la phase d'exploration (localStorage seul, IndexedDB, Cookies HTTP, User Metadata Supabase, colonne dans cd_user_profiles, Debounce continu, et persistance des filtres de vue dynamiques), justifiant le choix d'une table dédiée étanche, d'un périmètre ciblé (thème, colonnes, version release notes) et d'une écriture événementielle sobre.
