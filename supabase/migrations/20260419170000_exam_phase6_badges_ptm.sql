-- ============================================================
-- Exam Module Phase 6 — Badges + PTM + Notifications
-- ============================================================

-- 1. STUDENT BADGES
CREATE TABLE public.student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'section_topper', 'subject_topper', 'improved_10pct',
    'consistent_high', 'perfect_score', 'comeback'
  )),
  title TEXT NOT NULL,
  description TEXT,
  exam_type_id UUID REFERENCES public.exam_types(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{}'::jsonb,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, badge_type, exam_type_id, subject_id)
);

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages badges"
ON public.student_badges FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view own badges"
ON public.student_badges FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = student_badges.student_id AND s.user_id = auth.uid()
));

CREATE POLICY "Parents view child badges"
ON public.student_badges FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.parent_student ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE ps.student_id = student_badges.student_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers view badges of their students"
ON public.student_badges FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.teacher_classes tc ON tc.class_id = s.class_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE s.id = student_badges.student_id AND t.user_id = auth.uid()
  )
);

CREATE INDEX idx_badges_student ON public.student_badges(student_id);

-- Compute badges for a just-published (exam_type, class) pair
CREATE OR REPLACE FUNCTION public.compute_student_badges(
  _exam_type_id UUID, _class_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exam_name TEXT;
BEGIN
  SELECT name INTO _exam_name FROM public.exam_types WHERE id = _exam_type_id;

  -- Section topper (rank 1)
  INSERT INTO public.student_badges (
    student_id, badge_type, title, description,
    exam_type_id, class_id, context
  )
  SELECT
    cr.student_id,
    'section_topper',
    'Section Topper',
    'Ranked #1 in ' || COALESCE(_exam_name, 'this exam'),
    _exam_type_id,
    _class_id,
    jsonb_build_object('percentage', cr.percentage, 'rank', cr.rank)
  FROM public.class_ranks cr
  WHERE cr.exam_type_id = _exam_type_id
    AND cr.class_id = _class_id
    AND cr.rank = 1
  ON CONFLICT (student_id, badge_type, exam_type_id, subject_id) DO NOTHING;

  -- Subject topper (highest marks per subject in class)
  WITH subject_leaders AS (
    SELECT DISTINCT ON (m.subject_id)
      m.student_id,
      m.subject_id,
      m.marks_obtained,
      m.max_marks,
      s.name AS subject_name
    FROM public.marks m
    JOIN public.subjects s ON s.id = m.subject_id
    WHERE m.exam_type_id = _exam_type_id
      AND m.class_id = _class_id
      AND m.submission_status = 'submitted'
      AND COALESCE(m.flag, '') NOT IN ('absent', 'malpractice')
    ORDER BY m.subject_id, m.marks_obtained DESC
  )
  INSERT INTO public.student_badges (
    student_id, badge_type, title, description,
    exam_type_id, class_id, subject_id, context
  )
  SELECT
    sl.student_id,
    'subject_topper',
    'Subject Topper',
    'Highest score in ' || sl.subject_name,
    _exam_type_id,
    _class_id,
    sl.subject_id,
    jsonb_build_object('marks', sl.marks_obtained, 'max', sl.max_marks)
  FROM subject_leaders sl
  ON CONFLICT (student_id, badge_type, exam_type_id, subject_id) DO NOTHING;

  -- Perfect score (100% overall)
  INSERT INTO public.student_badges (
    student_id, badge_type, title, description,
    exam_type_id, class_id, context
  )
  SELECT
    cr.student_id,
    'perfect_score',
    'Perfect Score',
    'Achieved 100% in ' || COALESCE(_exam_name, 'this exam'),
    _exam_type_id,
    _class_id,
    jsonb_build_object('percentage', cr.percentage)
  FROM public.class_ranks cr
  WHERE cr.exam_type_id = _exam_type_id
    AND cr.class_id = _class_id
    AND cr.percentage = 100
  ON CONFLICT (student_id, badge_type, exam_type_id, subject_id) DO NOTHING;

  -- Improved 10%+ vs. this student's prior best (same class, different exam_type)
  INSERT INTO public.student_badges (
    student_id, badge_type, title, description,
    exam_type_id, class_id, context
  )
  SELECT
    curr.student_id,
    'improved_10pct',
    'Big Improver',
    'Percentage up 10%+ since last exam',
    _exam_type_id,
    _class_id,
    jsonb_build_object(
      'from_pct', prev.percentage,
      'to_pct', curr.percentage,
      'delta', curr.percentage - prev.percentage
    )
  FROM public.class_ranks curr
  JOIN LATERAL (
    SELECT percentage FROM public.class_ranks
    WHERE student_id = curr.student_id
      AND class_id = curr.class_id
      AND exam_type_id <> _exam_type_id
    ORDER BY computed_at DESC
    LIMIT 1
  ) prev ON true
  WHERE curr.exam_type_id = _exam_type_id
    AND curr.class_id = _class_id
    AND curr.percentage - prev.percentage >= 10
  ON CONFLICT (student_id, badge_type, exam_type_id, subject_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_student_badges(UUID, UUID) TO authenticated;

-- 2. PARENT-TEACHER MEETING REQUESTS
CREATE TABLE public.ptm_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  preferred_date DATE,
  preferred_slot TEXT,
  meeting_mode TEXT DEFAULT 'in_person' CHECK (meeting_mode IN ('in_person', 'video', 'phone')),
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'accepted', 'rejected', 'completed', 'cancelled')),
  parent_notes TEXT,
  teacher_notes TEXT,
  scheduled_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ptm_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin views PTM"
