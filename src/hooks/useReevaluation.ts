import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ReevalStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export interface ReevalRequest {
  id: string;
  marks_id: string;
  requested_by: string | null;
  reason: string;
  status: ReevalStatus;
  original_marks: number;
  revised_marks: number | null;
  teacher_notes: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  mark?: {
    id: string;
    student_id: string;
    marks_obtained: number;
    max_marks: number;
    subject_id: string;
    class_id: string;
    exam_type_id: string;
    subject?: { name: string };
    exam_type?: { name: string };
    student?: {
      roll_number: string | null;
      profile?: { full_name: string };
    };
  };
}

const db = supabase as unknown as { from: (table: string) => any };

export function useMyReevaluations() {
  return useQuery({
    queryKey: ['my-reevaluations'],
    queryFn: async (): Promise<ReevalRequest[]> => {
      const { data, error } = await db
        .from('reevaluation_requests')
        .select(`
          *,
          mark:marks(
            id, student_id, marks_obtained, max_marks, subject_id, class_id, exam_type_id,
            subject:subjects(name),
            exam_type:exam_types(name),
            student:students(
              roll_number,
              profile:profiles!students_user_id_fkey(full_name)
            )
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        mark: Array.isArray(r.mark) ? r.mark[0] : r.mark,
      })) as ReevalRequest[];
    },
  });
}

export function useCreateReevaluation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { marks_id: string; reason: string }) => {
      const { data: markRow, error: mErr } = await db
        .from('marks')
        .select('marks_obtained')
        .eq('id', input.marks_id)
        .single();
      if (mErr) throw mErr;

      const { error } = await db.from('reevaluation_requests').insert({
        marks_id: input.marks_id,
        reason: input.reason,
        original_marks: markRow?.marks_obtained ?? 0,
        requested_by: user?.id ?? null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-reevaluations'] });
      toast.success('Re-evaluation request sent');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useTeacherReviewReeval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: 'in_review' | 'approved' | 'rejected';
      revised_marks?: number | null;
      teacher_notes?: string;
    }) => {
      const patch: Record<string, unknown> = {
        status: input.status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      };
      if (input.revised_marks !== undefined) patch.revised_marks = input.revised_marks;
      if (input.teacher_notes !== undefined) patch.teacher_notes = input.teacher_notes;

      const { error } = await db
        .from('reevaluation_requests')
        .update(patch)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-reevaluations'] });
      toast.success('Re-evaluation updated');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useAdminDecideReeval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: 'approved' | 'rejected';
      admin_notes?: string;
    }) => {
      // Set final status + notes
      const { error } = await db
        .from('reevaluation_requests')
        .update({
          status: input.decision,
          admin_notes: input.admin_notes ?? null,
        })
        .eq('id', input.id);
      if (error) throw error;

      // If approved, apply the revised marks
      if (input.decision === 'approved') {
        const { error: rpcErr } = await (supabase as any).rpc('apply_reeval', {
          _reeval_id: input.id,
        });
        if (rpcErr) throw rpcErr;
      }

      // Notify the student + their parents about the decision
      const { data: row } = await db
        .from('reevaluation_requests')
        .select('marks_id, mark:marks(student_id, subject:subjects(name), exam_type:exam_types(name))')
        .eq('id', input.id)
        .single();
      const mark = Array.isArray(row?.mark) ? row.mark[0] : row?.mark;
      const subject = Array.isArray(mark?.subject) ? mark.subject[0] : mark?.subject;
      const examType = Array.isArray(mark?.exam_type) ? mark.exam_type[0] : mark?.exam_type;
      if (mark?.student_id) {
        const verb = input.decision === 'approved' ? 'approved' : 'rejected';
        await (supabase as any).rpc('notify_student', {
          _student_id: mark.student_id,
          _subject: `Re-evaluation ${verb}`,
          _body: `Your re-evaluation request for ${subject?.name ?? 'a subject'} (${examType?.name ?? 'exam'}) was ${verb}.`,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-reevaluations'] });
      qc.invalidateQueries({ queryKey: ['marks'] });
      toast.success('Decision recorded');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}
