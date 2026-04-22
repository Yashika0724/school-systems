import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EligibilityRule {
  id: string;
  exam_type_id: string | null;
  class_id: string | null;
  min_attendance_pct: number | null;
  require_fees_paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  exam_type?: { name: string } | null;
  class?: { name: string; section: string } | null;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useEligibilityRules() {
  return useQuery({
    queryKey: ['eligibility-rules'],
    queryFn: async (): Promise<EligibilityRule[]> => {
      const { data, error } = await db
        .from('exam_eligibility_rules')
        .select(`
          *,
          exam_type:exam_types(name),
          class:classes(name, section)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        exam_type: Array.isArray(r.exam_type) ? r.exam_type[0] : r.exam_type,
        class: Array.isArray(r.class) ? r.class[0] : r.class,
      })) as EligibilityRule[];
    },
  });
}

export function useUpsertEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      exam_type_id: string | null;
      class_id: string | null;
      min_attendance_pct: number;
      require_fees_paid: boolean;
      notes?: string;
    }) => {
      const { error } = await db
        .from('exam_eligibility_rules')
        .upsert(input, { onConflict: 'exam_type_id,class_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eligibility-rules'] });
      toast.success('Eligibility rule saved');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('exam_eligibility_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eligibility-rules'] });
      toast.success('Rule removed');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

// Compute per-student attendance % for a class. Used to show
// teachers which students are ineligible before marks entry.
export function useClassAttendancePercentages(class_id: string | null) {
  return useQuery({
    queryKey: ['class-attendance-pct', class_id],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!class_id) return {};
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', class_id);
      if (error) throw error;

      const totals = new Map<string, { present: number; total: number }>();
      for (const row of data || []) {
        const rec = totals.get(row.student_id) || { present: 0, total: 0 };
        rec.total += 1;
        if (row.status === 'present' || row.status === 'late') rec.present += 1;
        totals.set(row.student_id, rec);
      }
      const result: Record<string, number> = {};
      for (const [sid, rec] of totals) {
        result[sid] = rec.total > 0 ? (rec.present / rec.total) * 100 : 100;
      }
      return result;
    },
    enabled: !!class_id,
  });
}
