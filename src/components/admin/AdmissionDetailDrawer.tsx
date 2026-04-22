import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle2, Copy, UserPlus, Save, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useUpdateApplication,
  useEnrollApplicant,
  type AdmissionApplication,
  type AdmissionStatus,
} from '@/hooks/useAdmissions';
import { useAllClasses } from '@/hooks/useAdminStats';
import type { EnrollResult } from '@/hooks/useAdmissions';

const STATUS_OPTIONS: AdmissionStatus[] = [
  'submitted',
  'under_review',
  'interview_scheduled',
  'approved',
  'waitlisted',
  'rejected',
  'withdrawn',
];

interface Props {
  application: AdmissionApplication | null;
  onClose: () => void;
}

export function AdmissionDetailDrawer({ application, onClose }: Props) {
  const { data: classes } = useAllClasses();
  const update = useUpdateApplication();
  const enroll = useEnrollApplicant();

  const [status, setStatus] = useState<AdmissionStatus>('submitted');
  const [reviewNotes, setReviewNotes] = useState('');
  const [interviewAt, setInterviewAt] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollClassId, setEnrollClassId] = useState('');
  const [enrollRoll, setEnrollRoll] = useState('');
  const [enrollAdm, setEnrollAdm] = useState('');
  const [enrollCreateParent, setEnrollCreateParent] = useState(true);
  const [enrollResult, setEnrollResult] = useState<EnrollResult | null>(null);

  useEffect(() => {
    if (!application) return;
    setStatus(application.status);
    setReviewNotes(application.review_notes ?? '');
    setInterviewAt(
      application.interview_at
        ? new Date(application.interview_at).toISOString().slice(0, 16)
        : '',
    );
    setInterviewNotes(application.interview_notes ?? '');
    setEnrollClassId(application.desired_class_id ?? '');
    setEnrollRoll('');
    setEnrollAdm(application.application_number);
    setEnrollResult(null);
  }, [application]);

  const handleSave = () => {
    if (!application) return;
    update.mutate({
      id: application.id,
      status,
      review_notes: reviewNotes || null,
      interview_at: interviewAt ? new Date(interviewAt).toISOString() : null,
      interview_notes: interviewNotes || null,
    });
  };

  const handleEnroll = () => {
    if (!application || !enrollClassId) return;
    enroll.mutate(
      {
        applicationId: application.id,
        classId: enrollClassId,
        rollNumber: enrollRoll || undefined,
        admissionNumber: enrollAdm || undefined,
        createParent: enrollCreateParent,
      },
      {
        onSuccess: (data) => {
          setEnrollResult(data);
        },
      },
    );
  };

  return (
    <>
      <Sheet
        open={!!application}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {application && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{application.application_number}</span>
                  <Badge variant="outline" className="capitalize">
                    {application.status.replace('_', ' ')}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Submitted {format(new Date(application.submitted_at), 'PPp')}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section>
                  <h3 className="font-semibold mb-2">Student</h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Kv
                      label="Full name"
                      value={`${application.student_first_name} ${application.student_last_name}`}
                    />
                    <Kv
                      label="Date of birth"
                      value={format(
                        new Date(application.student_date_of_birth + 'T00:00:00'),
                        'PPP',
                      )}
                    />
                    <Kv label="Gender" value={application.student_gender ?? '—'} />
                    <Kv label="Blood group" value={application.student_blood_group ?? '—'} />
                    <Kv label="Nationality" value={application.student_nationality ?? '—'} />
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="font-semibold mb-2">Academic</h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Kv
                      label="Desired class"
                      value={
                        application.desired_class_id
                          ? classes?.find((c) => c.id === application.desired_class_id)?.name ??
                            'Unknown'
                          : 'No preference'
                      }
                    />
                    <Kv
                      label="Academic year"
                      value={application.desired_academic_year ?? '—'}
                    />
                    <Kv label="Previous school" value={application.previous_school ?? '—'} />
                    <Kv label="Previous class" value={application.previous_class ?? '—'} />
                    <Kv
                      label="Previous %"
                      value={
                        application.previous_percentage !== null
                          ? `${application.previous_percentage}%`
                          : '—'
                      }
                    />
                    <Kv label="Previous board" value={application.previous_board ?? '—'} />
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="font-semibold mb-2">Parent/Guardian</h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Kv
                      label="Name"
                      value={`${application.parent_name} (${application.parent_relationship})`}
                    />
                    <Kv label="Email" value={application.parent_email} />
                    <Kv label="Phone" value={application.parent_phone} />
                    <Kv label="Occupation" value={application.parent_occupation ?? '—'} />
                    {application.secondary_parent_name && (
                      <>
                        <Kv label="Secondary name" value={application.secondary_parent_name} />
                        <Kv
                          label="Secondary phone"
                          value={application.secondary_parent_phone ?? '—'}
                        />
                      </>
                    )}
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="font-semibold mb-2">Address</h3>
                  <p className="text-sm whitespace-pre-wrap">
                    {[
                      application.address_line1,
                      application.address_line2,
                      application.city,
                      application.state,
                      application.postal_code,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                </section>

                {application.notes && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="font-semibold mb-2">Applicant notes</h3>
                      <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-3">
                        {application.notes}
                      </p>
                    </section>
                  </>
                )}

                <Separator />

                <section>
                  <h3 className="font-semibold mb-3">Review</h3>
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={status}
                          onValueChange={(v) => setStatus(v as AdmissionStatus)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Interview (optional)</Label>
                        <Input
                          type="datetime-local"
                          value={interviewAt}
                          onChange={(e) => setInterviewAt(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Review notes (visible to applicant on status page)</Label>
                      <Textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Internal interview notes</Label>
                      <Textarea
                        value={interviewNotes}
                        onChange={(e) => setInterviewNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={update.isPending}
                      >
                        {update.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save changes
                      </Button>
                      {interviewAt && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStatus('interview_scheduled');
                          }}
                        >
                          <CalendarClock className="h-4 w-4 mr-2" />
                          Mark as scheduled
                        </Button>
                      )}
                      <Button
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setEnrollOpen(true)}
                        disabled={application.status === 'enrolled'}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {application.status === 'enrolled'
                          ? 'Already enrolled'
                          : 'Approve & enroll'}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Enroll dialog */}
      <Dialog
        open={enrollOpen}
        onOpenChange={(v) => {
          if (!v) {
            setEnrollOpen(false);
            setEnrollResult(null);
          }
        }}
      >
        <DialogContent>
          {!enrollResult ? (
            <>
              <DialogHeader>
                <DialogTitle>Enroll applicant</DialogTitle>
                <DialogDescription>
                  This creates a student account (and optionally a parent account), assigns them
                  to the chosen class, and marks the application as "enrolled".
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label>Class *</Label>
                  <Select value={enrollClassId} onValueChange={setEnrollClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} - {c.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Roll number</Label>
                    <Input
                      value={enrollRoll}
                      onChange={(e) => setEnrollRoll(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label>Admission number</Label>
                    <Input
                      value={enrollAdm}
                      onChange={(e) => setEnrollAdm(e.target.value)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm pt-2">
                  <input
                    type="checkbox"
                    checked={enrollCreateParent}
                    onChange={(e) => setEnrollCreateParent(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Also create parent account + link to student
                </label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEnrollOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleEnroll}
                  disabled={!enrollClassId || enroll.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {enroll.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Enroll now
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Enrolled successfully
                </DialogTitle>
                <DialogDescription>
                  Save or share these credentials. They won't be shown again.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <CredentialCard
                  title="Student login"
                  email={enrollResult.studentCredentials.email}
                  password={enrollResult.studentCredentials.password}
                />
                {enrollResult.parentCredentials ? (
                  <CredentialCard
                    title="Parent login"
                    email={enrollResult.parentCredentials.email}
                    password={enrollResult.parentCredentials.password}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No parent account was created (either reused an existing one or creation
                    was skipped).
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setEnrollOpen(false);
                    setEnrollResult(null);
                    onClose();
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}

function CredentialCard({
  title,
  email,
  password,
}: {
  title: string;
  email: string;
  password: string;
}) {
  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success('Copied');
  };
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="flex items-center justify-between gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="font-mono break-all">{email}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => copy(email)}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Password</p>
          <p className="font-mono">{password}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => copy(password)}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
