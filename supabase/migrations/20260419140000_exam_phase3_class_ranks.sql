-- ============================================================
-- Exam Module Phase 3 — Class Ranks
--   * class_ranks table keyed by (exam_type, class, student)
--   * compute_class_ranks(exam_type_id, class_id) recalculates
-- ============================================================

CREATE TABLE public.class_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type_id UUID NOT NULL REFERENCES public.exam_types(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  total_obtained NUMERIC(8,2) NOT NULL,
  total_max NUMERIC(8,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  rank INT NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_type_id, class_id, student_id)
);

ALTER TABLE public.class_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages ranks"
ON public.class_ranks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers view ranks for their classes"
ON public.class_ranks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.teacher_classes tc
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE tc.class_id = class_ranks.class_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Students view own rank if published"
ON public.class_ranks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = class_ranks.student_id AND s.user_id = auth.uid()
  )
  AND public.is_result_published(class_ranks.exam_type_id, class_ranks.class_id)
);

CREATE POLICY "Parents view child rank if published"
ON public.class_ranks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.parent_student ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE ps.student_id = class_ranks.student_id AND p.user_id = auth.uid()
  )
  AND public.is_result_published(class_ranks.exam_type_id, class_ranks.class_id)
);

CREATE INDEX idx_class_ranks_scope ON public.class_ranks(exam_type_id, class_id);

-- Recompute ranks for a given (exam_type, class). Idempotent — called on publish.
CREATE OR REPLACE FUNCTION public.compute_class_ranks(_exam_type_id UUID, _class_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.class_ranks
   WHERE exam_type_id = _exam_type_id AND class_id = _class_id;

  INSERT INTO public.class_ranks
    (exam_type_id, class_id, student_id, total_obtained, total_max, percentage, rank)
  SELECT
    _exam_type_id,
    _class_id,
    student_id,
    SUM(marks_obtained)::NUMERIC(8,2) AS total_obtained,
    SUM(max_marks)::NUMERIC(8,2) AS total_max,
    CASE
      WHEN SUM(max_marks) > 0 THEN ((SUM(marks_obtained) / SUM(max_marks)) * 100)::NUMERIC(5,2)
      ELSE 0
    END AS percentage,
    RANK() OVER (
      ORDER BY CASE
        WHEN SUM(max_marks) > 0 THEN SUM(marks_obtained) / SUM(max_marks)
        ELSE 0
      END DESC
    ) AS rank
  FROM public.marks
  WHERE exam_type_id = _exam_type_id
    AND class_id = _class_id
  GROUP BY student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_class_ranks(UUID, UUID) TO authenticated;
