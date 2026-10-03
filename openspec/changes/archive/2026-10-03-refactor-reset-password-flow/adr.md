# ADR Review Manifest

## ADR Review Completed

- Date: 2026-10-03
- Reviewer: Antigravity
- Change: refactor-reset-password-flow

## In-Force ADR Context Reviewed

- `adr/0001-theme-management-signals-css-variables.md` - Gestion des thèmes et variables CSS
- `adr/0002-additive-filter-pinning.md` - Système d'épinglage des filtres collaborateurs
- `adr/0003-role-based-access-control-and-readonly-mode.md` - Contrôle d'accès par rôle (RBAC) et mode lecture seule
- `adr/0004-email-domain-restriction-signup.md` - Restriction de domaine email à l'inscription
- `adr/0005-separation-update-and-reset-password-forms.md` - Séparation des routes de mise à jour et réinitialisation de mot de passe
- `adr/0006-otp-digit-password-recovery-flow.md` - Flux de récupération de mot de passe par code OTP à 6 chiffres

## Repository-Level ADRs Created

- `adr/0007-multi-step-otp-password-reset-and-direct-login.md` - Parcours séquentiel en 3 étapes de réinitialisation, autorisation de l'ancien mot de passe au reset et accès direct à l'application.

## Notes

La décision 0007 affine l'orchestration UX et le découplage des appels d'authentification introduits par l'ADR 0006.
