# ADR Review Manifest

## ADR Review Completed

- Date: 2026-10-03
- Reviewer: Antigravity
- Change: otp-digit-password-recovery

## In-Force ADR Context Reviewed

- `adr/0001-theme-management-signals-css-variables.md` - Gestion de thème via signaux et variables CSS.
- `adr/0002-additive-filter-pinning.md` - Épinglage additif des filtres.
- `adr/0003-role-based-access-control-and-readonly-mode.md` - Contrôle d'accès basé sur les rôles et mode lecture seule.
- `adr/0004-email-domain-restriction-signup.md` - Restriction de domaine pour l'inscription.
- `adr/0005-separation-update-and-reset-password-forms.md` - Séparation des formulaires de mise à jour et de réinitialisation de mot de passe (remplacé sur la partie acheminement du lien par l'ADR 0006).

## Repository-Level ADRs Created

- `adr/0006-otp-digit-password-recovery-flow.md` - Adoption du flux de récupération par code OTP à 6 chiffres pour contrer les scanners de messagerie et fiabiliser la réinitialisation.

## Notes

La décision 0006 résout définitivement le problème des jetons à usage unique consommés par les requêtes GET des scanners de messagerie (Microsoft Defender / Safe Links).
