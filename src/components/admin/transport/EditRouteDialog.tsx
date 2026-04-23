import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { type BusRoute, useUpdateRoute } from '@/hooks/useTransportation';

interface EditRouteDialogProps {
  route: BusRoute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRouteDialog({ route, open, onOpenChange }: EditRouteDialogProps) {
  const update = useUpdateRoute();
  const [form, setForm] = useState({
    route_name: '',
    route_number: '',
    start_location: '',
    end_location: '',
    morning_time: '',
    evening_time: '',
    monthly_fee: '',
    is_active: true,
  });

  useEffect(() => {
    if (!route) return;
    setForm({
      route_name: route.route_name,
      route_number: route.route_number ?? '',
      start_location: route.start_location,
      end_location: route.end_location,
      morning_time: route.morning_time ?? '',
      evening_time: route.evening_time ?? '',
      monthly_fee: String(route.monthly_fee ?? ''),
      is_active: route.is_active,
    });
  }, [route]);

  if (!route) return null;

  const canSubmit =
    form.route_name.trim() && form.start_location.trim() && form.end_location.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await update.mutateAsync({
      id: route.id,
      route_name: form.route_name.trim(),
      route_number: form.route_number.trim() || null,
      start_location: form.start_location.trim(),
      end_location: form.end_location.trim(),
      morning_time: form.morning_time || null,
      evening_time: form.evening_time || null,
      monthly_fee: parseFloat(form.monthly_fee) || 0,
      is_active: form.is_active,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Route — {route.route_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Route Name *</Label>
              <Input
                value={form.route_name}
                onChange={(e) => setForm((f) => ({ ...f, route_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Route Number</Label>
              <Input
                value={form.route_number}
                onChange={(e) => setForm((f) => ({ ...f, route_number: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Location *</Label>
              <Input
                value={form.start_location}
                onChange={(e) => setForm((f) => ({ ...f, start_location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Location *</Label>
              <Input
                value={form.end_location}
                onChange={(e) => setForm((f) => ({ ...f, end_location: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Morning Time</Label>
              <Input
                type="time"
                value={form.morning_time}
                onChange={(e) => setForm((f) => ({ ...f, morning_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Evening Time</Label>
              <Input
                type="time"
                value={form.evening_time}
                onChange={(e) => setForm((f) => ({ ...f, evening_time: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Monthly Fee (₹)</Label>
            <Input
              type="number"
              min={0}
              value={form.monthly_fee}
              onChange={(e) => setForm((f) => ({ ...f, monthly_fee: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label>Route is active</Label>
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
