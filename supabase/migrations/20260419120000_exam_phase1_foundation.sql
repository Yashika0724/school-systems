-- ============================================================
-- Exam Module Phase 1 — Foundation
--   * grading_scales          : configurable letter-grade bands per school
--   * exam_eligibility_rules  : attendance thresholds per exam type
--   * result_publications     : draft -> moderated -> published lifecycle
--   * marks_detail            : theory/practical/internal component split
--   * marks.submission_status : teacher draft/submit workflow
--   * marks.flag              : absent / malpractice / re_exam
--   * is_result_published()   : RLS helper for gating student/parent views
-- ============================================================

-- ============================
-- 1. GRADING SCALES
-- ============================
CREATE TABLE public.grading_scales (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    min_pct NUMERIC(5,2) NOT NULL,
    max_pct NUMERIC(5,2) NOT NULL,
    letter TEXT NOT NULL,
    grade_point NUMERIC(4,2),
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CHECK (min_pct >= 0 AND max_pct <= 100 AND min_pct <= max_pct),
    UNIQUE(name, letter)
);

ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grading scales viewable by authenticated"
ON public.grading_scales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin manages grading scales"
ON public.grading_scales FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_grading_scales_updated_at
BEFORE UPDATE ON public.grading_scales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a default 7-band scale (matches existing client-side grade calc)
INSERT INTO public.grading_scales (name, min_pct, max_pct, letter, grade_point, description, is_default) VALUES
    ('Default', 90, 100, 'A+', 10.0, 'Outstanding', true),
    ('Default', 80, 89.99, 'A',  9.0,  'Excellent', true),
    ('Default', 70, 79.99, 'B+', 8.0,  'Very Good', true),
    ('Default', 60, 69.99, 'B',  7.0,  'Good', true),
    ('Default', 50, 59.99, 'C',  6.0,  'Average', true),
    ('Default', 40, 49.99, 'D',  5.0,  'Below Average', true),
    ('Default',  0, 39.99, 'F',  0.0,  'Fail', true);

-- ============================
-- 2. EXAM ELIGIBILITY RULES
-- ============================
CREATE TABLE public.exam_eligibility_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_type_id UUID REFERENCES public.exam_types(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    min_attendance_pct NUMERIC(5,2) DEFAULT 75,
    require_fees_paid BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    -- Either scoped to an exam_type (applies to all classes) or exam_type + class
    UNIQUE(exam_type_id, class_id)
);

ALTER TABLE public.exam_eligibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eligibility rules viewable by authenticated"
ON public.exam_eligibility_rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin manages eligibility rules"
ON public.exam_eligibility_rules FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_exam_eligibility_rules_updated_at
BEFORE UPDATE ON public.exam_eligibility_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================
-- 3. RESULT PUBLICATIONS
--    Keyed by (exam_type_id, class_id). One row per class per exam cycle.
--    Lifecycle: draft -> moderated -> published
-- ============================
CREATE TABLE public.result_publications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_type_id UUID NOT NULL REFERENCES public.exam_types(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'moderated', 'published')),
    moderated_by UUID REFERENCES auth.users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES auth.users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(exam_type_id, class_id)
);

