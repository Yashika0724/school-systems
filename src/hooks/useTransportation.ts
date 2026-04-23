import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface BusRoute {
  id: string;
  route_name: string;
  route_number: string | null;
  start_location: string;
  end_location: string;
  stops: string[];
  morning_time: string | null;
  evening_time: string | null;
  distance_km: number | null;
  monthly_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bus {
  id: string;
  bus_number: string;
  capacity: number;
  driver_name: string | null;
  driver_phone: string | null;
  conductor_name: string | null;
  conductor_phone: string | null;
  route_id: string | null;
  driver_user_id: string | null;
  driver_id: string | null;
  conductor_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  route?: BusRoute;
  driver?: (Driver & { profile?: DriverProfile | null }) | null;
  conductor?: Conductor | null;
}

export interface RouteStop {
  id: string;
  route_id: string;
  sequence: number;
  name: string;
  lat: number | null;
  lng: number | null;
  scheduled_morning_time: string | null;
  scheduled_evening_time: string | null;
  created_at: string;
}

export type TripType = 'morning' | 'evening';
export type TripStatus = 'active' | 'completed' | 'cancelled';
export type StopEventType = 'arrived' | 'departed' | 'skipped';

export interface BusTrip {
  id: string;
  bus_id: string;
  route_id: string;
  trip_type: TripType;
  status: TripStatus;
  started_at: string;
  ended_at: string | null;
  started_by: string | null;
  created_at: string;
}

export interface TripStopEvent {
  id: string;
  trip_id: string;
  route_stop_id: string;
  event_type: StopEventType;
  recorded_at: string;
  route_stop?: RouteStop;
}

export interface BusLocation {
  id: string;
  trip_id: string;
  lat: number;
  lng: number;
  speed_kmh: number | null;
  heading: number | null;
  accuracy_m: number | null;
  recorded_at: string;
}

export interface DriverProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface Driver {
  id: string;
  user_id: string;
  license_number: string | null;
  license_expiry: string | null;
  experience_years: number | null;
  date_of_joining: string | null;
  emergency_contact: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: DriverProfile | null;
  buses?: Pick<Bus, 'id' | 'bus_number'>[];
}

export interface Conductor {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  date_of_joining: string | null;
  emergency_contact: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  buses?: Pick<Bus, 'id' | 'bus_number'>[];
}

export interface StudentTransport {
  id: string;
  student_id: string;
  bus_id: string;
  route_id: string;
  pickup_point: string;
  drop_point: string | null;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bus?: Bus;
  route?: BusRoute;
  student?: {
    id: string;
    roll_number: string | null;
    profile?: { full_name: string };
    class?: { name: string; section: string };
  };
}

// Hooks
export function useBusRoutes() {
  return useQuery({
    queryKey: ['bus-routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bus_routes')
        .select('*')
        .order('route_name');

      if (error) throw error;
      return data as BusRoute[];
    },
  });
}

export function useBuses() {
  return useQuery({
    queryKey: ['buses'],
    queryFn: async () => {
      const { data: buses, error } = await supabase
        .from('buses')
        .select(`
          *,
          route:bus_routes(*),
          driver:drivers(*),
          conductor:conductors(*)
        `)
        .order('bus_number');

      if (error) throw error;
      if (!buses) return [] as Bus[];

      // drivers.user_id isn't FK'd to profiles, so fetch profiles separately
      const driverUserIds = buses
        .map((b) => (b.driver as { user_id?: string } | null)?.user_id)
        .filter((id): id is string => !!id);
      const { data: profiles } = driverUserIds.length
        ? await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone, avatar_url')
            .in('user_id', driverUserIds)
        : { data: [] };

      return buses.map((b) => {
        const driver = b.driver as (Driver & { profile?: DriverProfile | null }) | null;
        return {
          ...b,
          driver: driver
            ? {
                ...driver,
                profile: profiles?.find((p) => p.user_id === driver.user_id) ?? null,
              }
            : null,
        };
      }) as Bus[];
    },
  });
}

