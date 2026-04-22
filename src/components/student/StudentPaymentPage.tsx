import { useState } from 'react';
import {
  CreditCard,
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  Wallet,
  ArrowRight,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useStudentInvoices, FeeInvoice } from '@/hooks/useFeeManagement';
import { useDemo } from '@/contexts/DemoContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createOrder, openRazorpayCheckout, verifyPayment } from '@/lib/razorpay';

// Demo invoices
const demoInvoices: FeeInvoice[] = [
  {
    id: '1',
    invoice_number: 'INV-2026-001',
    student_id: '1',
    total_amount: 15000,
    paid_amount: 5000,
    due_date: '2026-01-31',
    status: 'partial',
    month: 1,
    quarter: null,
    academic_year: '2025-26',
    notes: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    items: [
      { id: '1', invoice_id: '1', category_id: '1', description: 'Tuition Fee', amount: 10000, created_at: '' },
      { id: '2', invoice_id: '1', category_id: '2', description: 'Lab Fee', amount: 3000, created_at: '' },
      { id: '3', invoice_id: '1', category_id: '3', description: 'Library Fee', amount: 2000, created_at: '' },
    ],
    payments: [
      { id: '1', invoice_id: '1', amount: 5000, payment_method: 'card', transaction_id: 'TXN123456', payment_date: '2026-01-05', received_by: null, notes: null, created_at: '' },
    ],
  },
  {
    id: '2',
    invoice_number: 'INV-2025-012',
    student_id: '1',
    total_amount: 12000,
    paid_amount: 12000,
    due_date: '2025-12-31',
    status: 'paid',
    month: 12,
    quarter: null,
    academic_year: '2025-26',
    notes: null,
    created_at: '2025-12-01',
    updated_at: '2025-12-15',
    items: [
      { id: '4', invoice_id: '2', category_id: '1', description: 'Tuition Fee', amount: 10000, created_at: '' },
      { id: '5', invoice_id: '2', category_id: '3', description: 'Activity Fee', amount: 2000, created_at: '' },
    ],
    payments: [
      { id: '2', invoice_id: '2', amount: 12000, payment_method: 'upi', transaction_id: 'UPI987654', payment_date: '2025-12-10', received_by: null, notes: null, created_at: '' },
    ],
  },
];

export function StudentPaymentPage() {
  const { isDemo } = useDemo();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: invoices, isLoading } = useStudentInvoices();

  const [selectedInvoice, setSelectedInvoice] = useState<FeeInvoice | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [lastTxnId, setLastTxnId] = useState<string>('');

  const displayInvoices = isDemo ? demoInvoices : invoices;

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

  const totalDue = displayInvoices?.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0) || 0;
  const totalPaid = displayInvoices?.reduce((sum, inv) => sum + inv.paid_amount, 0) || 0;
  const pendingInvoices = displayInvoices?.filter(inv => inv.status !== 'paid').length || 0;

  const handlePayNow = (invoice: FeeInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount((invoice.total_amount - invoice.paid_amount).toString());
    setIsPaymentDialogOpen(true);
    setPaymentSuccess(false);
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (isDemo) {
      setIsProcessing(true);
      await new Promise((r) => setTimeout(r, 1200));
      setIsProcessing(false);
      setLastTxnId(`DEMO${Date.now().toString().slice(-8)}`);
      setPaymentSuccess(true);
      toast.success('Demo payment successful');
      return;
    }

    setIsProcessing(true);
    try {
      const order = await createOrder(selectedInvoice.id, amount);
      const rzp = await openRazorpayCheckout({
        order,
        description: `Fee payment for ${order.invoice_number}`,
        prefill: { email: user?.email ?? undefined },
      });
      const verification = await verifyPayment({
        invoice_id: selectedInvoice.id,
        razorpay_order_id: rzp.razorpay_order_id,
        razorpay_payment_id: rzp.razorpay_payment_id,
        razorpay_signature: rzp.razorpay_signature,
      });
      setLastTxnId(rzp.razorpay_payment_id);
      setPaymentSuccess(true);
      toast.success(
        verification.already_recorded
          ? 'Payment already recorded'
          : `Payment successful — ₹${verification.amount}`,
      );
      queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fee-stats'] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      if (msg !== 'Payment cancelled') toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClosePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setSelectedInvoice(null);
    setPaymentAmount('');
    setPaymentSuccess(false);
    setLastTxnId('');
  };

  if (isLoading && !isDemo) {
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
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View and pay your fee invoices</p>
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
              <Wallet className="h-8 w-8 text-orange-600" />
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
          {displayInvoices && displayInvoices.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {displayInvoices.map((invoice) => (
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

                      {/* Pay Now Button */}
                      {invoice.status !== 'paid' && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <span className="font-medium text-orange-800">Balance Due</span>
                            <span className="text-lg font-bold text-orange-800">
                              {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                            </span>
                          </div>
                          <Button 
                            className="w-full" 
                            size="lg"
                            onClick={() => handlePayNow(invoice)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay Now
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
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

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={handleClosePaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentSuccess ? 'Payment Successful!' : 'Make Payment'}
            </DialogTitle>
            <DialogDescription>
              {paymentSuccess 
                ? 'Your payment has been processed successfully.'
                : `Invoice: ${selectedInvoice?.invoice_number}`
              }
            </DialogDescription>
          </DialogHeader>

          {paymentSuccess ? (
            <div className="py-8 text-center">
              <div className="h-20 w-20 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600 mb-2">
                {formatCurrency(parseFloat(paymentAmount))}
              </p>
              <p className="text-sm text-muted-foreground mb-4 font-mono break-all px-4">
                {lastTxnId ? `Txn: ${lastTxnId}` : ''}
              </p>
              <Button onClick={handleClosePaymentDialog} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(selectedInvoice ? selectedInvoice.total_amount - selectedInvoice.paid_amount : 0)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-10"
                    max={selectedInvoice ? selectedInvoice.total_amount - selectedInvoice.paid_amount : 0}
                  />
                </div>
              </div>

              <Button
                onClick={handleProcessPayment}
                className="w-full"
                size="lg"
                disabled={isProcessing || !paymentAmount}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay {formatCurrency(parseFloat(paymentAmount) || 0)}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                {isDemo
                  ? 'Demo mode — no real transaction will occur.'
                  : 'Secured by Razorpay. UPI, cards, net-banking & wallets supported.'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
