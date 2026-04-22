import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClassRank {
  id: string;
  exam_type_id: string;
  class_id: string;
  student_id: string;
  total_obtained: number;
  total_max: number;
  percentage: number;
  rank: number;
  computed_at: string;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useStudentRanks(student_id: string | null) {
  return useQuery({
    queryKey: ['student-ranks', student_id],
    queryFn: async (): Promise<(ClassRank & { exam_type_name: string; class_size: number })[]> => {
      if (!student_id) return [];

      const { data: own, error } = await db
        .from('class_ranks')
        .select(`
          *,
          exam_type:exam_types(name)
        `)
        .eq('student_id', student_id);
      if (error) throw error;

      // Grab class_size counts so we can show "Rank 5 of 42"
      const results: (ClassRank & { exam_type_name: string; class_size: number })[] = [];
      for (const row of own || []) {
        const { count } = await db
          .from('class_ranks')
          .select('*', { count: 'exact', head: true })
          .eq('exam_type_id', row.exam_type_id)
          .eq('class_id', row.class_id);
        results.push({
          ...row,
          exam_type_name: Array.isArray(row.exam_type)
            ? row.exam_type[0]?.name
            : row.exam_type?.name,
          class_size: count || 0,
        });
      }
      return results;
    },
    enabled: !!student_id,
  });
}

export function useClassRanks(exam_type_id: string | null, class_id: string | null) {
  return useQuery({
    queryKey: ['class-ranks', exam_type_id, class_id],
    queryFn: async (): Promise<ClassRank[]> => {
      if (!exam_type_id || !class_id) return [];
      const { data, error } = await db
        .from('class_ranks')
        .select('*')
        .eq('exam_type_id', exam_type_id)
        .eq('class_id', class_id)
        .order('rank', { ascending: true });
      if (error) throw error;
      return (data || []) as ClassRank[];
    },
    enabled: !!exam_type_id && !!class_id,
  });
}