ALTER TABLE public.result_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Publications viewable by authenticated"
ON public.result_publications FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin manages publications"
ON public.result_publications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_result_publications_updated_at
BEFORE UPDATE ON public.result_publications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================
-- 4. MARKS DETAIL (theory / practical / internal)
-- ============================
CREATE TABLE public.marks_detail (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    marks_id UUID NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
    component TEXT NOT NULL CHECK (component IN ('theory', 'practical', 'internal', 'project', 'oral')),
    marks_obtained NUMERIC(6,2) NOT NULL,
    max_marks NUMERIC(6,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(marks_id, component)
);

ALTER TABLE public.marks_detail ENABLE ROW LEVEL SECURITY;

-- Mirror parent `marks` RLS so teachers can manage components for their classes
CREATE POLICY "Admin manages marks_detail"
ON public.marks_detail FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers manage marks_detail for their subjects"
ON public.marks_detail FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
        SELECT 1 FROM public.marks m
        JOIN public.teacher_classes tc
          ON tc.class_id = m.class_id AND tc.subject_id = m.subject_id
        JOIN public.teachers t ON t.id = tc.teacher_id
        WHERE m.id = marks_detail.marks_id
          AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Students view own marks_detail"
ON public.marks_detail FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.marks m
        JOIN public.students s ON s.id = m.student_id
        WHERE m.id = marks_detail.marks_id
          AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Parents view children marks_detail"
ON public.marks_detail FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
        SELECT 1 FROM public.marks m
        JOIN public.parent_student ps ON ps.student_id = m.student_id
        JOIN public.parents p ON p.id = ps.parent_id
        WHERE m.id = marks_detail.marks_id
          AND p.user_id = auth.uid()
    )
);

-- ============================
-- 5. MARKS TABLE EXTENSIONS
-- ============================
ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS submission_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (submission_status IN ('draft', 'submitted')),
  ADD COLUMN IF NOT EXISTS flag TEXT
    CHECK (flag IN ('absent', 'malpractice', 're_exam') OR flag IS NULL);

-- Existing rows get 'submitted' so they stay visible once we gate student/parent reads
UPDATE public.marks SET submission_status = 'submitted' WHERE submission_status = 'draft';

-- ============================
-- 6. RLS HELPER — is_result_published
-- ============================
CREATE OR REPLACE FUNCTION public.is_result_published(_exam_type_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.result_publications
    WHERE exam_type_id = _exam_type_id
      AND class_id = _class_id
      AND status = 'published'
  )
$$;

-- ============================
-- 7. MARKS RLS — gate student/parent reads on publication
-- ============================
DROP POLICY IF EXISTS "Students can view own marks" ON public.marks;
CREATE POLICY "Students can view own published marks"
ON public.marks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = marks.student_id
          AND s.user_id = auth.uid()
    )
    AND public.is_result_published(marks.exam_type_id, marks.class_id)
);

DROP POLICY IF EXISTS "Parents can view their children's marks" ON public.marks;
CREATE POLICY "Parents view children published marks"
ON public.marks FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
        SELECT 1 FROM public.parent_student ps
        JOIN public.parents p ON p.id = ps.parent_id
        WHERE ps.student_id = marks.student_id
          AND p.user_id = auth.uid()
    )
    AND public.is_result_published(marks.exam_type_id, marks.class_id)
);

-- Block teacher edits once the class+exam_type has been moderated/published
DROP POLICY IF EXISTS "Teachers can manage marks for their subjects and classes" ON public.marks;
CREATE POLICY "Teachers manage draft marks for their subjects"
ON public.marks FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
        SELECT 1 FROM public.teacher_classes tc
        JOIN public.teachers t ON t.id = tc.teacher_id
        WHERE tc.class_id = marks.class_id
          AND tc.subject_id = marks.subject_id
          AND t.user_id = auth.uid()
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.result_publications rp
        WHERE rp.exam_type_id = marks.exam_type_id
          AND rp.class_id = marks.class_id
          AND rp.status IN ('moderated', 'published')
    )
);

-- ============================
-- 8. BACKFILL — publish existing marks so nothing disappears
-- ============================
INSERT INTO public.result_publications (exam_type_id, class_id, status, published_at)
SELECT DISTINCT exam_type_id, class_id, 'published', now()
FROM public.marks
ON CONFLICT (exam_type_id, class_id) DO NOTHING;

-- ============================
-- 9. INDEXES
-- ============================
CREATE INDEX IF NOT EXISTS idx_marks_submission_status ON public.marks(submission_status);
CREATE INDEX IF NOT EXISTS idx_result_publications_status ON public.result_publications(status);
CREATE INDEX IF NOT EXISTS idx_marks_detail_marks_id ON public.marks_detail(marks_id);
