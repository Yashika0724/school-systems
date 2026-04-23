import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type Driver, useUpdateDriver } from '@/hooks/useTransportation';

interface EditDriverDialogProps {
  driver: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDriverDialog({ driver, open, onOpenChange }: EditDriverDialogProps) {
  const update = useUpdateDriver();
  const [form, setForm] = useState({
    license_number: '',
    license_expiry: '',
    experience_years: '',
    date_of_joining: '',
    emergency_contact: '',
    is_active: true,
  });

  useEffect(() => {
    if (!driver) return;
    setForm({
      license_number: driver.license_number ?? '',
      license_expiry: driver.license_expiry ?? '',
      experience_years:
        driver.experience_years != null ? String(driver.experience_years) : '',
      date_of_joining: driver.date_of_joining ?? '',
      emergency_contact: driver.emergency_contact ?? '',
      is_active: driver.is_active,
    });
  }, [driver]);

  if (!driver) return null;

  const handleSubmit = async () => {
    await update.mutateAsync({
      id: driver.id,
      license_number: form.license_number.trim() || null,
      license_expiry: form.license_expiry || null,
      experience_years: form.experience_years
        ? parseInt(form.experience_years)
        : null,
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
          <DialogTitle>
            Edit Driver — {driver.profile?.full_name ?? 'Unnamed'}
          </DialogTitle>
          <DialogDescription>
            Update driver details or deactivate. Email/password changes are handled
            separately via the user's own profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>License number</Label>
              <Input
                value={form.license_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, license_number: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>License expiry</Label>
              <Input
                type="date"
                value={form.license_expiry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, license_expiry: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Experience (yrs)</Label>
              <Input
                type="number"
                min={0}
                value={form.experience_years}
                onChange={(e) =>
                  setForm((f) => ({ ...f, experience_years: e.target.value }))
                }
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
                Inactive drivers won't appear in bus assignment dropdowns.
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
            disabled={update.isPending}
          >
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
