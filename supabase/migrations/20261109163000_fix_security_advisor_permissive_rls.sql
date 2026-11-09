-- ============================================================================
-- Migration : 20261109163000_fix_security_advisor_permissive_rls.sql
-- Emplacement : supabase/migrations/ (Miroir de supabase-shared/migrations/)
-- Description : Résolution des alertes Supabase Security Advisor (lint 0024_permissive_rls_policy)
--               pour le schéma crewdayz.
--               Suppression des anciennes politiques RLS permissives (USING true / WITH CHECK true)
--               sur crewdayz.cd_absences, crewdayz.cd_employee_balances, crewdayz.cd_employees.
-- ============================================================================

-- ============================================================================
-- Nettoyage des anciennes politiques permissives sur les tables Crewdayz
-- ============================================================================
-- Note : Ces tables disposent déjà des politiques RBAC restrictives déployées par
-- la migration 20260912162522_RBAC-crewdayz.sql ("Only editors and admins can modify ...").
-- La suppression de ces anciens reliquats permissifs rétablit l'étanchéité et le contrôle RBAC.

-- 1. crewdayz.cd_absences
DROP POLICY IF EXISTS "Allow authenticated delete on cd_absences" ON crewdayz.cd_absences;
DROP POLICY IF EXISTS "Allow authenticated insert on cd_absences" ON crewdayz.cd_absences;
DROP POLICY IF EXISTS "Allow authenticated update on cd_absences" ON crewdayz.cd_absences;
DROP POLICY IF EXISTS "Allow authenticated read on cd_absences" ON crewdayz.cd_absences;

-- 2. crewdayz.cd_employee_balances
DROP POLICY IF EXISTS "Allow authenticated delete on cd_employee_balances" ON crewdayz.cd_employee_balances;
DROP POLICY IF EXISTS "Allow authenticated insert on cd_employee_balances" ON crewdayz.cd_employee_balances;
DROP POLICY IF EXISTS "Allow authenticated update on cd_employee_balances" ON crewdayz.cd_employee_balances;
DROP POLICY IF EXISTS "Allow authenticated read on cd_employee_balances" ON crewdayz.cd_employee_balances;

-- 3. crewdayz.cd_employees
DROP POLICY IF EXISTS "Allow authenticated delete on cd_employees" ON crewdayz.cd_employees;
DROP POLICY IF EXISTS "Allow authenticated insert on cd_employees" ON crewdayz.cd_employees;
DROP POLICY IF EXISTS "Allow authenticated update on cd_employees" ON crewdayz.cd_employees;
DROP POLICY IF EXISTS "Allow authenticated read on cd_employees" ON crewdayz.cd_employees;
