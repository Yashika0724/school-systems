import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ParentData {
  id: string;
  user_id: string;
  occupation: string | null;
  relationship: string | null;
}

export interface LinkedChild {
  id: string;
  student_id: string;
  relationship: string | null;
  student: {
    id: string;
    roll_number: string | null;
    admission_number: string | null;
    class: {
      name: string;
      section: string;
    } | null;
    profile: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  };
}

export function useParentData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['parent', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as ParentData;
    },
    enabled: !!user?.id,
  });
}

export function useLinkedChildren(parentId: string | undefined) {
  return useQuery({
    queryKey: ['linked-children', parentId],
    queryFn: async () => {
      if (!parentId) throw new Error('No parent ID');

      // First get parent_student links
      const { data: links, error: linksError } = await supabase
        .from('parent_student')
        .select('id, student_id, relationship')
        .eq('parent_id', parentId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      // Get student details for each linked student
      const studentIds = links.map(l => l.student_id);
      
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          roll_number,
          admission_number,
          class:classes(name, section)
        `)
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Get profiles for student users
      const { data: studentsWithUsers, error: usersError } = await supabase
        .from('students')
        .select('id, user_id')
        .in('id', studentIds);

      if (usersError) throw usersError;

      const userIds = studentsWithUsers?.map(s => s.user_id) || [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      return links.map(link => {
        const student = students?.find(s => s.id === link.student_id);
        const studentUser = studentsWithUsers?.find(s => s.id === link.student_id);
        const profile = profiles?.find(p => p.user_id === studentUser?.user_id);

        return {
          id: link.id,
          student_id: link.student_id,
          relationship: link.relationship,
          student: {
            id: student?.id || '',
            roll_number: student?.roll_number,
            admission_number: student?.admission_number,
            class: student?.class,
            profile: profile ? {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            } : null,
          },
        };
      }) as LinkedChild[];
    },
    enabled: !!parentId,
  });
}
