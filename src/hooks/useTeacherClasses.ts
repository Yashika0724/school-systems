import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeacherClass {
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
    code: string | null;
  };
}

export interface ClassStudent {
  id: string;
  user_id: string;
  roll_number: string | null;
  admission_number: string | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useTeacherClasses(classTeacherOnly: boolean = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-classes', user?.id, classTeacherOnly],
    queryFn: async (): Promise<TeacherClass[]> => {
      if (!user) return [];

      // First get the teacher record
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (teacherError || !teacher) return [];

      // Then get assigned classes
      let query = supabase
        .from('teacher_classes')
        .select(`
          id,
          class_id,
          subject_id,
          is_class_teacher,
          class:classes(id, name, section),
          subject:subjects(id, name, code)
        `)
        .eq('teacher_id', teacher.id);
      
      // Filter to only class teacher assignments if requested
      if (classTeacherOnly) {
        query = query.eq('is_class_teacher', true);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching teacher classes:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        class: Array.isArray(item.class) ? item.class[0] : item.class,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
      })) as TeacherClass[];
    },
    enabled: !!user,
  });
}

export function useClassStudents(classId: string | null) {
  return useQuery({
    queryKey: ['class-students', classId],
    queryFn: async (): Promise<ClassStudent[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          roll_number,
          admission_number,
          profile:profiles!students_user_id_fkey(full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .order('roll_number');

      if (error) {
        console.error('Error fetching class students:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        profile: Array.isArray(item.profile) ? item.profile[0] : item.profile,
      })) as ClassStudent[];
    },
    enabled: !!classId,
  });
}

// Hook to get subjects for the current user's classes
export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching subjects:', error);
        return [];
      }

      return data || [];
    },
  });
}

// Hook to get exam types
export function useExamTypes() {
  return useQuery({
    queryKey: ['exam-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .order('weightage');

      if (error) {
        console.error('Error fetching exam types:', error);
        return [];
      }

      return data || [];
    },
  });
}
