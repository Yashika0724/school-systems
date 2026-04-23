-- Transport tracking: live bus GPS + stop check-ins
-- Adds structured route stops, trip sessions, stop events, and GPS samples.

-- 1. Link a driver user account to a bus
ALTER TABLE public.buses
  ADD COLUMN IF NOT EXISTS driver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_buses_driver_user_id ON public.buses(driver_user_id);

-- 2. Structured stops (supersedes bus_routes.stops text[])
CREATE TABLE IF NOT EXISTS public.route_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  scheduled_morning_time TIME,
  scheduled_evening_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (route_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route_sequence
  ON public.route_stops(route_id, sequence);

-- 3. Trip types and status enums
DO $$ BEGIN
  CREATE TYPE public.trip_type AS ENUM ('morning', 'evening');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trip_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stop_event_type AS ENUM ('arrived', 'departed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Trip sessions (one per morning/evening run)
CREATE TABLE IF NOT EXISTS public.bus_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  trip_type public.trip_type NOT NULL,
  status public.trip_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bus_trips_bus_status
  ON public.bus_trips(bus_id, status, started_at DESC);

-- Only one active trip per bus at a time
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_trip_per_bus
  ON public.bus_trips(bus_id) WHERE status = 'active';

-- 5. Stop check-in events
CREATE TABLE IF NOT EXISTS public.trip_stop_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.bus_trips(id) ON DELETE CASCADE,
  route_stop_id UUID NOT NULL REFERENCES public.route_stops(id) ON DELETE CASCADE,
  event_type public.stop_event_type NOT NULL DEFAULT 'arrived',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_stop_events_trip
  ON public.trip_stop_events(trip_id, recorded_at DESC);

-- 6. GPS samples
CREATE TABLE IF NOT EXISTS public.bus_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.bus_trips(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_kmh DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bus_locations_trip_recorded
  ON public.bus_locations(trip_id, recorded_at DESC);

-- 7. Helper: can this user view this bus (driver, admin, assigned student, or parent of assigned student)?
CREATE OR REPLACE FUNCTION public.can_view_bus(_user_id UUID, _bus_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.buses b WHERE b.id = _bus_id AND b.driver_user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.student_transport st
      JOIN public.students s ON s.id = st.student_id
      WHERE st.bus_id = _bus_id AND s.user_id = _user_id AND st.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.student_transport st
      JOIN public.parent_student ps ON ps.student_id = st.student_id
      JOIN public.parents p ON p.id = ps.parent_id
      WHERE st.bus_id = _bus_id AND p.user_id = _user_id AND st.is_active = true
    );
$$;

-- 8. Helper: is this user the registered driver for this bus?
CREATE OR REPLACE FUNCTION public.is_bus_driver(_user_id UUID, _bus_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.buses b WHERE b.id = _bus_id AND b.driver_user_id = _user_id);
$$;

-- 9. RLS
ALTER TABLE public.route_stops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_trips        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stop_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_locations    ENABLE ROW LEVEL SECURITY;

-- route_stops: all authenticated can read, admin manages
CREATE POLICY "route_stops readable by authenticated"
  ON public.route_stops FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "route_stops admin manages"
  ON public.route_stops FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- bus_trips
CREATE POLICY "bus_trips driver insert"
  ON public.bus_trips FOR INSERT
  WITH CHECK (public.is_bus_driver(auth.uid(), bus_id));

CREATE POLICY "bus_trips driver update"
  ON public.bus_trips FOR UPDATE
  USING (public.is_bus_driver(auth.uid(), bus_id));

CREATE POLICY "bus_trips viewable by related"
  ON public.bus_trips FOR SELECT
  USING (public.can_view_bus(auth.uid(), bus_id));

CREATE POLICY "bus_trips admin manages"
  ON public.bus_trips FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- trip_stop_events
CREATE POLICY "trip_stop_events driver insert"
  ON public.trip_stop_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bus_trips bt
    WHERE bt.id = trip_id AND public.is_bus_driver(auth.uid(), bt.bus_id)
  ));

CREATE POLICY "trip_stop_events viewable by related"
  ON public.trip_stop_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bus_trips bt
    WHERE bt.id = trip_id AND public.can_view_bus(auth.uid(), bt.bus_id)
  ));

CREATE POLICY "trip_stop_events admin manages"
  ON public.trip_stop_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- bus_locations
CREATE POLICY "bus_locations driver insert"
  ON public.bus_locations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bus_trips bt
    WHERE bt.id = trip_id
      AND bt.status = 'active'
      AND public.is_bus_driver(auth.uid(), bt.bus_id)
  ));

CREATE POLICY "bus_locations viewable by related"
  ON public.bus_locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bus_trips bt
    WHERE bt.id = trip_id AND public.can_view_bus(auth.uid(), bt.bus_id)
  ));

CREATE POLICY "bus_locations admin manages"
  ON public.bus_locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_stop_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_trips;
