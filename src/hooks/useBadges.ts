import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BadgeType =
  | 'section_topper'
  | 'subject_topper'
  | 'improved_10pct'
  | 'consistent_high'
  | 'perfect_score'
  | 'comeback';

export interface StudentBadge {
  id: string;
  student_id: string;
  badge_type: BadgeType;
  title: string;
  description: string | null;
  exam_type_id: string | null;
  class_id: string | null;
  subject_id: string | null;
  context: Record<string, unknown>;
  awarded_at: string;
  exam_type?: { name: string } | null;
  subject?: { name: string } | null;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useStudentBadges(student_id: string | null) {
  return useQuery({
    queryKey: ['student-badges', student_id],
    queryFn: async (): Promise<StudentBadge[]> => {
      if (!student_id) return [];
      const { data, error } = await db
        .from('student_badges')
        .select(`
          *,
          exam_type:exam_types(name),
          subject:subjects(name)
        `)
        .eq('student_id', student_id)
        .order('awarded_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        exam_type: Array.isArray(r.exam_type) ? r.exam_type[0] : r.exam_type,
        subject: Array.isArray(r.subject) ? r.subject[0] : r.subject,
      })) as StudentBadge[];
    },
    enabled: !!student_id,
  });
}
