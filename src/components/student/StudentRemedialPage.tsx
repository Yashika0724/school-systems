import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Lightbulb, RefreshCw, ExternalLink, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTopicMastery,
  useRefreshTopicMastery,
  useRemedialResources,
} from '@/hooks/useTopicMastery';

const WEAK_THRESHOLD = 60;

function ResourceBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="text-xs">
      {type}
    </Badge>
  );
}

function WeakTopicRow({
  topic,
  subject_id,
  class_id,
  masteryPct,
  correct,
  total,
}: {
  topic: string;
  subject_id: string | null;
  class_id: string | null;
  masteryPct: number;
  correct: number;
  total: number;
}) {
  const { data: resources } = useRemedialResources({
    topic,
    subject_id,
    student_class_id: class_id,
  });

  return (
    <Card className="border-orange-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{topic}</h3>
            <p className="text-xs text-muted-foreground">
              {correct}/{total} correct across attempts
            </p>
          </div>
          <Badge className="bg-orange-100 text-orange-700 border-orange-300">
            <TrendingDown className="h-3 w-3 mr-1" />
            {masteryPct.toFixed(0)}%
          </Badge>
        </div>

        <Progress value={masteryPct} className="h-2" />

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Recommended resources
          </p>
          {!resources || resources.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No matching library resources — ask your teacher for practice material.
            </p>
          ) : (
            <div className="space-y-1">
              {resources.map((r: any) => {
                const url = r.file_url || r.external_url;
                return (
                  <a
                    key={r.id}
                    href={url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start justify-between gap-2 text-sm p-2 rounded hover:bg-muted/40 border"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.title}</p>
                        {r.subject?.name && (
                          <p className="text-xs text-muted-foreground">
                            {r.subject.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <ResourceBadge type={r.resource_type} />
                      {url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentRemedialPage() {
  const { user } = useAuth();

  const { data: student, isLoading: studentLoading } = useQuery({
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

  const { data: mastery, isLoading } = useTopicMastery(student?.id || null);
  const refresh = useRefreshTopicMastery(student?.id || null);

  const [showAll, setShowAll] = useState(false);

  const weak = useMemo(
    () => (mastery || []).filter((m) => m.mastery_pct < WEAK_THRESHOLD),
    [mastery],
  );
  const strong = useMemo(
    () => (mastery || []).filter((m) => m.mastery_pct >= 80),
    [mastery],
  );

  if (studentLoading || isLoading) {
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Remedial Practice
          </h1>
          <p className="text-muted-foreground">
            Topics where you've scored below {WEAK_THRESHOLD}% in online exams, with suggested resources.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending || !student}
        >
          {refresh.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {!mastery || mastery.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">
              Take some online exams and your weak topics will show up here. Click Refresh
              after submitting an attempt.
            </p>
          </CardContent>
        </Card>
      ) : weak.length === 0 ? (
        <Card className="border-green-200">
          <CardContent className="p-10 text-center space-y-3">
            <TrendingUp className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="font-semibold text-lg">Looking good!</h2>
            <p className="text-muted-foreground">
              No weak topics right now — all tracked topics are above {WEAK_THRESHOLD}%.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {weak.map((m) => (
            <WeakTopicRow
              key={m.id}
              topic={m.topic}
              subject_id={m.subject_id}
              class_id={student?.class_id || null}
              masteryPct={Number(m.mastery_pct)}
              correct={m.correct_count}
              total={m.total_count}
            />
          ))}
        </div>
      )}

      {strong.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Strengths
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Hide' : `Show all ${mastery?.length || 0} topics`}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {strong.map((m) => (
                <Badge
                  key={m.id}
                  className="bg-green-100 text-green-700 border-green-300"
                >
                  {m.topic} — {m.mastery_pct}%
                </Badge>
              ))}
            </div>
            {showAll && (
              <div className="mt-4 space-y-2">
                {(mastery || [])
                  .filter((m) => m.mastery_pct >= WEAK_THRESHOLD && m.mastery_pct < 80)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <span className="font-medium text-sm">{m.topic}</span>
                      <div className="flex items-center gap-3">
                        <Progress value={Number(m.mastery_pct)} className="w-32 h-2" />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {m.mastery_pct}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
