import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useAdmissionsSettings,
  usePublicClasses,
  useSubmitApplication,
  type SubmitApplicationInput,
} from '@/hooks/useAdmissions';

const steps = [
  { key: 'student', label: 'Student' },
  { key: 'academic', label: 'Academic' },
  { key: 'parent', label: 'Parent' },
  { key: 'address', label: 'Address' },
  { key: 'review', label: 'Review' },
] as const;

type StepKey = (typeof steps)[number]['key'];

const NO_PREFERENCE = '__none__';

function emptyForm(): SubmitApplicationInput {
  return {
    student_first_name: '',
    student_last_name: '',
    student_date_of_birth: '',
    student_gender: '',
    student_blood_group: '',
    student_nationality: '',
    previous_school: '',
    previous_class: '',
    previous_percentage: null,
    previous_board: '',
    desired_class_id: null,
    desired_academic_year: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    parent_relationship: 'parent',
    parent_occupation: '',
    secondary_parent_name: '',
    secondary_parent_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    notes: '',
  };
}

export default function ApplyPage() {
  const navigate = useNavigate();
  const { data: settings, isLoading: settingsLoading } = useAdmissionsSettings();
  const { data: classes } = usePublicClasses();
  const submit = useSubmitApplication();

  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<SubmitApplicationInput>(() => emptyForm());
  const [submittedNumber, setSubmittedNumber] = useState<string | null>(null);

  const set = <K extends keyof SubmitApplicationInput>(
    key: K,
    value: SubmitApplicationInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const currentStep: StepKey = steps[stepIdx].key;

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case 'student':
        return (
          form.student_first_name.trim().length > 0 &&
          form.student_last_name.trim().length > 0 &&
          !!form.student_date_of_birth
        );
      case 'academic':
        return true;
      case 'parent':
        return (
          form.parent_name.trim().length > 0 &&
          /\S+@\S+\.\S+/.test(form.parent_email) &&
          form.parent_phone.trim().length >= 7
        );
      case 'address':
      case 'review':
        return true;
    }
  }, [currentStep, form]);

  const handleSubmit = async () => {
    if (!settings?.is_open) {
      toast.error('Admissions are currently closed.');
      return;
    }
    const payload: SubmitApplicationInput = {
      ...form,
      desired_academic_year: form.desired_academic_year || settings.academic_year,
      previous_percentage:
        form.previous_percentage === null || Number.isNaN(Number(form.previous_percentage))
          ? null
          : Number(form.previous_percentage),
      desired_class_id: form.desired_class_id ?? null,
    };
    submit.mutate(payload, {
      onSuccess: (data) => {
        setSubmittedNumber(data.application_number);
        toast.success('Application submitted');
      },
    });
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!settings?.is_open) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
            <h1 className="text-xl font-bold">Applications are closed</h1>
            <p className="text-sm text-muted-foreground">
              Please check back later or contact the school for more information.
            </p>
            <Link to="/">
              <Button variant="outline" className="mt-2">
                Back to home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submittedNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-emerald-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Application received</h1>
            <p className="text-sm text-muted-foreground">
              Save this application number — you'll need it with your parent email to check
              your status.
            </p>
            <div className="flex items-center justify-center gap-2 bg-muted/40 rounded-lg p-3">
              <span className="font-mono text-lg font-semibold">{submittedNumber}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(submittedNumber);
                  toast.success('Copied');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 pt-2">
              <Link to="/admissions/status" className="flex-1">
                <Button variant="outline" className="w-full">
                  Check status
                </Button>
              </Link>
              <Link to="/" className="flex-1">
                <Button className="w-full">Done</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/admissions" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold">Apply for Admission</span>
          </Link>
          <Link to="/admissions">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl py-8 space-y-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div
                className={
                  'h-8 w-8 rounded-full text-xs font-semibold flex items-center justify-center ' +
                  (i < stepIdx
                    ? 'bg-emerald-500 text-white'
                    : i === stepIdx
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground')
                }
              >
                {i < stepIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={
                  'text-xs font-medium hidden sm:inline ' +
                  (i === stepIdx ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px bg-border mx-1 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[stepIdx].label} details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 'student' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>First name *</Label>
                    <Input
                      value={form.student_first_name}
                      onChange={(e) => set('student_first_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Last name *</Label>
                    <Input
                      value={form.student_last_name}
                      onChange={(e) => set('student_last_name', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Date of birth *</Label>
                    <Input
                      type="date"
                      value={form.student_date_of_birth}
                      onChange={(e) => set('student_date_of_birth', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={form.student_gender || ''}
                      onValueChange={(v) => set('student_gender', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Blood group</Label>
                    <Input
                      value={form.student_blood_group ?? ''}
                      onChange={(e) => set('student_blood_group', e.target.value)}
                      placeholder="e.g. O+"
                    />
                  </div>
                  <div>
                    <Label>Nationality</Label>
                    <Input
                      value={form.student_nationality ?? ''}
                      onChange={(e) => set('student_nationality', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {currentStep === 'academic' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Desired class</Label>
                    <Select
                      value={form.desired_class_id ?? NO_PREFERENCE}
                      onValueChange={(v) =>
                        set('desired_class_id', v === NO_PREFERENCE ? null : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PREFERENCE}>No preference</SelectItem>
                        {classes?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} - {c.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Academic year</Label>
                    <Input
                      value={form.desired_academic_year ?? settings.academic_year}
                      onChange={(e) => set('desired_academic_year', e.target.value)}
                      placeholder={settings.academic_year}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Previous school</Label>
                    <Input
                      value={form.previous_school ?? ''}
                      onChange={(e) => set('previous_school', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Previous class</Label>
                    <Input
                      value={form.previous_class ?? ''}
                      onChange={(e) => set('previous_class', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Previous percentage</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={
                        form.previous_percentage === null ||
                        form.previous_percentage === undefined
                          ? ''
                          : form.previous_percentage
                      }
                      onChange={(e) =>
                        set(
                          'previous_percentage',
                          e.target.value === '' ? null : Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Previous board</Label>
                    <Input
                      value={form.previous_board ?? ''}
                      onChange={(e) => set('previous_board', e.target.value)}
                      placeholder="CBSE / ICSE / State / Other"
                    />
                  </div>
                </div>
              </>
            )}

            {currentStep === 'parent' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Parent/Guardian name *</Label>
                    <Input
                      value={form.parent_name}
                      onChange={(e) => set('parent_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Select
                      value={form.parent_relationship ?? 'parent'}
                      onValueChange={(v) => set('parent_relationship', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={form.parent_email}
                      onChange={(e) => set('parent_email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      value={form.parent_phone}
                      onChange={(e) => set('parent_phone', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Occupation</Label>
                  <Input
                    value={form.parent_occupation ?? ''}
                    onChange={(e) => set('parent_occupation', e.target.value)}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Secondary parent/guardian name</Label>
                    <Input
                      value={form.secondary_parent_name ?? ''}
                      onChange={(e) => set('secondary_parent_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Secondary phone</Label>
                    <Input
                      value={form.secondary_parent_phone ?? ''}
                      onChange={(e) => set('secondary_parent_phone', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {currentStep === 'address' && (
              <>
                <div>
                  <Label>Address line 1</Label>
                  <Input
                    value={form.address_line1 ?? ''}
                    onChange={(e) => set('address_line1', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Address line 2</Label>
                  <Input
                    value={form.address_line2 ?? ''}
                    onChange={(e) => set('address_line2', e.target.value)}
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={form.city ?? ''}
                      onChange={(e) => set('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={form.state ?? ''}
                      onChange={(e) => set('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Postal code</Label>
                    <Input
                      value={form.postal_code ?? ''}
                      onChange={(e) => set('postal_code', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Additional notes</Label>
                  <Textarea
                    value={form.notes ?? ''}
                    onChange={(e) => set('notes', e.target.value)}
                    rows={3}
                    placeholder="Anything else you'd like us to know (siblings enrolled, special needs, etc.)"
                  />
                </div>
              </>
            )}

            {currentStep === 'review' && (
              <div className="space-y-4 text-sm">
                <Alert>
                  <AlertTitle>Review your application</AlertTitle>
                  <AlertDescription>
                    Please double-check everything below. After submission you can still check
                    status, but you won't be able to edit from the public site — contact admin
                    to make changes.
                  </AlertDescription>
                </Alert>

                <ReviewRow
                  label="Student"
                  value={`${form.student_first_name} ${form.student_last_name} — ${
                    form.student_date_of_birth || '?'
                  }${form.student_gender ? ` • ${form.student_gender}` : ''}`}
                />
                <ReviewRow
                  label="Desired class"
                  value={
                    form.desired_class_id
                      ? classes?.find((c) => c.id === form.desired_class_id)?.name ?? '?'
                      : 'No preference'
                  }
                />
                <ReviewRow
                  label="Academic year"
                  value={form.desired_academic_year || settings.academic_year}
                />
                <ReviewRow
                  label="Previous school"
                  value={form.previous_school || '—'}
                />
                <ReviewRow
                  label="Parent"
                  value={`${form.parent_name} (${form.parent_relationship}) — ${form.parent_email} • ${form.parent_phone}`}
                />
                <ReviewRow
                  label="Address"
                  value={
                    [form.address_line1, form.address_line2, form.city, form.state, form.postal_code]
                      .filter(Boolean)
                      .join(', ') || '—'
                  }
                />
                {form.notes && <ReviewRow label="Notes" value={form.notes} />}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
            disabled={stepIdx === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          {stepIdx < steps.length - 1 ? (
            <Button
              onClick={() => setStepIdx((s) => Math.min(steps.length - 1, s + 1))}
              disabled={!canContinue}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit application
            </Button>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground pb-6">
          Already applied?{' '}
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => navigate('/admissions/status')}
          >
            Check status →
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 p-2 rounded bg-muted/30">
      <span className="font-medium w-40 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 break-words">{value}</span>
    </div>
  );
}
