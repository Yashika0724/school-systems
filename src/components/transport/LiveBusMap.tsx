import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, CheckCircle2, CircleDashed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useLiveBusLocation,
  useRouteStops,
  useTripStopEvents,
} from '@/hooks/useTransportation';

// Leaflet default icon fix (bundler path issue)
const busIcon = L.divIcon({
  className: 'bus-marker',
  html: `<div style="background:#2563eb;border:2px solid white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const stopIconDone = L.divIcon({
  className: 'stop-marker-done',
  html: `<div style="background:#16a34a;border:2px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const stopIconPending = L.divIcon({
  className: 'stop-marker-pending',
  html: `<div style="background:white;border:2px solid #6b7280;border-radius:50%;width:18px;height:18px;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

interface LiveBusMapProps {
  busId: string;
  routeId: string;
  pickupName?: string | null;
}

/**
 * Pans the map to follow the bus when a new fix arrives.
 */
function FollowBus({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.panTo([lat, lng], { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export function LiveBusMap({ busId, routeId, pickupName }: LiveBusMapProps) {
  const { trip, location, isLoading } = useLiveBusLocation(busId);
  const { data: stops } = useRouteStops(routeId);
  const { data: events } = useTripStopEvents(trip?.id);

  const arrivedStopIds = useMemo(
    () => new Set(events?.map((e) => e.route_stop_id) ?? []),
    [events],
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (location) return [location.lat, location.lng];
    const firstStop = stops?.find((s) => s.lat != null && s.lng != null);
    if (firstStop?.lat != null && firstStop?.lng != null) return [firstStop.lat, firstStop.lng];
    return [28.6139, 77.209]; // default: Delhi
  }, [location, stops]);

  const stopsWithCoords = stops?.filter((s) => s.lat != null && s.lng != null) ?? [];
  const routeLine = stopsWithCoords.map(
    (s) => [s.lat as number, s.lng as number] as [number, number],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          Live Tracking
        </CardTitle>
        {trip ? (
          <Badge className="bg-green-100 text-green-800">
            On trip ({trip.trip_type})
          </Badge>
        ) : (
          <Badge variant="secondary">Bus not on a trip right now</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!trip && (
          <p className="text-sm text-muted-foreground">
            Tracking will appear here when the driver starts the trip. Check back
            around your scheduled pickup time.
          </p>
        )}

        <div className="h-72 rounded-lg overflow-hidden border">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {routeLine.length >= 2 && (
              <Polyline
                positions={routeLine}
                pathOptions={{ color: '#6b7280', weight: 3, opacity: 0.6, dashArray: '6 6' }}
              />
            )}

            {stopsWithCoords.map((s) => {
              const done = arrivedStopIds.has(s.id);
              const isMyStop =
                pickupName && s.name.toLowerCase() === pickupName.toLowerCase();
              return (
                <Marker
                  key={s.id}
                  position={[s.lat as number, s.lng as number]}
                  icon={done ? stopIconDone : stopIconPending}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-medium">
                        {s.sequence}. {s.name}
                      </p>
                      {isMyStop && (
                        <p className="text-xs text-primary">Your pickup</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {done ? 'Arrived' : 'Upcoming'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {location && (
              <>
                <Marker position={[location.lat, location.lng]} icon={busIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-medium">Bus is here</p>
                      {location.speed_kmh != null && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round(location.speed_kmh)} km/h
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(location.recorded_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
                <FollowBus lat={location.lat} lng={location.lng} />
              </>
            )}
          </MapContainer>
        </div>

        {stops && stops.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Stop progress
            </p>
            <div className="space-y-1">
              {stops.map((s) => {
                const done = arrivedStopIds.has(s.id);
                const event = events?.find((e) => e.route_stop_id === s.id);
                const isMyStop =
                  pickupName && s.name.toLowerCase() === pickupName.toLowerCase();
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      isMyStop ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <CircleDashed className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={done ? 'text-muted-foreground' : ''}>
                      {s.name}
                    </span>
                    {isMyStop && (
                      <span className="text-xs text-blue-700 font-medium ml-1">
                        (your pickup)
                      </span>
                    )}
                    {event && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(event.recorded_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

