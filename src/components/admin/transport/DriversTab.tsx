import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { IdCard, Mail, Pencil, Phone } from 'lucide-react';
import { type Driver, useDrivers } from '@/hooks/useTransportation';
import { CreateDriverDialog } from './CreateDriverDialog';
import { EditDriverDialog } from './EditDriverDialog';

export function DriversTab() {
  const { data: drivers, isLoading } = useDrivers();
  const [editing, setEditing] = useState<Driver | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateDriverDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
          ) : drivers && drivers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Assigned Bus</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{d.profile?.full_name || 'Unnamed'}</p>
                        {d.date_of_joining && (
                          <p className="text-xs text-muted-foreground">
                            Joined{' '}
                            {new Date(d.date_of_joining).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-sm">
                        {d.profile?.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {d.profile.email}
                          </div>
                        )}
                        {d.profile?.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {d.profile.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.license_number ? (
                        <div className="text-sm">
                          <p className="font-medium">{d.license_number}</p>
                          {d.license_expiry && (
                            <p className="text-xs text-muted-foreground">
                              Exp{' '}
                              {new Date(d.license_expiry).toLocaleDateString('en-IN', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.experience_years != null ? `${d.experience_years} yr` : '—'}
                    </TableCell>
                    <TableCell>
                      {d.buses && d.buses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {d.buses.map((b) => (
                            <Badge key={b.id} variant="secondary">
                              {b.bus_number}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          d.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {d.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(d)}
                        title="Edit driver"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              <IdCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No drivers yet. Add a driver to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EditDriverDialog
        driver={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
