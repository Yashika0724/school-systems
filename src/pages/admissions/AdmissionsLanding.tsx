import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  Search,
  CheckCircle2,
  Mail,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdmissionsSettings } from '@/hooks/useAdmissions';

export default function AdmissionsLanding() {
  const { data: settings, isLoading } = useAdmissionsSettings();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold">School Connect Hub</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/admissions/status">
              <Button variant="ghost" size="sm">
                <Search className="h-4 w-4 mr-1" />
                Check status
              </Button>
            </Link>
            <Link to="/login/parent">
              <Button variant="outline" size="sm">
                Parent login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="text-sm">
            {isLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : settings?.is_open ? (
              <span className="text-emerald-600">
                ● Applications open for {settings.academic_year}
              </span>
            ) : (
              <span className="text-red-600">● Applications currently closed</span>
            )}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Admissions
          </h1>
          <p className="text-lg text-muted-foreground">
            Apply online in a few minutes. You'll receive an application number immediately and
            can track your status any time.
          </p>

          {settings?.instructions && (
            <div className="bg-white rounded-lg border p-4 text-left text-sm text-muted-foreground whitespace-pre-wrap">
              {settings.instructions}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link to="/admissions/apply">
              <Button size="lg" className="w-full sm:w-auto" disabled={!settings?.is_open}>
                {settings?.is_open ? 'Apply now' : 'Applications closed'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/admissions/status">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Search className="h-4 w-4 mr-2" />
                Check application status
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto pb-16">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">1. Apply</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Fill a short form with your child's and parent details. Takes about 5 minutes.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                <Search className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">2. Track</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use your application number and parent email to check status at any time.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
                <GraduationCap className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">3. Enroll</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              On approval, we create your parent and student logins and share them with you.
            </CardContent>
          </Card>
        </div>

        {settings?.contact_email && (
          <div className="text-center mt-10 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Mail className="h-4 w-4" />
            Questions? Contact{' '}
            <a
              href={`mailto:${settings.contact_email}`}
              className="text-primary underline"
            >
              {settings.contact_email}
            </a>
          </div>
        )}

        {settings && settings.application_fee > 0 && (
          <p className="text-center mt-2 text-xs text-muted-foreground">
            Application fee: ₹{settings.application_fee}
          </p>
        )}
      </section>
    </div>
  );
}
