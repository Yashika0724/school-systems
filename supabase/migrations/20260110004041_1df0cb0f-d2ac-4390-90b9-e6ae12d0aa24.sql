-- Create school_settings table for system configuration
CREATE TABLE public.school_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Only admin can manage settings
CREATE POLICY "Admin can manage all settings"
ON public.school_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view settings
CREATE POLICY "Authenticated users can view settings"
ON public.school_settings
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_school_settings_updated_at
BEFORE UPDATE ON public.school_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create exams table for exam scheduling
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_type_id UUID NOT NULL REFERENCES public.exam_types(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  max_marks INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Admin can manage all exams
CREATE POLICY "Admin can manage all exams"
ON public.exams
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view exams for their classes
CREATE POLICY "Teachers can view class exams"
ON public.exams
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
  SELECT 1 FROM teacher_classes tc
  JOIN teachers t ON t.id = tc.teacher_id
  WHERE tc.class_id = exams.class_id AND t.user_id = auth.uid()
));

-- Students can view their class exams
CREATE POLICY "Students can view own class exams"
ON public.exams
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.class_id = exams.class_id AND s.user_id = auth.uid()
));

-- Parents can view their children's class exams
CREATE POLICY "Parents can view children class exams"
ON public.exams
FOR SELECT
USING (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
  SELECT 1 FROM parent_student ps
  JOIN parents p ON p.id = ps.parent_id
  JOIN students s ON s.id = ps.student_id
  WHERE s.class_id = exams.class_id AND p.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default school settings
INSERT INTO public.school_settings (setting_key, setting_value, description, category) VALUES
  ('school_name', '"Demo School"', 'Name of the school', 'general'),
  ('school_address', '"{}"', 'School address details', 'general'),
  ('academic_year', '"2024-25"', 'Current academic year', 'academic'),
  ('school_phone', '""', 'School contact number', 'contact'),
  ('school_email', '""', 'School email address', 'contact'),
  ('school_logo', 'null', 'School logo URL', 'branding'),
  ('attendance_time', '"09:00"', 'Default attendance marking time', 'academic'),
  ('working_days', '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]', 'Working days of the week', 'academic'),
  ('grading_system', '{"A": 90, "B": 80, "C": 70, "D": 60, "E": 50, "F": 0}', 'Grading thresholds', 'academic');