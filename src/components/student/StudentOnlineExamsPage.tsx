import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Monitor, Play, Clock, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentAvailableOnlineExams, useStudentAttempts } from '@/hooks/useOnlineExam';

export function StudentOnlineExamsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: student } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: exams, isLoading } = useStudentAvailableOnlineExams(student?.class_id || null);
  const { data: attempts } = useStudentAttempts(student?.id || null);

  const now = new Date();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-6 w-6" />
          Online Exams
        </h1>
        <p className="text-muted-foreground">
          Take scheduled online tests. Make sure you're in a quiet environment before starting.
        </p>
      </div>

      {!exams || exams.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No online exams scheduled for your class right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((oe) => {
            const opensAt = oe.opens_at ? new Date(oe.opens_at) : null;
            const closesAt = oe.closes_at ? new Date(oe.closes_at) : null;
            const available =
              (!opensAt || now >= opensAt) && (!closesAt || now <= closesAt);
            const upcoming = opensAt && now < opensAt;
            const closed = closesAt && now > closesAt;

            const used = (attempts || []).filter(
              (a) => a.online_exam_id === oe.id && a.status !== 'in_progress',
            ).length;
            const inProgress = (attempts || []).find(
              (a) => a.online_exam_id === oe.id && a.status === 'in_progress',
            );
            const hasAttempts = used < oe.attempts_allowed;

            return (
              <Card key={oe.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {oe.exam?.subject?.name} — {oe.exam?.exam_type?.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {oe.duration_minutes} min · {oe.attempts_allowed} attempt(s) ·{' '}
                        {used}/{oe.attempts_allowed} used
                      </p>
                    </div>
                    {closed ? (
                      <Badge variant="secondary">
                        <Lock className="h-3 w-3 mr-1" />
                        Closed
                      </Badge>
                    ) : upcoming ? (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Upcoming
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        Live
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {opensAt && (
                    <p className="text-xs text-muted-foreground">
                      Opens {format(opensAt, 'dd MMM yyyy · HH:mm')}
                    </p>
                  )}
                  {closesAt && (
                    <p className="text-xs text-muted-foreground">
                      Closes {format(closesAt, 'dd MMM yyyy · HH:mm')}
                    </p>
                  )}
                  {oe.instructions && (
                    <div className="text-xs bg-muted/40 rounded p-2">
                      {oe.instructions}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={!available || (!hasAttempts && !inProgress)}
                    onClick={() => navigate(`/student/online-exams/${oe.id}/attempt`)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {inProgress ? 'Resume Attempt' : hasAttempts ? 'Start Attempt' : 'No attempts left'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
