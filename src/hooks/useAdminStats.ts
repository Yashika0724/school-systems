import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Fetch counts in parallel
      const [studentsResult, teachersResult, parentsResult, classesResult] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('parents').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalStudents: studentsResult.count || 0,
        totalTeachers: teachersResult.count || 0,
        totalParents: parentsResult.count || 0,
        totalClasses: classesResult.count || 0,
      } as AdminStats;
    },
  });
}

export function useAllStudents() {
  return useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data: students, error } = await supabase
        .from('students')
        .select(`
          *,
          class:classes(id, name, section)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for all students
      const userIds = students?.map(s => s.user_id) || [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return students?.map(student => ({
        ...student,
        profile: profiles?.find(p => p.user_id === student.user_id),
      }));
    },
  });
}

export function useAllTeachers() {
  return useQuery({
    queryKey: ['all-teachers'],
    queryFn: async () => {
      const { data: teachers, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = teachers?.map(t => t.user_id) || [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return teachers?.map(teacher => ({
        ...teacher,
        profile: profiles?.find(p => p.user_id === teacher.user_id),
      }));
    },
  });
}

export function useAllParents() {
  return useQuery({
    queryKey: ['all-parents'],
    queryFn: async () => {
      const { data: parents, error } = await supabase
        .from('parents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = parents?.map(p => p.user_id) || [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return parents?.map(parent => ({
        ...parent,
        profile: profiles?.find(p => p.user_id === parent.user_id),
      }));
    },
  });
}

export function useAllClasses() {
  return useQuery({
    queryKey: ['all-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useAllSubjects() {
  return useQuery({
    queryKey: ['all-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
