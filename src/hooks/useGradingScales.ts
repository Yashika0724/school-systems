import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GradingBand {
  id: string;
  name: string;
  min_pct: number;
  max_pct: number;
  letter: string;
  grade_point: number | null;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const db = supabase as unknown as {
  from: (table: string) => any;
};

export function useGradingScales() {
  return useQuery({
    queryKey: ['grading-scales'],
    queryFn: async (): Promise<GradingBand[]> => {
      const { data, error } = await db
        .from('grading_scales')
        .select('*')
        .order('min_pct', { ascending: false });
      if (error) throw error;
      return (data as GradingBand[]) || [];
    },
  });
}

export function useDefaultGradingScale() {
  const { data, ...rest } = useGradingScales();
  const bands = (data || []).filter((b) => b.is_default);
  return { data: bands, ...rest };
}

export function gradeForPercentage(bands: GradingBand[], percentage: number): GradingBand | null {
  const sorted = [...bands].sort((a, b) => b.min_pct - a.min_pct);
  return sorted.find((b) => percentage >= b.min_pct && percentage <= b.max_pct) || null;
}

export function useCreateGradingBand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<GradingBand, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await db.from('grading_scales').insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grading-scales'] });
      toast.success('Grading band added');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useUpdateGradingBand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<GradingBand> & { id: string }) => {
      const { error } = await db.from('grading_scales').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grading-scales'] });
      toast.success('Grading band updated');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteGradingBand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('grading_scales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grading-scales'] });
      toast.success('Grading band removed');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}
