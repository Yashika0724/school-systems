import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, School, Calendar, Phone, Mail, Palette, Save, Loader2, Clock } from 'lucide-react';
import { useSchoolSettings, useUpdateSettings } from '@/hooks/useSettings';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function SystemSettings() {
  const { data: settings, isLoading } = useSchoolSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState({
    school_name: '',
    school_phone: '',
    school_email: '',
    academic_year: '',
    attendance_time: '',
    working_days: [] as string[],
    grading_system: {} as Record<string, number>,
  });

  useEffect(() => {
    if (settings) {
      const getSettingValue = (key: string, defaultValue: any) => {
        const setting = settings.find(s => s.setting_key === key);
        return setting?.setting_value ?? defaultValue;
      };

      setForm({
        school_name: getSettingValue('school_name', ''),
        school_phone: getSettingValue('school_phone', ''),
        school_email: getSettingValue('school_email', ''),
        academic_year: getSettingValue('academic_year', ''),
        attendance_time: getSettingValue('attendance_time', '09:00'),
        working_days: getSettingValue('working_days', []),
        grading_system: getSettingValue('grading_system', {}),
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync([
      { key: 'school_name', value: form.school_name },
      { key: 'school_phone', value: form.school_phone },
      { key: 'school_email', value: form.school_email },
      { key: 'academic_year', value: form.academic_year },
      { key: 'attendance_time', value: form.attendance_time },
      { key: 'working_days', value: form.working_days },
      { key: 'grading_system', value: form.grading_system },
    ]);
  };

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }));
  };

  const updateGrade = (grade: string, value: number) => {
    setForm(prev => ({
      ...prev,
      grading_system: { ...prev.grading_system, [grade]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure school information and academic settings</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                School Information
              </CardTitle>
              <CardDescription>Basic details about your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input
                    value={form.school_name}
                    onChange={(e) => setForm(prev => ({ ...prev, school_name: e.target.value }))}
                    placeholder="Enter school name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    value={form.academic_year}
                    onChange={(e) => setForm(prev => ({ ...prev, academic_year: e.target.value }))}
                    placeholder="e.g., 2024-25"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>School contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={form.school_phone}
                    onChange={(e) => setForm(prev => ({ ...prev, school_phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={form.school_email}
                    onChange={(e) => setForm(prev => ({ ...prev, school_email: e.target.value }))}
                    placeholder="school@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attendance Settings
              </CardTitle>
              <CardDescription>Configure attendance timing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Attendance Time</Label>
                <Input
                  type="time"
                  value={form.attendance_time}
                  onChange={(e) => setForm(prev => ({ ...prev, attendance_time: e.target.value }))}
                  className="w-40"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Working Days
              </CardTitle>
              <CardDescription>Select the days your school operates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={form.working_days.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <Label htmlFor={day} className="font-normal">{day}</Label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Selected: {form.working_days.length} days per week
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Grading System
              </CardTitle>
              <CardDescription>Define grade thresholds (minimum percentage for each grade)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(form.grading_system)
                  .sort(([, a], [, b]) => b - a)
                  .map(([grade, minScore]) => (
                    <div key={grade} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Badge variant="outline">{grade}</Badge>
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={minScore}
                          onChange={(e) => updateGrade(grade, parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Grade Preview</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(form.grading_system)
                    .sort(([, a], [, b]) => b - a)
                    .map(([grade, minScore], index, arr) => {
                      const maxScore = index === 0 ? 100 : arr[index - 1][1] - 1;
                      return (
                        <Badge key={grade} variant="secondary">
                          {grade}: {minScore}% - {maxScore}%
                        </Badge>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
