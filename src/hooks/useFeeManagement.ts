import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface FeeCategory {
  id: string;
  name: string;
  description: string | null;
  is_recurring: boolean;
  created_at: string;
}

export interface FeeStructure {
  id: string;
  class_id: string;
  category_id: string;
  amount: number;
  frequency: string;
  academic_year: string;
  due_day: number;
  late_fee_amount: number;
  created_at: string;
  updated_at: string;
  class?: { id: string; name: string; section: string };
  category?: FeeCategory;
}

export interface FeeInvoice {
  id: string;
  invoice_number: string;
  student_id: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  month: number | null;
  quarter: number | null;
  academic_year: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    roll_number: string;
    class?: { id: string; name: string; section: string };
    profile?: { full_name: string };
  };
  items?: FeeInvoiceItem[];
  payments?: FeePayment[];
}

export interface FeeInvoiceItem {
  id: string;
  invoice_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  created_at: string;
  category?: FeeCategory;
}

export interface FeePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  payment_date: string;
  received_by: string | null;
  notes: string | null;
  created_at: string;
}

// Hooks
export function useFeeCategories() {
  return useQuery({
    queryKey: ['fee-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as FeeCategory[];
    },
  });
}

export function useFeeStructures(classId?: string) {
  return useQuery({
    queryKey: ['fee-structures', classId],
    queryFn: async () => {
      let query = supabase
        .from('fee_structures')
        .select(`
          *,
          class:classes(id, name, section),
          category:fee_categories(*)
        `)
        .order('created_at', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeeStructure[];
    },
  });
}

export function useStudentInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-invoices', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // First get the student ID
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError) throw studentError;

      const { data, error } = await supabase
        .from('fee_invoices')
        .select(`
          *,
          items:fee_invoice_items(*, category:fee_categories(*)),
          payments:fee_payments(*)
        `)
        .eq('student_id', student.id)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as FeeInvoice[];
    },
    enabled: !!user?.id,
  });
}

export function useParentChildrenInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['parent-children-invoices', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // Get parent ID
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (parentError) throw parentError;

      // Get linked student IDs
      const { data: links, error: linksError } = await supabase
        .from('parent_student')
        .select('student_id')
        .eq('parent_id', parent.id);

      if (linksError) throw linksError;

      const studentIds = links.map(l => l.student_id);

      if (studentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('fee_invoices')
        .select(`
          *,
          items:fee_invoice_items(*, category:fee_categories(*)),
          payments:fee_payments(*)
        `)
        .in('student_id', studentIds)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as FeeInvoice[];
    },
    enabled: !!user?.id,
  });
}

export function useAllInvoices(filters?: { status?: string; academic_year?: string }) {
  return useQuery({
    queryKey: ['all-invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('fee_invoices')
        .select(`
          *,
          items:fee_invoice_items(*, category:fee_categories(*)),
          payments:fee_payments(*)
        `)
        .order('due_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.academic_year) {
        query = query.eq('academic_year', filters.academic_year);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeeInvoice[];
    },
  });
}

export function useFeeStats() {
  return useQuery({
    queryKey: ['fee-stats'],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from('fee_invoices')
        .select('total_amount, paid_amount, status');

      if (error) throw error;

      const stats = {
        totalExpected: 0,
        totalCollected: 0,
        totalPending: 0,
        overdueCount: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
      };

      invoices?.forEach(inv => {
        stats.totalExpected += Number(inv.total_amount);
        stats.totalCollected += Number(inv.paid_amount);

        if (inv.status === 'paid') stats.paidCount++;
        else if (inv.status === 'partial') stats.partialCount++;
        else if (inv.status === 'overdue') stats.overdueCount++;
        else stats.pendingCount++;
      });

      stats.totalPending = stats.totalExpected - stats.totalCollected;

      return stats;
    },
  });
}

