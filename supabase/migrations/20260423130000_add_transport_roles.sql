-- Add 'driver' and 'conductor' to app_role enum.
-- Must commit before any migration references these literals in policies/etc.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'conductor';
