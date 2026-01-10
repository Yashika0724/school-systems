import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Trash2, Edit2, Loader2, CalendarDays, Clock, GraduationCap } from 'lucide-react';
import { useExamTypes, useCreateExamType, useDeleteExamType, useExams, useCreateExam, useDeleteExam } from '@/hooks/useExams';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function ExamManagement() {
  const { data: examTypes, isLoading: typesLoading } = useExamTypes();
  const { data: exams, isLoading: examsLoading } = useExams();
  const createExamType = useCreateExamType();
  const deleteExamType = useDeleteExamType();
  const createExam = useCreateExam();
  const deleteExam = useDeleteExam();

  // Fetch classes and subjects
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').order('name');
      return data || [];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('*').order('name');
      return data || [];
    },
  });

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [newType, setNewType] = useState({ name: '', description: '', weightage: 100 });
  const [newExam, setNewExam] = useState({
    exam_type_id: '',
    class_id: '',
    subject_id: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    room: '',
    max_marks: 100,
  });

  const handleCreateType = async () => {
    if (!newType.name.trim()) return;
    await createExamType.mutateAsync(newType);
    setTypeDialogOpen(false);
    setNewType({ name: '', description: '', weightage: 100 });
  };

  const handleCreateExam = async () => {
    if (!newExam.exam_type_id || !newExam.class_id || !newExam.subject_id || !newExam.exam_date) return;
    await createExam.mutateAsync(newExam);
    setExamDialogOpen(false);
    setNewExam({
      exam_type_id: '',
      class_id: '',
      subject_id: '',
      exam_date: '',
      start_time: '',
      end_time: '',
      room: '',
      max_marks: 100,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-100 text-blue-800">Ongoing</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Scheduled</Badge>;
    }
  };

  const upcomingExams = exams?.filter(e => new Date(e.exam_date) >= new Date()) || [];
  const pastExams = exams?.filter(e => new Date(e.exam_date) < new Date()) || [];

  if (typesLoading || examsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exam Management</h1>
        <p className="text-muted-foreground">Manage exam types, schedules, and results</p>
      </div>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList>
          <TabsTrigger value="schedule">Exam Schedule</TabsTrigger>
          <TabsTrigger value="types">Exam Types</TabsTrigger>
        </TabsList>

        {/* Exam Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Exam
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Schedule New Exam</DialogTitle>
                  <DialogDescription>Create a new exam for a class</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Exam Type *</Label>
                    <Select value={newExam.exam_type_id} onValueChange={(v) => setNewExam(p => ({ ...p, exam_type_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select exam type" />
                      </SelectTrigger>
                      <SelectContent>
                        {examTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Class *</Label>
                      <Select value={newExam.class_id} onValueChange={(v) => setNewExam(p => ({ ...p, class_id: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes?.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.section}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Select value={newExam.subject_id} onValueChange={(v) => setNewExam(p => ({ ...p, subject_id: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects?.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Date *</Label>
                    <Input 
                      type="date" 
                      value={newExam.exam_date} 
                      onChange={(e) => setNewExam(p => ({ ...p, exam_date: e.target.value }))} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input 
                        type="time" 
                        value={newExam.start_time} 
                        onChange={(e) => setNewExam(p => ({ ...p, start_time: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input 
                        type="time" 
                        value={newExam.end_time} 
                        onChange={(e) => setNewExam(p => ({ ...p, end_time: e.target.value }))} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Room</Label>
                      <Input 
                        value={newExam.room} 
                        onChange={(e) => setNewExam(p => ({ ...p, room: e.target.value }))}
                        placeholder="e.g., Room 101"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Marks</Label>
                      <Input 
                        type="number"
                        value={newExam.max_marks} 
                        onChange={(e) => setNewExam(p => ({ ...p, max_marks: parseInt(e.target.value) || 100 }))} 
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreateExam} disabled={createExam.isPending}>
                    {createExam.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Schedule Exam
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Upcoming Exams */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-500" />
                Upcoming Exams
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingExams.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No upcoming exams scheduled</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Exam Type</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingExams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell>{format(new Date(exam.exam_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{exam.exam_type?.name}</TableCell>
                        <TableCell>{exam.class?.name} {exam.class?.section}</TableCell>
                        <TableCell>{exam.subject?.name}</TableCell>
                        <TableCell>{exam.start_time ? `${exam.start_time} - ${exam.end_time}` : '-'}</TableCell>
                        <TableCell>{exam.room || '-'}</TableCell>
                        <TableCell>{getStatusBadge(exam.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteExam.mutate(exam.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Past Exams */}
          {pastExams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-green-500" />
                  Past Exams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Exam Type</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Max Marks</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastExams.slice(0, 10).map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell>{format(new Date(exam.exam_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{exam.exam_type?.name}</TableCell>
                        <TableCell>{exam.class?.name} {exam.class?.section}</TableCell>
                        <TableCell>{exam.subject?.name}</TableCell>
                        <TableCell>{exam.max_marks}</TableCell>
                        <TableCell>{getStatusBadge(exam.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Exam Types Tab */}
        <TabsContent value="types" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exam Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Exam Type</DialogTitle>
                  <DialogDescription>Define a new type of examination</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newType.name}
                      onChange={(e) => setNewType(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Mid-Term Exam"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newType.description}
                      onChange={(e) => setNewType(p => ({ ...p, description: e.target.value }))}
                      placeholder="Optional description..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weightage (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newType.weightage}
                      onChange={(e) => setNewType(p => ({ ...p, weightage: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <Button className="w-full" onClick={handleCreateType} disabled={createExamType.isPending}>
                    {createExamType.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Exam Type
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examTypes?.map((type) => (
              <Card key={type.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <CardDescription>{type.description || 'No description'}</CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteExamType.mutate(type.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Weightage</span>
                    <Badge variant="secondary">{type.weightage || 100}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!examTypes || examTypes.length === 0) && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No exam types defined yet</p>
                <p className="text-sm">Create exam types like Unit Test, Mid-Term, Final Exam, etc.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
