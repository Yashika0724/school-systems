import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Receipt,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useFeeCategories,
  useFeeStructures,
  useAllInvoices,
  useFeeStats,
  useCreateFeeStructure,
  useRecordPayment,
} from '@/hooks/useFeeManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

export function FeeManagement() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isStructureDialogOpen, setIsStructureDialogOpen] = useState(false);

  // New structure form state
  const [newStructure, setNewStructure] = useState({
    class_id: '',
    category_id: '',
    amount: '',
    frequency: 'monthly',
    due_day: '10',
  });

  const { data: categories, isLoading: categoriesLoading } = useFeeCategories();
  const { data: structures, isLoading: structuresLoading } = useFeeStructures();
  const { data: invoices, isLoading: invoicesLoading } = useAllInvoices(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { data: stats, isLoading: statsLoading } = useFeeStats();

  // Fetch classes for the fee structure form
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, section')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createStructure = useCreateFeeStructure();
  const recordPayment = useRecordPayment();

  const handleCreateStructure = async () => {
    if (!newStructure.class_id || !newStructure.category_id || !newStructure.amount) return;

    await createStructure.mutateAsync({
      class_id: newStructure.class_id,
      category_id: newStructure.category_id,
      amount: parseFloat(newStructure.amount),
      frequency: newStructure.frequency,
      due_day: parseInt(newStructure.due_day),
    });

    setNewStructure({ class_id: '', category_id: '', amount: '', frequency: 'monthly', due_day: '10' });
    setIsStructureDialogOpen(false);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    await recordPayment.mutateAsync({
      invoice_id: selectedInvoice,
      amount: parseFloat(paymentAmount),
      payment_method: paymentMethod,
    });

    setPaymentAmount('');
    setPaymentMethod('cash');
    setSelectedInvoice(null);
    setIsPaymentDialogOpen(false);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground">Manage fee structures, invoices, and payments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isStructureDialogOpen} onOpenChange={setIsStructureDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Structure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Fee Structure</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select
                    value={newStructure.class_id}
                    onValueChange={(v) => setNewStructure(prev => ({ ...prev, class_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fee Category</Label>
                  <Select
                    value={newStructure.category_id}
                    onValueChange={(v) => setNewStructure(prev => ({ ...prev, category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newStructure.amount}
                    onChange={(e) => setNewStructure(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newStructure.frequency}
                    onValueChange={(v) => setNewStructure(prev => ({ ...prev, frequency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one-time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={newStructure.due_day}
                    onChange={(e) => setNewStructure(prev => ({ ...prev, due_day: e.target.value }))}
                  />
                </div>
                <Button onClick={handleCreateStructure} className="w-full" disabled={createStructure.isPending}>
                  {createStructure.isPending ? 'Creating...' : 'Create Structure'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Collected</p>
                    <p className="text-xl font-bold text-green-800">{formatCurrency(stats?.totalCollected || 0)}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700">Pending</p>
                    <p className="text-xl font-bold text-orange-800">{formatCurrency(stats?.totalPending || 0)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Expected</p>
                    <p className="text-xl font-bold text-blue-800">{formatCurrency(stats?.totalExpected || 0)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700">Overdue</p>
                    <p className="text-xl font-bold text-red-800">{stats?.overdueCount || 0}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Collection Progress */}
      {stats && stats.totalExpected > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Collection Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Collection</span>
                <span className="font-medium">
                  {Math.round((stats.totalCollected / stats.totalExpected) * 100)}%
                </span>
              </div>
              <Progress 
                value={(stats.totalCollected / stats.totalExpected) * 100} 
                className="h-3" 
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="structures">
            <DollarSign className="h-4 w-4 mr-2" />
            Fee Structures
          </TabsTrigger>
          <TabsTrigger value="categories">
            <CreditCard className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices
                      .filter(inv => 
                        !searchQuery || 
                        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(invoice.paid_amount)}
                          </TableCell>
                          <TableCell className="text-orange-600">
                            {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            {invoice.status !== 'paid' && (
                              <Dialog open={isPaymentDialogOpen && selectedInvoice === invoice.id} onOpenChange={(open) => {
                                setIsPaymentDialogOpen(open);
                                if (!open) setSelectedInvoice(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedInvoice(invoice.id)}
                                  >
                                    Record Payment
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Record Payment</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    <div className="p-4 bg-muted rounded-lg">
                                      <p className="text-sm text-muted-foreground">Balance Due</p>
                                      <p className="text-2xl font-bold">
                                        {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Payment Amount (₹)</Label>
                                      <Input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        max={invoice.total_amount - invoice.paid_amount}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Payment Method</Label>
                                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="cash">Cash</SelectItem>
                                          <SelectItem value="upi">UPI</SelectItem>
                                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                          <SelectItem value="cheque">Cheque</SelectItem>
                                          <SelectItem value="online">Online</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button 
                                      onClick={handleRecordPayment} 
                                      className="w-full"
                                      disabled={recordPayment.isPending || !paymentAmount}
                                    >
                                      {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {structuresLoading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : structures && structures.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Due Day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structures.map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell>
                          {structure.class?.name} {structure.class?.section}
                        </TableCell>
                        <TableCell>{structure.category?.name}</TableCell>
                        <TableCell>{formatCurrency(structure.amount)}</TableCell>
                        <TableCell className="capitalize">{structure.frequency}</TableCell>
                        <TableCell>{structure.due_day}th</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fee structures configured</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsStructureDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Fee Structure
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {categoriesLoading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories?.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-muted-foreground">{category.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={category.is_recurring ? 'default' : 'secondary'}>
                            {category.is_recurring ? 'Recurring' : 'One-time'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
