import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, GraduationCap, BookOpen, Users } from 'lucide-react';
import { useAllClasses } from '@/hooks/useAdminStats';
import { z } from 'zod';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: 'student' | 'teacher' | 'parent';
}

const baseSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

const studentSchema = baseSchema.extend({
  classId: z.string().optional(),
  rollNumber: z.string().optional(),
  admissionNumber: z.string().optional(),
});

const teacherSchema = baseSchema.extend({
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  qualification: z.string().optional(),
});

const parentSchema = baseSchema.extend({
  occupation: z.string().optional(),
  relationship: z.string().optional(),
});

export function CreateUserDialog({ open, onOpenChange, userType }: CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const { data: classes } = useAllClasses();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Student-specific
  const [classId, setClassId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  
  // Teacher-specific
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  
  // Parent-specific
  const [occupation, setOccupation] = useState('');
  const [relationship, setRelationship] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setClassId('');
    setRollNumber('');
    setAdmissionNumber('');
    setEmployeeId('');
    setDesignation('');
    setQualification('');
    setOccupation('');
    setRelationship('');
    setErrors({});
  };

  const validateForm = () => {
    try {
      const baseData = { email, password, fullName, phone };
      
      if (userType === 'student') {
        studentSchema.parse({ ...baseData, classId, rollNumber, admissionNumber });
      } else if (userType === 'teacher') {
        teacherSchema.parse({ ...baseData, employeeId, designation, qualification });
      } else {
        parentSchema.parse({ ...baseData, occupation, relationship });
      }
      
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const userId = authData.user.id;

      // 2. Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
      });

      if (profileError) throw profileError;

      // 3. Assign role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: userType,
      });

      if (roleError) throw roleError;

      // 4. Create role-specific record
      if (userType === 'student') {
        const { error } = await supabase.from('students').insert({
          user_id: userId,
          class_id: classId || null,
          roll_number: rollNumber || null,
          admission_number: admissionNumber || null,
        });
        if (error) throw error;
      } else if (userType === 'teacher') {
        const { error } = await supabase.from('teachers').insert({
          user_id: userId,
          employee_id: employeeId || null,
          designation: designation || null,
          qualification: qualification || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('parents').insert({
          user_id: userId,
          occupation: occupation || null,
          relationship: relationship || null,
        });
        if (error) throw error;
      }

      toast.success(`${userType.charAt(0).toUpperCase() + userType.slice(1)} created successfully!`);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['all-students'] });
      queryClient.invalidateQueries({ queryKey: ['all-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['all-parents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      if (error.message?.includes('already registered')) {
        toast.error('A user with this email already exists');
      } else {
        toast.error(error.message || 'Failed to create user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const userTypeLabels = {
    student: { title: 'Add New Student', icon: GraduationCap },
    teacher: { title: 'Add New Teacher', icon: BookOpen },
    parent: { title: 'Add New Parent', icon: Users },
  };

  const { title, icon: Icon } = userTypeLabels[userType];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new {userType} account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          {/* Student-specific fields */}
          {userType === 'student' && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Student Details</h4>
              
              <div className="space-y-2">
                <Label htmlFor="classId">Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g., 15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admissionNumber">Admission No.</Label>
                  <Input
                    id="admissionNumber"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="e.g., ADM2024001"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Teacher-specific fields */}
          {userType === 'teacher' && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Teacher Details</h4>
              
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g., TCH2024001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g., Senior Mathematics Teacher"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g., M.Sc., B.Ed."
                />
              </div>
            </div>
          )}

          {/* Parent-specific fields */}
          {userType === 'parent' && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Parent Details</h4>
              
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${userType.charAt(0).toUpperCase() + userType.slice(1)}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
