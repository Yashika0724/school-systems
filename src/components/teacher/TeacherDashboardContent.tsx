import {
  BookOpen,
  ClipboardCheck,
  FileText,
  PenTool,
  Calendar,
  Users,
  Clock,
  Menu,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { demoTeacher } from '@/lib/demo-data';
import { TeacherSidebar } from '@/components/dashboard/TeacherSidebar';
import { useDemo } from '@/contexts/DemoContext';

interface TeacherDashboardContentProps {
  isDemo?: boolean;
}

export function TeacherDashboardContent({ isDemo = false }: TeacherDashboardContentProps) {
  const teacher = isDemo ? demoTeacher : demoTeacher;
  const { showDemoToast } = useDemo();

  const handleQuickAction = (action: string) => {
    if (isDemo) {
      showDemoToast(action);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <TeacherSidebar isDemo={isDemo} />
            </SheetContent>
          </Sheet>
          
          <div>
            <h1 className="text-2xl font-bold">Welcome, {teacher.name.split(' ').slice(1).join(' ')}! 👋</h1>
            <p className="text-muted-foreground">{teacher.designation}</p>
          </div>
        </div>

        <Avatar className="h-12 w-12 border-2 border-primary">
          <AvatarImage src={teacher.avatar} />
          <AvatarFallback>{teacher.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => handleQuickAction('Mark Attendance clicked')}
        >
          <ClipboardCheck className="h-6 w-6" />
          <span>Mark Attendance</span>
          {teacher.pendingTasks.attendanceToMark > 0 && (
            <Badge variant="secondary" className="bg-white/20">
              {teacher.pendingTasks.attendanceToMark} pending
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => handleQuickAction('Upload Marks clicked')}
        >
          <FileText className="h-6 w-6" />
          <span>Upload Marks</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => handleQuickAction('Post Homework clicked')}
        >
          <PenTool className="h-6 w-6" />
          <span>Post Homework</span>
          {teacher.pendingTasks.homeworkToReview > 0 && (
            <Badge variant="secondary">
              {teacher.pendingTasks.homeworkToReview} to review
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => handleQuickAction('Leave Requests clicked')}
        >
          <Calendar className="h-6 w-6" />
          <span>Leave Requests</span>
          {teacher.pendingTasks.leaveRequests > 0 && (
            <Badge variant="destructive">
              {teacher.pendingTasks.leaveRequests} pending
            </Badge>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacher.todaySchedule.map((period, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">{period.period}</span>
                  </div>
                  <div>
                    <p className="font-medium">Class {period.class}</p>
                    <p className="text-sm text-muted-foreground">{period.subject}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{period.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Assigned Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              My Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacher.assignedClasses.map((cls, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Class {cls.class}</p>
                    <p className="text-sm text-muted-foreground">{cls.subject}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{cls.students} students</p>
                  {cls.isClassTeacher && (
                    <Badge variant="default" className="text-xs">Class Teacher</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks Alert */}
      {(teacher.pendingTasks.attendanceToMark > 0 || 
        teacher.pendingTasks.homeworkToReview > 0 || 
        teacher.pendingTasks.leaveRequests > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Pending Tasks</p>
                <ul className="text-sm text-orange-700 mt-1 space-y-1">
                  {teacher.pendingTasks.attendanceToMark > 0 && (
                    <li>• {teacher.pendingTasks.attendanceToMark} classes need attendance marking</li>
                  )}
                  {teacher.pendingTasks.homeworkToReview > 0 && (
                    <li>• {teacher.pendingTasks.homeworkToReview} homework submissions to review</li>
                  )}
                  {teacher.pendingTasks.leaveRequests > 0 && (
                    <li>• {teacher.pendingTasks.leaveRequests} student leave requests pending</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Recent Student Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {teacher.recentStudents.map((student, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-40 p-4 rounded-lg bg-muted/50 text-center"
              >
                <Avatar className="h-12 w-12 mx-auto mb-2">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                  <AvatarFallback>{student.name[0]}</AvatarFallback>
                </Avatar>
                <p className="font-medium text-sm">{student.name}</p>
                <p className="text-xs text-muted-foreground">Class {student.class}</p>
                <Badge
                  variant={
                    student.performance === 'Excellent'
                      ? 'default'
                      : student.performance === 'Good'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="mt-2 text-xs"
                >
                  {student.performance}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
