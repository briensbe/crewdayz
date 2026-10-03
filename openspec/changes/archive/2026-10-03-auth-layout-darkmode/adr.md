# ADR Review Manifest

## ADR Review Completed

- Date: 2026-10-03
- Reviewer: Antigravity
- Change: auth-layout-darkmode

## In-Force ADR Context Reviewed

- `adr/0001-theme-management-signals-css-variables.md` - Gestion du thème (Dark Mode) avec signaux Angular et variables CSS.
- `adr/0002-additive-filter-pinning.md` - Filtrage et épinglage de collaborateurs.
- `adr/0003-role-based-access-control-and-readonly-mode.md` - Contrôle d'accès basé sur les rôles et mode lecture seule.
- `adr/0004-email-domain-restriction-signup.md` - Restriction de domaine email à l'inscription.
- `adr/0005-separation-update-and-reset-password-forms.md` - Séparation des formulaires de mise à jour et réinitialisation de mot de passe.
- `adr/0006-otp-digit-password-recovery-flow.md` - Flux de récupération de mot de passe avec code OTP.
- `adr/0007-multi-step-otp-password-reset-and-direct-login.md` - Réinitialisation multi-étapes et connexion directe.

## Repository-Level ADRs Created

- `adr/0008-authenticated-main-layout-and-anti-flicker-dark-mode.md` - Séparation du shell applicatif dans `MainLayoutComponent` avec `AuthGuard` parent et initialisation précoce anti-flicker du thème.

## Notes

La décision 0008 complète l'ADR 0001 en étendant la portée de l'initialisation du thème au premier rendu (anti-flicker) et en restructurant le layout applicatif.
