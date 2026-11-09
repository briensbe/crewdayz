# ADR Review Manifest

## ADR Review Completed

- Date: 2026-11-09
- Reviewer: Antigravity & Équipe de développement
- Change: restrict-signup-backend-hook

## In-Force ADR Context Reviewed

- adr/0003-role-based-access-control-and-readonly-mode.md - Modèle de rôles et RLS local à l'application CrewDayz ("Le Visa").
- adr/0004-email-domain-restriction-signup.md - Décision initiale de restriction d'inscription côté client ; désormais rendue obsolète et remplacée par l'ADR 0011.
- adr/0007-multi-step-otp-password-reset-and-direct-login.md - Flux de récupération et de connexion sécurisé interagissant avec Supabase Auth.

## Repository-Level ADRs Created

- adr/0011-backend-auth-hook-and-shared-access-rules.md - Sécurisation des inscriptions par Trigger PostgreSQL natif et règles d'accès partagées en BDD (remplace ADR-0004, documente l'Option A, la supériorité du Trigger natif sur le Hook GoTrue beta, et les alternatives rejetées Option B, Option C et app_scope).

## Notes

La décision enregistrée dans l'ADR 0011 formalise le découplage "Passeport (identité globale)" vs "Visa (rôles applicatifs)" et permet de sécuriser de façon étanche les inscriptions par mot de passe et les accès Google OAuth via un Trigger natif `BEFORE INSERT ON auth.users`, tout en conservant la mutualisation naturelle de l'instance Supabase entre Crewdayz et Roadmap.
