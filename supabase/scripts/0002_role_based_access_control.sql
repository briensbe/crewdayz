-- Migration Supabase / PostgreSQL : Contrôle d'accès basé sur les rôles (RBAC) & Mode lecture seule
-- Schema : crewdayz

-- 1. Table des profils utilisateurs et rôles applicatifs
CREATE TABLE IF NOT EXISTS crewdayz.cd_user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Index pour accélérer les recherches par identifiant et rôle
CREATE INDEX IF NOT EXISTS idx_cd_user_profiles_role ON crewdayz.cd_user_profiles(role);

-- 2. Fonction et Trigger PostgreSQL pour initialiser automatiquement le profil en 'viewer'
CREATE OR REPLACE FUNCTION crewdayz.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, crewdayz
AS $$
BEGIN
    INSERT INTO crewdayz.cd_user_profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'viewer')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION crewdayz.handle_new_user();

-- Initialisation des profils pour les utilisateurs existants sans profil
INSERT INTO crewdayz.cd_user_profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Fonctions utilitaires de vérification des rôles (utilisées dans les politiques RLS)
CREATE OR REPLACE FUNCTION crewdayz.is_editor_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM crewdayz.cd_user_profiles
        WHERE id = auth.uid() AND role IN ('editor', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION crewdayz.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM crewdayz.cd_user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- 4. Configuration des politiques Row Level Security (RLS)

-- RLS sur cd_user_profiles
ALTER TABLE crewdayz.cd_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile or admin reads all" ON crewdayz.cd_user_profiles;
CREATE POLICY "Users can read own profile or admin reads all"
    ON crewdayz.cd_user_profiles
    FOR SELECT
    USING (auth.uid() = id OR crewdayz.is_admin());

DROP POLICY IF EXISTS "Only admin can update profiles" ON crewdayz.cd_user_profiles;
CREATE POLICY "Only admin can update profiles"
    ON crewdayz.cd_user_profiles
    FOR UPDATE
    USING (crewdayz.is_admin());

-- RLS sur cd_absences
ALTER TABLE crewdayz.cd_absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read absences" ON crewdayz.cd_absences;
CREATE POLICY "Authenticated users can read absences"
    ON crewdayz.cd_absences
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only editors and admins can modify absences" ON crewdayz.cd_absences;
CREATE POLICY "Only editors and admins can modify absences"
    ON crewdayz.cd_absences
    FOR ALL
    USING (crewdayz.is_editor_or_admin())
    WITH CHECK (crewdayz.is_editor_or_admin());

-- RLS sur cd_employees
ALTER TABLE crewdayz.cd_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read employees" ON crewdayz.cd_employees;
CREATE POLICY "Authenticated users can read employees"
    ON crewdayz.cd_employees
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only editors and admins can modify employees" ON crewdayz.cd_employees;
CREATE POLICY "Only editors and admins can modify employees"
    ON crewdayz.cd_employees
    FOR ALL
    USING (crewdayz.is_editor_or_admin())
    WITH CHECK (crewdayz.is_editor_or_admin());

-- RLS sur cd_employee_balances
ALTER TABLE crewdayz.cd_employee_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read balances" ON crewdayz.cd_employee_balances;
CREATE POLICY "Authenticated users can read balances"
    ON crewdayz.cd_employee_balances
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only editors and admins can modify balances" ON crewdayz.cd_employee_balances;
CREATE POLICY "Only editors and admins can modify balances"
    ON crewdayz.cd_employee_balances
    FOR ALL
    USING (crewdayz.is_editor_or_admin())
    WITH CHECK (crewdayz.is_editor_or_admin());

-- RLS sur audit_logs (réservé aux admins)
ALTER TABLE crewdayz.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can read audit logs" ON crewdayz.audit_logs;
CREATE POLICY "Only admins can read audit logs"
    ON crewdayz.audit_logs
    FOR SELECT
    USING (crewdayz.is_admin());

