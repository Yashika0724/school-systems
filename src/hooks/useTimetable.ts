import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TimetableSlot {
  id: string;
  class_id: string;
  day_of_week: number;
  slot_number: number;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  teacher_id: string | null;
  room: string | null;
  class?: {
    id: string;
    name: string;
    section: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    profile?: {
      full_name: string;
    };
  };
}

export interface ClassSession {
  id: string;
  timetable_slot_id: string | null;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  session_date: string;
  topic: string | null;
  description: string | null;
  prerequisites: string | null;
  resources: string | null;
  learning_objectives: string | null;
  status: string;
  subject?: {
    id: string;
    name: string;
  };
  class?: {
    id: string;
    name: string;
    section: string;
  };
}

// Get timetable for a class
export function useClassTimetable(classId: string | null) {
  return useQuery({
    queryKey: ['class-timetable', classId],
    queryFn: async (): Promise<TimetableSlot[]> => {
      if (!classId) return [];

      // Step 1: Fetch timetable slots with subjects and teachers
      const { data: slotsData, error: slotsError } = await supabase
        .from('timetable_slots')
        .select(`
          *,
          subject:subjects(id, name),
          teacher:teachers(id, user_id)
        `)
        .eq('class_id', classId)
        .order('day_of_week')
        .order('slot_number');

      if (slotsError) {
        console.error('Error fetching timetable:', slotsError);
        return [];
      }

      if (!slotsData || slotsData.length === 0) return [];

      // Step 2: Get all teacher user_ids and fetch their profiles
      const teacherUserIds = slotsData
        .map(slot => {
          const teacher = Array.isArray(slot.teacher) ? slot.teacher[0] : slot.teacher;
          return teacher?.user_id;
        })
        .filter((id): id is string => !!id);

      let profilesMap: Record<string, string> = {};
      if (teacherUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', teacherUserIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.user_id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Step 3: Merge data
      return slotsData.map(slot => {
        const teacher = Array.isArray(slot.teacher) ? slot.teacher[0] : slot.teacher;
        return {
          ...slot,
          subject: Array.isArray(slot.subject) ? slot.subject[0] : slot.subject,
          teacher: teacher ? {
            id: teacher.id,
            profile: {
              full_name: profilesMap[teacher.user_id] || 'Unknown',
            },
          } : null,
        };
      }) as TimetableSlot[];
    },
    enabled: !!classId,
  });
}

// Get teacher's schedule (all classes they teach)
export function useTeacherSchedule() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-schedule', user?.id],
    queryFn: async (): Promise<TimetableSlot[]> => {
      if (!user) return [];

      // Get teacher record first
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!teacher) return [];

      const { data, error } = await supabase
        .from('timetable_slots')
        .select(`
          *,
          class:classes(id, name, section),
          subject:subjects(id, name)
        `)
        .eq('teacher_id', teacher.id)
        .order('day_of_week')
        .order('slot_number');

      if (error) {
        console.error('Error fetching teacher schedule:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        class: Array.isArray(item.class) ? item.class[0] : item.class,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
      })) as TimetableSlot[];
    },
    enabled: !!user,
  });
}

// Get class sessions for a date range
export function useClassSessions(classId: string | null, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['class-sessions', classId, startDate, endDate],
    queryFn: async (): Promise<ClassSession[]> => {
      if (!classId) return [];

      let query = supabase
        .from('class_sessions')
        .select(`
          *,
          subject:subjects(id, name)
        `)
        .eq('class_id', classId);

      if (startDate) {
        query = query.gte('session_date', startDate);
      }
      if (endDate) {
        query = query.lte('session_date', endDate);
      }

      const { data, error } = await query.order('session_date');

      if (error) {
        console.error('Error fetching class sessions:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
      })) as ClassSession[];
    },
    enabled: !!classId,
  });
}

// Get teacher's session plans
export function useTeacherSessions(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-sessions', user?.id, startDate, endDate],
    queryFn: async (): Promise<ClassSession[]> => {
      if (!user) return [];

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!teacher) return [];

      let query = supabase
        .from('class_sessions')
        .select(`
          *,
          subject:subjects(id, name),
          class:classes(id, name, section)
        `)
        .eq('teacher_id', teacher.id);

      if (startDate) {
        query = query.gte('session_date', startDate);
      }
      if (endDate) {
        query = query.lte('session_date', endDate);
      }

      const { data, error } = await query.order('session_date');

      if (error) {
        console.error('Error fetching teacher sessions:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
        class: Array.isArray(item.class) ? item.class[0] : item.class,
      })) as ClassSession[];
    },
    enabled: !!user,
  });
}

// Create or update a class session
export function useUpsertSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: Partial<ClassSession> & { id?: string }) => {
      const { id, subject, class: cls, ...sessionData } = session as any;
      if (id) {
        const { data, error } = await supabase
          .from('class_sessions')
          .update(sessionData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('class_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-sessions'] });
    },
  });
}
