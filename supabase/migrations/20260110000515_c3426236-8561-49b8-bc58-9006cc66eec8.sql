-- Phase 3: Fee Management Schema

-- Fee categories (Tuition, Transport, Lab, etc.)
CREATE TABLE public.fee_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fee structures (defines fee amounts per class/category)
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.fee_categories(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, yearly, one-time
  academic_year TEXT NOT NULL DEFAULT '2024-25',
  due_day INTEGER DEFAULT 10, -- Day of month when due
  late_fee_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, category_id, academic_year, frequency)
);

-- Fee invoices (generated for each student)
CREATE TABLE public.fee_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, partial, paid, overdue
  month INTEGER, -- 1-12 for monthly fees
  quarter INTEGER, -- 1-4 for quarterly fees
  academic_year TEXT NOT NULL DEFAULT '2024-25',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fee invoice items (breakdown of each invoice)
CREATE TABLE public.fee_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.fee_invoices(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.fee_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fee payments (records of payments made)
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.fee_invoices(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash, upi, bank_transfer, cheque, online
  transaction_id TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  received_by UUID, -- staff who received payment
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fee_categories
CREATE POLICY "Admin can manage fee categories"
ON public.fee_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view fee categories"
ON public.fee_categories FOR SELECT
USING (true);

-- RLS Policies for fee_structures
CREATE POLICY "Admin can manage fee structures"
ON public.fee_structures FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view fee structures"
ON public.fee_structures FOR SELECT
USING (true);

-- RLS Policies for fee_invoices
CREATE POLICY "Admin can manage all invoices"
ON public.fee_invoices FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view own invoices"
ON public.fee_invoices FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = fee_invoices.student_id AND s.user_id = auth.uid()
));

CREATE POLICY "Parents can view their children's invoices"
ON public.fee_invoices FOR SELECT
USING (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
  SELECT 1 FROM parent_student ps
  JOIN parents p ON p.id = ps.parent_id
  WHERE ps.student_id = fee_invoices.student_id AND p.user_id = auth.uid()
));

-- RLS Policies for fee_invoice_items
CREATE POLICY "Admin can manage all invoice items"
ON public.fee_invoice_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view invoice items for their invoices"
ON public.fee_invoice_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM fee_invoices fi
  JOIN students s ON s.id = fi.student_id
  WHERE fi.id = fee_invoice_items.invoice_id AND s.user_id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM fee_invoices fi
  JOIN parent_student ps ON ps.student_id = fi.student_id
  JOIN parents p ON p.id = ps.parent_id
  WHERE fi.id = fee_invoice_items.invoice_id AND p.user_id = auth.uid()
));

-- RLS Policies for fee_payments
CREATE POLICY "Admin can manage all payments"
ON public.fee_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view payments for their invoices"
ON public.fee_payments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM fee_invoices fi
  JOIN students s ON s.id = fi.student_id
  WHERE fi.id = fee_payments.invoice_id AND s.user_id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM fee_invoices fi
  JOIN parent_student ps ON ps.student_id = fi.student_id
  JOIN parents p ON p.id = ps.parent_id
  WHERE fi.id = fee_payments.invoice_id AND p.user_id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_fee_structures_updated_at
BEFORE UPDATE ON public.fee_structures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_invoices_updated_at
BEFORE UPDATE ON public.fee_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default fee categories
INSERT INTO public.fee_categories (name, description, is_recurring) VALUES
('Tuition Fee', 'Monthly tuition fee', true),
('Transport Fee', 'School bus/transport fee', true),
('Lab Fee', 'Laboratory usage fee', true),
('Library Fee', 'Library access and maintenance', true),
('Sports Fee', 'Sports facilities and equipment', true),
('Exam Fee', 'Examination fee', false),
('Admission Fee', 'One-time admission fee', false),
('Annual Fee', 'Yearly miscellaneous charges', false);