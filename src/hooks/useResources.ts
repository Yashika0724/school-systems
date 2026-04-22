import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ResourceType = 'material' | 'syllabus' | 'reference' | 'video' | 'link';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  subject_id: string | null;
  class_id: string | null;
  file_url: string | null;
  external_url: string | null;
  uploaded_by: string;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subject?: { id: string; name: string } | null;
  uploader?: { full_name: string | null } | null;
}

export function useStudentResources() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-resources', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Resource[]> => {
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (!student?.class_id) return [];

      const { data, error } = await supabase
        .from('resources')
        .select(`*, subject:subjects(id, name)`)
        .eq('class_id', student.class_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const uploaderIds = [...new Set((data || []).map((r) => r.uploaded_by))];
      const uploaderMap = new Map<string, { full_name: string | null }>();
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', uploaderIds);
        (profiles || []).forEach((p) => uploaderMap.set(p.user_id, { full_name: p.full_name }));
      }

      return (data || []).map((r) => ({
        ...r,
        uploader: uploaderMap.get(r.uploaded_by) ?? null,
      })) as Resource[];
    },
  });
}

export function useUploadResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      resource_type: ResourceType;
      subject_id?: string | null;
      class_id: string;
      academic_year?: string;
      file?: File | null;
      external_url?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      let file_url: string | null = null;
      if (input.file) {
        const ext = input.file.name.split('.').pop() || 'bin';
        const path = `${input.class_id}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('resources')
          .upload(path, input.file, { upsert: false, contentType: input.file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('resources').getPublicUrl(path);
        file_url = pub.publicUrl;
      }

      const { error } = await supabase.from('resources').insert({
        title: input.title,
        description: input.description ?? null,
        resource_type: input.resource_type,
        subject_id: input.subject_id ?? null,
        class_id: input.class_id,
        file_url,
        external_url: input.external_url ?? null,
        uploaded_by: user.id,
        academic_year: input.academic_year ?? '2024-25',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-resources'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-resources'] });
      toast.success('Resource uploaded');
    },
    onError: (e: Error) => toast.error(`Upload failed: ${e.message}`),
  });
}
