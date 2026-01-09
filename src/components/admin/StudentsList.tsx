import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAllStudents } from '@/hooks/useAdminStats';

interface StudentsListProps {
  searchQuery: string;
}

export function StudentsList({ searchQuery }: StudentsListProps) {
  const { data: students, isLoading, error } = useAllStudents();

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
          Error loading students. Please try again.
        </CardContent>
      </Card>
    );
  }

  const filteredStudents = students?.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.profile?.full_name?.toLowerCase().includes(query) ||
      student.profile?.email?.toLowerCase().includes(query) ||
      student.roll_number?.toLowerCase().includes(query) ||
      student.admission_number?.toLowerCase().includes(query)
    );
  });

  if (!filteredStudents?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {searchQuery ? 'No students found matching your search.' : 'No students registered yet.'}
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
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Roll No.</TableHead>
              <TableHead>Admission No.</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={student.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {student.profile?.full_name ? getInitials(student.profile.full_name) : 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{student.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{student.profile?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {student.class ? (
                    <Badge variant="secondary">
                      {student.class.name} - {student.class.section}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>{student.roll_number || '-'}</TableCell>
                <TableCell>{student.admission_number || '-'}</TableCell>
                <TableCell>{student.profile?.phone || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
