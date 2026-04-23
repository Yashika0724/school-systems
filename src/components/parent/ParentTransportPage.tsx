import { useState } from 'react';
import {
  Bus,
  MapPin,
  Clock,
  Phone,
  User,
  Route,
  IndianRupee,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useParentData, useLinkedChildren } from '@/hooks/useParentData';
import { useStudentTransportById } from '@/hooks/useTransportation';
import { useDemo } from '@/contexts/DemoContext';
import { LiveBusMap } from '@/components/transport/LiveBusMap';

// Demo data
const demoTransport = {
  id: '1',
  bus: {
    bus_number: 'KA-01-AB-1234',
    driver_name: 'Ramesh Kumar',
    driver_phone: '+91 98765 43210',
    conductor_name: 'Suresh Singh',
    conductor_phone: '+91 98765 43211',
  },
  route: {
    route_name: 'Green Park Express',
    route_number: 'R01',
    start_location: 'Green Park Metro',
    end_location: 'School Campus',
    morning_time: '07:30',
    evening_time: '14:30',
    monthly_fee: 2500,
  },
  pickup_point: 'Green Park Metro Station',
  drop_point: 'School Main Gate',
};

export function ParentTransportPage() {
  const { isDemo } = useDemo();
  const { data: parentData } = useParentData();
  const { data: children, isLoading } = useLinkedChildren(parentData?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const selectedChild = children?.find(c => c.student_id === selectedChildId);
  const { data: realTransport, isLoading: transportLoading } = useStudentTransportById(
    isDemo ? null : selectedChildId,
  );

  const displayTransport = isDemo ? demoTransport : realTransport;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading && !isDemo) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transport</h1>
        <p className="text-muted-foreground">View your children's transport details</p>
      </div>

      {/* Child Selector */}
      {children && children.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedChildId ? `Viewing: ${selectedChild?.student?.profile?.full_name || 'Child'}` : 'Select a child'}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {selectedChildId ? 'Change Child' : 'Select Child'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {children.map((child) => (
                    <DropdownMenuItem
                      key={child.student_id}
                      onClick={() => setSelectedChildId(child.student_id)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={child.student?.profile?.avatar_url || ''} />
                        <AvatarFallback>{child.student?.profile?.full_name?.[0] || 'S'}</AvatarFallback>
                      </Avatar>
                      {child.student?.profile?.full_name || 'Student'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedChildId && !isDemo ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Select a Child</h3>
            <p className="text-muted-foreground">
              Choose a child from the dropdown above to view their transport details.
            </p>
          </CardContent>
        </Card>
      ) : transportLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      ) : !displayTransport ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bus className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Transport Assigned</h3>
            <p className="text-muted-foreground">
              This child doesn't have any transport facility assigned. Please contact the school administration for more information.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bus Info Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bus className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-800">{displayTransport.bus?.bus_number}</h2>
                  <p className="text-blue-600">{displayTransport.route?.route_name}</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </CardContent>
          </Card>

          {/* Live Tracking */}
          {!isDemo && 'bus_id' in displayTransport && 'route_id' in displayTransport && (
            <LiveBusMap
              busId={displayTransport.bus_id as string}
              routeId={displayTransport.route_id as string}
              pickupName={displayTransport.pickup_point}
            />
          )}

          {/* Route Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                Route Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Route Number</p>
                  <p className="font-semibold">{displayTransport.route?.route_number || 'N/A'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Monthly Fee</p>
                  <p className="font-semibold flex items-center gap-1">
                    <IndianRupee className="h-4 w-4" />
                    {formatCurrency(displayTransport.route?.monthly_fee || 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-green-700">Start Point</p>
                    <p className="font-medium">{displayTransport.route?.start_location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-700">Child's Pickup Point</p>
                    <p className="font-medium">{displayTransport.pickup_point}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-700">End Point</p>
                    <p className="font-medium">{displayTransport.route?.end_location}</p>
                  </div>
                </div>
              </div>

              {/* Timings */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-4 border rounded-lg text-center">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Morning Pickup</p>
                  <p className="text-xl font-bold">{displayTransport.route?.morning_time || 'N/A'}</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-muted-foreground">Evening Drop</p>
                  <p className="text-xl font-bold">{displayTransport.route?.evening_time || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const bus = displayTransport.bus as {
                  driver?: { profile?: { full_name?: string; phone?: string } } | null;
                  conductor?: { full_name?: string; phone?: string | null } | null;
                  driver_name?: string | null;
                  driver_phone?: string | null;
                  conductor_name?: string | null;
                  conductor_phone?: string | null;
                } | undefined;
                const driverName = bus?.driver?.profile?.full_name || bus?.driver_name;
                const driverPhone = bus?.driver?.profile?.phone || bus?.driver_phone;
                if (!driverName) return null;
                return (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{driverName}</p>
                      <p className="text-sm text-muted-foreground">Driver</p>
                    </div>
                    {driverPhone && (
                      <a
                        href={`tel:${driverPhone}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {driverPhone}
                      </a>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const bus = displayTransport.bus as {
                  conductor?: { full_name?: string; phone?: string | null } | null;
                  conductor_name?: string | null;
                  conductor_phone?: string | null;
                } | undefined;
                const conductorName = bus?.conductor?.full_name || bus?.conductor_name;
                const conductorPhone = bus?.conductor?.phone || bus?.conductor_phone;
                if (!conductorName) return null;
                return (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{conductorName}</p>
                      <p className="text-sm text-muted-foreground">Conductor</p>
                    </div>
                    {conductorPhone && (
                      <a
                        href={`tel:${conductorPhone}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {conductorPhone}
                      </a>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
