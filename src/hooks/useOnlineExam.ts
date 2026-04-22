import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OnlineExam {
  id: string;
  exam_id: string;
  duration_minutes: number;
  shuffle_questions: boolean;
  allow_tab_switch: boolean;
  webcam_required: boolean;
  attempts_allowed: number;
  opens_at: string | null;
  closes_at: string | null;
  show_results_immediately: boolean;
  instructions: string | null;
  created_at: string;
  updated_at: string;
  exam?: {
    id: string;
    exam_date: string;
    class_id: string;
    subject_id: string;
    exam_type_id: string;
    class?: { name: string; section: string };
    subject?: { name: string };
    exam_type?: { name: string };
  };
}

export interface OnlineExamQuestion {
  id: string;
  online_exam_id: string;
  question_id: string;
  display_order: number;
  marks_override: number | null;
  question?: {
    id: string;
    text: string;
    type: string;
    marks: number;
    topic: string | null;
  };
}

export interface AttemptSummary {
  id: string;
  online_exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  auto_submitted: boolean;
  score: number | null;
  max_score: number | null;
  status: 'in_progress' | 'submitted' | 'flagged';
  tab_switch_count: number;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useOnlineExams() {
  return useQuery({
    queryKey: ['online-exams'],
    queryFn: async (): Promise<OnlineExam[]> => {
      const { data, error } = await db
        .from('online_exams')
        .select(`
          *,
          exam:exams(
            id, exam_date, class_id, subject_id, exam_type_id,
            class:classes(name, section),
            subject:subjects(name),
            exam_type:exam_types(name)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        exam: Array.isArray(r.exam) ? r.exam[0] : r.exam,
      })) as OnlineExam[];
    },
  });
}

export function useUpsertOnlineExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OnlineExam> & { exam_id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload = { ...input, created_by: userData.user?.id || null };
      const { data, error } = await db
        .from('online_exams')
        .upsert(payload, { onConflict: 'exam_id' })
        .select()
        .single();
      if (error) throw error;
      return data as OnlineExam;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['online-exams'] });
      toast.success('Online exam saved');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteOnlineExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('online_exams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['online-exams'] });
      toast.success('Removed');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useOnlineExamQuestions(online_exam_id: string | null) {
  return useQuery({
    queryKey: ['online-exam-questions', online_exam_id],
    queryFn: async (): Promise<OnlineExamQuestion[]> => {
      if (!online_exam_id) return [];
      const { data, error } = await db
        .from('online_exam_questions')
        .select(`
          *,
          question:questions(id, text, type, marks, topic)
        `)
        .eq('online_exam_id', online_exam_id)
        .order('display_order');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        question: Array.isArray(r.question) ? r.question[0] : r.question,
      })) as OnlineExamQuestion[];
    },
    enabled: !!online_exam_id,
  });
}

export function useAttachQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      online_exam_id: string;
      question_ids: string[];
    }) => {
      const existing = await db
        .from('online_exam_questions')
        .select('question_id, display_order')
        .eq('online_exam_id', input.online_exam_id);
      const offset = (existing.data?.length || 0) as number;

      const rows = input.question_ids.map((qid, i) => ({
        online_exam_id: input.online_exam_id,
        question_id: qid,
        display_order: offset + i + 1,
      }));
      if (rows.length === 0) return;

      const { error } = await db
        .from('online_exam_questions')
        .upsert(rows, { onConflict: 'online_exam_id,question_id' });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['online-exam-questions', v.online_exam_id] });
      toast.success('Questions attached');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDetachQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; online_exam_id: string }) => {
      const { error } = await db
        .from('online_exam_questions')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['online-exam-questions', v.online_exam_id] });
      toast.success('Detached');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

// Student-side: list online exams the student can potentially attempt
export function useStudentAvailableOnlineExams(studentClassId: string | null) {
  return useQuery({
    queryKey: ['student-online-exams', studentClassId],
    queryFn: async () => {
      if (!studentClassId) return [];
      const { data, error } = await db
        .from('online_exams')
        .select(`
          *,
          exam:exams!inner(
            id, exam_date, class_id, subject_id, exam_type_id,
            subject:subjects(name),
            exam_type:exam_types(name)
          )
        `)
        .eq('exam.class_id', studentClassId);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        exam: Array.isArray(r.exam) ? r.exam[0] : r.exam,
      })) as OnlineExam[];
    },
    enabled: !!studentClassId,
  });
}

export function useStudentAttempts(student_id: string | null) {
  return useQuery({
    queryKey: ['student-attempts', student_id],
    queryFn: async (): Promise<AttemptSummary[]> => {
      if (!student_id) return [];
      const { data, error } = await db
        .from('exam_attempts')
        .select('*')
        .eq('student_id', student_id)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AttemptSummary[];
    },
    enabled: !!student_id,
  });
}

// RPC wrappers
export async function rpcStartAttempt(online_exam_id: string) {
  const { data, error } = await (supabase as any).rpc('start_online_attempt', {
    _online_exam_id: online_exam_id,
  });
  if (error) throw error;
  return data;
}

export async function rpcSaveAnswer(attempt_id: string, question_id: string, answer: unknown) {
  const { error } = await (supabase as any).rpc('save_attempt_answer', {
    _attempt_id: attempt_id,
    _question_id: question_id,
    _answer: answer,
  });
  if (error) throw error;
}

export async function rpcSubmitAttempt(attempt_id: string, auto: boolean) {
  const { data, error } = await (supabase as any).rpc('submit_online_attempt', {
    _attempt_id: attempt_id,
    _auto_submit: auto,
  });
  if (error) throw error;
  return data as { score: number; max_score: number };
}

export async function rpcLogProctorEvent(
  attempt_id: string,
  event_type: string,
  payload: Record<string, unknown> = {},
) {
  const { error } = await (supabase as any).rpc('log_proctor_event', {
    _attempt_id: attempt_id,
    _event_type: event_type,
    _payload: payload,
  });
  if (error) throw error;
}
