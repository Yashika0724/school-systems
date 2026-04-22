import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TopicMasteryRow {
  id: string;
  student_id: string;
  subject_id: string | null;
  topic: string;
  correct_count: number;
  total_count: number;
  mastery_pct: number;
  last_updated: string;
  subject?: { name: string } | null;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useTopicMastery(student_id: string | null) {
  return useQuery({
    queryKey: ['topic-mastery', student_id],
    queryFn: async (): Promise<TopicMasteryRow[]> => {
      if (!student_id) return [];
      const { data, error } = await db
        .from('topic_mastery')
        .select(`*, subject:subjects(name)`)
        .eq('student_id', student_id)
        .order('mastery_pct', { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        subject: Array.isArray(r.subject) ? r.subject[0] : r.subject,
      })) as TopicMasteryRow[];
    },
    enabled: !!student_id,
  });
}

export function useRefreshTopicMastery(student_id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!student_id) return;
      const { error } = await (supabase as any).rpc('compute_topic_mastery', {
        _student_id: student_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topic-mastery', student_id] });
      toast.success('Topic scores refreshed');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

// Find library resources whose title/description/topic-ish field matches a weak topic.
// The resources table doesn't have a strict topic tag, so we fuzzy-match on title + description.
export function useRemedialResources(params: {
  student_class_id: string | null;
  subject_id: string | null;
  topic: string;
}) {
  return useQuery({
    queryKey: ['remedial-resources', params],
    queryFn: async () => {
      if (!params.topic || !params.student_class_id) return [];
      const ilike = `%${params.topic}%`;
      let q = db
        .from('resources')
        .select(`id, title, description, resource_type, file_url, external_url, subject:subjects(name)`)
        .eq('is_active', true)
        .eq('class_id', params.student_class_id)
        .or(`title.ilike.${ilike},description.ilike.${ilike}`);
      if (params.subject_id) q = q.eq('subject_id', params.subject_id);
      const { data, error } = await q.limit(6);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        subject: Array.isArray(r.subject) ? r.subject[0] : r.subject,
      }));
    },
    enabled: !!params.topic && !!params.student_class_id,
  });
}
