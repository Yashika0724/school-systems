import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Switch,
} from '@/components/ui/switch';
import {
  type Bus,
  useBusRoutes,
  useConductors,
  useDrivers,
  useUpdateBus,
} from '@/hooks/useTransportation';

const UNASSIGNED = '__unassigned__';

interface EditBusDialogProps {
  bus: Bus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBusDialog({ bus, open, onOpenChange }: EditBusDialogProps) {
  const { data: routes } = useBusRoutes();
  const { data: drivers } = useDrivers();
  const { data: conductors } = useConductors();
  const update = useUpdateBus();

  const [routeId, setRouteId] = useState<string>(UNASSIGNED);
  const [driverId, setDriverId] = useState<string>(UNASSIGNED);
  const [conductorId, setConductorId] = useState<string>(UNASSIGNED);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!bus) return;
    setRouteId(bus.route_id ?? UNASSIGNED);
    setDriverId(bus.driver_id ?? UNASSIGNED);
    setConductorId(bus.conductor_id ?? UNASSIGNED);
    setIsActive(bus.is_active ?? true);
  }, [bus]);

  if (!bus) return null;

  const handleSubmit = async () => {
    await update.mutateAsync({
      id: bus.id,
      route_id: routeId === UNASSIGNED ? null : routeId,
      driver_id: driverId === UNASSIGNED ? null : driverId,
      conductor_id: conductorId === UNASSIGNED ? null : conductorId,
      is_active: isActive,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Bus — {bus.bus_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Route</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Not assigned</SelectItem>
                {routes?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.route_name} {r.route_number ? `(${r.route_number})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>No driver</SelectItem>
                {drivers
                  ?.filter((d) => d.is_active)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.profile?.full_name || 'Unnamed'}
                      {d.profile?.email ? ` — ${d.profile.email}` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {drivers?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No drivers yet. Add one from the Drivers tab.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Conductor</Label>
            <Select value={conductorId} onValueChange={setConductorId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a conductor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>No conductor</SelectItem>
                {conductors
                  ?.filter((c) => c.is_active)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                      {c.phone ? ` — ${c.phone}` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {conductors?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No conductors yet. Add one from the Conductors tab.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Label>Bus is active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
