-- ============================
-- ATTENDANCE JUSTIFICATIONS
-- Parent/student can request that an absence be marked as excused.
-- Class teacher (or admin) reviews and approves/rejects.
-- On approval, a trigger upserts the matching attendance row to 'excused'.
-- ============================

CREATE TABLE IF NOT EXISTS public.attendance_justifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_justifications_status
    ON public.attendance_justifications(status);
CREATE INDEX IF NOT EXISTS idx_attendance_justifications_class
    ON public.attendance_justifications(class_id, status);

ALTER TABLE public.attendance_justifications ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin can manage all justifications"
ON public.attendance_justifications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Class teachers can read + update status for their classes
CREATE POLICY "Teachers can view justifications for their classes"
ON public.attendance_justifications FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM teacher_classes tc
        JOIN teachers t ON t.id = tc.teacher_id
        WHERE tc.class_id = attendance_justifications.class_id
        AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Teachers can update justifications for their classes"
ON public.attendance_justifications FOR UPDATE
TO authenticated
USING (
    has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM teacher_classes tc
        JOIN teachers t ON t.id = tc.teacher_id
        WHERE tc.class_id = attendance_justifications.class_id
        AND t.user_id = auth.uid()
    )
);

-- Parents can manage justifications for their linked children
CREATE POLICY "Parents can view own children justifications"
ON public.attendance_justifications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM parent_student ps
        JOIN parents p ON p.id = ps.parent_id
        WHERE ps.student_id = attendance_justifications.student_id
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Parents can request justifications for own children"
ON public.attendance_justifications FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM parent_student ps
        JOIN parents p ON p.id = ps.parent_id
        WHERE ps.student_id = attendance_justifications.student_id
        AND p.user_id = auth.uid()
    )
);

-- Students can view + submit for themselves
CREATE POLICY "Students can view own justifications"
ON public.attendance_justifications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = attendance_justifications.student_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Students can request own justifications"
ON public.attendance_justifications FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = attendance_justifications.student_id
        AND s.user_id = auth.uid()
    )
);

-- Auto-mark attendance as excused when a justification is approved.
CREATE OR REPLACE FUNCTION public.apply_approved_justification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
        INSERT INTO public.attendance (student_id, class_id, date, status, remarks, marked_by)
        VALUES (NEW.student_id, NEW.class_id, NEW.date, 'excused', NEW.reason, NEW.reviewed_by)
        ON CONFLICT (student_id, date) DO UPDATE
            SET status = 'excused',
                remarks = EXCLUDED.remarks,
                marked_by = EXCLUDED.marked_by,
                updated_at = now();
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_approved_justification ON public.attendance_justifications;
CREATE TRIGGER trg_apply_approved_justification
BEFORE UPDATE ON public.attendance_justifications
FOR EACH ROW
EXECUTE FUNCTION public.apply_approved_justification();

-- Keep updated_at fresh on plain updates too.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
