import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolInfo {
  name: string;
  academic_year: string;
  address: string;
  phone: string;
  email: string;
  logo: string | null;
}

export function useSchoolInfo() {
  return useQuery({
    queryKey: ['school-info'],
    queryFn: async (): Promise<SchoolInfo> => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('setting_key, setting_value');
      if (error) throw error;
      const map: Record<string, any> = {};
      for (const row of data || []) {
        map[row.setting_key] = row.setting_value;
      }
      return {
        name: typeof map.school_name === 'string' ? map.school_name : 'School',
        academic_year:
          typeof map.academic_year === 'string' ? map.academic_year : '2024-25',
        address: typeof map.school_address === 'string' ? map.school_address : '',
        phone: typeof map.school_phone === 'string' ? map.school_phone : '',
        email: typeof map.school_email === 'string' ? map.school_email : '',
        logo: typeof map.school_logo === 'string' ? map.school_logo : null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
