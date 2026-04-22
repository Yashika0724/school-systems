import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  subMonths,
} from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  X,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Download,
  Edit2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
}

export function StudentAttendancePage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [justifyFor, setJustifyFor] = useState<AttendanceRecord | null>(null);
  const [reason, setReason] = useState('');
  const [requestType, setRequestType] = useState<JustificationRequestType>('excuse');

  const { data: settings } = useAttendanceSettings();
  const { data: holidays, dateSet: holidayDates } = useHolidays();

  const { data: studentData } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('students')
        .select('id, class_id, roll_number, class:classes(name, section)')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  useJustificationsRealtime(studentData?.id ?? null);

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['student-attendance', studentData?.id, format(currentMonth, 'yyyy-MM')],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!studentData) return [];
      const start = startOfMonth(subMonths(currentMonth, 2));
      const end = endOfMonth(currentMonth);
      const { data, error } = await supabase
        .from('attendance')
        .select('id, student_id, class_id, date, status, remarks')
        .eq('student_id', studentData.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) {
        console.error('Error fetching attendance:', error);
        return [];
      }
      return (data || []) as AttendanceRecord[];
    },
    enabled: !!studentData,
  });

  const { data: justifications } = useStudentJustifications(studentData?.id ?? null);
  const submitJustification = useSubmitJustification();

  const stats = useMemo(
    () =>
      calculateAttendanceStats(attendance ?? [], {
        settings,
        holidayDates,
      }),
    [attendance, settings, holidayDates],
  );

  const monthRecords = useMemo(
    () =>
      (attendance ?? []).filter((r) => {
        const d = new Date(r.date);
        return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
      }),
    [attendance, currentMonth],
  );

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getRecordForDay = (day: Date): AttendanceRecord | null =>
    monthRecords.find((r) => isSameDay(new Date(r.date), day)) ?? null;

  const getHolidayForDay = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    return holidays?.find((h) => h.date === key) ?? null;
  };

  const getJustificationForDate = (date: string) =>
    justifications?.find((j) => j.date === date) ?? null;

  const getStatusColor = (status: AttendanceStatus | null) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 text-white';
      case 'absent':
        return 'bg-red-500 text-white';
      case 'late':
        return 'bg-yellow-500 text-white';
      case 'excused':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: AttendanceStatus | null) => {
    switch (status) {
      case 'present':
        return <Check className="h-3 w-3" />;
      case 'absent':
        return <X className="h-3 w-3" />;
      case 'late':
        return <Clock className="h-3 w-3" />;
      case 'excused':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      if (direction === 'prev') d.setMonth(d.getMonth() - 1);
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

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

  const handleDownloadPdf = async () => {
    if (!studentData || !attendance) return;
    try {
      const cls = Array.isArray(studentData.class)
        ? studentData.class[0]
        : studentData.class;
      const rows = [...(attendance ?? [])]
        .filter((r) => {
          const d = new Date(r.date);
          return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
        })
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((r) => ({
          date: format(new Date(r.date + 'T00:00:00'), 'EEE, MMM d, yyyy'),
          status: r.status,
          remarks: r.remarks,
        }));
      const monthStats = calculateAttendanceStats(
        (attendance ?? []).filter((r) => {
          const d = new Date(r.date);
          return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
        }),
        { settings, holidayDates },
      );
      await downloadPdf(
        <AttendanceReportPDF
          data={{
            school_name: 'School Connect Hub',
            period_label: format(currentMonth, 'MMMM yyyy'),
            student_name: user?.user_metadata?.full_name ?? 'Student',
            class_label: cls ? `${cls.name} ${cls.section ?? ''}`.trim() : '—',
            roll_number: studentData.roll_number ?? null,
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
        `attendance-${format(currentMonth, 'yyyy-MM')}.pdf`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const recentAbsences = (attendance ?? [])
    .filter((r) => r.status === 'absent')
    .slice(0, 10);

  const recentPresentDays = (attendance ?? [])
    .filter((r) => r.status === 'present' || r.status === 'late')
    .slice(0, 0); // not currently surfaced in the list; present/late is the happy path

  void recentPresentDays;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground">Track your attendance record</p>
        </div>
        <Button variant="outline" onClick={handleDownloadPdf}>
          <Download className="h-4 w-4 mr-2" />
          Download {format(currentMonth, 'MMM yyyy')} report
        </Button>
      </div>

      {stats.belowThreshold && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attendance below {stats.threshold}%</AlertTitle>
          <AlertDescription>
            Your attendance is currently {stats.percent}%.{' '}
            {settings?.enforce_exam_eligibility
              ? 'Exam access may be blocked until your percentage recovers.'
              : 'You may become ineligible for exams if it stays below the threshold.'}{' '}
            Contact your class teacher or submit a justification for legitimate absences.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.percent}%</p>
              <p className="text-sm text-muted-foreground">Overall</p>
              <Progress value={stats.percent} className="mt-2 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Check className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-800">{stats.present}</p>
              <p className="text-xs text-green-700">Present</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <X className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-800">{stats.absent}</p>
              <p className="text-xs text-red-700">Absent</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-800">{stats.late}</p>
              <p className="text-xs text-yellow-700">Late</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-800">{stats.excused}</p>
              <p className="text-xs text-blue-700">Excused</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
                disabled={currentMonth >= new Date()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {daysInMonth.map((day) => {
              const record = getRecordForDay(day);
              const holiday = getHolidayForDay(day);
              const status = record?.status ?? null;
              const isToday = isSameDay(day, new Date());
              const isFuture = day > new Date();

              return (
                <div
                  key={day.toISOString()}
                  title={holiday ? `Holiday: ${holiday.name}` : undefined}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors',
                    holiday
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : getStatusColor(status),
                    isToday && !status && !holiday && 'ring-2 ring-primary',
                    isFuture && 'opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'font-medium',
                      !status && !holiday && 'text-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {status && !holiday && (
                    <span className="mt-0.5">{getStatusIcon(status)}</span>
                  )}
                  {holiday && (
                    <span className="mt-0.5 text-[8px] truncate max-w-full px-0.5">
                      {holiday.name.slice(0, 6)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm">Excused</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300" />
              <span className="text-sm">Holiday</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Absences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAbsences.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No recent absences</p>
          ) : (
            <div className="space-y-2">
              {recentAbsences.map((record) => {
                const j = getJustificationForDate(record.date);
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(record.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      {record.remarks && (
                        <p className="text-xs text-muted-foreground">{record.remarks}</p>
                      )}
                    </div>
                    {j ? (
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
                        {j.request_type === 'correction' ? 'Correction' : 'Excuse'}: {j.status}
                      </Badge>
                    ) : (
                      <div className="flex gap-1">
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
                          title="I was actually present that day"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Mark as Error
                        </Button>
                      </div>
                    )}
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
                ? `You're telling your teacher that you were actually present on ${
                    justifyFor && format(new Date(justifyFor.date), 'MMMM d, yyyy')
                  }. If approved, the day will be changed to "present".`
                : `Explain why you were absent on ${
                    justifyFor && format(new Date(justifyFor.date), 'MMMM d, yyyy')
                  }. If approved, the day will be changed to "excused".`}
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
                  <SelectItem value="excuse">Excuse (I was absent with a reason)</SelectItem>
                  <SelectItem value="correction">Correction (I was actually present)</SelectItem>
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
                    ? 'e.g. I attended class on this day — classmates can confirm.'
                    : 'e.g. Hospital visit for fever — doctor\'s note available.'
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
