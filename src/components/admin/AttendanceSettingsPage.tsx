import { useEffect, useState } from 'react';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useAttendanceSettings,
  useUpdateAttendanceSettings,
} from '@/hooks/useAttendanceSettings';

export function AttendanceSettingsPage() {
  const { data, isLoading } = useAttendanceSettings();
  const update = useUpdateAttendanceSettings();

  const [minPct, setMinPct] = useState(75);
  const [enforce, setEnforce] = useState(false);
  const [notify, setNotify] = useState(true);
  const [lateAsPresent, setLateAsPresent] = useState(true);
  const [excludeWeekends, setExcludeWeekends] = useState(true);

  useEffect(() => {
    if (!data) return;
    setMinPct(data.min_attendance_percent);
    setEnforce(data.enforce_exam_eligibility);
    setNotify(data.notify_parents_on_absence);
    setLateAsPresent(data.late_counts_as_present);
    setExcludeWeekends(data.exclude_weekends);
  }, [data]);

  const handleSave = () => {
    update.mutate({
      id: data?.id || undefined,
      min_attendance_percent: Math.max(0, Math.min(100, minPct)),
      enforce_exam_eligibility: enforce,
      notify_parents_on_absence: notify,
      late_counts_as_present: lateAsPresent,
      exclude_weekends: excludeWeekends,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Attendance Settings
        </h1>
        <p className="text-muted-foreground">
          These settings apply across all classes and roles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eligibility Threshold</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="min-pct">Minimum attendance percentage</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="min-pct"
                type="number"
                min={0}
                max={100}
                value={minPct}
                onChange={(e) => setMinPct(Number(e.target.value) || 0)}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">
                Students below this are shown an alert. Common values: 75, 60, 55.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">
                Block exam/hall-ticket access when below threshold
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, student exam actions surface an "ineligible" state until % recovers.
              </p>
            </div>
            <Switch checked={enforce} onCheckedChange={setEnforce} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calculation Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Late counts as present</Label>
              <p className="text-xs text-muted-foreground">
                If off, late arrivals are excluded from the attendance %.
              </p>
            </div>
            <Switch checked={lateAsPresent} onCheckedChange={setLateAsPresent} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Exclude weekends</Label>
              <p className="text-xs text-muted-foreground">
                Saturdays and Sundays skipped from the denominator.
              </p>
            </div>
            <Switch checked={excludeWeekends} onCheckedChange={setExcludeWeekends} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Notify parents on absence</Label>
              <p className="text-xs text-muted-foreground">
                Sends an in-app message to each linked parent when a child is marked absent.
              </p>
            </div>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={update.isPending} size="lg">
          {update.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
