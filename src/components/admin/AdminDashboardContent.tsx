import {
  Users,
  GraduationCap,
  BookOpen,
  School,
  TrendingUp,
  CreditCard,
  Calendar,
  AlertCircle,
  Menu,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { demoAdmin } from '@/lib/demo-data';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { useDemo } from '@/contexts/DemoContext';

interface AdminDashboardContentProps {
  isDemo?: boolean;
}

export function AdminDashboardContent({ isDemo = false }: AdminDashboardContentProps) {
  const admin = isDemo ? demoAdmin : demoAdmin;
  const { showDemoToast } = useDemo();

  const handleAction = (action: string) => {
    if (isDemo) {
      showDemoToast(action);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <AdminSidebar isDemo={isDemo} />
            </SheetContent>
          </Sheet>
          
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {admin.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => handleAction('Add New User clicked')}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage src={admin.avatar} />
            <AvatarFallback>{admin.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <GraduationCap className="h-8 w-8 text-orange-500" />
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{admin.schoolStats.totalStudents}</p>
            <p className="text-sm text-muted-foreground">Students</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <BookOpen className="h-8 w-8 text-purple-500" />
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{admin.schoolStats.totalTeachers}</p>
            <p className="text-sm text-muted-foreground">Teachers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-green-500" />
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{admin.schoolStats.totalParents}</p>
            <p className="text-sm text-muted-foreground">Parents</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <School className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{admin.schoolStats.totalClasses}</p>
            <p className="text-sm text-muted-foreground">Classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{admin.schoolStats.attendanceToday}%</p>
            <p className="text-sm text-muted-foreground">Attendance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CreditCard className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{admin.schoolStats.feeCollected}%</p>
            <p className="text-sm text-muted-foreground">Fee Collected</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200">
              <div>
                <p className="font-medium">Teacher Leaves</p>
                <p className="text-sm text-muted-foreground">Awaiting approval</p>
              </div>
              <Badge variant="destructive">{admin.pendingApprovals.teacherLeaves}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div>
                <p className="font-medium">Student Admissions</p>
                <p className="text-sm text-muted-foreground">New applications</p>
              </div>
              <Badge>{admin.pendingApprovals.studentAdmissions}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div>
                <p className="font-medium">Fee Waivers</p>
                <p className="text-sm text-muted-foreground">Discount requests</p>
              </div>
              <Badge variant="secondary">{admin.pendingApprovals.feeWaivers}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {admin.recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full mt-2 ${
                  activity.type === 'enrollment' ? 'bg-green-500' :
                  activity.type === 'fee' ? 'bg-blue-500' :
                  activity.type === 'leave' ? 'bg-orange-500' : 'bg-purple-500'
                }`} />
                <div>
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {admin.upcomingEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleAction(`View ${event.name}`)}>
                  View
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Collection Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Collection</span>
              <span className="font-medium">{admin.schoolStats.feeCollected}%</span>
            </div>
            <Progress value={admin.schoolStats.feeCollected} className="h-3" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center p-3 rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">₹45L</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-50">
              <p className="text-2xl font-bold text-orange-600">₹8L</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">₹53L</p>
              <p className="text-xs text-muted-foreground">Total Expected</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">15</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
