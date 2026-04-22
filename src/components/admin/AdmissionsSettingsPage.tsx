import { useEffect, useState } from 'react';
import { Loader2, Save, Settings as SettingsIcon, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  useAdmissionsSettings,
  useUpdateAdmissionsSettings,
} from '@/hooks/useAdmissions';

export function AdmissionsSettingsPage() {
  const { data, isLoading } = useAdmissionsSettings();
  const update = useUpdateAdmissionsSettings();

  const [isOpen, setIsOpen] = useState(true);
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [fee, setFee] = useState(0);
  const [instructions, setInstructions] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (!data) return;
    setIsOpen(data.is_open);
    setAcademicYear(data.academic_year);
    setFee(Number(data.application_fee) || 0);
    setInstructions(data.instructions ?? '');
    setContactEmail(data.contact_email ?? '');
  }, [data]);

  const handleSave = () => {
    update.mutate({
      id: data?.id || undefined,
      is_open: isOpen,
      academic_year: academicYear.trim() || '2026-27',
      application_fee: fee,
      instructions: instructions.trim() || null,
      contact_email: contactEmail.trim() || null,
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Admissions Settings
          </h1>
          <p className="text-muted-foreground">
            Configure the public admissions window and information.
          </p>
        </div>
        <a href="/admissions" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View public page
          </Button>
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Admissions open</Label>
              <p className="text-xs text-muted-foreground">
                When off, the public apply page is blocked and shows a "closed" notice.
              </p>
            </div>
            <Switch checked={isOpen} onCheckedChange={setIsOpen} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Academic year</Label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026-27"
              />
            </div>
            <div>
              <Label>Application fee (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Contact email</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="admissions@school.example"
            />
          </div>
          <div>
            <Label>Instructions for applicants</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={6}
              placeholder="Eligibility, required documents, important dates..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Shown on the public admissions landing page above the Apply button.
            </p>
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
          Save settings
        </Button>
      </div>
    </div>
  );
}
