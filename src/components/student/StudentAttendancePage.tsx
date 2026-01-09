import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useState } from 'react';
import { Calendar, Check, X, Clock, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
}

export function StudentAttendancePage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: studentData } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['student-attendance', studentData?.id, format(currentMonth, 'yyyy-MM')],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!studentData) return [];

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('student_id', studentData.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      if (error) {
        console.error('Error fetching attendance:', error);
        return [];
      }

      return (data || []) as AttendanceRecord[];
    },
    enabled: !!studentData,
  });

  // Calculate stats
  const stats = {
    present: attendance?.filter(a => a.status === 'present').length || 0,
    absent: attendance?.filter(a => a.status === 'absent').length || 0,
    late: attendance?.filter(a => a.status === 'late').length || 0,
    excused: attendance?.filter(a => a.status === 'excused').length || 0,
  };
  const totalDays = stats.present + stats.absent + stats.late + stats.excused;
  const attendancePercent = totalDays > 0 ? Math.round(((stats.present + stats.late) / totalDays) * 100) : 0;

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getStatusForDay = (day: Date): AttendanceStatus | null => {
    const record = attendance?.find(a => isSameDay(new Date(a.date), day));
    return record?.status || null;
  };

  const getStatusColor = (status: AttendanceStatus | null) => {
    switch (status) {
      case 'present': return 'bg-green-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      case 'late': return 'bg-yellow-500 text-white';
      case 'excused': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: AttendanceStatus | null) => {
    switch (status) {
      case 'present': return <Check className="h-3 w-3" />;
      case 'absent': return <X className="h-3 w-3" />;
      case 'late': return <Clock className="h-3 w-3" />;
      case 'excused': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground">Track your attendance record</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{attendancePercent}%</p>
              <p className="text-sm text-muted-foreground">Overall</p>
              <Progress value={attendancePercent} className="mt-2 h-2" />
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

      {/* Calendar View */}
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
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the month starts */}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {daysInMonth.map((day) => {
              const status = getStatusForDay(day);
              const isToday = isSameDay(day, new Date());
              const isFuture = day > new Date();

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors',
                    getStatusColor(status),
                    isToday && !status && 'ring-2 ring-primary',
                    isFuture && 'opacity-50'
                  )}
                >
                  <span className={cn('font-medium', !status && 'text-foreground')}>
                    {format(day, 'd')}
                  </span>
                  {status && (
                    <span className="mt-0.5">{getStatusIcon(status)}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
