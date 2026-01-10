
-- LIBRARY SYSTEM TABLES

-- Books catalog
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  publisher TEXT,
  publication_year INTEGER,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Book issues/loans
CREATE TABLE public.book_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  issued_by UUID,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'issued',
  fine_amount NUMERIC DEFAULT 0,
  fine_paid BOOLEAN DEFAULT false,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Book reservations
CREATE TABLE public.book_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reservation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '3 days'),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TRANSPORTATION SYSTEM TABLES

-- Bus routes
CREATE TABLE public.bus_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name TEXT NOT NULL,
  route_number TEXT UNIQUE,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  stops JSONB DEFAULT '[]'::jsonb,
  morning_time TIME,
  evening_time TIME,
  distance_km NUMERIC,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Buses
CREATE TABLE public.buses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_number TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 40,
  driver_name TEXT,
  driver_phone TEXT,
  conductor_name TEXT,
  conductor_phone TEXT,
  route_id UUID REFERENCES public.bus_routes(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Student transport assignments
CREATE TABLE public.student_transport (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  pickup_point TEXT NOT NULL,
  drop_point TEXT,
  academic_year TEXT NOT NULL DEFAULT '2024-25',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, academic_year)
);

-- Enable RLS on all tables
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_transport ENABLE ROW LEVEL SECURITY;

-- LIBRARY RLS POLICIES

-- Books: viewable by all, managed by admin
CREATE POLICY "Books viewable by authenticated users" ON public.books FOR SELECT USING (true);
CREATE POLICY "Admin can manage books" ON public.books FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Book issues: students see own, parents see children, teachers see class, admin all
CREATE POLICY "Students can view own book issues" ON public.book_issues FOR SELECT
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = book_issues.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Parents can view children book issues" ON public.book_issues FOR SELECT
  USING (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM parent_student ps JOIN parents p ON p.id = ps.parent_id
    WHERE ps.student_id = book_issues.student_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admin can manage all book issues" ON public.book_issues FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Book reservations
CREATE POLICY "Students can manage own reservations" ON public.book_reservations FOR ALL
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = book_reservations.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Admin can manage all reservations" ON public.book_reservations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- TRANSPORTATION RLS POLICIES

-- Routes: viewable by all, managed by admin
CREATE POLICY "Routes viewable by authenticated users" ON public.bus_routes FOR SELECT USING (true);
CREATE POLICY "Admin can manage routes" ON public.bus_routes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Buses: viewable by all, managed by admin
CREATE POLICY "Buses viewable by authenticated users" ON public.buses FOR SELECT USING (true);
CREATE POLICY "Admin can manage buses" ON public.buses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Student transport: students see own, parents see children, admin all
CREATE POLICY "Students can view own transport" ON public.student_transport FOR SELECT
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = student_transport.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Parents can view children transport" ON public.student_transport FOR SELECT
  USING (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM parent_student ps JOIN parents p ON p.id = ps.parent_id
    WHERE ps.student_id = student_transport.student_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admin can manage all transport" ON public.student_transport FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_book_issues_updated_at BEFORE UPDATE ON public.book_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bus_routes_updated_at BEFORE UPDATE ON public.bus_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON public.buses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_transport_updated_at BEFORE UPDATE ON public.student_transport
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
