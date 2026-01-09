import { useState } from 'react';
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  Bell,
  CreditCard,
  Calendar,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { demoParent, demoStudent } from '@/lib/demo-data';
import { ParentSidebar } from '@/components/dashboard/ParentSidebar';

interface ParentDashboardContentProps {
  isDemo?: boolean;
}

export function ParentDashboardContent({ isDemo = false }: ParentDashboardContentProps) {
  const parent = isDemo ? demoParent : demoParent;
  const [selectedChild, setSelectedChild] = useState(parent.children[0]);

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
              <ParentSidebar isDemo={isDemo} />
            </SheetContent>
          </Sheet>
          
          <div>
            <h1 className="text-2xl font-bold">Welcome, {parent.name.split(' ')[0]}! 👋</h1>
            <p className="text-muted-foreground">Parent Dashboard</p>
          </div>
        </div>

        <Avatar className="h-12 w-12 border-2 border-primary">
          <AvatarImage src={parent.avatar} />
          <AvatarFallback>{parent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
      </div>

      {/* Child Selector */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-2 border-green-500">
                <AvatarImage src={selectedChild.avatar} />
                <AvatarFallback>{selectedChild.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedChild.name}</p>
                <p className="text-sm text-muted-foreground">Class {selectedChild.class} • Roll No. {selectedChild.rollNumber}</p>
              </div>
            </div>
            
            {parent.children.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Switch Child
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {parent.children.map((child) => (
                    <DropdownMenuItem
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={child.avatar} />
                        <AvatarFallback>{child.name[0]}</AvatarFallback>
                      </Avatar>
                      {child.name} - Class {child.class}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats for Selected Child */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance</p>
                <p className="text-2xl font-bold text-green-600">{selectedChild.attendance.percentage}%</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Grade</p>
                <p className="text-2xl font-bold text-blue-600">{selectedChild.recentGrade}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fee Status</p>
                <p className="text-2xl font-bold text-orange-600">Paid</p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Announcements</p>
                <p className="text-2xl font-bold text-purple-600">{parent.announcements.length}</p>
              </div>
              <Bell className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All Children Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Your Children
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parent.children.map((child) => (
              <div
                key={child.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setSelectedChild(child)}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={child.avatar} />
                    <AvatarFallback>{child.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{child.name}</p>
                    <p className="text-sm text-muted-foreground">Class {child.class}</p>
                  </div>
                </div>
                <Badge variant={child.recentGrade === 'A+' ? 'default' : 'secondary'}>
                  Grade: {child.recentGrade}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parent.announcements.map((announcement) => (
              <div key={announcement.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  announcement.type === 'event' ? 'bg-blue-100' : 'bg-orange-100'
                }`}>
                  {announcement.type === 'event' ? (
                    <Calendar className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Bell className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(announcement.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Fee Management Teaser */}
      <Card className="border-dashed border-2">
        <CardContent className="p-6 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Fee Management</h3>
          <p className="text-muted-foreground mb-4">
            Online fee payment and tracking coming soon!
          </p>
          <Badge variant="secondary">Under Development</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
