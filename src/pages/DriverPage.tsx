import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bus,
  LogOut,
  MapPin,
  Navigation,
  Pause,
  Play,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useMyDrivenBuses,
  useActiveTripForBus,
  useStartTrip,
  useEndTrip,
  useRouteStops,
  useTripStopEvents,
  useRecordStopEvent,
  useRecordLocation,
  type Bus as BusRow,
  type TripType,
} from '@/hooks/useTransportation';

function InlineLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Driver Sign In</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sign in with the staff account linked to your bus
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function NotLinked({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <Bus className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold">Not assigned as a driver</h2>
          <p className="text-muted-foreground">
            Your account isn't linked to any bus. Ask an administrator to link
            your account in Admin → Transport → Buses → Edit.
          </p>
          <Button variant="outline" onClick={onSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TripStarter({ buses, onStarted }: { buses: BusRow[]; onStarted: () => void }) {
  const [selectedBus, setSelectedBus] = useState<BusRow | null>(buses[0] ?? null);
  const [tripType, setTripType] = useState<TripType>('morning');
  const start = useStartTrip();

  const handleStart = async () => {
    if (!selectedBus?.route_id) {
      toast.error('This bus has no route assigned');
      return;
    }
    await start.mutateAsync({
      bus_id: selectedBus.id,
      route_id: selectedBus.route_id,
      trip_type: tripType,
    });
    onStarted();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Trip</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {buses.length > 1 && (
          <div className="space-y-2">
            <Label>Bus</Label>
            <div className="grid gap-2">
              {buses.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedBus?.id === b.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/40'
                  }`}
                  onClick={() => setSelectedBus(b)}
                >
                  <p className="font-medium">{b.bus_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.route?.route_name ?? 'No route'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedBus && buses.length === 1 && (
          <div className="rounded-lg border p-3">
            <p className="font-medium">{selectedBus.bus_number}</p>
            <p className="text-sm text-muted-foreground">
              {selectedBus.route?.route_name ?? 'No route assigned'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Trip type</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`p-3 rounded-lg border flex items-center justify-center gap-2 ${
                tripType === 'morning'
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/40'
              }`}
              onClick={() => setTripType('morning')}
            >
              <Sun className="h-4 w-4" /> Morning
            </button>
            <button
              type="button"
              className={`p-3 rounded-lg border flex items-center justify-center gap-2 ${
                tripType === 'evening'
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/40'
              }`}
              onClick={() => setTripType('evening')}
            >
              <Moon className="h-4 w-4" /> Evening
            </button>
          </div>
        </div>

        <Button
          className="w-full h-14 text-lg"
          onClick={handleStart}
          disabled={!selectedBus?.route_id || start.isPending}
        >
          <Play className="h-5 w-5 mr-2" />
          {start.isPending ? 'Starting...' : 'Start Trip'}
        </Button>
      </CardContent>
    </Card>
  );
}

function ActiveTripPanel({ bus, tripId }: { bus: BusRow; tripId: string }) {
  const { data: stops } = useRouteStops(bus.route_id);
  const { data: events } = useTripStopEvents(tripId);
  const recordStop = useRecordStopEvent();
  const recordLoc = useRecordLocation();
  const endTrip = useEndTrip();

  const [gpsStatus, setGpsStatus] = useState<'idle' | 'active' | 'error'>('idle');
  const [lastSample, setLastSample] = useState<GeolocationCoordinates | null>(null);
  const [sampleCount, setSampleCount] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const lastPushRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const arrivedStopIds = useMemo(
    () => new Set(events?.map((e) => e.route_stop_id) ?? []),
    [events],
  );

  const pushLocation = useCallback(
    (coords: GeolocationCoordinates) => {
      setLastSample(coords);
      const now = Date.now();
      const prev = lastPushRef.current;
      const dt = prev ? now - prev.at : Infinity;
      const dd = prev ? distanceMeters(prev.lat, prev.lng, coords.latitude, coords.longitude) : Infinity;
      // throttle: push at most every 10s, or when moved > 20m
      if (dt < 10_000 && dd < 20) return;
      lastPushRef.current = { lat: coords.latitude, lng: coords.longitude, at: now };
      setSampleCount((n) => n + 1);
      recordLoc.mutate({
        trip_id: tripId,
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy_m: coords.accuracy ?? null,
        speed_kmh: coords.speed != null ? coords.speed * 3.6 : null,
        heading: coords.heading ?? null,
      });
    },
    [tripId, recordLoc],
  );

  const startWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      toast.error('This device does not support GPS');
      setGpsStatus('error');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('active');
        pushLocation(pos.coords);
      },
      (err) => {
        console.error('GPS error', err);
        setGpsStatus('error');
        toast.error(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 },
    );
    watchIdRef.current = id;
  }, [pushLocation]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus('idle');
  }, []);

  // auto-start watch when component mounts (there's an active trip)
  useEffect(() => {
    startWatch();
    // best-effort screen wake lock
    (async () => {
      try {
        const anyNav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
        };
        if (anyNav.wakeLock) {
          wakeLockRef.current = await anyNav.wakeLock.request('screen');
        }
      } catch {
        // ignore — wake lock is a nice-to-have
      }
    })();
    return () => {
      stopWatch();
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [startWatch, stopWatch]);

  const handleEnd = async () => {
    stopWatch();
    await endTrip.mutateAsync(tripId);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Active trip</p>
            <p className="font-semibold">{bus.bus_number}</p>
            <p className="text-sm text-muted-foreground">{bus.route?.route_name}</p>
          </div>
          <div className="text-right">
            <Badge
              className={
                gpsStatus === 'active'
                  ? 'bg-green-100 text-green-800'
                  : gpsStatus === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }
            >
              <Navigation className="h-3 w-3 mr-1" />
              GPS {gpsStatus}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {sampleCount} sample{sampleCount === 1 ? '' : 's'} sent
            </p>
          </div>
        </CardContent>
      </Card>

      {lastSample && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Last fix</p>
            <p className="font-mono">
              {lastSample.latitude.toFixed(5)}, {lastSample.longitude.toFixed(5)}
              {lastSample.accuracy ? ` (±${Math.round(lastSample.accuracy)}m)` : ''}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stops — tap on arrival</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!stops || stops.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No stops configured for this route. Ask admin to add stops.
            </p>
          ) : (
            stops.map((s) => {
              const done = arrivedStopIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={done || recordStop.isPending}
                  onClick={() =>
                    recordStop.mutate({ trip_id: tripId, route_stop_id: s.id })
                  }
                  className={`w-full text-left p-4 rounded-lg border flex items-center gap-3 transition-colors ${
                    done
                      ? 'bg-green-50 border-green-200'
                      : 'hover:bg-muted/40 active:bg-primary/5'
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      done ? 'bg-green-600 text-white' : 'bg-muted text-foreground'
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : s.sequence}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{s.name}</p>
                    {(s.scheduled_morning_time || s.scheduled_evening_time) && (
                      <p className="text-xs text-muted-foreground">
                        AM {s.scheduled_morning_time ?? '—'} · PM{' '}
                        {s.scheduled_evening_time ?? '—'}
                      </p>
                    )}
                  </div>
                  {done && (
                    <span className="text-xs text-green-700 font-medium">
                      Arrived
                    </span>
                  )}
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        className="w-full h-12"
        onClick={handleEnd}
        disabled={endTrip.isPending}
      >
        <Pause className="h-5 w-5 mr-2" />
        {endTrip.isPending ? 'Ending...' : 'End Trip'}
      </Button>
    </div>
  );
}

export default function DriverPage() {
  const { user, loading, signOut } = useAuth();
  const { data: buses, isLoading: busesLoading } = useMyDrivenBuses();
  const [activeBusId, setActiveBusId] = useState<string | null>(null);

  // auto-pick single bus
  useEffect(() => {
    if (!activeBusId && buses && buses.length === 1) {
      setActiveBusId(buses[0].id);
    }
  }, [buses, activeBusId]);

  const { data: activeTrip } = useActiveTripForBus(activeBusId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-32 w-80" />
      </div>
    );
  }

  if (!user) return <InlineLogin />;

  if (busesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-32 w-80" />
      </div>
    );
  }

  if (!buses || buses.length === 0) return <NotLinked onSignOut={signOut} />;

  const activeBus = buses.find((b) => b.id === (activeBusId ?? buses[0].id)) ?? buses[0];

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Bus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">Driver</h1>
              <p className="text-xs text-muted-foreground">
                Signed in as {user.email}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {activeTrip ? (
          <ActiveTripPanel bus={activeBus} tripId={activeTrip.id} />
        ) : (
          <TripStarter
            buses={buses}
            onStarted={() => {
              /* active trip query will refetch via invalidation */
            }}
          />
        )}
      </div>
    </div>
  );
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