async function enrichAssignmentWithDriverProfile(
  assignment: StudentTransport | null,
): Promise<StudentTransport | null> {
  if (!assignment?.bus) return assignment;
  const driver = (assignment.bus as Bus).driver;
  const userId = driver?.user_id;
  if (!userId) return assignment;

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, full_name, email, phone, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    ...assignment,
    bus: {
      ...(assignment.bus as Bus),
      driver: { ...driver, profile: profile ?? null },
    },
  };
}

export function useStudentTransport() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-transport', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError) throw studentError;

      const { data, error } = await supabase
        .from('student_transport')
        .select(`
          *,
          bus:buses(*, driver:drivers(*), conductor:conductors(*)),
          route:bus_routes(*)
        `)
        .eq('student_id', student.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return enrichAssignmentWithDriverProfile(data as StudentTransport | null);
    },
    enabled: !!user?.id,
  });
}

export function useStudentTransportById(studentId: string | null | undefined) {
  return useQuery({
    queryKey: ['student-transport-by-id', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_transport')
        .select(`*, bus:buses(*, driver:drivers(*), conductor:conductors(*)), route:bus_routes(*)`)
        .eq('student_id', studentId!)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return enrichAssignmentWithDriverProfile(data as StudentTransport | null);
    },
  });
}

export function useAllStudentTransport() {
  return useQuery({
    queryKey: ['all-student-transport'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_transport')
        .select(`
          *,
          bus:buses(*),
          route:bus_routes(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudentTransport[];
    },
  });
}

export function useTransportStats() {
  return useQuery({
    queryKey: ['transport-stats'],
    queryFn: async () => {
      const [routesRes, busesRes, assignmentsRes] = await Promise.all([
        supabase.from('bus_routes').select('id, is_active'),
        supabase.from('buses').select('id, capacity, is_active'),
        supabase.from('student_transport').select('id, is_active'),
      ]);

      if (routesRes.error) throw routesRes.error;
      if (busesRes.error) throw busesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      const activeRoutes = routesRes.data?.filter(r => r.is_active).length || 0;
      const activeBuses = busesRes.data?.filter(b => b.is_active).length || 0;
      const totalCapacity = busesRes.data?.filter(b => b.is_active).reduce((sum, b) => sum + b.capacity, 0) || 0;
      const activeStudents = assignmentsRes.data?.filter(a => a.is_active).length || 0;

      return {
        activeRoutes,
        activeBuses,
        totalCapacity,
        activeStudents,
        availableSeats: totalCapacity - activeStudents,
      };
    },
  });
}

// Mutations
export function useUpdateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      route_name?: string;
      route_number?: string | null;
      start_location?: string;
      end_location?: string;
      morning_time?: string | null;
      evening_time?: string | null;
      monthly_fee?: number;
      is_active?: boolean;
    }) => {
      const { id, ...patch } = data;
      const { error } = await supabase.from('bus_routes').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-routes'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Route updated');
    },
    onError: (e: Error) => toast.error(`Failed to update route: ${e.message}`),
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bus_routes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-routes'] });
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      queryClient.invalidateQueries({ queryKey: ['all-student-transport'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Route deleted');
    },
    onError: (e: Error) => toast.error(`Failed to delete route: ${e.message}`),
  });
}

export function useDeleteBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('buses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      queryClient.invalidateQueries({ queryKey: ['all-student-transport'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Bus deleted');
    },
    onError: (e: Error) => toast.error(`Failed to delete bus: ${e.message}`),
  });
}

export function useUpdateRouteStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      route_id: string;
      name?: string;
      lat?: number | null;
      lng?: number | null;
      scheduled_morning_time?: string | null;
      scheduled_evening_time?: string | null;
      sequence?: number;
    }) => {
      const { id, route_id: _routeId, ...patch } = data;
      const { error } = await supabase.from('route_stops').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['route-stops', vars.route_id] });
      toast.success('Stop updated');
    },
    onError: (e: Error) => toast.error(`Failed to update stop: ${e.message}`),
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      route_name: string;
      route_number?: string;
      start_location: string;
      end_location: string;
      stops?: string[];
      morning_time?: string;
      evening_time?: string;
      monthly_fee: number;
    }) => {
      const { error } = await supabase.from('bus_routes').insert({
        ...data,
        stops: data.stops || [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-routes'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Route created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create route: ${error.message}`);
    },
  });
}

