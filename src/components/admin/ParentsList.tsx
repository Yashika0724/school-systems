import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAllParents } from '@/hooks/useAdminStats';

interface ParentsListProps {
  searchQuery: string;
}

export function ParentsList({ searchQuery }: ParentsListProps) {
  const { data: parents, isLoading, error } = useAllParents();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Error loading parents. Please try again.
        </CardContent>
      </Card>
    );
  }

  const filteredParents = parents?.filter((parent) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      parent.profile?.full_name?.toLowerCase().includes(query) ||
      parent.profile?.email?.toLowerCase().includes(query) ||
      parent.occupation?.toLowerCase().includes(query)
    );
  });

  if (!filteredParents?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {searchQuery ? 'No parents found matching your search.' : 'No parents registered yet.'}
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parent</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Relationship</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParents.map((parent) => (
              <TableRow key={parent.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={parent.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {parent.profile?.full_name ? getInitials(parent.profile.full_name) : 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{parent.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{parent.profile?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{parent.profile?.phone || '-'}</TableCell>
                <TableCell>{parent.occupation || '-'}</TableCell>
                <TableCell className="capitalize">{parent.relationship || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
