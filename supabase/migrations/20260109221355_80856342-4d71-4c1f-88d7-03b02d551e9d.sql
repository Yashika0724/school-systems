-- Phase 2: Core Daily Operations Tables

-- ============================
-- ATTENDANCE TABLE
-- ============================
CREATE TABLE public.attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by UUID REFERENCES auth.users(id),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance
CREATE POLICY "Admin can manage all attendance"
ON public.attendance FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage attendance for their classes"
ON public.attendance FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'teacher') AND 
    EXISTS (
        SELECT 1 FROM teacher_classes tc
        JOIN teachers t ON t.id = tc.teacher_id
        WHERE tc.class_id = attendance.class_id
        AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Students can view own attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = attendance.student_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Parents can view their children's attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'parent') AND
    EXISTS (
        SELECT 1 FROM parent_student ps
        JOIN parents p ON p.id = ps.parent_id
        WHERE ps.student_id = attendance.student_id
        AND p.user_id = auth.uid()
    )
);

-- ============================
-- EXAM TYPES TABLE
-- ============================
CREATE TABLE public.exam_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weightage DECIMAL(5,2) DEFAULT 100,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2024-25',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exam types viewable by authenticated users"
ON public.exam_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can manage exam types"
ON public.exam_types FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- ============================
-- MARKS TABLE
-- ============================
CREATE TABLE public.marks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    exam_type_id UUID NOT NULL REFERENCES public.exam_types(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL DEFAULT 100,
    grade VARCHAR(5),
    remarks TEXT,
    entered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, subject_id, exam_type_id)
);

-- Enable RLS
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all marks"
ON public.marks FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage marks for their subjects and classes"
ON public.marks FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM teacher_classes tc
        JOIN teachers t ON t.id = tc.teacher_id
        WHERE tc.class_id = marks.class_id
        AND tc.subject_id = marks.subject_id
        AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Students can view own marks"
ON public.marks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = marks.student_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Parents can view their children's marks"
ON public.marks FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'parent') AND
    EXISTS (
        SELECT 1 FROM parent_student ps
        JOIN parents p ON p.id = ps.parent_id
        WHERE ps.student_id = marks.student_id
        AND p.user_id = auth.uid()
    )
);

-- ============================
-- HOMEWORK TABLE
-- ============================
CREATE TABLE public.homework (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all homework"
ON public.homework FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage homework for their classes"
ON public.homework FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM teacher_classes tc
        JOIN teachers t ON t.id = tc.teacher_id
        WHERE tc.class_id = homework.class_id
        AND tc.subject_id = homework.subject_id
        AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Students can view homework for their class"
ON public.homework FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.class_id = homework.class_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Parents can view homework for their children's classes"
ON public.homework FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'parent') AND
    EXISTS (
        SELECT 1 FROM parent_student ps
        JOIN parents p ON p.id = ps.parent_id
        JOIN students s ON s.id = ps.student_id
        WHERE s.class_id = homework.class_id
        AND p.user_id = auth.uid()
    )
);

-- ============================
-- HOMEWORK SUBMISSIONS TABLE
-- ============================
CREATE TABLE public.homework_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    submission_text TEXT,
    attachment_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed', 'graded')),
    grade VARCHAR(5),
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(homework_id, student_id)
);

-- Enable RLS
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all homework submissions"
ON public.homework_submissions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage submissions for their homework"
ON public.homework_submissions FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM homework hw
        JOIN teacher_classes tc ON tc.class_id = hw.class_id AND tc.subject_id = hw.subject_id
        JOIN teachers t ON t.id = tc.teacher_id
        WHERE hw.id = homework_submissions.homework_id
        AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Students can manage own submissions"
ON public.homework_submissions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = homework_submissions.student_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Parents can view their children's submissions"
ON public.homework_submissions FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'parent') AND
    EXISTS (
        SELECT 1 FROM parent_student ps
        JOIN parents p ON p.id = ps.parent_id
        WHERE ps.student_id = homework_submissions.student_id
        AND p.user_id = auth.uid()
    )
);

-- ============================
-- TRIGGERS FOR UPDATED_AT
-- ============================
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marks_updated_at
    BEFORE UPDATE ON public.marks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homework_updated_at
    BEFORE UPDATE ON public.homework
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homework_submissions_updated_at
    BEFORE UPDATE ON public.homework_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================
-- INSERT DEFAULT EXAM TYPES
-- ============================
INSERT INTO public.exam_types (name, description, weightage) VALUES
('Unit Test 1', 'First unit test of the term', 10),
('Unit Test 2', 'Second unit test of the term', 10),
('Mid Term', 'Mid-term examination', 30),
('Final Term', 'Final term examination', 50);

-- ============================
-- INSERT SAMPLE SUBJECTS
-- ============================
INSERT INTO public.subjects (name, code) VALUES
('Mathematics', 'MATH'),
('English', 'ENG'),
('Science', 'SCI'),
('Social Studies', 'SST'),
('Hindi', 'HIN'),
('Computer Science', 'CS')
ON CONFLICT DO NOTHING;