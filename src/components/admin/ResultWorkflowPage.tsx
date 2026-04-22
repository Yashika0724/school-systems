import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileCheck, ShieldCheck, Send, Undo2 } from 'lucide-react';
import {
  useResultWorkflow,
  useSetPublicationStatus,
  type PublicationStatus,
} from '@/hooks/useResultPublications';

function statusBadge(status: PublicationStatus) {
  if (status === 'published') {
    return <Badge className="bg-green-100 text-green-800 border-green-300">Published</Badge>;
  }
  if (status === 'moderated') {
    return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Moderated</Badge>;
  }
  return <Badge variant="secondary">Draft</Badge>;
}

export function ResultWorkflowPage() {
  const { data: rows, isLoading } = useResultWorkflow();
  const setStatus = useSetPublicationStatus();

  const setTo = (exam_type_id: string, class_id: string, status: PublicationStatus) =>
    setStatus.mutate({ exam_type_id, class_id, status });

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
          <FileCheck className="h-6 w-6" />
          Result Workflow
        </h1>
        <p className="text-muted-foreground">
          Moderate teacher submissions, then publish to make results visible to students and parents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class × Exam Type Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {!rows || rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No marks have been entered yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Exam Type</TableHead>
                  <TableHead>Marks Entered</TableHead>
                  <TableHead>Drafts</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.exam_type_id}-${row.class_id}`}>
                    <TableCell className="font-medium">{row.class_label}</TableCell>
                    <TableCell>{row.exam_type_name}</TableCell>
                    <TableCell>{row.total_marks}</TableCell>
                    <TableCell>
                      {row.draft_count > 0 ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          {row.draft_count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>{row.submitted_count}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {row.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={row.draft_count > 0 || setStatus.isPending}
                          onClick={() => setTo(row.exam_type_id, row.class_id, 'moderated')}
                        >
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Moderate
                        </Button>
                      )}
                      {row.status === 'moderated' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={setStatus.isPending}
                            onClick={() => setTo(row.exam_type_id, row.class_id, 'draft')}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            Revert
                          </Button>
                          <Button
                            size="sm"
                            disabled={setStatus.isPending}
                            onClick={() => setTo(row.exam_type_id, row.class_id, 'published')}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Publish
                          </Button>
                        </>
                      )}
                      {row.status === 'published' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setStatus.isPending}
                          onClick={() => setTo(row.exam_type_id, row.class_id, 'moderated')}
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Unpublish
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
          <p><strong>Draft → Moderated:</strong> all teacher entries for this class/exam must be submitted first.</p>
          <p><strong>Moderated → Published:</strong> students and parents can now see results. Teachers can no longer edit.</p>
          <p><strong>Unpublish:</strong> hides results again — use only to fix errors.</p>
        </CardContent>
      </Card>
    </div>
  );
}
