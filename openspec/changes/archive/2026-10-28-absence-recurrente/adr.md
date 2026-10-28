# ADR Review Manifest

## ADR Review Completed

- Date: 2026-10-28
- Reviewer: AI Assistant & Utilisateur
- Change: absence-recurrente

## In-Force ADR Context Reviewed

- adr/0001-theme-management-signals-css-variables.md - Gestion du thème et signals Angular
- adr/0002-additive-filter-pinning.md - Épinglage de collaborateurs et filtres
- adr/0003-role-based-access-control-and-readonly-mode.md - Rôles et contrôle d'accès lecture seule
- adr/0004-email-domain-restriction-signup.md - Restriction de domaine e-mail
- adr/0005-separation-update-and-reset-password-forms.md - Séparation des formulaires mot de passe
- adr/0006-otp-digit-password-recovery-flow.md - Récupération par OTP
- adr/0007-multi-step-otp-password-reset-and-direct-login.md - Flux multi-étapes mot de passe
- adr/0008-authenticated-main-layout-and-anti-flicker-dark-mode.md - Architecture MainLayout

## Repository-Level ADRs Created

- adr/0009-materialized-recurring-absences-generator.md - Choix de la matérialisation directe des absences récurrentes dans `cd_absences` et isolation de l'algorithme dans un utilitaire pur `recurrence-generator.ts`.

## Notes

Le choix de matérialiser directement les absences dans `cd_absences` plutôt que d'introduire un moteur virtuel de règles perpétuelles garantit la compatibilité immédiate avec les vues mensuelle et annuelle, les calculs de soldes, les exports et le système de réconciliation Triskell sans risque d'effets de bord.
