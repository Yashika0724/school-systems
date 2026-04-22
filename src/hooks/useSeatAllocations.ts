import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SeatAllocation {
  id: string;
  exam_type_id: string;
  class_id: string;
  student_id: string;
  room: string | null;
  seat_no: string | null;
  hall_ticket_no: string;
  instructions: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    roll_number: string | null;
    admission_number: string | null;
    profile?: { full_name: string } | null;
    class?: { name: string; section: string } | null;
  };
  exam_type?: { id: string; name: string };
  class?: { id: string; name: string; section: string };
}

const db = supabase as unknown as { from: (table: string) => any };

export function useSeatAllocations(exam_type_id: string | null, class_id: string | null) {
  return useQuery({
    queryKey: ['seat-allocations', exam_type_id, class_id],
    queryFn: async (): Promise<SeatAllocation[]> => {
      if (!exam_type_id || !class_id) return [];
      const { data, error } = await db
        .from('exam_seat_allocations')
        .select(`
          *,
          student:students(
            id, roll_number, admission_number,
            profile:profiles!students_user_id_fkey(full_name),
            class:classes(name, section)
          ),
          exam_type:exam_types(id, name),
          class:classes(id, name, section)
        `)
        .eq('exam_type_id', exam_type_id)
        .eq('class_id', class_id)
        .order('seat_no', { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        exam_type: Array.isArray(r.exam_type) ? r.exam_type[0] : r.exam_type,
        class: Array.isArray(r.class) ? r.class[0] : r.class,
        student: Array.isArray(r.student) ? r.student[0] : r.student,
      })) as SeatAllocation[];
    },
    enabled: !!exam_type_id && !!class_id,
  });
}

export function useStudentSeatAllocations(student_id: string | null) {
  return useQuery({
    queryKey: ['student-seat-allocations', student_id],
    queryFn: async (): Promise<SeatAllocation[]> => {
      if (!student_id) return [];
      const { data, error } = await db
        .from('exam_seat_allocations')
        .select(`
          *,
          exam_type:exam_types(id, name),
          class:classes(id, name, section)
        `)
        .eq('student_id', student_id);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        exam_type: Array.isArray(r.exam_type) ? r.exam_type[0] : r.exam_type,
        class: Array.isArray(r.class) ? r.class[0] : r.class,
      })) as SeatAllocation[];
    },
    enabled: !!student_id,
  });
}

export function useBulkGenerateSeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      exam_type_id: string;
      class_id: string;
      room: string;
      seats_per_room: number;
      starting_seat: number;
      class_label: string;
    }) => {
      // Fetch students in the class
      const { data: students, error: sErr } = await db
        .from('students')
        .select('id, roll_number, admission_number')
        .eq('class_id', input.class_id);
      if (sErr) throw sErr;
      if (!students || students.length === 0) throw new Error('No students in this class');

      // Fetch exam_type short code for hall ticket
      const { data: examType, error: eErr } = await db
        .from('exam_types')
        .select('name')
        .eq('id', input.exam_type_id)
        .single();
      if (eErr) throw eErr;

      const examCode =
        (examType?.name || 'EX')
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 4) || 'EX';

      const classCode = input.class_label.replace(/\s+/g, '').toUpperCase().slice(0, 6);

      const rows = students.map((s: any, idx: number) => {
        const seatNumber = input.starting_seat + idx;
        const roomIndex = Math.floor(idx / input.seats_per_room);
        const rollOrAdm = s.roll_number || s.admission_number || s.id.slice(0, 6);
        return {
          exam_type_id: input.exam_type_id,
          class_id: input.class_id,
          student_id: s.id,
          room: roomIndex === 0 ? input.room : `${input.room}-${roomIndex + 1}`,
          seat_no: String(seatNumber).padStart(3, '0'),
          hall_ticket_no: `HT-${examCode}-${classCode}-${rollOrAdm}`.toUpperCase(),
        };
      });

      const { error } = await db
        .from('exam_seat_allocations')
        .upsert(rows, { onConflict: 'exam_type_id,student_id' });
      if (error) throw error;

      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['seat-allocations'] });
      toast.success(`Generated ${count} seat allocations`);
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteSeatAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('exam_seat_allocations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seat-allocations'] });
      toast.success('Allocation removed');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}
