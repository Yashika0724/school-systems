import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Loader2,
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Download,
  Edit2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParentData, useLinkedChildren } from '@/hooks/useParentData';
import {
  useStudentJustifications,
  useSubmitJustification,
  useJustificationsRealtime,
  type JustificationRequestType,
} from '@/hooks/useAttendance';
import {
  useAttendanceSettings,
  useHolidays,
} from '@/hooks/useAttendanceSettings';
import { calculateAttendanceStats, type AttendanceStatus } from '@/lib/attendance';
import { AttendanceReportPDF } from '@/components/pdf/AttendanceReportPDF';
import { downloadPdf } from '@/lib/pdfDownload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
}

function useChildAttendance(studentId: string | null) {
  return useQuery({
    queryKey: ['child-attendance', studentId],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!studentId) return [];
      const startDate = format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance')
        .select('id, student_id, class_id, date, status, remarks')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AttendanceRecord[];
    },
    enabled: !!studentId,
  });
}

export function ParentAttendancePage() {
  const { data: parent, isLoading: parentLoading } = useParentData();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(parent?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: settings } = useAttendanceSettings();
  const { data: holidays, dateSet: holidayDates } = useHolidays();

  const activeChildId = selectedChildId || children?.[0]?.student_id || null;
  const selectedChild = children?.find((c) => c.student_id === activeChildId);
  const { data: attendance, isLoading: attendanceLoading } = useChildAttendance(activeChildId);
  const { data: justifications } = useStudentJustifications(activeChildId);
  useJustificationsRealtime(activeChildId);

  const [justifyFor, setJustifyFor] = useState<AttendanceRecord | null>(null);
  const [reason, setReason] = useState('');
  const [requestType, setRequestType] = useState<JustificationRequestType>('excuse');
  const submitJustification = useSubmitJustification();

  const stats = useMemo(
    () =>
      calculateAttendanceStats(attendance ?? [], {
        settings,
        holidayDates,
      }),
    [attendance, settings, holidayDates],
  );

  const getJustificationForDate = (date: string) =>
    justifications?.find((j) => j.date === date) ?? null;

  const handleDownloadPdf = async () => {
    if (!attendance || !selectedChild) return;
    try {
      const currentMonth = new Date();
      const monthRows = (attendance ?? []).filter((r) => {
        const d = new Date(r.date);
        return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
      });
      const monthStats = calculateAttendanceStats(monthRows, { settings, holidayDates });
      const rows = monthRows
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((r) => ({
          date: format(new Date(r.date + 'T00:00:00'), 'EEE, MMM d, yyyy'),
          status: r.status,
          remarks: r.remarks,
        }));
      await downloadPdf(
        <AttendanceReportPDF
          data={{
            school_name: 'School Connect Hub',
            period_label: format(currentMonth, 'MMMM yyyy'),
            student_name: selectedChild.student.profile?.full_name ?? 'Student',
            class_label:
              `${selectedChild.student.class?.name ?? ''} ${selectedChild.student.class?.section ?? ''}`.trim() ||
              '—',
            roll_number: selectedChild.student.roll_number ?? null,
            stats: {
              present: monthStats.present,
              absent: monthStats.absent,
              late: monthStats.late,
              excused: monthStats.excused,
              workingDays: monthStats.workingDays,
              percent: monthStats.percent,
              threshold: monthStats.threshold,
            },
            rows,
            generated_on: format(new Date(), 'PPP'),
          }}
        />,
        `attendance-${selectedChild.student.profile?.full_name ?? 'student'}-${format(currentMonth, 'yyyy-MM')}.pdf`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF');
    }
  };

  if (parentLoading || childrenLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Children Linked</h3>
            <p className="text-muted-foreground">
              Contact admin to link your children to your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openJustify = (record: AttendanceRecord, type: JustificationRequestType) => {
    setJustifyFor(record);
    setReason('');
    setRequestType(type);
  };

  const handleSubmitJustification = () => {
    if (!justifyFor || !reason.trim()) return;
    submitJustification.mutate(
      {
        studentId: justifyFor.student_id,
        classId: justifyFor.class_id,
        date: justifyFor.date,
        reason: reason.trim(),
        requestType,
      },
      {
        onSuccess: () => {
          setJustifyFor(null);
          setReason('');
        },
      },
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">View your child's attendance records</p>
        </div>
        <Button variant="outline" onClick={handleDownloadPdf}>
          <Download className="h-4 w-4 mr-2" />
          Download monthly report
        </Button>
      </div>

      {children.length > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Select Child:</span>
              <Select value={activeChildId || ''} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.student_id} value={child.student_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={child.student.profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {child.student.profile?.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {child.student.profile?.full_name} - Class {child.student.class?.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedChild && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-green-500">
                <AvatarImage src={selectedChild.student.profile?.avatar_url || ''} />
                <AvatarFallback>
                  {selectedChild.student.profile?.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">
                  {selectedChild.student.profile?.full_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Class {selectedChild.student.class?.name}{' '}
                  {selectedChild.student.class?.section} • Roll No.{' '}
                  {selectedChild.student.roll_number || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.belowThreshold && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attendance below {stats.threshold}%</AlertTitle>
          <AlertDescription>
            Your child's attendance is currently {stats.percent}%.{' '}
            {settings?.enforce_exam_eligibility
              ? 'Exam access may be blocked until their percentage recovers.'
              : 'This may affect exam eligibility.'}{' '}
            Consider requesting excuses for legitimate absences below.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.percent}%</p>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Days Present</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Days Absent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
              <p className="text-sm text-muted-foreground">Days Late</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !attendance || attendance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No attendance records found</p>
          ) : (
            <div className="space-y-2">
              {attendance.map((record) => {
                const j = getJustificationForDate(record.date);
                const isHoliday = holidays?.some((h) => h.date === record.date);
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          record.status === 'present'
                            ? 'bg-green-100'
                            : record.status === 'absent'
                              ? 'bg-red-100'
                              : record.status === 'late'
                                ? 'bg-yellow-100'
                                : 'bg-blue-100'
                        }`}
                      >
                        <ClipboardCheck
                          className={`h-5 w-5 ${
                            record.status === 'present'
                              ? 'text-green-600'
                              : record.status === 'absent'
                                ? 'text-red-600'
                                : record.status === 'late'
                                  ? 'text-yellow-600'
                                  : 'text-blue-600'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(new Date(record.date), 'EEEE, MMMM d, yyyy')}
                          {isHoliday && (
                            <Badge variant="outline" className="ml-2">
                              Holiday
                            </Badge>
                          )}
                        </p>
                        {record.remarks && (
                          <p className="text-sm text-muted-foreground">{record.remarks}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.status === 'absent' &&
                        (j ? (
                          <Badge
                            variant={
                              j.status === 'approved'
                                ? 'default'
                                : j.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="capitalize"
                          >
                            {j.request_type === 'correction' ? 'Correction' : 'Excuse'}:{' '}
                            {j.status}
                          </Badge>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openJustify(record, 'excuse')}
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" />
                              Request Excuse
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openJustify(record, 'correction')}
                              title="My child was actually present"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ))}
                      <Badge
                        variant={
                          record.status === 'present'
                            ? 'default'
                            : record.status === 'absent'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="capitalize"
                      >
                        {record.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!justifyFor}
        onOpenChange={(open) => {
          if (!open) {
            setJustifyFor(null);
            setReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requestType === 'correction' ? 'Report Attendance Error' : 'Request Excuse'}
            </DialogTitle>
            <DialogDescription>
              {requestType === 'correction'
                ? `You're saying ${
                    selectedChild?.student.profile?.full_name?.split(' ')[0] ?? 'your child'
                  } was actually present on ${
                    justifyFor && format(new Date(justifyFor.date), 'MMMM d, yyyy')
                  }. If approved, the day flips to "present".`
                : `Explain why ${
                    selectedChild?.student.profile?.full_name?.split(' ')[0] ?? 'your child'
                  } was absent on ${
                    justifyFor && format(new Date(justifyFor.date), 'MMMM d, yyyy')
                  }. The class teacher reviews this.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Request type</Label>
              <Select
                value={requestType}
                onValueChange={(v) => setRequestType(v as JustificationRequestType)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excuse">Excuse (legitimate absence)</SelectItem>
                  <SelectItem value="correction">Correction (was actually present)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Details</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  requestType === 'correction'
                    ? 'e.g. He attended all classes that day.'
                    : 'e.g. Fever — doctor visit on this date.'
                }
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustifyFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitJustification}
              disabled={!reason.trim() || submitJustification.isPending}
            >
              {submitJustification.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
