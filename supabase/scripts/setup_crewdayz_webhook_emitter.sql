-- Script d'activation du Webhook HTTP Asynchrone côté Crewdayz (pg_net + Supabase Vault + Throttle à la Source)
-- Aucune clé d'API, URL ou secret n'est codé en dur dans ce fichier.
-- Anti-rafale (Throttling) à la SOURCE : Évite d'émettre des requêtes HTTP réseau à Roadmap si un appel a déjà été émis il y a < 2s.

-- 1. Activation de l'extension réseau HTTP Supabase (pg_net)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Table de suivi d'état du dernier Webhook émis par Crewdayz
CREATE TABLE IF NOT EXISTS crewdayz.cd_webhook_state (
    id text PRIMARY KEY,
    last_sent_at timestamp with time zone DEFAULT now()
);

-- Insertion de la clé d'état par défaut
INSERT INTO crewdayz.cd_webhook_state (id, last_sent_at)
VALUES ('roadmap_availabilities', '1970-01-01 00:00:00+00'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- 3. Fonction d'émission HTTP Webhook Asynchrone avec Throttle à la Source
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
    -- Si un Webhook a déjà été émis vers Roadmap il y a moins de 2 secondes,
    -- on annule IMMÉDIATEMENT l'appel sans envoyer AUCUNE requête HTTP sur le réseau.
    SELECT last_sent_at INTO v_last_sent
    FROM crewdayz.cd_webhook_state
    WHERE id = 'roadmap_availabilities'
    FOR UPDATE;

    IF v_last_sent IS NOT NULL AND v_last_sent > (now() - interval '2 seconds') THEN
        -- Abandon direct : ZERO appel réseau HTTP envoyé vers Roadmap !
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

    -- C. Mise à jour de l'horodatage d'émission à la source
    UPDATE crewdayz.cd_webhook_state
    SET last_sent_at = now()
    WHERE id = 'roadmap_availabilities';

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
