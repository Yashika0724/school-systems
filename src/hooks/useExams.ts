import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExamType {
  id: string;
  name: string;
  description: string | null;
  weightage: number | null;
  academic_year: string;
  created_at: string;
}

export interface Exam {
  id: string;
  exam_type_id: string;
  class_id: string;
  subject_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  max_marks: number;
  status: string;
  notes: string | null;
  created_at: string;
  exam_type?: ExamType;
  class?: { name: string; section: string };
  subject?: { name: string };
}

// Get all exam types
export function useExamTypes() {
  return useQuery({
    queryKey: ['exam-types'],
    queryFn: async (): Promise<ExamType[]> => {
      const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Create exam type
export function useCreateExamType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; weightage?: number }) => {
      const { error } = await supabase
        .from('exam_types')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      toast.success('Exam type created');
    },
    onError: (error) => {
      toast.error('Failed to create exam type: ' + error.message);
    },
  });
}

// Update exam type
export function useUpdateExamType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; weightage?: number }) => {
      const { error } = await supabase
        .from('exam_types')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      toast.success('Exam type updated');
    },
    onError: (error) => {
      toast.error('Failed to update exam type: ' + error.message);
    },
  });
}

// Delete exam type
export function useDeleteExamType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exam_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      toast.success('Exam type deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete exam type: ' + error.message);
    },
  });
}

// Get all exams
export function useExams() {
  return useQuery({
    queryKey: ['exams'],
    queryFn: async (): Promise<Exam[]> => {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          exam_type:exam_types(id, name, description, weightage),
          class:classes(name, section),
          subject:subjects(name)
        `)
        .order('exam_date', { ascending: true });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        exam_type: Array.isArray(item.exam_type) ? item.exam_type[0] : item.exam_type,
        class: Array.isArray(item.class) ? item.class[0] : item.class,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
      })) as Exam[];
    },
  });
}

// Create exam
export function useCreateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      exam_type_id: string;
      class_id: string;
      subject_id: string;
      exam_date: string;
      start_time: string;
      end_time: string;
      room?: string;
      max_marks?: number;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('exams')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Exam scheduled');
    },
    onError: (error) => {
      toast.error('Failed to schedule exam: ' + error.message);
    },
  });
}

// Update exam
export function useUpdateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from('exams')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Exam updated');
    },
    onError: (error) => {
      toast.error('Failed to update exam: ' + error.message);
    },
  });
}

// Delete exam
export function useDeleteExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Exam deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete exam: ' + error.message);
    },
  });
}
