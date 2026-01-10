import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, Clock, Plus, Trash2, Edit2, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClassTimetable, type TimetableSlot } from '@/hooks/useTimetable';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_SLOTS = [
  { number: 1, start: '08:00', end: '08:45' },
  { number: 2, start: '08:45', end: '09:30' },
  { number: 3, start: '09:45', end: '10:30' },
  { number: 4, start: '10:30', end: '11:15' },
  { number: 5, start: '11:30', end: '12:15' },
  { number: 6, start: '12:15', end: '13:00' },
  { number: 7, start: '14:00', end: '14:45' },
  { number: 8, start: '14:45', end: '15:30' },
];

export function TimetableManagement() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [slotForm, setSlotForm] = useState({
    day_of_week: 1,
    slot_number: 1,
    start_time: '08:00',
    end_time: '08:45',
    subject_id: '',
    teacher_id: '',
    room: '',
  });

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch teachers with profiles
  const { data: teachers } = useQuery({
    queryKey: ['teachers-with-profiles'],
    queryFn: async () => {
      // First get all teachers
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id, user_id')
        .order('id');
      if (teacherError) throw teacherError;
      
      if (!teacherData || teacherData.length === 0) return [];
      
      // Then get profiles for those teachers
      const userIds = teacherData.map(t => t.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      if (profileError) throw profileError;
      
      // Merge the data
      return teacherData.map(t => ({
        ...t,
        profile: profileData?.find(p => p.user_id === t.user_id) || null,
      }));
    },
  });

  // Fetch timetable for selected class
  const { data: timetable, isLoading: timetableLoading } = useClassTimetable(selectedClass || null);

  // Add/update slot mutation
  const upsertSlot = useMutation({
    mutationFn: async (slot: typeof slotForm & { id?: string; class_id: string }) => {
      if (slot.id) {
        const { error } = await supabase
          .from('timetable_slots')
          .update({
            day_of_week: slot.day_of_week,
            slot_number: slot.slot_number,
            start_time: slot.start_time,
            end_time: slot.end_time,
            subject_id: slot.subject_id || null,
            teacher_id: slot.teacher_id || null,
            room: slot.room || null,
          })
          .eq('id', slot.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('timetable_slots')
          .insert({
            class_id: slot.class_id,
            day_of_week: slot.day_of_week,
            slot_number: slot.slot_number,
            start_time: slot.start_time,
            end_time: slot.end_time,
            subject_id: slot.subject_id || null,
            teacher_id: slot.teacher_id || null,
            room: slot.room || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-timetable'] });
      toast.success(editingSlot ? 'Slot updated!' : 'Slot added!');
      setIsAddingSlot(false);
      setEditingSlot(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save slot');
    },
  });

  // Delete slot mutation
  const deleteSlot = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from('timetable_slots')
        .delete()
        .eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-timetable'] });
      toast.success('Slot deleted!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete slot');
    },
  });

  const resetForm = () => {
    setSlotForm({
      day_of_week: 1,
      slot_number: 1,
      start_time: '08:00',
      end_time: '08:45',
      subject_id: '',
      teacher_id: '',
      room: '',
    });
  };

  const handleEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotForm({
      day_of_week: slot.day_of_week,
      slot_number: slot.slot_number,
      start_time: slot.start_time,
      end_time: slot.end_time,
      subject_id: slot.subject_id || '',
      teacher_id: slot.teacher_id || '',
      room: slot.room || '',
    });
    setIsAddingSlot(true);
  };

  const handleSaveSlot = () => {
    if (!selectedClass) return;
    upsertSlot.mutate({
      ...slotForm,
      class_id: selectedClass,
      id: editingSlot?.id,
    });
  };

  // Group timetable by day
  const timetableByDay = (timetable || []).reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) acc[slot.day_of_week] = [];
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, TimetableSlot[]>);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Timetable Management</h1>
          <p className="text-muted-foreground">Manage class schedules and teacher assignments</p>
        </div>
      </div>

      {/* Class Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <Label>Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClass && (
              <Dialog open={isAddingSlot} onOpenChange={(open) => {
                setIsAddingSlot(open);
                if (!open) {
                  setEditingSlot(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSlot ? 'Edit Slot' : 'Add Timetable Slot'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Day</Label>
                        <Select 
                          value={slotForm.day_of_week.toString()} 
                          onValueChange={(v) => setSlotForm(prev => ({ ...prev, day_of_week: parseInt(v) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map((day, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Period Number</Label>
                        <Select 
                          value={slotForm.slot_number.toString()} 
                          onValueChange={(v) => {
                            const num = parseInt(v);
                            const defaultSlot = DEFAULT_SLOTS.find(s => s.number === num);
                            setSlotForm(prev => ({ 
                              ...prev, 
                              slot_number: num,
                              start_time: defaultSlot?.start || prev.start_time,
                              end_time: defaultSlot?.end || prev.end_time,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                              <SelectItem key={num} value={num.toString()}>Period {num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Time</Label>
                        <Input 
                          type="time" 
                          value={slotForm.start_time}
                          onChange={(e) => setSlotForm(prev => ({ ...prev, start_time: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input 
                          type="time" 
                          value={slotForm.end_time}
                          onChange={(e) => setSlotForm(prev => ({ ...prev, end_time: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Subject</Label>
                      <Select 
                        value={slotForm.subject_id} 
                        onValueChange={(v) => setSlotForm(prev => ({ ...prev, subject_id: v }))}
                      >
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

                    <div>
                      <Label>Teacher</Label>
                      <Select 
                        value={slotForm.teacher_id} 
                        onValueChange={(v) => setSlotForm(prev => ({ ...prev, teacher_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.profile?.full_name || 'Unknown'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Room (Optional)</Label>
                      <Input 
                        value={slotForm.room}
                        onChange={(e) => setSlotForm(prev => ({ ...prev, room: e.target.value }))}
                        placeholder="e.g., Room 101"
                      />
                    </div>

                    <Button 
                      onClick={handleSaveSlot} 
                      disabled={upsertSlot.isPending}
                      className="w-full"
                    >
                      {upsertSlot.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {editingSlot ? 'Update Slot' : 'Add Slot'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timetable Display */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timetableLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : Object.keys(timetableByDay).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No slots added yet. Click "Add Slot" to create the schedule.
              </div>
            ) : (
              <div className="space-y-6">
                {[1, 2, 3, 4, 5, 6].map((dayNum) => {
                  const daySlots = timetableByDay[dayNum] || [];
                  if (daySlots.length === 0) return null;

                  return (
                    <div key={dayNum}>
                      <h3 className="font-semibold mb-2">{DAYS[dayNum]}</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">Period</TableHead>
                              <TableHead className="w-32">Time</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead>Teacher</TableHead>
                              <TableHead className="w-24">Room</TableHead>
                              <TableHead className="w-24">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {daySlots
                              .sort((a, b) => a.slot_number - b.slot_number)
                              .map((slot) => (
                                <TableRow key={slot.id}>
                                  <TableCell>{slot.slot_number}</TableCell>
                                  <TableCell className="text-sm">
                                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                  </TableCell>
                                  <TableCell>{slot.subject?.name || '-'}</TableCell>
                                  <TableCell>{(slot.teacher as any)?.profile?.full_name || '-'}</TableCell>
                                  <TableCell>{slot.room || '-'}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditSlot(slot)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteSlot.mutate(slot.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
