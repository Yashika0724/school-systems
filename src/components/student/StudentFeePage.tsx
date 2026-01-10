import {
  CreditCard,
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useStudentInvoices } from '@/hooks/useFeeManagement';

export function StudentFeePage() {
  const { data: invoices, isLoading } = useStudentInvoices();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  // Calculate summary stats
  const totalDue = invoices?.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0) || 0;
  const totalPaid = invoices?.reduce((sum, inv) => sum + inv.paid_amount, 0) || 0;
  const pendingInvoices = invoices?.filter(inv => inv.status !== 'paid').length || 0;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fee Details</h1>
        <p className="text-muted-foreground">View your fee invoices and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">Total Due</p>
                <p className="text-2xl font-bold text-orange-800">{formatCurrency(totalDue)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Total Paid</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Pending Invoices</p>
                <p className="text-2xl font-bold text-blue-800">{pendingInvoices}</p>
              </div>
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Fee Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {invoices.map((invoice) => (
                <AccordionItem 
                  key={invoice.id} 
                  value={invoice.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center justify-between w-full mr-4">
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-mono text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
                          {invoice.paid_amount > 0 && invoice.status !== 'paid' && (
                            <p className="text-xs text-green-600">
                              Paid: {formatCurrency(invoice.paid_amount)}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4">
                      {/* Payment Progress */}
                      {invoice.status !== 'paid' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Payment Progress</span>
                            <span className="font-medium">
                              {Math.round((invoice.paid_amount / invoice.total_amount) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(invoice.paid_amount / invoice.total_amount) * 100} 
                            className="h-2" 
                          />
                        </div>
                      )}

                      {/* Invoice Items */}
                      {invoice.items && invoice.items.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Breakdown</h4>
                          <div className="space-y-2">
                            {invoice.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                                <span>{item.description}</span>
                                <span className="font-medium">{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment History */}
                      {invoice.payments && invoice.payments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Payment History</h4>
                          <div className="space-y-2">
                            {invoice.payments.map((payment) => (
                              <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-green-50 rounded border border-green-200">
                                <div>
                                  <p className="font-medium text-green-800">{formatCurrency(payment.amount)}</p>
                                  <p className="text-xs text-green-600">
                                    {new Date(payment.payment_date).toLocaleDateString('en-IN')} • {payment.payment_method.toUpperCase()}
                                  </p>
                                </div>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Balance Due */}
                      {invoice.status !== 'paid' && (
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <span className="font-medium text-orange-800">Balance Due</span>
                          <span className="text-lg font-bold text-orange-800">
                            {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fee invoices found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
