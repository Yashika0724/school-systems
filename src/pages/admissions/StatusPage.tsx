import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  GraduationCap,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarClock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  useLookupStatus,
  type AdmissionStatus,
  type PublicStatusResult,
} from '@/hooks/useAdmissions';

function statusPresentation(status: AdmissionStatus) {
  switch (status) {
    case 'submitted':
      return {
        label: 'Submitted',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: Clock,
        message: 'Your application is in the queue and will be reviewed soon.',
      };
    case 'under_review':
      return {
        label: 'Under review',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: Clock,
        message: 'The admissions team is reviewing your application.',
      };
    case 'interview_scheduled':
      return {
        label: 'Interview scheduled',
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: CalendarClock,
        message: 'Please check the interview date and time below.',
      };
    case 'approved':
      return {
        label: 'Approved',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
        message:
          'Your application has been approved! The school will share enrollment details shortly.',
      };
    case 'enrolled':
      return {
        label: 'Enrolled',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
        message:
          'Welcome! Your parent and student logins have been created — check your email or contact admin.',
      };
    case 'rejected':
      return {
        label: 'Not accepted',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: XCircle,
        message:
          'Unfortunately this application was not accepted. See review notes below if provided.',
      };
    case 'waitlisted':
      return {
        label: 'Waitlisted',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: Clock,
        message: 'You are on the waitlist. We will reach out if a seat becomes available.',
      };
    case 'withdrawn':
      return {
        label: 'Withdrawn',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: XCircle,
        message: 'This application has been withdrawn.',
      };
  }
}

export default function StatusPage() {
  const [applicationNumber, setApplicationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<PublicStatusResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const lookup = useLookupStatus();

  const handleLookup = () => {
    setNotFound(false);
    setResult(null);
    lookup.mutate(
      { applicationNumber, email },
      {
        onSuccess: (data) => {
          if (data) setResult(data);
          else setNotFound(true);
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/admissions" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold">Check Application Status</span>
          </Link>
          <Link to="/admissions">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-xl py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lookup your application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Application number</Label>
              <Input
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                placeholder="ADM-2026-00001"
              />
            </div>
            <div>
              <Label>Parent email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleLookup}
              disabled={
                lookup.isPending ||
                applicationNumber.trim().length < 4 ||
                !/\S+@\S+\.\S+/.test(email)
              }
            >
              {lookup.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Check status
            </Button>
            {notFound && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>
                  No application found with that number + email. Double-check both values.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {result &&
          (() => {
            const p = statusPresentation(result.status);
            const Icon = p.icon;
            return (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Application</p>
                      <p className="font-mono font-bold text-lg">
                        {result.application_number}
                      </p>
                    </div>
                    <Badge className={p.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {p.label}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Student</p>
                    <p className="font-medium">
                      {result.student_first_name} {result.student_last_name}
                    </p>
                  </div>

                  {result.desired_academic_year && (
                    <div>
                      <p className="text-sm text-muted-foreground">Academic year</p>
                      <p className="font-medium">{result.desired_academic_year}</p>
                    </div>
                  )}

                  <div className="text-sm bg-muted/30 rounded p-3">{p.message}</div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p>{format(new Date(result.submitted_at), 'PPP')}</p>
                    </div>
                    {result.reviewed_at && (
                      <div>
                        <p className="text-muted-foreground">Reviewed</p>
                        <p>{format(new Date(result.reviewed_at), 'PPP')}</p>
                      </div>
                    )}
                    {result.interview_at && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Interview</p>
                        <p className="font-medium">
                          {format(new Date(result.interview_at), 'PPP p')}
                        </p>
                      </div>
                    )}
                  </div>

                  {result.review_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Review notes</p>
                      <p className="text-sm bg-muted/30 rounded p-3 whitespace-pre-wrap">
                        {result.review_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
      </div>
    </div>
  );
}
