import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type Conductor, useUpdateConductor } from '@/hooks/useTransportation';

interface EditConductorDialogProps {
  conductor: Conductor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditConductorDialog({ conductor, open, onOpenChange }: EditConductorDialogProps) {
  const update = useUpdateConductor();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    date_of_joining: '',
    emergency_contact: '',
    is_active: true,
  });

  useEffect(() => {
    if (!conductor) return;
    setForm({
      full_name: conductor.full_name,
      phone: conductor.phone ?? '',
      date_of_joining: conductor.date_of_joining ?? '',
      emergency_contact: conductor.emergency_contact ?? '',
      is_active: conductor.is_active,
    });
  }, [conductor]);

  if (!conductor) return null;

  const canSubmit = form.full_name.trim().length > 1;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await update.mutateAsync({
      id: conductor.id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      date_of_joining: form.date_of_joining || null,
      emergency_contact: form.emergency_contact.trim() || null,
      is_active: form.is_active,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Conductor — {conductor.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, date_of_joining: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Emergency contact</Label>
            <Input
              value={form.emergency_contact}
              onChange={(e) =>
                setForm((f) => ({ ...f, emergency_contact: e.target.value }))
              }
              placeholder="Name + phone"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive conductors won't appear in bus assignment dropdowns.
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit || update.isPending}
          >
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
