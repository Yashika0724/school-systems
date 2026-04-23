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
import { Pencil, Phone, UserSquare2 } from 'lucide-react';
import { type Conductor, useConductors } from '@/hooks/useTransportation';
import { CreateConductorDialog } from './CreateConductorDialog';
import { EditConductorDialog } from './EditConductorDialog';

export function ConductorsTab() {
  const { data: conductors, isLoading } = useConductors();
  const [editing, setEditing] = useState<Conductor | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateConductorDialog />
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
          ) : conductors && conductors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Emergency Contact</TableHead>
                  <TableHead>Assigned Bus</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conductors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>
                      {c.phone ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.date_of_joining
                        ? new Date(c.date_of_joining).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.emergency_contact || '—'}
                    </TableCell>
                    <TableCell>
                      {c.buses && c.buses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.buses.map((b) => (
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
                          c.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(c)}
                        title="Edit conductor"
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
              <UserSquare2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No conductors yet. Add one to assign to a bus.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EditConductorDialog
        conductor={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
