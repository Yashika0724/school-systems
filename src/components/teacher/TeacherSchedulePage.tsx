import { useAuth } from '@/contexts/AuthContext';
import { useTeacherSchedule } from '@/hooks/useTimetable';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, Clock, MapPin, Users, School } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TeacherSchedulePage() {
  const { data: schedule, isLoading: scheduleLoading } = useTeacherSchedule();
  const { data: teacherClasses } = useTeacherClasses();
  
  // Find classes where teacher is the class teacher
  const classTeacherClasses = teacherClasses?.filter(tc => tc.is_class_teacher) || [];
  
  const today = new Date().getDay();
  const currentDayIndex = today === 0 ? 6 : today - 1;
  
  // Group schedule by day
  const scheduleByDay = DAYS.map((day, index) => ({
    day,
    dayIndex: index,
    slots: schedule?.filter(slot => slot.day_of_week === index) || [],
  }));
  
  if (scheduleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground">Your weekly teaching schedule</p>
        </div>
      </div>
      
      <Tabs defaultValue="my-schedule">
        <TabsList>
          <TabsTrigger value="my-schedule">My Schedule</TabsTrigger>
          {classTeacherClasses.length > 0 && (
            <TabsTrigger value="class-timetable">Class Timetable</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="my-schedule" className="mt-6">
          {/* Desktop Grid View */}
          <div className="hidden lg:grid grid-cols-6 gap-4">
            {scheduleByDay.map(({ day, dayIndex, slots }) => (
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
                    slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-2 rounded-lg bg-muted/50 border text-xs space-y-1"
                      >
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                        </div>
                        <p className="font-medium text-sm">
                          {slot.subject?.name || 'Period'}
                        </p>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {slot.class?.name}-{slot.class?.section}
                        </div>
                        {slot.room && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {slot.room}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Mobile Stacked View */}
          <div className="lg:hidden space-y-4">
            {scheduleByDay.map(({ day, dayIndex, slots }) => (
              <Card key={day} className={cn(dayIndex === currentDayIndex && 'ring-2 ring-primary')}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-medium flex items-center justify-between">
                    {day}
                    {dayIndex === currentDayIndex && <Badge>Today</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No classes scheduled</p>
                  ) : (
                    <div className="space-y-3">
                      {slots.map((slot) => (
                        <div key={slot.id} className="p-3 rounded-lg bg-muted/50 border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{slot.subject?.name || 'Period'}</p>
                              <p className="text-sm text-muted-foreground">
                                Class {slot.class?.name}-{slot.class?.section}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                            </Badge>
                          </div>
                          {slot.room && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              Room: {slot.room}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {schedule?.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Schedule Yet</h3>
                <p className="text-muted-foreground">
                  You haven't been assigned to any timetable slots yet. Please contact the administrator.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {classTeacherClasses.length > 0 && (
          <TabsContent value="class-timetable" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  Classes You're Class Teacher Of
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classTeacherClasses.map((tc) => (
                    <div key={tc.id} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-lg">
                          {tc.class?.name} - {tc.class?.section}
                        </h4>
                        <Badge>Class Teacher</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You can view the full timetable for this class from the admin dashboard or timetable management section.
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