export function useCreateBus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bus_number: string;
      capacity: number;
      driver_name?: string;
      driver_phone?: string;
      conductor_name?: string;
      conductor_phone?: string;
      route_id?: string;
    }) => {
      const { error } = await supabase.from('buses').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Bus added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add bus: ${error.message}`);
    },
  });
}

export function useAssignTransport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      bus_id: string;
      route_id: string;
      pickup_point: string;
      drop_point?: string;
    }) => {
      const { error } = await supabase.from('student_transport').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-student-transport'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Transport assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign transport: ${error.message}`);
    },
  });
}

export function useRemoveTransport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('student_transport')
        .update({ is_active: false })
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-student-transport'] });
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      queryClient.invalidateQueries({ queryKey: ['transport-stats'] });
      toast.success('Transport assignment removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove assignment: ${error.message}`);
    },
  });
}

// -- Route stops -----------------------------------------------------

export function useRouteStops(routeId: string | null | undefined) {
  return useQuery({
    queryKey: ['route-stops', routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_stops')
        .select('*')
        .eq('route_id', routeId!)
        .order('sequence');
      if (error) throw error;
      return data as RouteStop[];
    },
  });
}

export function useCreateRouteStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      route_id: string;
      sequence: number;
      name: string;
      lat?: number | null;
      lng?: number | null;
      scheduled_morning_time?: string | null;
      scheduled_evening_time?: string | null;
    }) => {
      const { error } = await supabase.from('route_stops').insert(data);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['route-stops', vars.route_id] });
      toast.success('Stop added');
    },
    onError: (e: Error) => toast.error(`Failed to add stop: ${e.message}`),
  });
}

export function useDeleteRouteStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, route_id: _routeId }: { id: string; route_id: string }) => {
      const { error } = await supabase.from('route_stops').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['route-stops', vars.route_id] });
      toast.success('Stop removed');
    },
    onError: (e: Error) => toast.error(`Failed to remove stop: ${e.message}`),
  });
}

// -- Bus edit (assign driver) ---------------------------------------

export function useUpdateBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      route_id?: string | null;
      driver_id?: string | null;
      conductor_id?: string | null;
      is_active?: boolean;
    }) => {
      const { id, ...patch } = data;
      const { error } = await supabase.from('buses').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      queryClient.invalidateQueries({ queryKey: ['bus', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['my-driven-buses'] });
      toast.success('Bus updated');
    },
    onError: (e: Error) => toast.error(`Failed to update bus: ${e.message}`),
  });
}

// -- Driver side -----------------------------------------------------

export function useMyDrivenBuses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-driven-buses', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buses')
        .select('*, route:bus_routes(*)')
        .eq('driver_user_id', user!.id)
        .order('bus_number');
      if (error) throw error;
      return data as Bus[];
    },
  });
}

export function useActiveTripForBus(busId: string | null | undefined) {
  return useQuery({
    queryKey: ['active-trip', busId],
    enabled: !!busId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bus_trips')
        .select('*')
        .eq('bus_id', busId!)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data as BusTrip | null;
    },
  });
}

export function useStartTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { bus_id: string; route_id: string; trip_type: TripType }) => {
      const { data: inserted, error } = await supabase
        .from('bus_trips')
        .insert({ ...data, started_by: user?.id, status: 'active' })
        .select('*')
        .single();
      if (error) throw error;
      return inserted as BusTrip;
    },
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['active-trip', trip.bus_id] });
      toast.success('Trip started');
    },
    onError: (e: Error) => toast.error(`Failed to start trip: ${e.message}`),
  });
}

export function useEndTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from('bus_trips')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-trip'] });
      queryClient.invalidateQueries({ queryKey: ['trip-stop-events'] });
      toast.success('Trip ended');
    },
    onError: (e: Error) => toast.error(`Failed to end trip: ${e.message}`),
  });
}

