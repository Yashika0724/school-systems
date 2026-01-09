import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarDays, Check, X, Clock, AlertCircle, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, useClassStudents, type TeacherClass } from '@/hooks/useTeacherClasses';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentAttendance {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export function AttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Only fetch classes where teacher is class teacher
  const { data: teacherClasses, isLoading: classesLoading } = useTeacherClasses(true);
  
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceStatus>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState<boolean>(false);

  const { data: students, isLoading: studentsLoading } = useClassStudents(selectedClass?.class_id || null);

  // Fetch existing attendance when class or date changes
  const fetchExistingAttendance = async (classId: string, date: Date) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('class_id', classId)
      .eq('date', format(date, 'yyyy-MM-dd'));

    if (error) {
      console.error('Error fetching attendance:', error);
      return;
    }

    if (data && data.length > 0) {
      const records = new Map<string, AttendanceStatus>();
      data.forEach(record => {
        records.set(record.student_id, record.status as AttendanceStatus);
      });
      setAttendanceRecords(records);
      setExistingAttendance(true);
    } else {
      setAttendanceRecords(new Map());
      setExistingAttendance(false);
    }
  };

  const handleClassChange = (classId: string) => {
    const cls = teacherClasses?.find(c => c.class_id === classId);
    setSelectedClass(cls || null);
    setAttendanceRecords(new Map());
    if (cls) {
      fetchExistingAttendance(cls.class_id, selectedDate);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      if (selectedClass) {
        fetchExistingAttendance(selectedClass.class_id, date);
      }
    }
  };

  const markAttendance = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords(prev => {
      const next = new Map(prev);
      next.set(studentId, status);
      return next;
    });
  };

  const markAllAs = (status: AttendanceStatus) => {
    if (!students) return;
    const records = new Map<string, AttendanceStatus>();
    students.forEach(student => {
      records.set(student.id, status);
    });
    setAttendanceRecords(records);
  };

  const handleSubmit = async () => {
    if (!selectedClass || !students || !user) return;

    const unmarkedStudents = students.filter(s => !attendanceRecords.has(s.id));
    if (unmarkedStudents.length > 0) {
      toast.error(`Please mark attendance for all ${unmarkedStudents.length} remaining students`);
      return;
    }

    setIsSubmitting(true);

    try {
      const attendanceData = Array.from(attendanceRecords.entries()).map(([studentId, status]) => ({
        student_id: studentId,
        class_id: selectedClass.class_id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status,
        marked_by: user.id,
      }));

      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceData, { 
          onConflict: 'student_id,date',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast.success('Attendance saved successfully!');
      setExistingAttendance(true);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast.error(error.message || 'Failed to save attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <Check className="h-4 w-4" />;
      case 'absent': return <X className="h-4 w-4" />;
      case 'late': return <Clock className="h-4 w-4" />;
      case 'excused': return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-500 hover:bg-green-600';
      case 'absent': return 'bg-red-500 hover:bg-red-600';
      case 'late': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'excused': return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const presentCount = Array.from(attendanceRecords.values()).filter(s => s === 'present').length;
  const absentCount = Array.from(attendanceRecords.values()).filter(s => s === 'absent').length;
  const lateCount = Array.from(attendanceRecords.values()).filter(s => s === 'late').length;

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
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
          <p className="text-muted-foreground">Select a class and date to mark attendance</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Class</label>
              <Select 
                value={selectedClass?.class_id || ''} 
                onValueChange={handleClassChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses?.map((cls) => (
                    <SelectItem key={cls.class_id} value={cls.class_id}>
                      {cls.class?.name} - {cls.class?.section} ({cls.subject?.name})
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
                    onSelect={handleDateChange}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Marking */}
      {selectedClass && (
        <>
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => markAllAs('present')}>
              <Check className="h-4 w-4 mr-1 text-green-500" />
              Mark All Present
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAllAs('absent')}>
              <X className="h-4 w-4 mr-1 text-red-500" />
              Mark All Absent
            </Button>
            {existingAttendance && (
              <Badge variant="secondary" className="ml-auto">
                <AlertCircle className="h-3 w-3 mr-1" />
                Editing existing attendance
              </Badge>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{students?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Check className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-700">Present</p>
                  <p className="text-2xl font-bold text-green-800">{presentCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center gap-3">
                <X className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-red-700">Absent</p>
                  <p className="text-2xl font-bold text-red-800">{absentCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-700">Late</p>
                  <p className="text-2xl font-bold text-yellow-800">{lateCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students ({students?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : students && students.length > 0 ? (
                <div className="space-y-2">
                  {students.map((student) => {
                    const currentStatus = attendanceRecords.get(student.id);
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
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

                        <div className="flex gap-1">
                          {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={currentStatus === status ? 'default' : 'outline'}
                              className={cn(
                                'w-9 h-9 p-0',
                                currentStatus === status && getStatusColor(status)
                              )}
                              onClick={() => markAttendance(student.id, status)}
                              title={status.charAt(0).toUpperCase() + status.slice(1)}
                            >
                              {getStatusIcon(status)}
                            </Button>
                          ))}
                        </div>
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

          {/* Submit Button */}
          {students && students.length > 0 && (
            <div className="flex justify-end">
              <Button 
                size="lg" 
                onClick={handleSubmit} 
                disabled={isSubmitting || attendanceRecords.size === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {existingAttendance ? 'Update Attendance' : 'Save Attendance'}
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {!selectedClass && teacherClasses && teacherClasses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Classes Assigned</h3>
            <p className="text-muted-foreground">
              You are not a class teacher for any class. Only class teachers can mark attendance.
              Please contact the administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
