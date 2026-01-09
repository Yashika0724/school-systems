import { useState } from 'react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { Calendar, BookOpen, Plus, Edit2, Loader2, Save, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useTeacherSessions, useUpsertSession, type ClassSession } from '@/hooks/useTimetable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function SessionPlanningPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isPlanning, setIsPlanning] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [form, setForm] = useState({
    class_id: '',
    subject_id: '',
    topic: '',
    description: '',
    prerequisites: '',
    resources: '',
    learning_objectives: '',
  });

  const { data: teacherClasses } = useTeacherClasses();
  
  // Get teacher record
  const { data: teacher } = useQuery({
    queryKey: ['teacher-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  const { data: sessions, isLoading } = useTeacherSessions(weekStart, weekEnd);
  const upsertSession = useUpsertSession();

  const resetForm = () => {
    setForm({
      class_id: '',
      subject_id: '',
      topic: '',
      description: '',
      prerequisites: '',
      resources: '',
      learning_objectives: '',
    });
    setEditingSession(null);
  };

  const handleEdit = (session: ClassSession) => {
    setEditingSession(session);
    setForm({
      class_id: session.class_id,
      subject_id: session.subject_id,
      topic: session.topic || '',
      description: session.description || '',
      prerequisites: session.prerequisites || '',
      resources: session.resources || '',
      learning_objectives: session.learning_objectives || '',
    });
    setIsPlanning(true);
  };

  const handleSave = async () => {
    if (!form.class_id || !form.subject_id || !form.topic) {
      toast.error('Please fill in class, subject and topic');
      return;
    }

    if (!teacher) {
      toast.error('Teacher record not found');
      return;
    }

    try {
      await upsertSession.mutateAsync({
        id: editingSession?.id,
        class_id: form.class_id,
        subject_id: form.subject_id,
        teacher_id: teacher.id,
        session_date: format(selectedDate, 'yyyy-MM-dd'),
        topic: form.topic,
        description: form.description || null,
        prerequisites: form.prerequisites || null,
        resources: form.resources || null,
        learning_objectives: form.learning_objectives || null,
        status: 'planned',
      });
      toast.success(editingSession ? 'Session updated!' : 'Session planned!');
      setIsPlanning(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save session');
    }
  };

  // Get unique class-subject combinations
  const classSubjectOptions = teacherClasses?.map(tc => ({
    class_id: tc.class_id,
    subject_id: tc.subject_id,
    label: `${tc.class?.name} - ${tc.class?.section} (${tc.subject?.name})`,
  })) || [];

  // Group sessions by date
  const sessionsByDate = (sessions || []).reduce((acc, session) => {
    if (!acc[session.session_date]) acc[session.session_date] = [];
    acc[session.session_date].push(session);
    return acc;
  }, {} as Record<string, ClassSession[]>);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i)
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Session Planning</h1>
          <p className="text-muted-foreground">Plan your class sessions with topics and resources</p>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Week of {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Dialog open={isPlanning} onOpenChange={(open) => {
              setIsPlanning(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Plan Session
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingSession ? 'Edit Session' : 'Plan a Session'} - {format(selectedDate, 'EEEE, MMM d')}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <Label>Class & Subject</Label>
                    <Select 
                      value={`${form.class_id}|${form.subject_id}`}
                      onValueChange={(v) => {
                        const [class_id, subject_id] = v.split('|');
                        setForm(prev => ({ ...prev, class_id, subject_id }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class and subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {classSubjectOptions.map((opt) => (
                          <SelectItem key={`${opt.class_id}|${opt.subject_id}`} value={`${opt.class_id}|${opt.subject_id}`}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Topic *</Label>
                    <Input 
                      value={form.topic}
                      onChange={(e) => setForm(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="What will you teach?"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief overview of the session..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Prerequisites</Label>
                    <Textarea 
                      value={form.prerequisites}
                      onChange={(e) => setForm(prev => ({ ...prev, prerequisites: e.target.value }))}
                      placeholder="What should students know beforehand?"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Resources / Materials</Label>
                    <Textarea 
                      value={form.resources}
                      onChange={(e) => setForm(prev => ({ ...prev, resources: e.target.value }))}
                      placeholder="Books, links, materials needed..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Learning Objectives</Label>
                    <Textarea 
                      value={form.learning_objectives}
                      onChange={(e) => setForm(prev => ({ ...prev, learning_objectives: e.target.value }))}
                      placeholder="What will students learn?"
                      rows={2}
                    />
                  </div>

                  <Button 
                    onClick={handleSave}
                    disabled={upsertSession.isPending}
                    className="w-full"
                  >
                    {upsertSession.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {editingSession ? 'Update Session' : 'Save Session Plan'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Week View */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySessions = sessionsByDate[dateKey] || [];
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

          return (
            <Card 
              key={dateKey}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'ring-2 ring-primary' : ''
              } ${isToday ? 'bg-primary/5' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{format(day, 'EEE')}</span>
                  <span className={`text-lg ${isToday ? 'text-primary font-bold' : ''}`}>
                    {format(day, 'd')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {isLoading ? (
                  <div className="h-16 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : daySessions.length > 0 ? (
                  <div className="space-y-2">
                    {daySessions.slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        className="p-2 rounded bg-primary/10 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(session);
                        }}
                      >
                        <p className="font-medium truncate">{session.topic}</p>
                        <p className="text-muted-foreground truncate">
                          {session.class?.name} - {session.subject?.name}
                        </p>
                      </div>
                    ))}
                    {daySessions.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{daySessions.length - 3} more
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center text-muted-foreground text-xs">
                    No sessions
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Day Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Sessions for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sessionsByDate[format(selectedDate, 'yyyy-MM-dd')]?.length > 0 ? (
            <div className="space-y-4">
              {sessionsByDate[format(selectedDate, 'yyyy-MM-dd')].map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{session.topic}</h4>
                        <Badge variant="outline">
                          {session.class?.name} - {session.class?.section}
                        </Badge>
                        <Badge variant="secondary">{session.subject?.name}</Badge>
                      </div>
                      
                      {session.description && (
                        <p className="text-sm text-muted-foreground mb-2">{session.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        {session.prerequisites && (
                          <div className="flex items-start gap-1">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Prerequisites:</span>
                              <p className="text-muted-foreground">{session.prerequisites}</p>
                            </div>
                          </div>
                        )}
                        {session.resources && (
                          <div className="flex items-start gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Resources:</span>
                              <p className="text-muted-foreground">{session.resources}</p>
                            </div>
                          </div>
                        )}
                        {session.learning_objectives && (
                          <div className="flex items-start gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Objectives:</span>
                              <p className="text-muted-foreground">{session.learning_objectives}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(session)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sessions planned for this day.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsPlanning(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Plan a Session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
