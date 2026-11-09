-- Script SQL Supabase : Durcissement de Sécurité Splinter Linter (Trigger d'inscription)
-- Date: 2026-11-09
-- Fichier: supabase/scripts/0004_harden_auth_trigger_splinter_linter.sql
-- Correction Splinter Linter: "Signed-In Users Can Execute SECURITY DEFINER Function"
--
-- Problème adressé :
-- Par défaut, PostgreSQL attribue les droits EXECUTE à PUBLIC sur les nouvelles fonctions.
-- Étant dans le schéma 'public', la fonction SECURITY DEFINER trigger_validate_signup() était
-- détectée par PostgREST comme un endpoint RPC callable par le rôle 'authenticated'.
--
-- Actions de correction Splinter :
-- 1. Déplacer la fonction dans le schéma privé app_auth (non exposé sur PostgREST)
-- 2. Révoquer explicitement tout droit EXECUTE aux rôles PUBLIC, anon et authenticated
-- 3. Ré-attacher le trigger BEFORE INSERT ON auth.users vers app_auth.trigger_validate_signup()
-- 4. Supprimer l'ancienne fonction résiduelle dans public

-- 1. Définition de la fonction dans le schéma privé app_auth
CREATE OR REPLACE FUNCTION app_auth.trigger_validate_signup()
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
    -- Mode permissif automatique si aucune règle active
    SELECT EXISTS (
        SELECT 1 FROM app_auth.allowed_rules WHERE is_active = true
    ) INTO v_has_active_rules;

    IF NOT v_has_active_rules THEN
        RETURN NEW;
    END IF;

    -- Extraction et normalisation de l'e-mail et du domaine
    v_email := lower(trim(NEW.email));
    IF v_email IS NULL OR v_email = '' OR position('@' in v_email) = 0 THEN
        RAISE EXCEPTION 'Adresse e-mail invalide ou absente.'
            USING ERRCODE = 'P0001';
    END IF;

    v_domain := split_part(v_email, '@', 2);

    -- Vérification de la correspondance (exception e-mail exacte OU domaine autorisé)
    SELECT EXISTS (
        SELECT 1 FROM app_auth.allowed_rules
        WHERE is_active = true
          AND (
            (rule_type = 'email' AND lower(value) = v_email)
            OR
            (rule_type = 'domain' AND lower(value) = v_domain)
          )
    ) INTO v_is_allowed;

    -- Blocage si non autorisé
    IF NOT v_is_allowed THEN
        RAISE EXCEPTION 'Veuillez utiliser votre adresse professionnelle autorisee.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Révocation stricte des privilèges d'exécution directe (correction Splinter Linter)
REVOKE EXECUTE ON FUNCTION app_auth.trigger_validate_signup() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_auth.trigger_validate_signup() FROM anon, authenticated;

-- 3. Ré-attachement du Trigger sur auth.users vers la fonction durcie dans app_auth
DROP TRIGGER IF EXISTS on_auth_user_created_validate ON auth.users;
CREATE TRIGGER on_auth_user_created_validate
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION app_auth.trigger_validate_signup();

-- 4. Suppression de l'ancienne fonction exposée dans public
DROP FUNCTION IF EXISTS public.trigger_validate_signup();
