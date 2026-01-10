import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
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
  Droplets,
  Hash,
  BadgeCheck,
  Pencil,
  X,
  Save,
  Loader2
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
  const updateProfile = useUpdateProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
  });

  const isLoading = profileLoading || 
    (userRole === 'student' && studentLoading) ||
    (userRole === 'teacher' && teacherLoading) ||
    (userRole === 'parent' && parentLoading);

  const handleStartEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
      });
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      full_name: formData.full_name,
      phone: formData.phone || null,
      address: formData.address || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
    });
    setIsEditing(false);
  };

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Profile</CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          )}
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

          {/* Basic Info - View Mode */}
          {!isEditing ? (
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
          ) : (
            /* Basic Info - Edit Mode */
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Edit Information
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter your address"
                    rows={3}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

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