ON public.ptm_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Parents manage own PTM"
ON public.ptm_requests FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.parents p
  WHERE p.id = ptm_requests.parent_id AND p.user_id = auth.uid()
));

CREATE POLICY "Teachers view + update their PTM"
ON public.ptm_requests FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teachers t
  WHERE t.id = ptm_requests.teacher_id AND t.user_id = auth.uid()
));

CREATE POLICY "Teachers update their PTM"
ON public.ptm_requests FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teachers t
  WHERE t.id = ptm_requests.teacher_id AND t.user_id = auth.uid()
));

CREATE TRIGGER update_ptm_requests_updated_at
BEFORE UPDATE ON public.ptm_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ptm_status ON public.ptm_requests(status);
CREATE INDEX idx_ptm_teacher ON public.ptm_requests(teacher_id);
CREATE INDEX idx_ptm_parent ON public.ptm_requests(parent_id);

-- 3. NOTIFICATION HELPERS
-- Broadcast a message to every student in a class (and their parents)
CREATE OR REPLACE FUNCTION public.notify_class(
  _class_id UUID, _subject TEXT, _body TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender UUID := auth.uid();
BEGIN
  IF _sender IS NULL THEN RETURN; END IF;

  -- Students in the class
  INSERT INTO public.messages (sender_id, receiver_id, subject, content)
  SELECT _sender, s.user_id, _subject, _body
  FROM public.students s WHERE s.class_id = _class_id;

  -- Parents of those students
  INSERT INTO public.messages (sender_id, receiver_id, subject, content)
  SELECT _sender, p.user_id, _subject, _body
  FROM public.students s
  JOIN public.parent_student ps ON ps.student_id = s.id
  JOIN public.parents p ON p.id = ps.parent_id
  WHERE s.class_id = _class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_class(UUID, TEXT, TEXT) TO authenticated;

-- Notify a specific student (+ their parents) — used for re-eval decisions
CREATE OR REPLACE FUNCTION public.notify_student(
  _student_id UUID, _subject TEXT, _body TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender UUID := auth.uid();
BEGIN
  IF _sender IS NULL THEN RETURN; END IF;

  INSERT INTO public.messages (sender_id, receiver_id, subject, content)
  SELECT _sender, s.user_id, _subject, _body
  FROM public.students s WHERE s.id = _student_id;

  INSERT INTO public.messages (sender_id, receiver_id, subject, content)
  SELECT _sender, p.user_id, _subject, _body
  FROM public.parent_student ps
  JOIN public.parents p ON p.id = ps.parent_id
  WHERE ps.student_id = _student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_student(UUID, TEXT, TEXT) TO authenticated;
