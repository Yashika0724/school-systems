import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  CalendarCheck,
  BookOpen,
  PenTool,
  IndianRupee,
  Bus,
  Phone,
  Mail,
  CalendarDays,
  Hash,
  Droplets,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LinkedChild {
  student_id: string;
  relationship: string | null;
  roll_number: string | null;
  admission_number: string | null;
  admission_date: string | null;
  blood_group: string | null;
  emergency_contact: string | null;
  class: { name: string | null; section: string | null } | null;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    date_of_birth: string | null;
    gender: string | null;
  } | null;
}

export function ParentChildrenPage() {
  const { user } = useAuth();

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-linked-children', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LinkedChild[]> => {
      const { data: parent, error: pErr } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!parent) return [];

      const { data: links, error: lErr } = await supabase
        .from('parent_student')
        .select(
          `
          relationship,
          student:students(
            id,
            roll_number,
            admission_number,
            admission_date,
            blood_group,
            emergency_contact,
            class:classes(name, section),
            user_id
          )
        `,
        )
        .eq('parent_id', parent.id);
      if (lErr) throw lErr;

      const userIds = (links || [])
        .map((l) => (l.student as { user_id?: string } | null)?.user_id)
        .filter((v): v is string => !!v);

      const profileMap = new Map<string, LinkedChild['profile']>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone, avatar_url, date_of_birth, gender')
          .in('user_id', userIds);
        (profs || []).forEach((p) => {
          profileMap.set(p.user_id, {
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            avatar_url: p.avatar_url,
            date_of_birth: p.date_of_birth,
            gender: p.gender,
          });
        });
      }

      return (links || []).map((l) => {
        const s = l.student as {
          id: string;
          roll_number: string | null;
          admission_number: string | null;
          admission_date: string | null;
          blood_group: string | null;
          emergency_contact: string | null;
          class: { name: string | null; section: string | null } | null;
          user_id: string;
        } | null;
        return {
          student_id: s?.id ?? '',
          relationship: l.relationship ?? null,
          roll_number: s?.roll_number ?? null,
          admission_number: s?.admission_number ?? null,
          admission_date: s?.admission_date ?? null,
          blood_group: s?.blood_group ?? null,
          emergency_contact: s?.emergency_contact ?? null,
          class: s?.class ?? null,
          profile: s?.user_id ? profileMap.get(s.user_id) ?? null : null,
        };
      });
    },
  });

  const initials = (name: string | null) =>
    (name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const quickLinks = useMemo(
    () => [
      { label: 'Attendance', icon: CalendarCheck, to: '/parent/attendance' },
      { label: 'Marks', icon: BookOpen, to: '/parent/marks' },
      { label: 'Homework', icon: PenTool, to: '/parent/homework' },
      { label: 'Fees', icon: IndianRupee, to: '/parent/fees' },
      { label: 'Transport', icon: Bus, to: '/parent/transport' },
    ],
    [],
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Children</h1>
        <p className="text-muted-foreground">
          Linked student profiles. Contact admin to add or remove a child.
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : !children || children.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No children linked to your account</p>
            <p className="text-sm mt-2">
              Please contact the school admin to link your child&rsquo;s profile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {children.map((child) => (
            <Card key={child.student_id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10 pb-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                    <AvatarImage src={child.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {initials(child.profile?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">
                      {child.profile?.full_name || 'Unnamed student'}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {child.class && (
                        <Badge variant="secondary">
                          {child.class.name} - {child.class.section}
                        </Badge>
                      )}
                      {child.relationship && (
                        <Badge variant="outline" className="capitalize">
                          {child.relationship}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {child.roll_number && (
                    <InfoRow icon={Hash} label="Roll" value={child.roll_number} />
                  )}
                  {child.admission_number && (
                    <InfoRow icon={Hash} label="Admission" value={child.admission_number} />
                  )}
                  {child.admission_date && (
                    <InfoRow
                      icon={CalendarDays}
                      label="Admitted"
                      value={new Date(child.admission_date).toLocaleDateString('en-IN')}
                    />
                  )}
                  {child.blood_group && (
                    <InfoRow icon={Droplets} label="Blood" value={child.blood_group} />
                  )}
                  {child.profile?.phone && (
                    <InfoRow icon={Phone} label="Phone" value={child.profile.phone} />
                  )}
                  {child.profile?.email && (
                    <InfoRow icon={Mail} label="Email" value={child.profile.email} />
                  )}
                  {child.emergency_contact && (
                    <InfoRow
                      icon={Phone}
                      label="Emergency"
                      value={child.emergency_contact}
                    />
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {quickLinks.map((link) => (
                    <Button key={link.to} asChild variant="outline" size="sm">
                      <Link to={link.to}>
                        <link.icon className="h-3.5 w-3.5 mr-1.5" />
                        {link.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
