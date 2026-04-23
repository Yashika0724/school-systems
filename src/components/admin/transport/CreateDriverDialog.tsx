import { useState } from 'react';
import { IdCard, Loader2, Plus } from 'lucide-react';
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
import { useCreateDriver } from '@/hooks/useTransportation';

export function CreateDriverDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    experienceYears: '',
    dateOfJoining: '',
    emergencyContact: '',
  });

  const create = useCreateDriver();

  const reset = () =>
    setForm({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      licenseNumber: '',
      licenseExpiry: '',
      experienceYears: '',
      dateOfJoining: '',
      emergencyContact: '',
    });

  const canSubmit =
    form.fullName.trim().length > 1 &&
    /.+@.+\..+/.test(form.email) &&
    form.password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await create.mutateAsync({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone || undefined,
      licenseNumber: form.licenseNumber || undefined,
      licenseExpiry: form.licenseExpiry || undefined,
      experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
      dateOfJoining: form.dateOfJoining || undefined,
      emergencyContact: form.emergencyContact || undefined,
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
          <Plus className="h-4 w-4 mr-2" /> Add Driver
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <IdCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Add New Driver</DialogTitle>
              <DialogDescription>
                Creates a login account and a driver profile.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="min 6 characters"
              />
            </div>
          </div>

          <div className="pt-2 border-t space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Driver details</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>License number</Label>
                <Input
                  value={form.licenseNumber}
                  onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>License expiry</Label>
                <Input
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Experience (yrs)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.experienceYears}
                  onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date of joining</Label>
                <Input
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfJoining: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Emergency contact</Label>
              <Input
                value={form.emergencyContact}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                placeholder="Name + phone"
              />
            </div>
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
              {create.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
                </>
              ) : (
                'Create Driver'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
