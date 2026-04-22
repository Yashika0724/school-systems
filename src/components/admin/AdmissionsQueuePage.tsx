import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ClipboardList,
  Loader2,
  Search,
  Users,
  CalendarClock,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdmissionDetailDrawer } from '@/components/admin/AdmissionDetailDrawer';
import {
  useAdminApplications,
  type AdmissionApplication,
  type AdmissionStatus,
} from '@/hooks/useAdmissions';

const TABS: Array<{ value: AdmissionStatus | 'all'; label: string }> = [
  { value: 'submitted', label: 'New' },
  { value: 'under_review', label: 'Under review' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'approved', label: 'Approved' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'all', label: 'All' },
];

function statusBadge(status: AdmissionStatus) {
  const map: Record<AdmissionStatus, { className: string; label: string; icon: typeof Clock }> = {
    submitted: { className: 'bg-blue-100 text-blue-700', label: 'New', icon: Clock },
    under_review: { className: 'bg-amber-100 text-amber-700', label: 'Under review', icon: Clock },
    interview_scheduled: {
      className: 'bg-purple-100 text-purple-700',
      label: 'Interview',
      icon: CalendarClock,
    },
    approved: { className: 'bg-emerald-100 text-emerald-700', label: 'Approved', icon: CheckCircle2 },
    rejected: { className: 'bg-red-100 text-red-700', label: 'Rejected', icon: XCircle },
    waitlisted: { className: 'bg-orange-100 text-orange-700', label: 'Waitlisted', icon: Clock },
    enrolled: { className: 'bg-emerald-500 text-white', label: 'Enrolled', icon: CheckCircle2 },
    withdrawn: { className: 'bg-gray-200 text-gray-700', label: 'Withdrawn', icon: XCircle },
  };
  const p = map[status];
  const Icon = p.icon;
  return (
    <Badge className={p.className}>
      <Icon className="h-3 w-3 mr-1" />
      {p.label}
    </Badge>
  );
}

export function AdmissionsQueuePage() {
  const [filter, setFilter] = useState<AdmissionStatus | 'all'>('submitted');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdmissionApplication | null>(null);
  const { data: all, isLoading } = useAdminApplications('all');

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: 0 };
    TABS.forEach((t) => (base[t.value] = 0));
    (all ?? []).forEach((a) => {
      base.all += 1;
      base[a.status] = (base[a.status] ?? 0) + 1;
    });
    return base;
  }, [all]);

  const filtered = useMemo(() => {
    let rows = all ?? [];
    if (filter !== 'all') rows = rows.filter((a) => a.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.application_number.toLowerCase().includes(q) ||
          `${a.student_first_name} ${a.student_last_name}`.toLowerCase().includes(q) ||
          a.parent_name.toLowerCase().includes(q) ||
          a.parent_email.toLowerCase().includes(q) ||
          a.parent_phone.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [all, filter, search]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Admissions Queue
        </h1>
        <p className="text-muted-foreground">
          Review new applications, schedule interviews, and enroll approved applicants.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total applications</p>
              <p className="text-xl font-bold">{counts.all}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Pending review</p>
              <p className="text-xl font-bold">
                {(counts.submitted ?? 0) + (counts.under_review ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Approved (not yet enrolled)</p>
              <p className="text-xl font-bold">{counts.approved ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-xs text-muted-foreground">Enrolled</p>
              <p className="text-xl font-bold">{counts.enrolled ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as AdmissionStatus | 'all')}
          className="flex-1"
        >
          <TabsList className="flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label} ({counts[t.value] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Name, number, email, phone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-2" />
              No applications in this view.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelected(app)}
                  className="w-full text-left p-4 rounded-lg border hover:bg-muted/40 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-mono text-sm font-semibold">
                        {app.application_number}
                      </p>
                      {statusBadge(app.status)}
                    </div>
                    <p className="font-medium mt-1 truncate">
                      {app.student_first_name} {app.student_last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {app.parent_name} • {app.parent_email} • {app.parent_phone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {format(new Date(app.submitted_at), 'PPp')}
                      {app.desired_academic_year && ` • ${app.desired_academic_year}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdmissionDetailDrawer
        application={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
