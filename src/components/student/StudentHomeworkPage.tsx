import { useQuery } from '@tanstack/react-query';
import { format, isPast, isToday } from 'date-fns';
import { BookOpen, Calendar, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_date: string;
  subject: { name: string };
}

export function StudentHomeworkPage() {
  const { user } = useAuth();

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

  const { data: homework, isLoading } = useQuery({
    queryKey: ['student-homework', studentData?.class_id],
    queryFn: async (): Promise<Homework[]> => {
      if (!studentData?.class_id) return [];

      const { data, error } = await supabase
        .from('homework')
        .select(`
          id,
          title,
          description,
          due_date,
          assigned_date,
          subject:subjects(name)
        `)
        .eq('class_id', studentData.class_id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching homework:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
      })) as Homework[];
    },
    enabled: !!studentData?.class_id,
  });

  const getDueStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    if (isPast(due) && !isToday(due)) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle };
    }
    if (isToday(due)) {
      return { label: 'Due Today', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: Clock };
    }
    return { label: 'Pending', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Calendar };
  };

  const pendingHomework = homework?.filter(h => !isPast(new Date(h.due_date)) || isToday(new Date(h.due_date))) || [];
  const pastHomework = homework?.filter(h => isPast(new Date(h.due_date)) && !isToday(new Date(h.due_date))) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const HomeworkCard = ({ hw }: { hw: Homework }) => {
    const status = getDueStatus(hw.due_date);
    const StatusIcon = status.icon;

    return (
      <Card key={hw.id}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{hw.title}</h3>
                  <p className="text-sm text-muted-foreground">{hw.subject?.name}</p>
                </div>
                <Badge className={status.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              {hw.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {hw.description}
                </p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Assigned: {format(new Date(hw.assigned_date), 'PP')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due: {format(new Date(hw.due_date), 'PP')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Homework</h1>
        <p className="text-muted-foreground">View and track your assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-800">{pendingHomework.length}</p>
              <p className="text-xs text-blue-700">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-800">{pastHomework.length}</p>
              <p className="text-xs text-green-700">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200 col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-800">
                {homework?.filter(h => isToday(new Date(h.due_date))).length || 0}
              </p>
              <p className="text-xs text-orange-700">Due Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {homework && homework.length > 0 ? (
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingHomework.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastHomework.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingHomework.length > 0 ? (
              pendingHomework.map((hw) => <HomeworkCard key={hw.id} hw={hw} />)
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">
                    You have no pending homework. Great job!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastHomework.length > 0 ? (
              pastHomework.map((hw) => <HomeworkCard key={hw.id} hw={hw} />)
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No past homework to show.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Homework Assigned</h3>
            <p className="text-muted-foreground">
              You don't have any homework assigned yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
