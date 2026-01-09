import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeacherData {
  id: string;
  user_id: string;
  employee_id: string | null;
  designation: string | null;
  qualification: string | null;
  joining_date: string | null;
}

export interface TeacherAssignment {
  id: string;
  class_id: string;
  subject_id: string;
  is_class_teacher: boolean;
  class: {
    id: string;
    name: string;
    section: string;
  };
  subject: {
    id: string;
    name: string;
  };
}

export function useTeacherData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as TeacherData;
    },
    enabled: !!user?.id,
  });
}

export function useTeacherAssignments(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-assignments', teacherId],
    queryFn: async () => {
      if (!teacherId) throw new Error('No teacher ID');

      const { data, error } = await supabase
        .from('teacher_classes')
        .select(`
          *,
          class:classes(id, name, section),
          subject:subjects(id, name)
        `)
        .eq('teacher_id', teacherId);

      if (error) throw error;
      return data as TeacherAssignment[];
    },
    enabled: !!teacherId,
  });
}
