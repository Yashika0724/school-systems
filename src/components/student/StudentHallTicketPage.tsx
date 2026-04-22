import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Ticket, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentSeatAllocations } from '@/hooks/useSeatAllocations';
import { useExams } from '@/hooks/useExams';
import { useSchoolInfo } from '@/hooks/useSchoolSettings';
import { HallTicketPDF, type HallTicketData } from '@/components/pdf/HallTicketPDF';
import { downloadPdf } from '@/lib/pdfDownload';
import { toast } from 'sonner';

export function StudentHallTicketPage() {
  const { user } = useAuth();
  const { data: school } = useSchoolInfo();
  const { data: exams } = useExams();

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, roll_number, admission_number, class_id,
          profile:profiles!students_user_id_fkey(full_name),
          class:classes(name, section)
        `)
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data as any;
    },
    enabled: !!user,
  });

  const { data: allocations, isLoading: allocLoading } = useStudentSeatAllocations(
    student?.id || null,
  );

  const handleDownload = async (alloc: any) => {
    if (!student) return;
    try {
      const profile = Array.isArray(student.profile) ? student.profile[0] : student.profile;
      const cls = Array.isArray(student.class) ? student.class[0] : student.class;
      const classLabel = cls ? `${cls.name} - ${cls.section}` : '—';

      const examRows = (exams || [])
        .filter(
          (e) => e.exam_type_id === alloc.exam_type_id && e.class_id === student.class_id,
        )
        .map((e) => ({
          exam_date: e.exam_date,
          subject: e.subject?.name || '',
          start_time: e.start_time,
          end_time: e.end_time,
          room: e.room,
        }));

      const qr = await QRCode.toDataURL(alloc.hall_ticket_no, { width: 200, margin: 1 });

      const data: HallTicketData = {
        school_name: school?.name || 'School',
        student_name: profile?.full_name || '—',
        roll_number: student.roll_number,
        admission_number: student.admission_number,
        class_label: classLabel,
        exam_type_name: alloc.exam_type?.name || '',
        hall_ticket_no: alloc.hall_ticket_no,
        room: alloc.room,
        seat_no: alloc.seat_no,
        exams: examRows,
        qr_data_url: qr,
      };
      await downloadPdf(<HallTicketPDF data={data} />, `HallTicket-${alloc.hall_ticket_no}.pdf`);
    } catch (e: any) {
      toast.error('Failed to generate PDF: ' + e.message);
    }
  };

  if (studentLoading || allocLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="h-6 w-6" />
          Hall Tickets
        </h1>
        <p className="text-muted-foreground">
          Download your admit card for each exam term. Carry a printed copy on exam day.
        </p>
      </div>

      {!allocations || allocations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">No Hall Tickets Yet</h3>
            <p className="text-muted-foreground">
              Hall tickets will appear here once the administration allocates seats.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {allocations.map((alloc) => (
            <Card key={alloc.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{alloc.exam_type?.name || 'Exam'}</span>
                  <Badge variant="outline">{alloc.hall_ticket_no}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Room <strong>{alloc.room || 'TBA'}</strong> · Seat{' '}
                    <strong>{alloc.seat_no || 'TBA'}</strong>
                  </span>
                </div>
                <Button className="w-full" onClick={() => handleDownload(alloc)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Hall Ticket
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
