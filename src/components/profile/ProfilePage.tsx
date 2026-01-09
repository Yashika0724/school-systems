import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentData } from '@/hooks/useStudentData';
import { useTeacherData } from '@/hooks/useTeacherData';
import { useParentData } from '@/hooks/useParentData';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  GraduationCap,
  Briefcase,
  Users,
  BookOpen,
  Droplets,
  Hash,
  BadgeCheck
} from 'lucide-react';
import { format } from 'date-fns';

interface ProfileItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}

function ProfileItem({ icon, label, value }: ProfileItemProps) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-5 w-5" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { userRole } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: studentData, isLoading: studentLoading } = useStudentData();
  const { data: teacherData, isLoading: teacherLoading } = useTeacherData();
  const { data: parentData, isLoading: parentLoading } = useParentData();

  const isLoading = profileLoading || 
    (userRole === 'student' && studentLoading) ||
    (userRole === 'teacher' && teacherLoading) ||
    (userRole === 'parent' && parentLoading);

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const roleLabels: Record<string, string> = {
    student: 'Student',
    parent: 'Parent/Guardian',
    teacher: 'Teacher',
    admin: 'Administrator',
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header with avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-primary/10">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{profile?.full_name}</h2>
              <Badge variant="secondary" className="mt-1">
                {roleLabels[userRole || ''] || 'User'}
              </Badge>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <ProfileItem 
                icon={<Mail className="h-5 w-5" />}
                label="Email"
                value={profile?.email}
              />
              <ProfileItem 
                icon={<Phone className="h-5 w-5" />}
                label="Phone"
                value={profile?.phone}
              />
              <ProfileItem 
                icon={<MapPin className="h-5 w-5" />}
                label="Address"
                value={profile?.address}
              />
              <ProfileItem 
                icon={<Calendar className="h-5 w-5" />}
                label="Date of Birth"
                value={profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'PPP') : null}
              />
              <ProfileItem 
                icon={<User className="h-5 w-5" />}
                label="Gender"
                value={profile?.gender}
              />
            </div>
          </div>

          {/* Role-specific Info */}
          {userRole === 'student' && studentData && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Student Information
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <ProfileItem 
                  icon={<GraduationCap className="h-5 w-5" />}
                  label="Class"
                  value={studentData.class ? `${studentData.class.name} - ${studentData.class.section}` : null}
                />
                <ProfileItem 
                  icon={<Hash className="h-5 w-5" />}
                  label="Roll Number"
                  value={studentData.roll_number}
                />
                <ProfileItem 
                  icon={<BadgeCheck className="h-5 w-5" />}
                  label="Admission Number"
                  value={studentData.admission_number}
                />
                <ProfileItem 
                  icon={<Calendar className="h-5 w-5" />}
                  label="Admission Date"
                  value={studentData.admission_date ? format(new Date(studentData.admission_date), 'PPP') : null}
                />
                <ProfileItem 
                  icon={<Droplets className="h-5 w-5" />}
                  label="Blood Group"
                  value={studentData.blood_group}
                />
                <ProfileItem 
                  icon={<Phone className="h-5 w-5" />}
                  label="Emergency Contact"
                  value={studentData.emergency_contact}
                />
              </div>
            </div>
          )}

          {userRole === 'teacher' && teacherData && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Teacher Information
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <ProfileItem 
                  icon={<BadgeCheck className="h-5 w-5" />}
                  label="Employee ID"
                  value={teacherData.employee_id}
                />
                <ProfileItem 
                  icon={<Briefcase className="h-5 w-5" />}
                  label="Designation"
                  value={teacherData.designation}
                />
                <ProfileItem 
                  icon={<GraduationCap className="h-5 w-5" />}
                  label="Qualification"
                  value={teacherData.qualification}
                />
                <ProfileItem 
                  icon={<Calendar className="h-5 w-5" />}
                  label="Joining Date"
                  value={teacherData.joining_date ? format(new Date(teacherData.joining_date), 'PPP') : null}
                />
              </div>
            </div>
          )}

          {userRole === 'parent' && parentData && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Parent Information
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <ProfileItem 
                  icon={<Briefcase className="h-5 w-5" />}
                  label="Occupation"
                  value={parentData.occupation}
                />
                <ProfileItem 
                  icon={<Users className="h-5 w-5" />}
                  label="Relationship"
                  value={parentData.relationship}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
