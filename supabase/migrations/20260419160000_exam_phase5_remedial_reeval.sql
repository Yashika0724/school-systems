-- ============================================================
-- Exam Module Phase 5 — Remedial + Re-evaluation
--   * topic_mastery          : per-student topic scores from online attempts
--   * reevaluation_requests  : student -> teacher -> admin workflow
-- ============================================================

-- 1. TOPIC MASTERY
CREATE TABLE public.topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  correct_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  mastery_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, topic)
);

ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages mastery"
ON public.topic_mastery FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view own mastery"
ON public.topic_mastery FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = topic_mastery.student_id AND s.user_id = auth.uid()
));

CREATE POLICY "Parents view child mastery"
ON public.topic_mastery FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.parent_student ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE ps.student_id = topic_mastery.student_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers view mastery for their students"
ON public.topic_mastery FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.teacher_classes tc ON tc.class_id = s.class_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE s.id = topic_mastery.student_id AND t.user_id = auth.uid()
  )
);

CREATE INDEX idx_topic_mastery_student ON public.topic_mastery(student_id);

-- Recompute a student's topic mastery from their submitted attempts
CREATE OR REPLACE FUNCTION public.compute_topic_mastery(_student_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.topic_mastery WHERE student_id = _student_id;

  INSERT INTO public.topic_mastery
    (student_id, subject_id, topic, correct_count, total_count, mastery_pct)
  SELECT
    _student_id,
    b.subject_id,
    q.topic,
    SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::INT AS correct_count,
    COUNT(*)::INT AS total_count,
    ROUND(
      SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::NUMERIC
        / NULLIF(COUNT(*), 0) * 100,
      2
    )::NUMERIC(5,2) AS mastery_pct
  FROM public.attempt_answers aa
  JOIN public.exam_attempts ea ON ea.id = aa.attempt_id
  JOIN public.questions q ON q.id = aa.question_id
  JOIN public.question_banks b ON b.id = q.bank_id
  WHERE ea.student_id = _student_id
    AND ea.status = 'submitted'
    AND q.topic IS NOT NULL
    AND q.topic <> ''
  GROUP BY b.subject_id, q.topic;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_topic_mastery(UUID) TO authenticated;

-- 2. REEVALUATION REQUESTS
CREATE TABLE public.reevaluation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marks_id UUID NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  original_marks NUMERIC(5,2) NOT NULL,
  revised_marks NUMERIC(5,2),
  teacher_notes TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reevaluation_requests ENABLE ROW LEVEL SECURITY;

-- Admin: full control
CREATE POLICY "Admin manages reeval"
ON public.reevaluation_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Students: insert for own marks, view own
CREATE POLICY "Students create reeval for own marks"
ON public.reevaluation_requests FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marks m
    JOIN public.students s ON s.id = m.student_id
    WHERE m.id = reevaluation_requests.marks_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Students view own reeval"
ON public.reevaluation_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marks m
    JOIN public.students s ON s.id = m.student_id
    WHERE m.id = reevaluation_requests.marks_id
      AND s.user_id = auth.uid()
  )
);

-- Parents: insert for child's marks, view child's reeval
CREATE POLICY "Parents create reeval for child"
ON public.reevaluation_requests FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.marks m
    JOIN public.parent_student ps ON ps.student_id = m.student_id
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE m.id = reevaluation_requests.marks_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Parents view child reeval"
ON public.reevaluation_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.marks m
    JOIN public.parent_student ps ON ps.student_id = m.student_id
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE m.id = reevaluation_requests.marks_id
      AND p.user_id = auth.uid()
  )
);

-- Teachers: view + update (status/revised_marks/teacher_notes) for their class+subject
CREATE POLICY "Teachers view reeval for their classes"
ON public.reevaluation_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.marks m
    JOIN public.teacher_classes tc
      ON tc.class_id = m.class_id AND tc.subject_id = m.subject_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE m.id = reevaluation_requests.marks_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers update reeval for their classes"
ON public.reevaluation_requests FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.marks m
    JOIN public.teacher_classes tc
      ON tc.class_id = m.class_id AND tc.subject_id = m.subject_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE m.id = reevaluation_requests.marks_id
      AND t.user_id = auth.uid()
  )
);

CREATE TRIGGER update_reevaluation_requests_updated_at
BEFORE UPDATE ON public.reevaluation_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reeval_status ON public.reevaluation_requests(status);
CREATE INDEX idx_reeval_marks ON public.reevaluation_requests(marks_id);

-- Helper: when admin approves, apply revised_marks to the marks table.
-- Called by the UI after flipping status to 'approved'.
CREATE OR REPLACE FUNCTION public.apply_reeval(_reeval_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mid UUID;
  _new NUMERIC(5,2);
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin can apply reevaluation';
  END IF;

  SELECT marks_id, revised_marks INTO _mid, _new
  FROM public.reevaluation_requests
  WHERE id = _reeval_id AND status = 'approved';

  IF _mid IS NULL THEN
    RAISE EXCEPTION 'Approved reeval not found';
  END IF;

  IF _new IS NULL THEN
    RAISE EXCEPTION 'No revised marks on this request';
  END IF;

  UPDATE public.marks
  SET marks_obtained = _new, updated_at = now()
  WHERE id = _mid;

  UPDATE public.reevaluation_requests
  SET decided_by = auth.uid(), decided_at = now(), updated_at = now()
  WHERE id = _reeval_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_reeval(UUID) TO authenticated;
