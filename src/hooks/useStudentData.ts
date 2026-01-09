import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StudentData {
  id: string;
  user_id: string;
  class_id: string | null;
  roll_number: string | null;
  admission_number: string | null;
  admission_date: string | null;
  blood_group: string | null;
  emergency_contact: string | null;
  class?: {
    id: string;
    name: string;
    section: string;
  };
}

export function useStudentData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          class:classes(id, name, section)
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as StudentData;
    },
    enabled: !!user?.id,
  });
}
