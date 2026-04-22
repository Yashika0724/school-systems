import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExamTypes } from '@/hooks/useExams';
import { useGradingScales } from '@/hooks/useGradingScales';
import { useSchoolInfo } from '@/hooks/useSchoolSettings';
import { buildReportCardData } from '@/lib/reportCardBuilder';
import { ReportCardPDF } from '@/components/pdf/ReportCardPDF';
import { downloadPdf } from '@/lib/pdfDownload';
import { toast } from 'sonner';

const FULL_YEAR = '__full__';

export function StudentReportCardPage() {
  const { user } = useAuth();
  const { data: school } = useSchoolInfo();
  const { data: examTypes } = useExamTypes();
  const { data: bands } = useGradingScales();

  const [examTypeId, setExamTypeId] = useState<string>(FULL_YEAR);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const handleDownload = async () => {
    if (!student || !school || !bands) return;
    setIsDownloading(true);
    try {
      const data = await buildReportCardData({
        studentId: student.id,
        school,
        gradingBands: bands,
        examTypeId: examTypeId === FULL_YEAR ? undefined : examTypeId,
      });
      if (data.sections.length === 0) {
        toast.error('No published results to include yet.');
        return;
      }
      const filename = `ReportCard-${data.student_name.replace(/\s+/g, '')}-${
        examTypeId === FULL_YEAR
          ? 'Full'
          : data.sections[0]?.exam_type_name.replace(/\s+/g, '') || 'Report'
      }.pdf`;
      await downloadPdf(<ReportCardPDF data={data} />, filename);
    } catch (e: any) {
      toast.error('Failed to generate report card: ' + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Report Card
        </h1>
        <p className="text-muted-foreground">
          Download your term-wise or full-year report card.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose Scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={examTypeId} onValueChange={setExamTypeId}>
            <SelectTrigger className="md:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FULL_YEAR}>Full Academic Year</SelectItem>
              {examTypes?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleDownload} disabled={isDownloading || !student}>
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>

          <p className="text-xs text-muted-foreground">
            Only published results appear on your report card. If a section looks empty,
            your school hasn't released those marks yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
