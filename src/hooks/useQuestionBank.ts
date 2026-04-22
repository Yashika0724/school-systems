import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type QuestionType = 'mcq' | 'true_false' | 'short';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export interface QuestionBank {
  id: string;
  name: string;
  description: string | null;
  subject_id: string | null;
  class_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  subject?: { name: string } | null;
  class?: { name: string; section: string } | null;
}

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  bank_id: string;
  type: QuestionType;
  difficulty: Difficulty | null;
  bloom_level: BloomLevel | null;
  topic: string | null;
  text: string;
  options: QuestionOption[] | null;
  correct_answer: unknown;
  marks: number;
  explanation: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useQuestionBanks() {
  return useQuery({
    queryKey: ['question-banks'],
    queryFn: async (): Promise<QuestionBank[]> => {
      const { data, error } = await db
        .from('question_banks')
        .select(`
          *,
          subject:subjects(name),
          class:classes(name, section)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        subject: Array.isArray(r.subject) ? r.subject[0] : r.subject,
        class: Array.isArray(r.class) ? r.class[0] : r.class,
      })) as QuestionBank[];
    },
  });
}

export function useCreateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      subject_id?: string | null;
      class_id?: string | null;
      description?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        ...input,
        created_by: userData.user?.id || null,
      };
      const { error } = await db.from('question_banks').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Bank created');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('question_banks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Bank removed');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useBankQuestions(bank_id: string | null) {
  return useQuery({
    queryKey: ['questions', bank_id],
    queryFn: async (): Promise<Question[]> => {
      if (!bank_id) return [];
      const { data, error } = await db
        .from('questions')
        .select('*')
        .eq('bank_id', bank_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Question[];
    },
    enabled: !!bank_id,
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bank_id: string;
      type: QuestionType;
      text: string;
      options?: QuestionOption[];
      correct_answer: unknown;
      marks: number;
      difficulty?: Difficulty;
      bloom_level?: BloomLevel;
      topic?: string;
      explanation?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        ...input,
        created_by: userData.user?.id || null,
      };
      const { error } = await db.from('questions').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['questions', v.bank_id] });
      toast.success('Question added');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; bank_id: string }) => {
      const { error } = await db.from('questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['questions', v.bank_id] });
      toast.success('Question removed');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}