export function useRecordStopEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      trip_id: string;
      route_stop_id: string;
      event_type?: StopEventType;
    }) => {
      const { error } = await supabase.from('trip_stop_events').insert({
        ...data,
        event_type: data.event_type ?? 'arrived',
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['trip-stop-events', vars.trip_id] });
      toast.success('Stop recorded');
    },
    onError: (e: Error) => toast.error(`Failed to record stop: ${e.message}`),
  });
}

export function useRecordLocation() {
  return useMutation({
    mutationFn: async (data: {
      trip_id: string;
      lat: number;
      lng: number;
      speed_kmh?: number | null;
      heading?: number | null;
      accuracy_m?: number | null;
    }) => {
      const { error } = await supabase.from('bus_locations').insert(data);
      if (error) throw error;
    },
  });
}

// -- Viewer side (live location + stop events) ---------------------

export function useTripStopEvents(tripId: string | null | undefined) {
  return useQuery({
    queryKey: ['trip-stop-events', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_stop_events')
        .select('*, route_stop:route_stops(*)')
        .eq('trip_id', tripId!)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return data as TripStopEvent[];
    },
  });
}

/**
 * Subscribes to the latest GPS sample for the active trip on a bus.
 * Seeds with the most recent row, then upgrades in real time.
 */
export function useLiveBusLocation(busId: string | null | undefined) {
  const queryClient = useQueryClient();

  const tripQuery = useQuery({
    queryKey: ['active-trip', busId],
    enabled: !!busId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bus_trips')
        .select('*')
        .eq('bus_id', busId!)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data as BusTrip | null;
    },
  });

  const tripId = tripQuery.data?.id ?? null;

  const locationQuery = useQuery({
    queryKey: ['bus-location', tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('trip_id', tripId!)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BusLocation | null;
    },
  });

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`bus-locations-${tripId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bus_locations', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          queryClient.setQueryData(['bus-location', tripId], payload.new as BusLocation);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  useEffect(() => {
    if (!busId) return;
    const channel = supabase
      .channel(`bus-trips-${busId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bus_trips', filter: `bus_id=eq.${busId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-trip', busId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [busId, queryClient]);

  return {
    trip: tripQuery.data,
    location: locationQuery.data,
    isLoading: tripQuery.isLoading || locationQuery.isLoading,
  };
}

// -- Drivers ---------------------------------------------------------

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = drivers?.map((d) => d.user_id) ?? [];
      if (userIds.length === 0) return [] as Driver[];

      const [{ data: profiles }, { data: buses }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, phone, avatar_url').in('user_id', userIds),
        supabase.from('buses').select('id, bus_number, driver_id').in('driver_id', drivers.map((d) => d.id)),
      ]);

      return drivers.map((d) => ({
        ...d,
        profile: profiles?.find((p) => p.user_id === d.user_id) ?? null,
        buses: buses?.filter((b) => b.driver_id === d.id).map((b) => ({ id: b.id, bus_number: b.bus_number })),
      })) as Driver[];
    },
  });
}

export function useDriver(driverId: string | null | undefined) {
  return useQuery({
    queryKey: ['driver', driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data: driver, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId!)
        .maybeSingle();
      if (error) throw error;
      if (!driver) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, avatar_url')
        .eq('user_id', driver.user_id)
        .maybeSingle();

      return { ...driver, profile: profile ?? null } as Driver;
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      licenseNumber?: string;
      licenseExpiry?: string;
      experienceYears?: number;
      dateOfJoining?: string;
      emergencyContact?: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: { ...data, userType: 'driver' },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver created');
    },
    onError: (e: Error) => toast.error(`Failed to create driver: ${e.message}`),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      license_number?: string | null;
      license_expiry?: string | null;
      experience_years?: number | null;
      date_of_joining?: string | null;
      emergency_contact?: string | null;
      is_active?: boolean;
    }) => {
      const { id, ...patch } = data;
      const { error } = await supabase.from('drivers').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver', vars.id] });
      toast.success('Driver updated');
    },
    onError: (e: Error) => toast.error(`Failed to update driver: ${e.message}`),
  });
}

