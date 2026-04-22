-- ============================================================
-- Exam Module Phase 2 — Seat Allocations + Hall Tickets
--   * exam_seat_allocations : one seat per (student, exam_type)
--     hall_ticket_no is a stable human-readable ID per student
-- ============================================================

CREATE TABLE public.exam_seat_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_type_id UUID NOT NULL REFERENCES public.exam_types(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    room TEXT,
    seat_no TEXT,
    hall_ticket_no TEXT NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(exam_type_id, student_id),
    UNIQUE(hall_ticket_no)
);

ALTER TABLE public.exam_seat_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages seat allocations"
ON public.exam_seat_allocations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers view seat allocations for their classes"
ON public.exam_seat_allocations FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
        SELECT 1 FROM public.teacher_classes tc
        JOIN public.teachers t ON t.id = tc.teacher_id
        WHERE tc.class_id = exam_seat_allocations.class_id
          AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Students view own seat allocations"
ON public.exam_seat_allocations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = exam_seat_allocations.student_id
          AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Parents view children seat allocations"
ON public.exam_seat_allocations FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
        SELECT 1 FROM public.parent_student ps
        JOIN public.parents p ON p.id = ps.parent_id
        WHERE ps.student_id = exam_seat_allocations.student_id
          AND p.user_id = auth.uid()
    )
);

CREATE TRIGGER update_exam_seat_allocations_updated_at
BEFORE UPDATE ON public.exam_seat_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_seat_alloc_class ON public.exam_seat_allocations(class_id);
CREATE INDEX idx_seat_alloc_exam_type ON public.exam_seat_allocations(exam_type_id);
