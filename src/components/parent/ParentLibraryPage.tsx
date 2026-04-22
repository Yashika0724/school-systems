import { useState } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useParentData, useLinkedChildren } from '@/hooks/useParentData';
import { useStudentBookIssuesById } from '@/hooks/useLibrary';
import { useDemo } from '@/contexts/DemoContext';

// Demo data
const demoBookIssues = [
  {
    id: '1',
    book: { title: 'To Kill a Mockingbird', author: 'Harper Lee' },
    issue_date: '2026-01-05',
    due_date: '2026-01-19',
    status: 'issued',
  },
  {
    id: '2',
    book: { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
    issue_date: '2025-12-15',
    due_date: '2025-12-29',
    return_date: '2025-12-28',
    status: 'returned',
  },
];

export function ParentLibraryPage() {
  const { isDemo } = useDemo();
  const { data: parentData } = useParentData();
  const { data: children, isLoading } = useLinkedChildren(parentData?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const selectedChild = children?.find(c => c.student_id === selectedChildId);
  const { data: realIssues, isLoading: issuesLoading } = useStudentBookIssuesById(
    isDemo ? null : selectedChildId,
  );

  const displayIssues = isDemo ? demoBookIssues : (realIssues ?? []);

  const currentIssues = displayIssues.filter(i => i.status === 'issued');
  const overdueCount = displayIssues.filter(i => i.status === 'issued' && new Date(i.due_date) < new Date()).length;

  if (isLoading && !isDemo) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-muted-foreground">View your children's library activities</p>
      </div>

      {/* Child Selector */}
      {children && children.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedChildId ? `Viewing: ${selectedChild?.student?.profile?.full_name || 'Child'}` : 'Select a child'}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {selectedChildId ? 'Change Child' : 'Select Child'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {children.map((child) => (
                    <DropdownMenuItem
                      key={child.student_id}
                      onClick={() => setSelectedChildId(child.student_id)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={child.student?.profile?.avatar_url || ''} />
                        <AvatarFallback>{child.student?.profile?.full_name?.[0] || 'S'}</AvatarFallback>
                      </Avatar>
                      {child.student?.profile?.full_name || 'Student'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Currently Borrowed</p>
                <p className="text-2xl font-bold text-blue-800">{currentIssues.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Books Returned</p>
                <p className="text-2xl font-bold text-green-800">
                  {displayIssues.filter(i => i.status === 'returned').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Overdue</p>
                <p className="text-2xl font-bold text-red-800">{overdueCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Currently Borrowed Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedChildId && !isDemo ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a child to view their library books</p>
            </div>
          ) : issuesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : currentIssues.length > 0 ? (
            <div className="space-y-3">
              {currentIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{issue.book?.title}</p>
                    <p className="text-sm text-muted-foreground">{issue.book?.author}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Due: {new Date(issue.due_date).toLocaleDateString('en-IN')}</p>
                    {new Date(issue.due_date) < new Date() ? (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800">Issued</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No books currently borrowed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return History */}
      {displayIssues.filter(i => i.status === 'returned').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Return History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayIssues.filter(i => i.status === 'returned').map((issue: any) => (
                <div key={issue.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium">{issue.book?.title}</p>
                    <p className="text-sm text-muted-foreground">{issue.book?.author}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Returned: {issue.return_date ? new Date(issue.return_date).toLocaleDateString('en-IN') : '-'}
                    </p>
                    <Badge className="bg-green-100 text-green-800">Returned</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
