import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SchoolSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

// Get all settings
export function useSchoolSettings() {
  return useQuery({
    queryKey: ['school-settings'],
    queryFn: async (): Promise<SchoolSetting[]> => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Get settings by category
export function useSettingsByCategory(category: string) {
  return useQuery({
    queryKey: ['school-settings', category],
    queryFn: async (): Promise<SchoolSetting[]> => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .eq('category', category)
        .order('setting_key', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Get a single setting by key
export function useSetting(key: string) {
  return useQuery({
    queryKey: ['school-setting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .eq('setting_key', key)
        .single();

      if (error) throw error;
      return data as SchoolSetting;
    },
  });
}

// Update a setting
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('school_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      queryClient.invalidateQueries({ queryKey: ['school-setting'] });
      toast.success('Setting updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update setting: ' + error.message);
    },
  });
}

// Update multiple settings at once
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: { key: string; value: any }[]) => {
      for (const setting of settings) {
        const { error } = await supabase
          .from('school_settings')
          .update({ setting_value: setting.value })
          .eq('setting_key', setting.key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      queryClient.invalidateQueries({ queryKey: ['school-setting'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
}
