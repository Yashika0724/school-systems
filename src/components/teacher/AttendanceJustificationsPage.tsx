import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Loader2,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import {
  useTeacherPendingJustifications,
  useReviewJustification,
  useJustificationsRealtime,
  type AttendanceJustification,
  type JustificationStatus,
} from '@/hooks/useAttendance';

interface StudentSummary {
  id: string;
  roll_number: string | null;
  class_name: string;
  class_section: string;
  full_name: string;
  avatar_url: string | null;
}

function useStudentSummaries(studentIds: string[]) {
  return useQuery({
    queryKey: ['student-summaries', studentIds.sort().join(',')],
    queryFn: async (): Promise<Record<string, StudentSummary>> => {
      if (studentIds.length === 0) return {};
      const { data: students, error } = await supabase
        .from('students')
        .select(
          'id, user_id, roll_number, class:classes(name, section)',
        )
        .in('id', studentIds);
      if (error) throw error;
      const userIds = (students ?? []).map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const map: Record<string, StudentSummary> = {};
      (students ?? []).forEach((s) => {
        const profile = profiles?.find((p) => p.user_id === s.user_id);
        const cls = Array.isArray(s.class) ? s.class[0] : s.class;
        map[s.id] = {
          id: s.id,
          roll_number: s.roll_number,
          class_name: cls?.name ?? '',
          class_section: cls?.section ?? '',
          full_name: profile?.full_name ?? 'Unknown',
          avatar_url: profile?.avatar_url ?? null,
        };
      });
      return map;
    },
    enabled: studentIds.length > 0,
  });
}

export function AttendanceJustificationsPage() {
  const { data: teacherClasses, isLoading: classesLoading } = useTeacherClasses(true);
  const classIds = useMemo(
    () => (teacherClasses ?? []).map((c) => c.class_id),
    [teacherClasses],
  );

  const { data: justifications, isLoading } = useTeacherPendingJustifications(classIds);
  useJustificationsRealtime(classIds.join(',') || null);

  const studentIds = useMemo(
    () => Array.from(new Set((justifications ?? []).map((j) => j.student_id))),
    [justifications],
  );
  const { data: studentMap } = useStudentSummaries(studentIds);

  const review = useReviewJustification();

  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectTarget, setRejectTarget] = useState<AttendanceJustification | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const filtered = useMemo(() => {
    const list = justifications ?? [];
    if (filter === 'all') return list;
    return list.filter((j) => j.status === filter);
  }, [justifications, filter]);

  const counts = useMemo(() => {
    const list = justifications ?? [];
    return {
      pending: list.filter((j) => j.status === 'pending').length,
      approved: list.filter((j) => j.status === 'approved').length,
      rejected: list.filter((j) => j.status === 'rejected').length,
      all: list.length,
    };
  }, [justifications]);

  const statusBadge = (status: JustificationStatus) => {
    if (status === 'approved') return <Badge className="bg-green-500">Approved</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  const typeBadge = (t: AttendanceJustification['request_type']) => {
    if (t === 'correction')
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          Correction → present
        </Badge>
      );
    return (
      <Badge variant="outline" className="border-blue-500 text-blue-600">
        Excuse → excused
      </Badge>
    );
  };

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacherClasses || teacherClasses.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Classes Assigned</h3>
            <p className="text-muted-foreground">
              You need to be a class teacher to review absence justifications.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Absence Justifications</h1>
        <p className="text-muted-foreground">
          Review excuse requests from students and parents. Approving will mark the day as
          excused automatically.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No {filter === 'all' ? '' : filter} justifications.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((j) => {
                const student = studentMap?.[j.student_id];
                return (
                  <div key={j.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student?.avatar_url || undefined} />
                          <AvatarFallback>
                            {student?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{student?.full_name ?? 'Student'}</p>
                          <p className="text-sm text-muted-foreground">
                            {student?.class_name} {student?.class_section} • Roll{' '}
                            {student?.roll_number || 'N/A'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(j.date), 'EEEE, MMMM d, yyyy')}
                            </span>
                            {typeBadge(j.request_type)}
                            {statusBadge(j.status)}
                          </div>
                          <p className="mt-2 text-sm bg-muted/40 rounded p-2">{j.reason}</p>
                          {j.review_notes && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              <span className="font-medium">Review note:</span> {j.review_notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {j.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={review.isPending}
                            onClick={() =>
                              review.mutate({ id: j.id, status: 'approved' })
                            }
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={review.isPending}
                            onClick={() => {
                              setRejectTarget(j);
                              setRejectNotes('');
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Justification</DialogTitle>
            <DialogDescription>
              Optionally explain why this request is being rejected. The student and parent will
              see your note.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="e.g. No supporting documentation provided."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={review.isPending}
              onClick={() => {
                if (!rejectTarget) return;
                review.mutate(
                  {
                    id: rejectTarget.id,
                    status: 'rejected',
                    reviewNotes: rejectNotes.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      setRejectTarget(null);
                      setRejectNotes('');
                    },
                  },
                );
              }}
            >
              {review.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
