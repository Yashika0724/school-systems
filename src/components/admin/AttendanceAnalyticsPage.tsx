import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  subDays,
  startOfDay,
  eachDayOfInterval,
} from 'date-fns';
import {
  BarChart3,
  Download,
  Loader2,
  TrendingDown,
  Users,
  CalendarDays,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { calculateAttendanceStats } from '@/lib/attendance';
import {
  useAttendanceSettings,
  useHolidays,
} from '@/hooks/useAttendanceSettings';

interface AttendanceRow {
  student_id: string;
  class_id: string;
  date: string;
  status: string;
}

interface ClassInfo {
  id: string;
  name: string;
  section: string;
}

function useRangeAttendance(start: Date, end: Date, classId: string | null) {
  return useQuery({
    queryKey: [
      'admin-attendance-range',
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd'),
      classId ?? 'all',
    ],
    queryFn: async (): Promise<AttendanceRow[]> => {
      let q = supabase
        .from('attendance')
        .select('student_id, class_id, date, status')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));
      if (classId) q = q.eq('class_id', classId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });
}

function useAllClasses() {
  return useQuery({
    queryKey: ['admin-all-classes-analytics'],
    queryFn: async (): Promise<ClassInfo[]> => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, section')
        .order('name');
      if (error) throw error;
      return (data ?? []) as ClassInfo[];
    },
  });
}

function useStudentsByClass() {
  return useQuery({
    queryKey: ['admin-students-by-class'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, class_id, user_id, roll_number');
      if (error) throw error;

      const userIds = (data ?? []).map((s) => s.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      return (data ?? []).map((s) => ({
        ...s,
        full_name:
          profiles?.find((p) => p.user_id === s.user_id)?.full_name ?? 'Unknown',
      }));
    },
  });
}

export function AttendanceAnalyticsPage() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 29));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [classFilter, setClassFilter] = useState<string>('all');

  const { data: classes } = useAllClasses();
  const { data: students } = useStudentsByClass();
  const { data: attendance, isLoading } = useRangeAttendance(
    startDate,
    endDate,
    classFilter === 'all' ? null : classFilter,
  );
  const { data: settings } = useAttendanceSettings();
  const { dateSet: holidayDates } = useHolidays();
  const threshold = settings?.min_attendance_percent ?? 75;

  const overallStats = useMemo(
    () => calculateAttendanceStats(attendance ?? [], { settings, holidayDates }),
    [attendance, settings, holidayDates],
  );

  const dailyTrend = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfDay(startDate),
      end: startOfDay(endDate),
    });
    const byDate = new Map<string, AttendanceRow[]>();
    (attendance ?? []).forEach((r) => {
      const list = byDate.get(r.date) ?? [];
      list.push(r);
      byDate.set(r.date, list);
    });
    return days.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const rows = byDate.get(key) ?? [];
      const stats = calculateAttendanceStats(rows, { settings, holidayDates });
      return {
        date: format(d, 'MMM d'),
        percent: stats.percent,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
      };
    });
  }, [attendance, startDate, endDate, settings, holidayDates]);

  const perClass = useMemo(() => {
    if (!classes || !attendance) return [];
    return classes.map((cls) => {
      const rows = attendance.filter((r) => r.class_id === cls.id);
      const stats = calculateAttendanceStats(rows, { settings, holidayDates });
      return {
        id: cls.id,
        label: `${cls.name}${cls.section ? '-' + cls.section : ''}`,
        percent: stats.percent,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        excused: stats.excused,
        workingDays: stats.workingDays,
      };
    });
  }, [classes, attendance, settings, holidayDates]);

  const atRiskStudents = useMemo(() => {
    if (!attendance || !students) return [];
    const byStudent = new Map<string, AttendanceRow[]>();
    attendance.forEach((r) => {
      const list = byStudent.get(r.student_id) ?? [];
      list.push(r);
      byStudent.set(r.student_id, list);
    });
    const atRisk: Array<{
      id: string;
      name: string;
      roll: string | null;
      className: string;
      percent: number;
      workingDays: number;
    }> = [];
    byStudent.forEach((rows, studentId) => {
      const stats = calculateAttendanceStats(rows, { settings, holidayDates });
      if (stats.workingDays === 0) return;
      if (stats.percent < threshold) {
        const student = students.find((s) => s.id === studentId);
        const cls = classes?.find((c) => c.id === student?.class_id);
        atRisk.push({
          id: studentId,
          name: student?.full_name ?? 'Unknown',
          roll: student?.roll_number ?? null,
          className: cls ? `${cls.name}-${cls.section}` : '—',
          percent: stats.percent,
          workingDays: stats.workingDays,
        });
      }
    });
    return atRisk.sort((a, b) => a.percent - b.percent);
  }, [attendance, students, classes, settings, holidayDates, threshold]);

  const downloadCsv = () => {
    const header = [
      'Class',
      'Attendance %',
      'Working Days (P+A+L)',
      'Present',
      'Absent',
      'Late',
      'Excused',
    ];
    const rows = perClass.map((c) => [
      c.label,
      c.percent,
      c.workingDays,
      c.present,
      c.absent,
      c.late,
      c.excused,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Analytics</h1>
          <p className="text-muted-foreground">
            Trends, per-class rollups, and at-risk students across any date range.
          </p>
        </div>
        <Button onClick={downloadCsv} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[180px] justify-start">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {format(startDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[180px] justify-start">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {format(endDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} - {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Rate</p>
                    <p className="text-2xl font-bold">{overallStats.percent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Present</p>
                    <p className="text-2xl font-bold">{overallStats.present}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Absent</p>
                    <p className="text-2xl font-bold">{overallStats.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">At-Risk Students</p>
                    <p className="text-2xl font-bold">{atRiskStudents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="percent"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Attendance %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Per-Class Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(240, perClass.length * 34)}>
                <BarChart data={perClass} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip />
                  <Bar dataKey="percent" fill="#3b82f6" name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Students Below {threshold}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atRiskStudents.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No students below the threshold in this range.
                </p>
              ) : (
                <div className="space-y-2">
                  {atRiskStudents.slice(0, 50).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.className} • Roll {s.roll || 'N/A'} • {s.workingDays} working days
                        </p>
                      </div>
                      <Badge variant="destructive">{s.percent}%</Badge>
                    </div>
                  ))}
                  {atRiskStudents.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      + {atRiskStudents.length - 50} more. Export CSV for the full list.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
