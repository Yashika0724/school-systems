import {
  ClipboardCheck,
  FileText,
  BookOpen,
  Calendar,
  TrendingUp,
  Menu,
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

interface StudentDashboardContentProps {
  isDemo?: boolean;
}

export function StudentDashboardContent({ isDemo = false }: StudentDashboardContentProps) {
  const student = isDemo ? demoStudent : demoStudent; // In real app, fetch from auth context
  const { data: announcements = [] } = useStudentAnnouncements();

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
            <p className="text-muted-foreground">Class {student.class} • Roll No. {student.rollNumber}</p>
          </div>
        </div>
        
        <Avatar className="h-12 w-12 border-2 border-primary">
          <AvatarImage src={student.avatar} />
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
                <p className="text-2xl font-bold text-green-800">{student.attendance.percentage}%</p>
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
                <p className="text-2xl font-bold text-blue-800">A</p>
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
                <p className="text-2xl font-bold text-purple-800">{student.upcomingExams}</p>
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
                <p className="text-2xl font-bold text-orange-800">{student.pendingHomework}</p>
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
            {student.recentMarks.map((mark, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{mark.subject}</span>
                  <span className="font-medium">{mark.marks}/{mark.total} ({mark.grade})</span>
                </div>
                <Progress value={(mark.marks / mark.total) * 100} className="h-2" />
              </div>
            ))}
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
            {student.homework.filter(hw => hw.status === 'pending').map((hw) => (
              <div key={hw.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{hw.title}</p>
                  <p className="text-xs text-muted-foreground">{hw.subject}</p>
                  <p className="text-xs text-orange-600 mt-1">Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            ))}
            {student.homework.filter(hw => hw.status === 'pending').length === 0 && (
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
          <div className="flex gap-2 overflow-x-auto pb-2">
            {student.timetable[0].periods.map((period, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-24 p-3 rounded-lg bg-primary/5 border text-center"
              >
                <p className="text-xs text-muted-foreground">Period {index + 1}</p>
                <p className="font-medium text-sm mt-1">{period}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