// Mutations
export function useCreateFeeStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      class_id: string;
      category_id: string;
      amount: number;
      frequency: string;
      due_day?: number;
      late_fee_amount?: number;
    }) => {
      const { error } = await supabase.from('fee_structures').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast.success('Fee structure created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create fee structure: ${error.message}`);
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      total_amount: number;
      due_date: string;
      month?: number;
      quarter?: number;
      items: { category_id?: string; description: string; amount: number }[];
    }) => {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from('fee_invoices')
        .insert({
          invoice_number: invoiceNumber,
          student_id: data.student_id,
          total_amount: data.total_amount,
          due_date: data.due_date,
          month: data.month,
          quarter: data.quarter,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const items = data.items.map(item => ({
        invoice_id: invoice.id,
        ...item,
      }));

      const { error: itemsError } = await supabase
        .from('fee_invoice_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fee-stats'] });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      invoice_id: string;
      amount: number;
      payment_method: string;
      transaction_id?: string;
      notes?: string;
    }) => {
      // Insert payment
      const { error: paymentError } = await supabase
        .from('fee_payments')
        .insert(data);

      if (paymentError) throw paymentError;

      // Update invoice paid_amount and status
      const { data: invoice, error: invoiceError } = await supabase
        .from('fee_invoices')
        .select('total_amount, paid_amount')
        .eq('id', data.invoice_id)
        .single();

      if (invoiceError) throw invoiceError;

      const newPaidAmount = Number(invoice.paid_amount) + data.amount;
      const newStatus = newPaidAmount >= Number(invoice.total_amount)
        ? 'paid'
        : newPaidAmount > 0
          ? 'partial'
          : 'pending';

      const { error: updateError } = await supabase
        .from('fee_invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', data.invoice_id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['parent-children-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fee-stats'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}

export function useGenerateInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      class_id: string;
      month?: number;
      term?: number; // 1, 2, 3 etc
      academic_year: string;
      type: 'monthly' | 'term' | 'one-time' | 'yearly';
    }) => {
      // 1. Get all students in the class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', data.class_id);

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) throw new Error('No students found in this class');

      // 2. Get applicable fee structures
      let structureQuery = supabase
        .from('fee_structures')
        .select('*, category:fee_categories(*)')
        .eq('class_id', data.class_id)
        .eq('academic_year', data.academic_year);

      // Filter by type/frequency
      if (data.type === 'monthly') {
        structureQuery = structureQuery.eq('frequency', 'monthly');
      } else if (data.type === 'term') {
        structureQuery = structureQuery.eq('frequency', 'quarterly');
      } else if (data.type === 'yearly') {
        structureQuery = structureQuery.eq('frequency', 'yearly');
      } else if (data.type === 'one-time') {
        structureQuery = structureQuery.eq('frequency', 'one-time');
      }

      const { data: structures, error: structuresError } = await structureQuery;

      if (structuresError) throw structuresError;
      if (!structures || structures.length === 0) throw new Error('No fee structures found for this criteria');

      // 3. Create invoices for each student
      let successCount = 0;

      // Calculate due date based on type
      const now = new Date();
      const currentYear = now.getFullYear();
      let dueDate = new Date();

      if (data.type === 'monthly' && data.month) {
        // Due on 10th of the selected month
        // Adjust year if selecting a month in the next calendar year part of the academic year
        // For simplicity, assuming academic year 2024-25 starts in April 2024
        // If data.month < 4 (Jan, Feb, Mar), it's next year (2025)
        // If data.month >= 4, it's current year (2024)
        // But we don't know the refined academic year start logic here easily without more config
        // So we'll use a simple heuristic: if month is before current month, assume next year? 
        // Or just use current year for now and let user edit. 
        // Better: use the year from academic_year string? '2024-25' -> 2024
        const startYear = parseInt(data.academic_year.split('-')[0]);
        const year = data.month < 4 ? startYear + 1 : startYear;
        dueDate = new Date(year, data.month - 1, 10);
      } else {
        // Default to due in 10 days
        dueDate.setDate(dueDate.getDate() + 10);
      }

      const getInvoiceNumber = () => `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      for (const student of students) {
        try {
          // Check for existing invoice
          let checkQuery = supabase
            .from('fee_invoices')
            .select('id')
            .eq('student_id', student.id)
            .eq('academic_year', data.academic_year);

          if (data.type === 'monthly' && data.month) {
            checkQuery = checkQuery.eq('month', data.month);
          } else if (data.type === 'term' && data.term) {
            checkQuery = checkQuery.eq('quarter', data.term);
          }

          const { data: existing } = await checkQuery;

          if (existing && existing.length > 0) {
            continue;
          }

          const totalAmount = structures.reduce((sum, s) => sum + Number(s.amount), 0);
          if (totalAmount <= 0) continue;

          // Insert invoice
          const { data: invoice, error: invError } = await supabase
            .from('fee_invoices')
            .insert({
              invoice_number: getInvoiceNumber(),
              student_id: student.id,
              total_amount: totalAmount,
              due_date: dueDate.toISOString(),
              month: data.type === 'monthly' ? data.month : null,
              quarter: data.type === 'term' ? data.term : null,
              academic_year: data.academic_year,
              status: 'pending'
            })
            .select()
            .single();

          if (invError) throw invError;

          // Insert items
          const items = structures.map(s => ({
            invoice_id: invoice.id,
            category_id: s.category_id,
            description: `${s.category?.name} - ${data.type}`,
            amount: s.amount
          }));

          const { error: itemsError } = await supabase
            .from('fee_invoice_items')
            .insert(items);

          if (itemsError) throw itemsError;

          successCount++;
        } catch (e) {
          console.error(`Failed to generate invoice for student ${student.id}`, e);
        }
      }

      return { successCount, totalStudents: students.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fee-stats'] });
      toast.success(`Generated ${data.successCount} invoices`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate invoices: ${error.message}`);
    },
  });
}
