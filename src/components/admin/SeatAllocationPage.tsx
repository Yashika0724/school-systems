import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Download, Trash2, MapPin } from 'lucide-react';
import { useExamTypes, useExams } from '@/hooks/useExams';
import {
  useSeatAllocations,
  useBulkGenerateSeats,
  useDeleteSeatAllocation,
  type SeatAllocation,
} from '@/hooks/useSeatAllocations';
import { useSchoolInfo } from '@/hooks/useSchoolSettings';
import { HallTicketPDF, type HallTicketData } from '@/components/pdf/HallTicketPDF';
import { downloadPdf } from '@/lib/pdfDownload';
import { toast } from 'sonner';

export function SeatAllocationPage() {
  const { data: examTypes } = useExamTypes();
  const { data: exams } = useExams();
  const { data: school } = useSchoolInfo();

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').order('name');
      return data || [];
    },
  });

  const [examTypeId, setExamTypeId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [room, setRoom] = useState<string>('Main Hall');
  const [seatsPerRoom, setSeatsPerRoom] = useState<number>(40);
  const [startingSeat, setStartingSeat] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: allocations, isLoading } = useSeatAllocations(examTypeId || null, classId || null);
  const bulkGenerate = useBulkGenerateSeats();
  const delAlloc = useDeleteSeatAllocation();

  const selectedClass = classes?.find((c) => c.id === classId);
  const classLabel = selectedClass ? `${selectedClass.name}-${selectedClass.section}` : '';
  const selectedExamType = examTypes?.find((t) => t.id === examTypeId);

  const relevantExams = useMemo(
    () =>
      (exams || []).filter(
        (e) => e.exam_type_id === examTypeId && e.class_id === classId,
      ),
    [exams, examTypeId, classId],
  );

  const handleBulk = async () => {
    if (!examTypeId || !classId) {
      toast.error('Select exam type and class first');
      return;
    }
    await bulkGenerate.mutateAsync({
      exam_type_id: examTypeId,
      class_id: classId,
      room,
      seats_per_room: seatsPerRoom,
      starting_seat: startingSeat,
      class_label: classLabel,
    });
  };

  const buildHallTicketData = async (alloc: SeatAllocation): Promise<HallTicketData> => {
    const qr = await QRCode.toDataURL(alloc.hall_ticket_no, { width: 200, margin: 1 });
    const examRows = relevantExams.map((e) => ({
      exam_date: e.exam_date,
      subject: e.subject?.name || '',
      start_time: e.start_time,
      end_time: e.end_time,
      room: e.room,
    }));
    return {
      school_name: school?.name || 'School',
      student_name: alloc.student?.profile?.full_name || '—',
      roll_number: alloc.student?.roll_number || null,
      admission_number: alloc.student?.admission_number || null,
      class_label: classLabel,
      exam_type_name: selectedExamType?.name || '',
      hall_ticket_no: alloc.hall_ticket_no,
      room: alloc.room,
      seat_no: alloc.seat_no,
      exams: examRows,
      qr_data_url: qr,
    };
  };

  const downloadOne = async (alloc: SeatAllocation) => {
    const data = await buildHallTicketData(alloc);
    await downloadPdf(
      <HallTicketPDF data={data} />,
      `HallTicket-${alloc.hall_ticket_no}.pdf`,
    );
  };

  const downloadAll = async () => {
    if (!allocations || allocations.length === 0) return;
    setIsDownloading(true);
    try {
      for (const alloc of allocations) {
        // eslint-disable-next-line no-await-in-loop
        await downloadOne(alloc);
      }
      toast.success(`Downloaded ${allocations.length} hall tickets`);
    } catch (e: any) {
      toast.error('Download failed: ' + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Seat Allocation &amp; Hall Tickets
        </h1>
        <p className="text-muted-foreground">
          Assign rooms + seats for a class, then generate printable hall tickets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Allocations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Exam Type</Label>
              <Select value={examTypeId} onValueChange={setExamTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} - {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Base Room</Label>
              <Input value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Seats / Room</Label>
              <Input
                type="number"
                min={1}
                value={seatsPerRoom}
                onChange={(e) => setSeatsPerRoom(parseInt(e.target.value) || 40)}
              />
            </div>
            <div className="space-y-1">
              <Label>Starting Seat</Label>
              <Input
                type="number"
                min={1}
                value={startingSeat}
                onChange={(e) => setStartingSeat(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleBulk}
                disabled={bulkGenerate.isPending || !examTypeId || !classId}
              >
                {bulkGenerate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Students beyond the seats-per-room fill into {room}-2, {room}-3, …
          </p>
        </CardContent>
      </Card>

      {examTypeId && classId && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Allocations</CardTitle>
            <Button
              variant="outline"
              onClick={downloadAll}
              disabled={!allocations?.length || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download All Hall Tickets
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !allocations || allocations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No allocations yet. Click Generate above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead>Hall Ticket No</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.student?.profile?.full_name || '—'}</TableCell>
                      <TableCell>{a.student?.roll_number || '—'}</TableCell>
                      <TableCell>{a.room || '—'}</TableCell>
                      <TableCell>{a.seat_no || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.hall_ticket_no}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadOne(a)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => delAlloc.mutate(a.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
