import { useMemo, useState, useEffect } from 'react';
import { Check, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type BusRoute,
  type RouteStop,
  useRouteStops,
  useCreateRouteStop,
  useDeleteRouteStop,
  useUpdateRouteStop,
} from '@/hooks/useTransportation';

interface ManageStopsDialogProps {
  route: BusRoute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StopRowProps {
  stop: RouteStop;
  routeId: string;
}

function StopRow({ stop, routeId }: StopRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: stop.name,
    lat: stop.lat != null ? String(stop.lat) : '',
    lng: stop.lng != null ? String(stop.lng) : '',
    morning: stop.scheduled_morning_time ?? '',
    evening: stop.scheduled_evening_time ?? '',
  });
  const update = useUpdateRouteStop();
  const del = useDeleteRouteStop();

  useEffect(() => {
    if (editing) return;
    setForm({
      name: stop.name,
      lat: stop.lat != null ? String(stop.lat) : '',
      lng: stop.lng != null ? String(stop.lng) : '',
      morning: stop.scheduled_morning_time ?? '',
      evening: stop.scheduled_evening_time ?? '',
    });
  }, [stop, editing]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    await update.mutateAsync({
      id: stop.id,
      route_id: routeId,
      name: form.name.trim(),
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      scheduled_morning_time: form.morning || null,
      scheduled_evening_time: form.evening || null,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <TableRow>
        <TableCell className="font-mono">{stop.sequence}</TableCell>
        <TableCell>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Stop name"
            className="h-8"
          />
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Input
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              placeholder="lat"
              className="h-8 w-20"
              inputMode="decimal"
            />
            <Input
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              placeholder="lng"
              className="h-8 w-20"
              inputMode="decimal"
            />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Input
              type="time"
              value={form.morning}
              onChange={(e) => setForm((f) => ({ ...f, morning: e.target.value }))}
              className="h-8 w-24"
            />
            <Input
              type="time"
              value={form.evening}
              onChange={(e) => setForm((f) => ({ ...f, evening: e.target.value }))}
              className="h-8 w-24"
            />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSave}
              disabled={update.isPending || !form.name.trim()}
              title="Save"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEditing(false)}
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-mono">{stop.sequence}</TableCell>
      <TableCell className="font-medium">{stop.name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {stop.lat != null && stop.lng != null
          ? `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`
          : '—'}
      </TableCell>
      <TableCell className="text-xs">
        {stop.scheduled_morning_time || '—'} / {stop.scheduled_evening_time || '—'}
      </TableCell>
      <TableCell>
        <div className="flex gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditing(true)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => del.mutate({ id: stop.id, route_id: routeId })}
            disabled={del.isPending}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ManageStopsDialog({ route, open, onOpenChange }: ManageStopsDialogProps) {
  const { data: stops } = useRouteStops(route?.id);
  const create = useCreateRouteStop();

  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [morning, setMorning] = useState('');
  const [evening, setEvening] = useState('');

  const nextSeq = useMemo(() => {
    if (!stops || stops.length === 0) return 1;
    return Math.max(...stops.map((s) => s.sequence)) + 1;
  }, [stops]);

  const reset = () => {
    setName('');
    setLat('');
    setLng('');
    setMorning('');
    setEvening('');
  };

  if (!route) return null;

  const handleAdd = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({
      route_id: route.id,
      sequence: nextSeq,
      name: name.trim(),
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      scheduled_morning_time: morning || null,
      scheduled_evening_time: evening || null,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Stops — {route.route_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Add stop #{nextSeq}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Stop name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Hauz Khas Metro"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="28.5504"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="77.2060"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Morning time</Label>
                <Input
                  type="time"
                  value={morning}
                  onChange={(e) => setMorning(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Evening time</Label>
                <Input
                  type="time"
                  value={evening}
                  onChange={(e) => setEvening(e.target.value)}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleAdd}
              disabled={!name.trim() || create.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {create.isPending ? 'Adding…' : 'Add Stop'}
            </Button>
          </div>

          <div className="rounded-lg border">
            {stops && stops.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Stop</TableHead>
                    <TableHead className="w-48">Coords</TableHead>
                    <TableHead className="w-48">AM / PM</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stops.map((s) => (
                    <StopRow key={s.id} stop={s} routeId={route.id} />
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No stops yet. Add the first stop above.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
