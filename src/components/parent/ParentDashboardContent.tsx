import { useState, useEffect } from 'react';
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  Bell,
  CreditCard,
  Calendar,
  Menu,
  ChevronDown,
  Loader2,
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
import { demoParent } from '@/lib/demo-data';
import { ParentSidebar } from '@/components/dashboard/ParentSidebar';
import { AnnouncementCarousel } from '@/components/shared/AnnouncementCarousel';
import { useParentAnnouncements } from '@/hooks/useAnnouncements';
import { useParentDashboardData, ChildDashboardData } from '@/hooks/useParentDashboard';
import { Link } from 'react-router-dom';

interface ParentDashboardContentProps {
  isDemo?: boolean;
}

export function ParentDashboardContent({ isDemo = false }: ParentDashboardContentProps) {
  const { parent: realParent, children: realChildren, isLoading } = useParentDashboardData();
  const { data: announcements = [] } = useParentAnnouncements();
  
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  // Reset selected child when children data changes
  useEffect(() => {
    if (realChildren && realChildren.length > 0 && selectedChildIndex >= realChildren.length) {
      setSelectedChildIndex(0);
    }
  }, [realChildren, selectedChildIndex]);

  // Use demo data in demo mode
  const parent = isDemo ? demoParent : {
    name: realParent?.name || 'Parent',
    avatar: realParent?.avatar,
    children: realChildren || [],
    announcements: demoParent.announcements, // Use demo announcements as fallback
  };

  const children = isDemo 
    ? demoParent.children.map(c => ({
        id: c.id,
        studentId: c.id,
        name: c.name,
        avatar: c.avatar,
        class: c.class,
        rollNumber: c.rollNumber,
        attendance: c.attendance,
        recentGrade: c.recentGrade,
        pendingFees: 0,
      }))
    : realChildren || [];

  const selectedChild = children[selectedChildIndex] || children[0];

  if (!isDemo && isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isDemo && (!realChildren || realChildren.length === 0)) {
    return (
      <div className="p-4 md:p-6 pb-20 lg:pb-6">
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Children Linked</h2>
          <p className="text-muted-foreground">
            No students are currently linked to your account. Please contact the school administration.
          </p>
        </Card>
      </div>
    );
  }

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
          <AvatarImage src={parent.avatar || undefined} />
          <AvatarFallback>{parent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
      </div>

      {/* Child Selector */}
      {selectedChild && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-green-500">
                  <AvatarImage src={selectedChild.avatar || undefined} />
                  <AvatarFallback>{selectedChild.name?.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedChild.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Class {selectedChild.class}
                    {selectedChild.rollNumber && ` • Roll No. ${selectedChild.rollNumber}`}
                  </p>
                </div>
              </div>
              
              {children.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Switch Child
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {children.map((child, index) => (
                      <DropdownMenuItem
                        key={child.id}
                        onClick={() => setSelectedChildIndex(index)}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={child.avatar || undefined} />
                          <AvatarFallback>{child.name?.[0] || '?'}</AvatarFallback>
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
      )}

      {/* Announcements Carousel */}
      {announcements.length > 0 && (
        <AnnouncementCarousel announcements={announcements} />
      )}

      {/* Quick Stats for Selected Child */}
      {selectedChild && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attendance</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedChild.attendance?.percentage || 0}%
                  </p>
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
                  <p className="text-2xl font-bold text-blue-600">{selectedChild.recentGrade || 'N/A'}</p>
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
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedChild.pendingFees > 0 ? `₹${selectedChild.pendingFees}` : 'Paid'}
                  </p>
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
                  <p className="text-2xl font-bold text-purple-600">{announcements.length}</p>
                </div>
                <Bell className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            {children.map((child, index) => (
              <div
                key={child.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setSelectedChildIndex(index)}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={child.avatar || undefined} />
                    <AvatarFallback>{child.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{child.name}</p>
                    <p className="text-sm text-muted-foreground">Class {child.class}</p>
                  </div>
                </div>
                <Badge variant={child.recentGrade === 'A+' ? 'default' : 'secondary'}>
                  Grade: {child.recentGrade || 'N/A'}
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
            {announcements.length > 0 ? (
              announcements.slice(0, 3).map((announcement) => (
                <div key={announcement.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-100">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{announcement.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(announcement.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No announcements</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fee Management Link */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CreditCard className="h-10 w-10 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Fee Management</h3>
                <p className="text-muted-foreground text-sm">
                  View and track fee payments for your children
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to={isDemo ? '/demo/parent/fees' : '/parent/fees'}>
                View Fees
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
