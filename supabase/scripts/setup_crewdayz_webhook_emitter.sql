-- Script d'activation du Webhook HTTP Asynchrone côté Crewdayz (pg_net + Supabase Vault + Throttle Autonome à la Source)
-- Aucune clé d'API, URL ou secret n'est codé en dur dans ce fichier.
-- Auto-initialisation : Ne nécessite AUCUNE pré-insertion initiale dans la table cd_webhook_state.

-- 1. Activation de l'extension réseau HTTP Supabase (pg_net)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Table de suivi d'état du dernier Webhook émis par Crewdayz
CREATE TABLE IF NOT EXISTS crewdayz.cd_webhook_state (
    id text PRIMARY KEY,
    last_sent_at timestamp with time zone DEFAULT now()
);

-- 3. Fonction d'émission HTTP Webhook Asynchrone avec Auto-initialisation & Throttle à la Source
CREATE OR REPLACE FUNCTION crewdayz.trg_emit_roadmap_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url text;
    v_token text;
    v_last_sent timestamp with time zone;
BEGIN
    -- A. THROTTLE À LA SOURCE (Côté Crewdayz) :
    -- Lecture du dernier horodatage (s'il existe). Si absent, v_last_sent vaut NULL (premier appel).
    SELECT last_sent_at INTO v_last_sent
    FROM crewdayz.cd_webhook_state
    WHERE id = 'roadmap_availabilities'
    FOR UPDATE;

    -- Si un Webhook a été émis il y a moins de 2 secondes, annulation directe (0 appel réseau HTTP).
    IF v_last_sent IS NOT NULL AND v_last_sent > (now() - interval '2 seconds') THEN
        RETURN NULL;
    END IF;

    -- B. Exigence absolue : Secrets dans Supabase Vault
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'vault' AND table_name = 'decrypted_secrets') THEN
        RAISE EXCEPTION '[Crewdayz Webhook] L extension Supabase Vault (vault) n est pas activée.' USING ERRCODE = '42P01';
    END IF;

    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'roadmap_webhook_url' LIMIT 1;
    SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'roadmap_webhook_bearer_token' LIMIT 1;

    IF v_token IS NULL OR v_token = '' THEN
        RAISE EXCEPTION '[Crewdayz Webhook] Échec : Le jeton "roadmap_webhook_bearer_token" est introuvable dans Supabase Vault.' USING ERRCODE = '42501';
    END IF;

    IF v_url IS NULL OR v_url = '' THEN
        RAISE EXCEPTION '[Crewdayz Webhook] Échec : L URL "roadmap_webhook_url" est introuvable dans Supabase Vault.' USING ERRCODE = '42501';
    END IF;

    -- C. Mise à jour ou auto-initialisation de l'horodatage d'émission (UPSERT)
    INSERT INTO crewdayz.cd_webhook_state (id, last_sent_at)
    VALUES ('roadmap_availabilities', now())
    ON CONFLICT (id) DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at;

    -- D. Émission de l'UNIQUE appel HTTP POST asynchrone non-bloquant
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_token
        ),
        body := jsonb_build_object(
            'source', 'crewdayz',
            'event_type', TG_TABLE_NAME || '_' || LOWER(TG_OP),
            'payload', jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP)
        )
    );
    RETURN NULL;
END;
$$;

-- 4. Déclencheurs de Webhook HTTP par INSTRUCTION (FOR EACH STATEMENT -> 1 seule exécution par requête SQL)
DROP TRIGGER IF EXISTS trg_cd_absences_emit_webhook ON crewdayz.cd_absences;
CREATE TRIGGER trg_cd_absences_emit_webhook
    AFTER INSERT OR UPDATE OR DELETE ON crewdayz.cd_absences
    FOR EACH STATEMENT
    EXECUTE FUNCTION crewdayz.trg_emit_roadmap_webhook();

DROP TRIGGER IF EXISTS trg_cd_employees_emit_webhook ON crewdayz.cd_employees;
CREATE TRIGGER trg_cd_employees_emit_webhook
    AFTER INSERT OR UPDATE OR DELETE ON crewdayz.cd_employees
    FOR EACH STATEMENT
    EXECUTE FUNCTION crewdayz.trg_emit_roadmap_webhook();
