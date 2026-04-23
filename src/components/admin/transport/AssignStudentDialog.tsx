import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBuses,
  useAllStudentTransport,
  useAssignTransport,
} from '@/hooks/useTransportation';
import { useAllStudents } from '@/hooks/useAdminStats';

export function AssignStudentDialog() {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [busId, setBusId] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [dropPoint, setDropPoint] = useState('');

  const { data: students } = useAllStudents();
  const { data: buses } = useBuses();
  const { data: existing } = useAllStudentTransport();
  const assign = useAssignTransport();

  const assignedStudentIds = useMemo(
    () => new Set(existing?.map((e) => e.student_id) ?? []),
    [existing],
  );

  const unassignedStudents = useMemo(
    () => students?.filter((s) => !assignedStudentIds.has(s.id)) ?? [],
    [students, assignedStudentIds],
  );

  const availableBuses = useMemo(
    () => buses?.filter((b) => b.is_active && b.route_id) ?? [],
    [buses],
  );

  const selectedBus = availableBuses.find((b) => b.id === busId);

  const reset = () => {
    setStudentId('');
    setBusId('');
    setPickupPoint('');
    setDropPoint('');
  };

  const canSubmit = studentId && busId && selectedBus?.route_id && pickupPoint.trim();

  const handleSubmit = async () => {
    if (!canSubmit || !selectedBus?.route_id) return;
    await assign.mutateAsync({
      student_id: studentId,
      bus_id: busId,
      route_id: selectedBus.route_id,
      pickup_point: pickupPoint.trim(),
      drop_point: dropPoint.trim() || undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Assign Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Student to Bus</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Student *</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {unassignedStudents.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    All students already have a transport assignment
                  </div>
                ) : (
                  unassignedStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.profile?.full_name || 'Unnamed'}
                      {s.class ? ` — ${s.class.name} ${s.class.section}` : ''}
                      {s.roll_number ? ` (Roll ${s.roll_number})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bus *</Label>
            <Select value={busId} onValueChange={setBusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bus (must have a route)" />
              </SelectTrigger>
              <SelectContent>
                {availableBuses.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No active buses with routes. Add a bus and assign it a route first.
                  </div>
                ) : (
                  availableBuses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bus_number}
                      {b.route ? ` — ${b.route.route_name}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Point *</Label>
              <Input
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                placeholder="e.g., Green Park Metro"
              />
            </div>
            <div className="space-y-2">
              <Label>Drop Point</Label>
              <Input
                value={dropPoint}
                onChange={(e) => setDropPoint(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit || assign.isPending}
            onClick={handleSubmit}
          >
            {assign.isPending ? 'Assigning...' : 'Assign Student'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
