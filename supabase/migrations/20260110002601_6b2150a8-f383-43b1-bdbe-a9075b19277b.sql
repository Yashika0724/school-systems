-- Create leave requests table for teachers and students
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('teacher', 'student')),
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'personal', 'family', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Admin can manage all leave requests
CREATE POLICY "Admin can manage all leave requests"
ON public.leave_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view and manage their own leave requests
CREATE POLICY "Teachers can manage own leave requests"
ON public.leave_requests
FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND user_id = auth.uid()
  AND user_type = 'teacher'
);

-- Students can view their own leave requests
CREATE POLICY "Students can view own leave requests"
ON public.leave_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role)
  AND user_id = auth.uid()
  AND user_type = 'student'
);

-- Students can create their own leave requests
CREATE POLICY "Students can create own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'student'::app_role)
  AND user_id = auth.uid()
  AND user_type = 'student'
);

-- Parents can view their children's leave requests
CREATE POLICY "Parents can view children leave requests"
ON public.leave_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'parent'::app_role)
  AND user_type = 'student'
  AND EXISTS (
    SELECT 1 FROM parent_student ps
    JOIN parents p ON p.id = ps.parent_id
    JOIN students s ON s.id = ps.student_id
    WHERE p.user_id = auth.uid()
    AND s.user_id = leave_requests.user_id
  )
);

-- Parents can create leave requests for their children
CREATE POLICY "Parents can create children leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'parent'::app_role)
  AND user_type = 'student'
  AND EXISTS (
    SELECT 1 FROM parent_student ps
    JOIN parents p ON p.id = ps.parent_id
    JOIN students s ON s.id = ps.student_id
    WHERE p.user_id = auth.uid()
    AND s.user_id = leave_requests.user_id
  )
);

-- Class teachers can view leave requests for students in their class
CREATE POLICY "Class teachers can view class leave requests"
ON public.leave_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND user_type = 'student'
  AND EXISTS (
    SELECT 1 FROM teacher_classes tc
    JOIN teachers t ON t.id = tc.teacher_id
    JOIN students s ON s.class_id = tc.class_id
    WHERE tc.is_class_teacher = true
    AND t.user_id = auth.uid()
    AND s.user_id = leave_requests.user_id
  )
);

-- Class teachers can approve/reject leave requests for students in their class
CREATE POLICY "Class teachers can update class leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND user_type = 'student'
  AND EXISTS (
    SELECT 1 FROM teacher_classes tc
    JOIN teachers t ON t.id = tc.teacher_id
    JOIN students s ON s.class_id = tc.class_id
    WHERE tc.is_class_teacher = true
    AND t.user_id = auth.uid()
    AND s.user_id = leave_requests.user_id
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_leave_requests_user ON public.leave_requests(user_id, user_type);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON public.leave_requests(start_date, end_date);