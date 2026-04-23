import { useState } from 'react';
import { Plus, UserSquare2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateConductor } from '@/hooks/useTransportation';

export function CreateConductorDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    date_of_joining: '',
    emergency_contact: '',
  });
  const create = useCreateConductor();

  const reset = () =>
    setForm({ full_name: '', phone: '', date_of_joining: '', emergency_contact: '' });

  const canSubmit = form.full_name.trim().length > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await create.mutateAsync({
      full_name: form.full_name.trim(),
      phone: form.phone || null,
      date_of_joining: form.date_of_joining || null,
      emergency_contact: form.emergency_contact || null,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Add Conductor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserSquare2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Add New Conductor</DialogTitle>
              <DialogDescription>
                Conductors don't need a login — just name and phone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Full name *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date of joining</Label>
              <Input
                type="date"
                value={form.date_of_joining}
                onChange={(e) => setForm((f) => ({ ...f, date_of_joining: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Emergency contact</Label>
            <Input
              value={form.emergency_contact}
              onChange={(e) => setForm((f) => ({ ...f, emergency_contact: e.target.value }))}
              placeholder="Name + phone"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit || create.isPending}>
              {create.isPending ? 'Adding…' : 'Add Conductor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
