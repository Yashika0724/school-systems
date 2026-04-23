import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bus as BusIcon,
  Calendar,
  IdCard,
  MapPin,
  Navigation,
  Phone,
  Route,
  UserSquare2,
  Users,
  Sun,
  Moon,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBus, useRouteStops } from '@/hooks/useTransportation';
import { LiveBusMap } from '@/components/transport/LiveBusMap';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BusDetailsPage() {
  const { busId } = useParams<{ busId: string }>();
  const { data: bus, isLoading } = useBus(busId);
  const { data: stops } = useRouteStops(bus?.route_id);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Bus not found.</p>
        <Button asChild variant="outline">
          <Link to="/admin/transport">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Transport
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/transport">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BusIcon className="h-6 w-6 text-primary" /> {bus.bus_number}
            </h1>
            <p className="text-muted-foreground text-sm">
              {bus.route?.route_name ?? 'No route assigned'}
            </p>
          </div>
        </div>
        <Badge
          className={
            bus.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }
        >
          {bus.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Capacity</p>
            <p className="text-2xl font-bold">{bus.capacity}</p>
            <p className="text-xs text-muted-foreground">
              {bus.assignments?.length ?? 0} assigned · {Math.max(0, bus.capacity - (bus.assignments?.length ?? 0))} seats left
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Route</p>
            <p className="font-semibold">{bus.route?.route_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              {bus.route?.route_number ?? ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recent trips</p>
            <p className="text-2xl font-bold">{bus.recentTrips?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">last 10 runs</p>
          </CardContent>
        </Card>
      </div>

      {/* Driver & Conductor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IdCard className="h-4 w-4 text-primary" /> Driver
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bus.driver ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-base">
                  {bus.driver.profile?.full_name ?? 'Unnamed'}
                </p>
                {bus.driver.profile?.email && (
                  <p className="text-muted-foreground">{bus.driver.profile.email}</p>
                )}
                {bus.driver.profile?.phone && (
                  <a
                    href={`tel:${bus.driver.profile.phone}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Phone className="h-3 w-3" /> {bus.driver.profile.phone}
                  </a>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">License</p>
                    <p>{bus.driver.license_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">License expiry</p>
                    <p>{formatDate(bus.driver.license_expiry)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Experience</p>
                    <p>
                      {bus.driver.experience_years != null
                        ? `${bus.driver.experience_years} yr`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p>{formatDate(bus.driver.date_of_joining)}</p>
                  </div>
                </div>
                {bus.driver.emergency_contact && (
                  <div className="pt-2 border-t text-xs">
                    <p className="text-muted-foreground">Emergency contact</p>
                    <p>{bus.driver.emergency_contact}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No driver assigned. Edit this bus to assign one.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserSquare2 className="h-4 w-4 text-primary" /> Conductor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bus.conductor ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-base">{bus.conductor.full_name}</p>
                {bus.conductor.phone && (
                  <a
                    href={`tel:${bus.conductor.phone}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Phone className="h-3 w-3" /> {bus.conductor.phone}
                  </a>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p>{formatDate(bus.conductor.date_of_joining)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Emergency</p>
                    <p>{bus.conductor.emergency_contact || '—'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No conductor assigned. Edit this bus to assign one.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live tracking */}
      {bus.route_id && (
        <LiveBusMap busId={bus.id} routeId={bus.route_id} />
      )}

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="h-4 w-4 text-primary" /> Stops
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stops && stops.length > 0 ? (
            <div className="space-y-2">
              {stops.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-2 rounded border"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {s.sequence}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.name}</p>
                    {(s.scheduled_morning_time || s.scheduled_evening_time) && (
                      <p className="text-xs text-muted-foreground">
                        <Sun className="h-3 w-3 inline mr-0.5" />
                        {s.scheduled_morning_time || '—'}
                        <span className="mx-2">·</span>
                        <Moon className="h-3 w-3 inline mr-0.5" />
                        {s.scheduled_evening_time || '—'}
                      </p>
                    )}
                  </div>
                  {s.lat != null && s.lng != null ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No stops configured for this route.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Student assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Assigned Students
            <span className="text-sm font-normal text-muted-foreground">
              ({bus.assignments?.length ?? 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bus.assignments && bus.assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Drop</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bus.assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.student_name || '—'}
                    </TableCell>
                    <TableCell>{a.roll_number || '—'}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" /> {a.pickup_point}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.drop_point || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground text-center">
              No students assigned to this bus yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent trips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="h-4 w-4 text-primary" /> Recent Trips
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bus.recentTrips && bus.recentTrips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bus.recentTrips.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{formatDateTime(t.started_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(t.ended_at)}
                    </TableCell>
                    <TableCell className="capitalize">
                      <span className="inline-flex items-center gap-1">
                        {t.trip_type === 'morning' ? (
                          <Sun className="h-3 w-3" />
                        ) : (
                          <Moon className="h-3 w-3" />
                        )}
                        {t.trip_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          t.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : t.status === 'completed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" /> No trips recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
