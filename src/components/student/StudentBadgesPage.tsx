import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Sparkles, Crown, TrendingUp, Star, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentBadges, type BadgeType } from '@/hooks/useBadges';
import { format } from 'date-fns';

const ICON: Record<BadgeType, { icon: React.ElementType; bg: string; fg: string }> = {
  section_topper: { icon: Crown, bg: 'bg-yellow-50', fg: 'text-yellow-600' },
  subject_topper: { icon: Star, bg: 'bg-blue-50', fg: 'text-blue-600' },
  improved_10pct: { icon: TrendingUp, bg: 'bg-green-50', fg: 'text-green-600' },
  perfect_score: { icon: Sparkles, bg: 'bg-purple-50', fg: 'text-purple-600' },
  consistent_high: { icon: Trophy, bg: 'bg-amber-50', fg: 'text-amber-600' },
  comeback: { icon: RefreshCw, bg: 'bg-pink-50', fg: 'text-pink-600' },
};

export function StudentBadgesPage() {
  const { user } = useAuth();

  const { data: student } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: badges, isLoading } = useStudentBadges(student?.id || null);

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
          <Trophy className="h-6 w-6 text-amber-500" />
          My Badges
        </h1>
        <p className="text-muted-foreground">
          Awards earned based on your exam performance.
        </p>
      </div>

      {!badges || badges.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">
              No badges yet — keep at it! Badges are awarded automatically when results are published.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((b) => {
            const style = ICON[b.badge_type] || ICON.consistent_high;
            const Icon = style.icon;
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className={`${style.bg} p-4 flex items-center gap-3`}>
                  <div className={`h-12 w-12 rounded-full ${style.bg} border-2 border-current ${style.fg} flex items-center justify-center`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.awarded_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <CardContent className="p-4 space-y-2">
                  {b.description && <p className="text-sm">{b.description}</p>}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {b.exam_type?.name && (
                      <Badge variant="outline">{b.exam_type.name}</Badge>
                    )}
                    {b.subject?.name && (
                      <Badge variant="outline">{b.subject.name}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
