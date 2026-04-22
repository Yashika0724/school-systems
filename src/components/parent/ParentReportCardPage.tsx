import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, ScrollText } from 'lucide-react';
import { useParentData, useLinkedChildren } from '@/hooks/useParentData';
import { useExamTypes } from '@/hooks/useExams';
import { useGradingScales } from '@/hooks/useGradingScales';
import { useSchoolInfo } from '@/hooks/useSchoolSettings';
import { buildReportCardData } from '@/lib/reportCardBuilder';
import { ReportCardPDF } from '@/components/pdf/ReportCardPDF';
import { downloadPdf } from '@/lib/pdfDownload';
import { toast } from 'sonner';

const FULL_YEAR = '__full__';

export function ParentReportCardPage() {
  const { data: parent, isLoading: parentLoading } = useParentData();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(parent?.id);
  const { data: school } = useSchoolInfo();
  const { data: examTypes } = useExamTypes();
  const { data: bands } = useGradingScales();

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [examTypeId, setExamTypeId] = useState<string>(FULL_YEAR);
  const [isDownloading, setIsDownloading] = useState(false);

  const activeChildId = selectedChildId || children?.[0]?.student_id || null;
  const selectedChild = children?.find((c) => c.student_id === activeChildId);

  const handleDownload = async () => {
    if (!activeChildId || !school || !bands) return;
    setIsDownloading(true);
    try {
      const data = await buildReportCardData({
        studentId: activeChildId,
        school,
        gradingBands: bands,
        examTypeId: examTypeId === FULL_YEAR ? undefined : examTypeId,
      });
      if (data.sections.length === 0) {
        toast.error('No published results yet for this child.');
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

  if (parentLoading || childrenLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Children Linked</h3>
            <p className="text-muted-foreground">
              Contact admin to link your children to your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Report Cards
        </h1>
        <p className="text-muted-foreground">
          Download your child's report card for a specific term or the full year.
        </p>
      </div>

      {children.length > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Select Child:</span>
              <Select
                value={activeChildId || ''}
                onValueChange={setSelectedChildId}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.student_id} value={child.student_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={child.student.profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {child.student.profile?.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {child.student.profile?.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedChild && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-blue-500">
                <AvatarImage src={selectedChild.student.profile?.avatar_url || ''} />
                <AvatarFallback>
                  {selectedChild.student.profile?.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">
                  {selectedChild.student.profile?.full_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Class {selectedChild.student.class?.name}{' '}
                  {selectedChild.student.class?.section} · Roll{' '}
                  {selectedChild.student.roll_number || '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Download Report</CardTitle>
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

          <Button onClick={handleDownload} disabled={isDownloading || !activeChildId}>
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
