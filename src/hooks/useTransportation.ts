import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
  route?: BusRoute;
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
      const { data, error } = await supabase
        .from('buses')
        .select(`
          *,
          route:bus_routes(*)
        `)
        .order('bus_number');

      if (error) throw error;
      return data as Bus[];
    },
  });
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
          bus:buses(*),
          route:bus_routes(*)
        `)
        .eq('student_id', student.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as StudentTransport | null;
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
        .select(`*, bus:buses(*), route:bus_routes(*)`)
        .eq('student_id', studentId!)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as StudentTransport | null;
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
