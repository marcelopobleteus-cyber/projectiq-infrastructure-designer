-- Migration: 016_extend_user_roles.sql
-- Description: Adds 'editor' and 'viewer' values to public.user_role ENUM type.
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot be executed in the same transaction as statements that reference the new values,
-- so this migration MUST run before 017_role_permission_enforcement.sql.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'viewer';
