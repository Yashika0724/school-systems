import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, BookOpen, Clock, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimetableSlot {
  id: string;
  day_of_week: number;
  slot_number: number;
  start_time: string;
  end_time: string;
  room: string | null;
  subject: { id: string; name: string; code: string | null } | null;
  teacher: { 
    id: string;
    profile: { full_name: string } | null;
  } | null;
}

interface ClassSession {
  id: string;
  session_date: string;
  topic: string | null;
  description: string | null;
  subject_id: string;
}

function useStudentClass() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['student-class', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('students')
        .select('class_id, class:classes(id, name, section)')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

function useStudentTimetable(classId: string | null) {
  return useQuery({
    queryKey: ['student-timetable', classId],
    queryFn: async () => {
      if (!classId) return [];
      
      const { data, error } = await supabase
        .from('timetable_slots')
        .select(`
          id,
          day_of_week,
          slot_number,
          start_time,
          end_time,
          room,
          subject:subjects(id, name, code),
          teacher_id
        `)
        .eq('class_id', classId)
        .order('day_of_week')
        .order('slot_number');
      
      if (error) throw error;
      
      // Get teacher details
      const teacherIds = [...new Set(data?.filter(d => d.teacher_id).map(d => d.teacher_id) || [])];
      let teachers: any[] = [];
      
      if (teacherIds.length > 0) {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id, user_id')
          .in('id', teacherIds);
        
        if (teacherData) {
          const userIds = teacherData.map(t => t.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          
          teachers = teacherData.map(t => ({
            id: t.id,
            profile: profiles?.find(p => p.user_id === t.user_id),
          }));
        }
      }
      
      return (data || []).map(item => ({
        ...item,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
        teacher: teachers.find(t => t.id === item.teacher_id) || null,
      })) as TimetableSlot[];
    },
    enabled: !!classId,
  });
}

function useWeekSessions(classId: string | null) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  
  return useQuery({
    queryKey: ['week-sessions', classId, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!classId) return [];
      
      const { data, error } = await supabase
        .from('class_sessions')
        .select('id, session_date, topic, description, subject_id')
        .eq('class_id', classId)
        .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('session_date', format(weekEnd, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data as ClassSession[];
    },
    enabled: !!classId,
  });
}

export function StudentTimetablePage() {
  const { data: studentClass, isLoading: classLoading } = useStudentClass();
  const classId = studentClass?.class_id || null;
  const classInfo = Array.isArray(studentClass?.class) ? studentClass.class[0] : studentClass?.class;
  
  const { data: timetable, isLoading: timetableLoading } = useStudentTimetable(classId);
  const { data: sessions } = useWeekSessions(classId);
  
  const today = new Date().getDay();
  const currentDayIndex = today === 0 ? 6 : today - 1; // Convert Sunday=0 to index
  
  // Group timetable by day
  const timetableByDay = DAYS.map((day, index) => ({
    day,
    dayIndex: index,
    slots: timetable?.filter(slot => slot.day_of_week === index) || [],
  }));
  
  // Get session for a specific slot
  const getSessionForSlot = (subjectId: string, dayIndex: number) => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const slotDate = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
    return sessions?.find(s => s.subject_id === subjectId && s.session_date === slotDate);
  };
  
  if (classLoading || timetableLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!classInfo) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Class Assigned</h3>
            <p className="text-muted-foreground">
              You haven't been assigned to a class yet. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Timetable</h1>
          <p className="text-muted-foreground">
            Class {classInfo.name} - {classInfo.section} • Weekly Schedule
          </p>
        </div>
        <Badge variant="outline" className="hidden md:flex">
          <Calendar className="h-3 w-3 mr-1" />
          Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </Badge>
      </div>
      
      {/* Desktop view - Grid */}
      <div className="hidden lg:grid grid-cols-6 gap-4">
        {timetableByDay.map(({ day, dayIndex, slots }) => (
          <Card key={day} className={cn(dayIndex === currentDayIndex && 'ring-2 ring-primary')}>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                {day}
                {dayIndex === currentDayIndex && (
                  <Badge className="text-xs">Today</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {slots.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No classes</p>
              ) : (
                slots.map((slot) => {
                  const session = slot.subject ? getSessionForSlot(slot.subject.id, dayIndex) : null;
                  return (
                    <div
                      key={slot.id}
                      className="p-2 rounded-lg bg-muted/50 border text-xs space-y-1"
                    >
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                      </div>
                      <p className="font-medium text-sm">
                        {slot.subject?.name || 'Free Period'}
                      </p>
                      {slot.teacher?.profile && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          {slot.teacher.profile.full_name}
                        </div>
                      )}
                      {slot.room && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {slot.room}
                        </div>
                      )}
                      {session?.topic && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center gap-1 text-primary font-medium">
                            <BookOpen className="h-3 w-3" />
                            Topic:
                          </div>
                          <p className="text-muted-foreground">{session.topic}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Mobile view - Stacked cards */}
      <div className="lg:hidden space-y-4">
        {timetableByDay.map(({ day, dayIndex, slots }) => (
          <Card key={day} className={cn(dayIndex === currentDayIndex && 'ring-2 ring-primary')}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-medium flex items-center justify-between">
                {day}
                {dayIndex === currentDayIndex && (
                  <Badge>Today</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No classes scheduled</p>
              ) : (
                <div className="space-y-3">
                  {slots.map((slot) => {
                    const session = slot.subject ? getSessionForSlot(slot.subject.id, dayIndex) : null;
                    return (
                      <div
                        key={slot.id}
                        className="p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{slot.subject?.name || 'Free Period'}</p>
                            {slot.teacher?.profile && (
                              <p className="text-sm text-muted-foreground">
                                {slot.teacher.profile.full_name}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                          </Badge>
                        </div>
                        {slot.room && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {slot.room}
                          </div>
                        )}
                        {session?.topic && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-1 text-sm text-primary font-medium">
                              <BookOpen className="h-3 w-3" />
                              Today's Topic:
                            </div>
                            <p className="text-sm text-muted-foreground">{session.topic}</p>
                            {session.description && (
                              <p className="text-xs text-muted-foreground mt-1">{session.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
