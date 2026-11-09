-- Migration Supabase : Sécurisation des Inscriptions par Trigger PostgreSQL Natif et Règles d'Accès Partagées
-- Date: 2026-11-09
-- Fichier: supabase/migrations/20261109100000_auth_allowed_rules_and_trigger_hook.sql

-- 1. Schéma dédié app_auth (transverse entre applications Crewdayz et Roadmap)
CREATE SCHEMA IF NOT EXISTS app_auth;

-- Permissions d'accès au schéma pour les rôles Supabase
GRANT USAGE ON SCHEMA app_auth TO anon, authenticated, service_role;

-- 2. Table des règles d'accès (domaines d'entreprise et exceptions e-mails VIP / Google OAuth)
CREATE TABLE IF NOT EXISTS app_auth.allowed_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type text NOT NULL CHECK (rule_type IN ('domain', 'email')),
    value text NOT NULL UNIQUE,          -- ex: 'ca-titres.fr' (pour domain) ou 'admin.perso@gmail.com' (pour email)
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Index pour optimiser les requêtes du Trigger et du Frontend
CREATE INDEX IF NOT EXISTS idx_allowed_rules_active_type ON app_auth.allowed_rules(is_active, rule_type);
CREATE INDEX IF NOT EXISTS idx_allowed_rules_value_lower ON app_auth.allowed_rules(lower(value));

-- 3. Sécurité Row Level Security (RLS) & Droits d'Accès
ALTER TABLE app_auth.allowed_rules ENABLE ROW LEVEL SECURITY;

-- Lecture publique : filtrée par RLS pour n'exposer QUE les domaines actifs.
-- Les exceptions e-mails individuelles (VIP) restent confidentielles et ne sont lisibles que par le Trigger interne.
DROP POLICY IF EXISTS "Lecture publique des règles actives" ON app_auth.allowed_rules;
DROP POLICY IF EXISTS "Lecture publique des domaines autorisés" ON app_auth.allowed_rules;
CREATE POLICY "Lecture publique des domaines autorisés"
ON app_auth.allowed_rules
FOR SELECT
TO anon, authenticated
USING (is_active = true AND rule_type = 'domain');

-- Écriture (INSERT, UPDATE, DELETE) : STRICTEMENT BLOQUÉE pour tous les clients API (anon et authenticated).
-- Aucune interface de modification client n'étant prévue, toute administration se fait exclusivement
-- via Supabase Studio (Table Editor / SQL Editor) avec les privilèges postgres / service_role.
DROP POLICY IF EXISTS "Modification réservée aux administrateurs" ON app_auth.allowed_rules;

-- Permissions de base PostgreSQL (indispensables avant l'évaluation du RLS)
REVOKE ALL ON app_auth.allowed_rules FROM anon, authenticated;
GRANT SELECT ON app_auth.allowed_rules TO anon, authenticated, service_role;
GRANT ALL ON app_auth.allowed_rules TO service_role;

-- 4. Vue publique pour exposition transparente à l'API PostgREST (schéma public par défaut)
-- Double verrouillage :
-- a) Filtre explicite dans la vue sur les domaines actifs (étanchéité anti-fuite d'e-mails VIP)
-- b) security_invoker = true pour exécuter la vue avec les droits et le RLS de l'appelant (anon/authenticated)
CREATE OR REPLACE VIEW public.allowed_rules
WITH (security_invoker = true) AS
SELECT id, rule_type, value, description, is_active, created_at, updated_at
FROM app_auth.allowed_rules
WHERE is_active = true AND rule_type = 'domain';

-- Restriction stricte des privilèges : seule la lecture est accordée sur la vue
REVOKE ALL ON public.allowed_rules FROM anon, authenticated;
GRANT SELECT ON public.allowed_rules TO anon, authenticated, service_role;
GRANT ALL ON public.allowed_rules TO service_role;

-- 5. Fonction Trigger PostgreSQL : validation stricte avant création de compte (avant INSERT dans auth.users)
-- Cette fonction s'exécute avec les privilèges SECURITY DEFINER (postgres), lui permettant de lire
-- à la fois les domaines ET les e-mails VIP confidentiels.
CREATE OR REPLACE FUNCTION public.trigger_validate_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp, app_auth, public
AS $$
DECLARE
    v_email text;
    v_domain text;
    v_has_active_rules boolean;
    v_is_allowed boolean := false;
BEGIN
    -- Étape A : Mode permissif automatique si aucune règle active n'est définie
    -- Permet aux environnements locaux (dev) et à la CI de fonctionner sans configuration préalable.
    SELECT EXISTS (
        SELECT 1 FROM app_auth.allowed_rules WHERE is_active = true
    ) INTO v_has_active_rules;

    IF NOT v_has_active_rules THEN
        RETURN NEW;
    END IF;

    -- Étape B : Extraction et normalisation de l'adresse e-mail et du domaine
    v_email := lower(trim(NEW.email));
    IF v_email IS NULL OR v_email = '' OR position('@' in v_email) = 0 THEN
        RAISE EXCEPTION 'Adresse e-mail invalide ou absente.'
            USING ERRCODE = 'P0001';
    END IF;

    v_domain := split_part(v_email, '@', 2);

    -- Étape C : Vérification de la correspondance (exception e-mail exacte OU domaine autorisé)
    SELECT EXISTS (
        SELECT 1 FROM app_auth.allowed_rules
        WHERE is_active = true
          AND (
            (rule_type = 'email' AND lower(value) = v_email)
            OR
            (rule_type = 'domain' AND lower(value) = v_domain)
          )
    ) INTO v_is_allowed;

    -- Étape D : Blocage absolu si non autorisé
    IF NOT v_is_allowed THEN
        RAISE EXCEPTION 'Veuillez utiliser votre adresse professionnelle autorisee.'
            USING ERRCODE = 'P0001';
    END IF;

    -- Étape E : Inscription acceptée
    RETURN NEW;
END;
$$;

-- 6. Attachement du Trigger sur auth.users (déclenché avant INSERT)
DROP TRIGGER IF EXISTS on_auth_user_created_validate ON auth.users;
CREATE TRIGGER on_auth_user_created_validate
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_validate_signup();
