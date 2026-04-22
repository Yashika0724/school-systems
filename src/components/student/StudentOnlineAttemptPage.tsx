import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Clock, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  rpcStartAttempt,
  rpcSaveAnswer,
  rpcSubmitAttempt,
  rpcLogProctorEvent,
} from '@/hooks/useOnlineExam';

interface AttemptQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'short';
  text: string;
  options?: { key: string; text: string }[];
  marks: number;
  display_order: number;
}

interface AttemptSession {
  attempt_id: string;
  duration_minutes: number;
  shuffle_questions: boolean;
  started_at: string;
  questions: AttemptQuestion[];
  saved_answers: Record<string, unknown>;
}

export function StudentOnlineAttemptPage() {
  const { onlineExamId } = useParams<{ onlineExamId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<AttemptSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ score: number; max_score: number } | null>(null);

  const submittedRef = useRef(false);

  // Start / resume attempt on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!onlineExamId) return;
      try {
        const data = (await rpcStartAttempt(onlineExamId)) as AttemptSession;
        if (cancelled) return;
        const qs = data.shuffle_questions
          ? [...data.questions].sort(() => Math.random() - 0.5)
          : data.questions;
        setSession({ ...data, questions: qs });
        setAnswers(data.saved_answers || {});

        // Initialize countdown
        const started = new Date(data.started_at).getTime();
        const total = data.duration_minutes * 60;
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setRemainingSec(Math.max(total - elapsed, 0));
      } catch (e: any) {
        setError(e.message || 'Failed to start attempt');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onlineExamId]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (!session || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const res = await rpcSubmitAttempt(session.attempt_id, auto);
        setResult(res);
        if (auto) toast.warning('Time up — attempt auto-submitted');
        else toast.success('Attempt submitted');
      } catch (e: any) {
        submittedRef.current = false;
        toast.error(e.message || 'Submit failed');
      } finally {
        setSubmitting(false);
        setConfirmOpen(false);
      }
    },
    [session],
  );

  // Timer
  useEffect(() => {
    if (remainingSec === null || result) return;
    if (remainingSec <= 0) {
      submit(true);
      return;
    }
    const t = setInterval(() => {
      setRemainingSec((s) => (s !== null ? s - 1 : null));
    }, 1000);
    return () => clearInterval(t);
  }, [remainingSec, result, submit]);

  // Anti-cheat: log tab switches, warn the student
  useEffect(() => {
    if (!session || result) return;
    const onBlur = () => {
      rpcLogProctorEvent(session.attempt_id, 'tab_switch').catch(() => {});
      toast.warning('Tab switch detected — this has been logged.');
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      rpcLogProctorEvent(session.attempt_id, 'copy_paste', { type: e.type }).catch(
        () => {},
      );
    };
    const preventContext = (e: MouseEvent) => {
      e.preventDefault();
      rpcLogProctorEvent(session.attempt_id, 'right_click').catch(() => {});
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventCopy);
    document.addEventListener('contextmenu', preventContext);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventCopy);
      document.removeEventListener('contextmenu', preventContext);
    };
  }, [session, result]);

  const setAnswer = async (questionId: string, value: unknown) => {
    if (!session) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    try {
      await rpcSaveAnswer(session.attempt_id, questionId, value as never);
    } catch (e: any) {
      toast.error('Autosave failed: ' + e.message);
    }
  };

  const answeredCount = useMemo(
    () =>
      session
        ? session.questions.filter((q) => answers[q.id] !== undefined).length
        : 0,
    [session, answers],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="font-semibold text-lg">Cannot start attempt</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/student/online-exams')}>Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    const pct = result.max_score > 0 ? (result.score / result.max_score) * 100 : 0;
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Attempt Submitted</h2>
            <div>
              <p className="text-4xl font-bold">
                {result.score}/{result.max_score}
              </p>
              <p className="text-muted-foreground">{pct.toFixed(1)}%</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your teacher will moderate and publish final results.
            </p>
            <Button onClick={() => navigate('/student/online-exams')}>
              Back to Exams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) return null;

  const current = session.questions[currentIdx];
  const mins = Math.floor((remainingSec || 0) / 60);
  const secs = (remainingSec || 0) % 60;
  const timeLow = (remainingSec || 0) < 120;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Online Exam</h1>
          <p className="text-xs text-muted-foreground">
            {answeredCount}/{session.questions.length} answered
          </p>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 border',
            timeLow
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-blue-50 border-blue-300 text-blue-700',
          )}
        >
          <Clock className="h-5 w-5" />
          <span className="font-mono text-xl font-bold">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4">
        {/* Question panel */}
        <Card className="select-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                Question {currentIdx + 1} of {session.questions.length}
              </span>
              <Badge variant="outline">{current.marks} mk</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">{current.text}</p>

            {current.type === 'mcq' && current.options && (
              <div className="space-y-2">
                {current.options.map((opt) => {
                  const selected = answers[current.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      className={cn(
                        'w-full text-left p-3 rounded border transition-colors',
                        selected
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/40',
                      )}
                      onClick={() => setAnswer(current.id, opt.key)}
                    >
                      <span className="font-semibold mr-2">{opt.key}.</span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {current.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-3">
                {['true', 'false'].map((v) => (
                  <button
                    key={v}
                    className={cn(
                      'p-3 rounded border font-medium capitalize',
                      answers[current.id] === v
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/40',
                    )}
                    onClick={() => setAnswer(current.id, v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {current.type === 'short' && (
              <textarea
                className="w-full rounded border p-2"
                rows={3}
                value={(answers[current.id] as string) || ''}
                onChange={(e) => setAnswer(current.id, e.target.value)}
                placeholder="Your answer"
              />
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentIdx((i) => Math.max(i - 1, 0))}
                disabled={currentIdx === 0}
              >
                Previous
              </Button>
              {currentIdx < session.questions.length - 1 ? (
                <Button onClick={() => setCurrentIdx((i) => i + 1)}>Next</Button>
              ) : (
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Finish &amp; Submit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {session.questions.map((q, i) => (
                <button
                  key={q.id}
                  className={cn(
                    'h-9 rounded border text-sm font-medium',
                    i === currentIdx && 'ring-2 ring-primary',
                    answers[q.id] !== undefined
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'hover:bg-muted/40',
                  )}
                  onClick={() => setCurrentIdx(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => setConfirmOpen(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Now
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              You've answered {answeredCount} of {session.questions.length} questions. After
              submitting you won't be able to change your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit(false)} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
