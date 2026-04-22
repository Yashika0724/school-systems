import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  type AttendanceSettings,
} from '@/lib/attendance';

export interface AttendanceSettingsRow extends AttendanceSettings {
  id: string;
  updated_at: string;
  updated_by: string | null;
}

export function useAttendanceSettings() {
  return useQuery({
    queryKey: ['attendance-settings'],
    queryFn: async (): Promise<AttendanceSettingsRow> => {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return {
          id: '',
          ...DEFAULT_ATTENDANCE_SETTINGS,
          updated_at: new Date().toISOString(),
          updated_by: null,
        };
      }
      return data as AttendanceSettingsRow;
    },
  });
}

export function useUpdateAttendanceSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AttendanceSettings> & { id?: string }) => {
      const payload: Record<string, unknown> = {
        ...input,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      };
      if (input.id) {
        const { error } = await supabase
          .from('attendance_settings')
          .update(payload)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['attendance-settings'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save'),
  });
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  description: string | null;
}

export function useHolidays() {
  const q = useQuery({
    queryKey: ['school-holidays'],
    queryFn: async (): Promise<Holiday[]> => {
      const { data, error } = await supabase
        .from('school_holidays')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Holiday[];
    },
  });
  const dateSet = useMemo(
    () => new Set((q.data ?? []).map((h) => h.date)),
    [q.data],
  );
  return { ...q, dateSet };
}

export function useUpsertHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Holiday, 'id'> & { id?: string }) => {
      if (input.id) {
        const { error } = await supabase
          .from('school_holidays')
          .update({
            date: input.date,
            name: input.name,
            description: input.description,
          })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('school_holidays').insert({
          date: input.date,
          name: input.name,
          description: input.description,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Holiday saved');
      qc.invalidateQueries({ queryKey: ['school-holidays'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save holiday'),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('school_holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Holiday removed');
      qc.invalidateQueries({ queryKey: ['school-holidays'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete holiday'),
  });
}
