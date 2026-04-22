import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CalendarDays,
  Check,
  X,
  Clock,
  AlertCircle,
  Users,
  Loader2,
  Edit2,
  Save,
  School,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAttendanceRealtime } from '@/hooks/useAttendance';
import {
  ATTENDANCE_STATUSES,
  getStatusBgColor,
  type AttendanceStatus,
} from '@/lib/attendance';
import { cn } from '@/lib/utils';

interface RowState {
  status: AttendanceStatus;
  remarks: string;
}

function useClasses() {
  return useQuery({
    queryKey: ['admin-all-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

function useClassStudents(classId: string | null) {
  return useQuery({
    queryKey: ['admin-class-students', classId],
    queryFn: async () => {
      if (!classId) return [];

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, user_id, roll_number')
        .eq('class_id', classId)
        .order('roll_number');

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) return [];

      const userIds = students.map((s) => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return students.map((student) => ({
        ...student,
        profile:
          profiles?.find((p) => p.user_id === student.user_id) || {
            full_name: 'Unknown',
            avatar_url: null,
          },
      }));
    },
    enabled: !!classId,
  });
}

function useAttendanceRecords(classId: string | null, date: Date) {
  return useQuery({
    queryKey: ['admin-attendance', classId, format(date, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!classId) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('id, student_id, status, remarks')
        .eq('class_id', classId)
        .eq('date', format(date, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

export function AttendanceManagement() {
  const queryClient = useQueryClient();
  const { data: classes, isLoading: classesLoading } = useClasses();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editMode, setEditMode] = useState(false);
  const [updates, setUpdates] = useState<Map<string, RowState>>(new Map());
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);

  const { data: students, isLoading: studentsLoading } = useClassStudents(
    selectedClassId || null,
  );
  const { data: attendanceRecords } = useAttendanceRecords(
    selectedClassId || null,
    selectedDate,
  );

  useAttendanceRealtime(selectedClassId || null, selectedDate);

  const saveAttendance = useMutation({
    mutationFn: async () => {
      const payload = Array.from(updates.entries()).map(([studentId, state]) => ({
        student_id: studentId,
        class_id: selectedClassId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: state.status,
        remarks: state.remarks.trim() ? state.remarks.trim() : null,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'student_id,date' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Attendance updated');
      queryClient.invalidateQueries({ queryKey: ['admin-attendance'] });
      setEditMode(false);
      setUpdates(new Map());
      setOpenRemarksFor(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update attendance');
    },
  });

  const handleStartEdit = () => {
    setEditMode(true);
    const seed = new Map<string, RowState>();
    attendanceRecords?.forEach((r) => {
      seed.set(r.student_id, {
        status: r.status as AttendanceStatus,
        remarks: r.remarks ?? '',
      });
    });
    setUpdates(seed);
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setUpdates((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, { status, remarks: existing?.remarks ?? '' });
      return next;
    });
  };

  const setRemarks = (studentId: string, remarks: string) => {
    setUpdates((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId) ?? {
        status: 'present' as AttendanceStatus,
        remarks: '',
      };
      next.set(studentId, { ...existing, remarks });
      return next;
    });
  };

  const markAllAs = (status: AttendanceStatus) => {
    if (!students) return;
    const next = new Map<string, RowState>();
    students.forEach((s) => {
      next.set(s.id, { status, remarks: updates.get(s.id)?.remarks ?? '' });
    });
    setUpdates(next);
  };

  const statusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <Check className="h-4 w-4" />;
      case 'absent':
        return <X className="h-4 w-4" />;
      case 'late':
        return <Clock className="h-4 w-4" />;
      case 'excused':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStudentRow = (studentId: string): RowState | null => {
    if (editMode) return updates.get(studentId) ?? null;
    const record = attendanceRecords?.find((r) => r.student_id === studentId);
    if (!record) return null;
    return {
      status: record.status as AttendanceStatus,
      remarks: record.remarks ?? '',
    };
  };

  const selectedClass = classes?.find((c) => c.id === selectedClassId);

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground">View and edit attendance for any class</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[200px] justify-start">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClassId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedClass?.name} - {selectedClass?.section} ({students?.length || 0} students)
            </CardTitle>
            {editMode ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveAttendance.mutate()}
                  disabled={saveAttendance.isPending}
                >
                  {saveAttendance.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Attendance
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editMode && students && students.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => markAllAs('present')}>
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                  Mark All Present
                </Button>
                <Button variant="outline" size="sm" onClick={() => markAllAs('absent')}>
                  <X className="h-4 w-4 mr-1 text-red-500" />
                  Mark All Absent
                </Button>
              </div>
            )}

            {studentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : students && students.length > 0 ? (
              <div className="space-y-2">
                {students.map((student) => {
                  const row = getStudentRow(student.id);
                  const status = row?.status ?? null;
                  const hasRemarks = !!row?.remarks?.trim();
                  const remarksOpen = openRemarksFor === student.id;
                  return (
                    <div
                      key={student.id}
                      className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {student.profile?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.profile?.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Roll No. {student.roll_number || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {editMode ? (
                          <div className="flex gap-1 items-center">
                            {ATTENDANCE_STATUSES.map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant={status === s ? 'default' : 'outline'}
                                className={cn(
                                  'w-9 h-9 p-0',
                                  status === s && getStatusBgColor(s),
                                )}
                                onClick={() => setStatus(student.id, s)}
                                title={s.charAt(0).toUpperCase() + s.slice(1)}
                              >
                                {statusIcon(s)}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              variant={hasRemarks ? 'default' : 'ghost'}
                              className="w-9 h-9 p-0"
                              onClick={() =>
                                setOpenRemarksFor(remarksOpen ? null : student.id)
                              }
                              title="Add remarks"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {hasRemarks && (
                              <span
                                className="text-xs text-muted-foreground max-w-[200px] truncate"
                                title={row?.remarks}
                              >
                                {row?.remarks}
                              </span>
                            )}
                            <Badge
                              variant={status ? 'default' : 'secondary'}
                              className={cn(
                                status === 'present' && 'bg-green-500',
                                status === 'absent' && 'bg-red-500',
                                status === 'late' && 'bg-yellow-500',
                                status === 'excused' && 'bg-blue-500',
                              )}
                            >
                              {status
                                ? status.charAt(0).toUpperCase() + status.slice(1)
                                : 'Not Marked'}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {editMode && remarksOpen && (
                        <div className="mt-3 pl-[52px]">
                          <Textarea
                            placeholder="Optional remarks"
                            value={row?.remarks ?? ''}
                            onChange={(e) => setRemarks(student.id, e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No students found in this class
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClassId && (
        <Card>
          <CardContent className="p-8 text-center">
            <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Select a Class</h3>
            <p className="text-muted-foreground">
              Choose a class and date to view or edit attendance records
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
