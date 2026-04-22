import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type PublicationStatus = 'draft' | 'moderated' | 'published';

export interface ResultPublication {
  id: string;
  exam_type_id: string;
  class_id: string;
  status: PublicationStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  published_by: string | null;
  published_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  exam_type?: { id: string; name: string };
  class?: { id: string; name: string; section: string };
}

const db = supabase as unknown as { from: (table: string) => any };

export function useResultPublications() {
  return useQuery({
    queryKey: ['result-publications'],
    queryFn: async (): Promise<ResultPublication[]> => {
      const { data, error } = await db
        .from('result_publications')
        .select(`
          *,
          exam_type:exam_types(id, name),
          class:classes(id, name, section)
        `)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        exam_type: Array.isArray(r.exam_type) ? r.exam_type[0] : r.exam_type,
        class: Array.isArray(r.class) ? r.class[0] : r.class,
      })) as ResultPublication[];
    },
  });
}

export function usePublicationStatus(exam_type_id: string | null, class_id: string | null) {
  return useQuery({
    queryKey: ['result-publication', exam_type_id, class_id],
    queryFn: async (): Promise<ResultPublication | null> => {
      if (!exam_type_id || !class_id) return null;
      const { data, error } = await db
        .from('result_publications')
        .select('*')
        .eq('exam_type_id', exam_type_id)
        .eq('class_id', class_id)
        .maybeSingle();
      if (error) throw error;
      return data as ResultPublication | null;
    },
    enabled: !!exam_type_id && !!class_id,
  });
}

export function useSetPublicationStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      exam_type_id: string;
      class_id: string;
      status: PublicationStatus;
      notes?: string;
    }) => {
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        exam_type_id: input.exam_type_id,
        class_id: input.class_id,
        status: input.status,
        notes: input.notes ?? null,
      };
      if (input.status === 'moderated') {
        patch.moderated_by = user?.id ?? null;
        patch.moderated_at = now;
      }
      if (input.status === 'published') {
        patch.published_by = user?.id ?? null;
        patch.published_at = now;
      }

      const { error } = await db
        .from('result_publications')
        .upsert(patch, { onConflict: 'exam_type_id,class_id' });
      if (error) throw error;

      // On publish: recompute ranks, award badges, notify class
      if (input.status === 'published') {
        const rpc = (supabase as any).rpc;
        const { error: rpcErr } = await rpc('compute_class_ranks', {
          _exam_type_id: input.exam_type_id,
          _class_id: input.class_id,
        });
        if (rpcErr) throw rpcErr;

        const { error: badgeErr } = await rpc('compute_student_badges', {
          _exam_type_id: input.exam_type_id,
          _class_id: input.class_id,
        });
        if (badgeErr) console.error('Badge compute failed:', badgeErr.message);

        const { error: notifyErr } = await rpc('notify_class', {
          _class_id: input.class_id,
          _subject: 'Exam results published',
          _body:
            'Your exam results are now available. Log in to view your marks, rank, and any badges earned.',
        });
        if (notifyErr) console.error('Notify failed:', notifyErr.message);
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['result-publications'] });
      qc.invalidateQueries({
        queryKey: ['result-publication', variables.exam_type_id, variables.class_id],
      });
      const labels: Record<PublicationStatus, string> = {
        draft: 'Reverted to draft',
        moderated: 'Marked as moderated',
        published: 'Results published',
      };
      toast.success(labels[variables.status]);
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

// Admin summary: list all (exam_type, class) combos that have any marks,
// joined with their publication status. Useful for the workflow dashboard.
export interface ResultWorkflowRow {
  exam_type_id: string;
  class_id: string;
  exam_type_name: string;
  class_label: string;
  total_marks: number;
  draft_count: number;
  submitted_count: number;
  status: PublicationStatus;
  publication_id: string | null;
}

export function useResultWorkflow() {
  return useQuery({
    queryKey: ['result-workflow'],
    queryFn: async (): Promise<ResultWorkflowRow[]> => {
      const [marksRes, pubsRes] = await Promise.all([
        db
          .from('marks')
          .select(`
            exam_type_id,
            class_id,
            submission_status,
            exam_type:exam_types(name),
            class:classes(name, section)
          `),
        db.from('result_publications').select('*'),
      ]);
      if (marksRes.error) throw marksRes.error;
      if (pubsRes.error) throw pubsRes.error;

      const pubs = (pubsRes.data || []) as ResultPublication[];
      const byKey = new Map<string, {
        exam_type_id: string;
        class_id: string;
        exam_type_name: string;
        class_label: string;
        total: number;
        draft: number;
        submitted: number;
      }>();

      for (const row of marksRes.data || []) {
        const key = `${row.exam_type_id}:${row.class_id}`;
        const examName = Array.isArray(row.exam_type) ? row.exam_type[0]?.name : row.exam_type?.name;
        const cls = Array.isArray(row.class) ? row.class[0] : row.class;
        const classLabel = cls ? `${cls.name} - ${cls.section}` : '';
        const existing = byKey.get(key) || {
          exam_type_id: row.exam_type_id,
          class_id: row.class_id,
          exam_type_name: examName || 'Unknown',
          class_label: classLabel,
          total: 0,
          draft: 0,
          submitted: 0,
        };
        existing.total += 1;
        if (row.submission_status === 'submitted') existing.submitted += 1;
        else existing.draft += 1;
        byKey.set(key, existing);
      }

      return Array.from(byKey.values()).map((r) => {
        const pub = pubs.find(
          (p) => p.exam_type_id === r.exam_type_id && p.class_id === r.class_id,
        );
        return {
          exam_type_id: r.exam_type_id,
          class_id: r.class_id,
          exam_type_name: r.exam_type_name,
          class_label: r.class_label,
          total_marks: r.total,
          draft_count: r.draft,
          submitted_count: r.submitted,
          status: (pub?.status as PublicationStatus) || 'draft',
          publication_id: pub?.id || null,
        };
      });
    },
  });
}
