import {
  ClipboardCheck,
  FileText,
  BookOpen,
  Calendar,
  TrendingUp,
  Menu,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { demoStudent } from '@/lib/demo-data';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from '@/components/dashboard/StudentSidebar';
import { AnnouncementCarousel } from '@/components/shared/AnnouncementCarousel';
import { useStudentAnnouncements } from '@/hooks/useAnnouncements';
import { useStudentDashboardData } from '@/hooks/useStudentDashboard';

interface StudentDashboardContentProps {
  isDemo?: boolean;
}

export function StudentDashboardContent({ isDemo = false }: StudentDashboardContentProps) {
  // Use real data for logged-in users, demo data for demo mode
  const { 
    student: realStudent, 
    attendance: realAttendance, 
    recentMarks: realMarks,
    homework: realHomework,
    pendingHomeworkCount,
    todaySchedule: realSchedule,
    isLoading 
  } = useStudentDashboardData();
  
  const { data: announcements = [] } = useStudentAnnouncements();

  // Use demo data in demo mode, otherwise use real data
  const student = isDemo ? {
    name: demoStudent.name,
    class: demoStudent.class,
    rollNumber: demoStudent.rollNumber,
    avatar: demoStudent.avatar,
  } : {
    name: realStudent?.name || 'Student',
    class: realStudent?.class || '',
    rollNumber: realStudent?.rollNumber || '',
    avatar: realStudent?.avatar,
  };

  const attendance = isDemo ? demoStudent.attendance : realAttendance;
  const recentMarks = isDemo ? demoStudent.recentMarks : realMarks;
  const homework = isDemo ? demoStudent.homework : realHomework;
  const todaySchedule = isDemo ? demoStudent.timetable[0]?.periods || [] : realSchedule;
  const upcomingExams = isDemo ? demoStudent.upcomingExams : 0;
  const pendingHW = isDemo ? demoStudent.pendingHomework : pendingHomeworkCount;

  // Calculate average grade
  const avgGrade = recentMarks.length > 0 
    ? recentMarks[0]?.grade || 'N/A'
    : 'N/A';

  if (!isDemo && isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6">
      {/* Header with mobile menu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <StudentSidebar isDemo={isDemo} />
            </SheetContent>
          </Sheet>
          
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {student.name.split(' ')[0]}! 👋</h1>
            <p className="text-muted-foreground">
              {student.class && `Class ${student.class}`}
              {student.rollNumber && ` • Roll No. ${student.rollNumber}`}
            </p>
          </div>
        </div>
        
        <Avatar className="h-12 w-12 border-2 border-primary">
          <AvatarImage src={student.avatar || undefined} />
          <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
      </div>

      {/* Announcements Carousel */}
      {announcements.length > 0 && (
        <AnnouncementCarousel announcements={announcements} />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Attendance</p>
                <p className="text-2xl font-bold text-green-800">{attendance.percentage}%</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Avg. Grade</p>
                <p className="text-2xl font-bold text-blue-800">{avgGrade}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">Upcoming Exams</p>
                <p className="text-2xl font-bold text-purple-800">{upcomingExams}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">Pending HW</p>
                <p className="text-2xl font-bold text-orange-800">{pendingHW}</p>
              </div>
              <BookOpen className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Marks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recent Marks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentMarks.length > 0 ? (
              recentMarks.map((mark, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{mark.subject}</span>
                    <span className="font-medium">{mark.marks}/{mark.total} ({mark.grade})</span>
                  </div>
                  <Progress value={(mark.marks / mark.total) * 100} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No marks recorded yet</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Homework */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Pending Homework
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {homework.filter(hw => hw.status === 'pending').length > 0 ? (
              homework.filter(hw => hw.status === 'pending').map((hw) => (
                <div key={hw.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{hw.title}</p>
                    <p className="text-xs text-muted-foreground">{hw.subject}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No pending homework! 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isDemo ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {todaySchedule.map((period, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-24 p-3 rounded-lg bg-primary/5 border text-center"
                >
                  <p className="text-xs text-muted-foreground">Period {index + 1}</p>
                  <p className="font-medium text-sm mt-1">{period}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {realSchedule.length > 0 ? (
                realSchedule.map((slot, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-28 p-3 rounded-lg bg-primary/5 border text-center"
                  >
                    <p className="text-xs text-muted-foreground">Period {slot.period}</p>
                    <p className="font-medium text-sm mt-1">{slot.subject || 'Free'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {slot.startTime?.slice(0, 5)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4 w-full">
                  No schedule for today
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
