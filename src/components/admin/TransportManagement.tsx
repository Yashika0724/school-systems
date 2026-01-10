import { useState } from 'react';
import {
  Bus,
  MapPin,
  Plus,
  Users,
  Route,
  Phone,
  Clock,
  IndianRupee,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useBusRoutes,
  useBuses,
  useAllStudentTransport,
  useTransportStats,
  useCreateRoute,
  useCreateBus,
} from '@/hooks/useTransportation';

export function TransportManagement() {
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [newRoute, setNewRoute] = useState({
    route_name: '',
    route_number: '',
    start_location: '',
    end_location: '',
    morning_time: '',
    evening_time: '',
    monthly_fee: '',
  });
  const [newBus, setNewBus] = useState({
    bus_number: '',
    capacity: '40',
    driver_name: '',
    driver_phone: '',
    conductor_name: '',
    conductor_phone: '',
    route_id: '',
  });

  const { data: routes, isLoading: routesLoading } = useBusRoutes();
  const { data: buses, isLoading: busesLoading } = useBuses();
  const { data: assignments, isLoading: assignmentsLoading } = useAllStudentTransport();
  const { data: stats, isLoading: statsLoading } = useTransportStats();

  const createRoute = useCreateRoute();
  const createBus = useCreateBus();

  const handleCreateRoute = async () => {
    if (!newRoute.route_name || !newRoute.start_location || !newRoute.end_location) return;

    await createRoute.mutateAsync({
      route_name: newRoute.route_name,
      route_number: newRoute.route_number || undefined,
      start_location: newRoute.start_location,
      end_location: newRoute.end_location,
      morning_time: newRoute.morning_time || undefined,
      evening_time: newRoute.evening_time || undefined,
      monthly_fee: parseFloat(newRoute.monthly_fee) || 0,
    });

    setNewRoute({
      route_name: '',
      route_number: '',
      start_location: '',
      end_location: '',
      morning_time: '',
      evening_time: '',
      monthly_fee: '',
    });
    setIsAddRouteOpen(false);
  };

  const handleCreateBus = async () => {
    if (!newBus.bus_number) return;

    await createBus.mutateAsync({
      bus_number: newBus.bus_number,
      capacity: parseInt(newBus.capacity) || 40,
      driver_name: newBus.driver_name || undefined,
      driver_phone: newBus.driver_phone || undefined,
      conductor_name: newBus.conductor_name || undefined,
      conductor_phone: newBus.conductor_phone || undefined,
      route_id: newBus.route_id || undefined,
    });

    setNewBus({
      bus_number: '',
      capacity: '40',
      driver_name: '',
      driver_phone: '',
      conductor_name: '',
      conductor_phone: '',
      route_id: '',
    });
    setIsAddBusOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transport Management</h1>
          <p className="text-muted-foreground">Manage buses, routes, and student assignments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddRouteOpen} onOpenChange={setIsAddRouteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Route
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Route</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Route Name *</Label>
                    <Input
                      value={newRoute.route_name}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, route_name: e.target.value }))}
                      placeholder="e.g., Downtown Express"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Route Number</Label>
                    <Input
                      value={newRoute.route_number}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, route_number: e.target.value }))}
                      placeholder="e.g., R01"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Location *</Label>
                    <Input
                      value={newRoute.start_location}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, start_location: e.target.value }))}
                      placeholder="Starting point"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Location *</Label>
                    <Input
                      value={newRoute.end_location}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, end_location: e.target.value }))}
                      placeholder="Ending point"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Morning Time</Label>
                    <Input
                      type="time"
                      value={newRoute.morning_time}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, morning_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Evening Time</Label>
                    <Input
                      type="time"
                      value={newRoute.evening_time}
                      onChange={(e) => setNewRoute(prev => ({ ...prev, evening_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Fee (₹)</Label>
                  <Input
                    type="number"
                    value={newRoute.monthly_fee}
                    onChange={(e) => setNewRoute(prev => ({ ...prev, monthly_fee: e.target.value }))}
                    placeholder="e.g., 1500"
                  />
                </div>
                <Button onClick={handleCreateRoute} className="w-full" disabled={createRoute.isPending}>
                  {createRoute.isPending ? 'Creating...' : 'Create Route'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddBusOpen} onOpenChange={setIsAddBusOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Bus
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Bus</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bus Number *</Label>
                    <Input
                      value={newBus.bus_number}
                      onChange={(e) => setNewBus(prev => ({ ...prev, bus_number: e.target.value }))}
                      placeholder="e.g., KA-01-AB-1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={newBus.capacity}
                      onChange={(e) => setNewBus(prev => ({ ...prev, capacity: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assigned Route</Label>
                  <Select
                    value={newBus.route_id}
                    onValueChange={(v) => setNewBus(prev => ({ ...prev, route_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes?.map(route => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.route_name} ({route.route_number || 'No number'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Driver Name</Label>
                    <Input
                      value={newBus.driver_name}
                      onChange={(e) => setNewBus(prev => ({ ...prev, driver_name: e.target.value }))}
                      placeholder="Driver name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Driver Phone</Label>
                    <Input
                      value={newBus.driver_phone}
                      onChange={(e) => setNewBus(prev => ({ ...prev, driver_phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Conductor Name</Label>
                    <Input
                      value={newBus.conductor_name}
                      onChange={(e) => setNewBus(prev => ({ ...prev, conductor_name: e.target.value }))}
                      placeholder="Conductor name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conductor Phone</Label>
                    <Input
                      value={newBus.conductor_phone}
                      onChange={(e) => setNewBus(prev => ({ ...prev, conductor_phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateBus} className="w-full" disabled={createBus.isPending}>
                  {createBus.isPending ? 'Adding...' : 'Add Bus'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statsLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Active Routes</p>
                    <p className="text-2xl font-bold text-blue-800">{stats?.activeRoutes || 0}</p>
                  </div>
                  <Route className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700">Active Buses</p>
                    <p className="text-2xl font-bold text-purple-800">{stats?.activeBuses || 0}</p>
                  </div>
                  <Bus className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Total Capacity</p>
                    <p className="text-2xl font-bold text-green-800">{stats?.totalCapacity || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700">Students</p>
                    <p className="text-2xl font-bold text-orange-800">{stats?.activeStudents || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-teal-700">Available Seats</p>
                    <p className="text-2xl font-bold text-teal-800">{stats?.availableSeats || 0}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-teal-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routes">
            <Route className="h-4 w-4 mr-2" />
            Routes
          </TabsTrigger>
          <TabsTrigger value="buses">
            <Bus className="h-4 w-4 mr-2" />
            Buses
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="h-4 w-4 mr-2" />
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {routesLoading ? (
                <div className="p-8 space-y-4">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : routes && routes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Start - End</TableHead>
                      <TableHead>Timings</TableHead>
                      <TableHead>Monthly Fee</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow key={route.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{route.route_name}</p>
                            {route.route_number && (
                              <p className="text-xs text-muted-foreground">{route.route_number}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {route.start_location} → {route.end_location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {route.morning_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                AM: {route.morning_time}
                              </div>
                            )}
                            {route.evening_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                PM: {route.evening_time}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {formatCurrency(route.monthly_fee)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={route.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {route.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No routes found. Add a route to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buses" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {busesLoading ? (
                <div className="p-8 space-y-4">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : buses && buses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bus Number</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buses.map((bus) => (
                      <TableRow key={bus.id}>
                        <TableCell className="font-medium">{bus.bus_number}</TableCell>
                        <TableCell>
                          {bus.route ? (
                            <Badge variant="secondary">{bus.route.route_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>{bus.capacity} seats</TableCell>
                        <TableCell>
                          {bus.driver_name ? (
                            <div>
                              <p className="text-sm">{bus.driver_name}</p>
                              {bus.driver_phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {bus.driver_phone}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={bus.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {bus.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No buses found. Add a bus to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {assignmentsLoading ? (
                <div className="p-8 space-y-4">
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : assignments && assignments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bus</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Pickup Point</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.bus?.bus_number || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {assignment.route?.route_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{assignment.pickup_point}</TableCell>
                        <TableCell>
                          <Badge className={assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {assignment.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transport assignments found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
