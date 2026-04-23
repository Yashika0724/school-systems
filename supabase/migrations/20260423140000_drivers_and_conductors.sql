-- Drivers and conductors: dedicated staff tables + bus FKs

-- 1. Drivers (always have an auth user account)
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  license_number TEXT,
  license_expiry DATE,
  experience_years INTEGER,
  date_of_joining DATE,
  emergency_contact TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON public.drivers(is_active);

-- 2. Conductors (optional auth account; minimally just name + phone)
CREATE TABLE IF NOT EXISTS public.conductors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  date_of_joining DATE,
  emergency_contact TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conductors_is_active ON public.conductors(is_active);

-- 3. Link buses to drivers/conductors
ALTER TABLE public.buses
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conductor_id UUID REFERENCES public.conductors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_buses_driver_id ON public.buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_buses_conductor_id ON public.buses(conductor_id);

-- 4. Trigger: when buses.driver_id changes, sync buses.driver_user_id from drivers.user_id
-- This keeps the tracking-policy plumbing (which checks driver_user_id) working.
CREATE OR REPLACE FUNCTION public.sync_bus_driver_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.driver_id IS NULL THEN
    NEW.driver_user_id := NULL;
  ELSIF (TG_OP = 'INSERT') OR (NEW.driver_id IS DISTINCT FROM OLD.driver_id) THEN
    SELECT user_id INTO NEW.driver_user_id FROM public.drivers WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bus_driver_user_id ON public.buses;
CREATE TRIGGER trg_sync_bus_driver_user_id
  BEFORE INSERT OR UPDATE OF driver_id ON public.buses
  FOR EACH ROW EXECUTE FUNCTION public.sync_bus_driver_user_id();

-- 5. updated_at triggers
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conductors_updated_at
  BEFORE UPDATE ON public.conductors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS
ALTER TABLE public.drivers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conductors ENABLE ROW LEVEL SECURITY;

-- drivers: admin full; driver sees own; riders assigned to this bus can see the driver
CREATE POLICY "drivers admin manages"
  ON public.drivers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "drivers view own"
  ON public.drivers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "drivers viewable by assigned riders"
  ON public.drivers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.buses b
    WHERE b.driver_id = drivers.id
      AND public.can_view_bus(auth.uid(), b.id)
  ));

-- conductors: admin full; riders on this bus can see the conductor
CREATE POLICY "conductors admin manages"
  ON public.conductors FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "conductors view own"
  ON public.conductors FOR SELECT
  USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "conductors viewable by assigned riders"
  ON public.conductors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.buses b
    WHERE b.conductor_id = conductors.id
      AND public.can_view_bus(auth.uid(), b.id)
  ));