// -- Conductors (no auth login for MVP) ------------------------------

export function useConductors() {
  return useQuery({
    queryKey: ['conductors'],
    queryFn: async () => {
      const { data: conductors, error } = await supabase
        .from('conductors')
        .select('*')
        .order('full_name');
      if (error) throw error;

      const ids = conductors?.map((c) => c.id) ?? [];
      if (ids.length === 0) return [] as Conductor[];

      const { data: buses } = await supabase
        .from('buses')
        .select('id, bus_number, conductor_id')
        .in('conductor_id', ids);

      return conductors.map((c) => ({
        ...c,
        buses: buses?.filter((b) => b.conductor_id === c.id).map((b) => ({ id: b.id, bus_number: b.bus_number })),
      })) as Conductor[];
    },
  });
}

export function useCreateConductor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      full_name: string;
      phone?: string | null;
      date_of_joining?: string | null;
      emergency_contact?: string | null;
    }) => {
      const { error } = await supabase.from('conductors').insert({
        full_name: data.full_name,
        phone: data.phone || null,
        date_of_joining: data.date_of_joining || null,
        emergency_contact: data.emergency_contact || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductors'] });
      toast.success('Conductor added');
    },
    onError: (e: Error) => toast.error(`Failed to add conductor: ${e.message}`),
  });
}

export function useUpdateConductor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      full_name?: string;
      phone?: string | null;
      date_of_joining?: string | null;
      emergency_contact?: string | null;
      is_active?: boolean;
    }) => {
      const { id, ...patch } = data;
      const { error } = await supabase.from('conductors').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductors'] });
      toast.success('Conductor updated');
    },
    onError: (e: Error) => toast.error(`Failed to update conductor: ${e.message}`),
  });
}

// -- Bus details page (full info for one bus) ------------------------

export function useBus(busId: string | null | undefined) {
  return useQuery({
    queryKey: ['bus', busId],
    enabled: !!busId,
    queryFn: async () => {
      const { data: bus, error } = await supabase
        .from('buses')
        .select(`*, route:bus_routes(*)`)
        .eq('id', busId!)
        .maybeSingle();
      if (error) throw error;
      if (!bus) return null;

      const [driverRes, conductorRes, assignmentsRes, tripsRes] = await Promise.all([
        bus.driver_id
          ? supabase.from('drivers').select('*').eq('id', bus.driver_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as const),
        bus.conductor_id
          ? supabase.from('conductors').select('*').eq('id', bus.conductor_id).maybeSingle()
          : Promise.resolve({ data: null, error: null } as const),
        supabase
          .from('student_transport')
          .select(`*, student:students(id, roll_number, user_id)`)
          .eq('bus_id', bus.id)
          .eq('is_active', true),
        supabase
          .from('bus_trips')
          .select('*')
          .eq('bus_id', bus.id)
          .order('started_at', { ascending: false })
          .limit(10),
      ]);

      let driverProfile: DriverProfile | null = null;
      if (driverRes.data) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, avatar_url')
          .eq('user_id', driverRes.data.user_id)
          .maybeSingle();
        driverProfile = data ?? null;
      }

      const studentUserIds = (assignmentsRes.data ?? [])
        .map((a) => (a.student as { user_id?: string } | null)?.user_id)
        .filter((id): id is string => !!id);
      const { data: studentProfiles } = studentUserIds.length
        ? await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', studentUserIds)
        : { data: [] };

      const assignments = (assignmentsRes.data ?? []).map((a) => {
        const student = a.student as { id: string; roll_number: string | null; user_id: string } | null;
        return {
          ...a,
          student_name: student
            ? studentProfiles?.find((p) => p.user_id === student.user_id)?.full_name ?? null
            : null,
          roll_number: student?.roll_number ?? null,
        };
      });

      return {
        ...bus,
        driver: driverRes.data ? { ...driverRes.data, profile: driverProfile } : null,
        conductor: conductorRes.data ?? null,
        assignments,
        recentTrips: tripsRes.data ?? [],
      };
    },
  });
}
