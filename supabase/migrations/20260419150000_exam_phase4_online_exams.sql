-- ============================================================
-- Exam Module Phase 4 — Online MCQ Exams + Proctoring
-- ============================================================

-- 1. QUESTION BANKS
CREATE TABLE public.question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages banks"
ON public.question_banks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers manage banks for their subjects"
ON public.question_banks FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      JOIN public.teachers t ON t.id = tc.teacher_id
      WHERE t.user_id = auth.uid()
        AND tc.subject_id = question_banks.subject_id
    )
  )
);

CREATE POLICY "All teachers view banks"
ON public.question_banks FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE TRIGGER update_question_banks_updated_at
BEFORE UPDATE ON public.question_banks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. QUESTIONS
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'short')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard') OR difficulty IS NULL),
  bloom_level TEXT CHECK (bloom_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create') OR bloom_level IS NULL),
  topic TEXT,
  text TEXT NOT NULL,
  options JSONB,
  correct_answer JSONB NOT NULL,
  marks NUMERIC(5,2) NOT NULL DEFAULT 1,
  explanation TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages questions"
ON public.questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers manage questions in accessible banks"
ON public.questions FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.question_banks b
    WHERE b.id = questions.bank_id
      AND (b.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.teacher_classes tc
        JOIN public.teachers t ON t.id = tc.teacher_id
        WHERE t.user_id = auth.uid() AND tc.subject_id = b.subject_id
      ))
  )
);

CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_questions_bank ON public.questions(bank_id);

-- 3. ONLINE EXAMS
CREATE TABLE public.online_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL UNIQUE REFERENCES public.exams(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  shuffle_questions BOOLEAN NOT NULL DEFAULT true,
  allow_tab_switch BOOLEAN NOT NULL DEFAULT false,
  webcam_required BOOLEAN NOT NULL DEFAULT false,
  attempts_allowed INT NOT NULL DEFAULT 1 CHECK (attempts_allowed > 0),
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  show_results_immediately BOOLEAN NOT NULL DEFAULT false,
  instructions TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.online_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages online exams"
ON public.online_exams FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers manage online exams for their classes"
ON public.online_exams FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.exams e
    JOIN public.teacher_classes tc ON tc.class_id = e.class_id AND tc.subject_id = e.subject_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE e.id = online_exams.exam_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Students see online exams for their class"
ON public.online_exams FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    JOIN public.students s ON s.class_id = e.class_id
    WHERE e.id = online_exams.exam_id AND s.user_id = auth.uid()
  )
);

CREATE TRIGGER update_online_exams_updated_at
BEFORE UPDATE ON public.online_exams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ONLINE EXAM QUESTIONS (M2M)
CREATE TABLE public.online_exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  online_exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  marks_override NUMERIC(5,2),
  UNIQUE(online_exam_id, question_id)
);

ALTER TABLE public.online_exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages online_exam_questions"
ON public.online_exam_questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers manage for their online exams"
ON public.online_exam_questions FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.online_exams oe
    JOIN public.exams e ON e.id = oe.exam_id
    JOIN public.teacher_classes tc ON tc.class_id = e.class_id AND tc.subject_id = e.subject_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE oe.id = online_exam_questions.online_exam_id AND t.user_id = auth.uid()
  )
);
-- Students NEVER read this table directly — they go through start_online_attempt RPC.

CREATE INDEX idx_oeq_exam ON public.online_exam_questions(online_exam_id);

-- 5. EXAM ATTEMPTS
CREATE TABLE public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  online_exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  auto_submitted BOOLEAN NOT NULL DEFAULT false,
  score NUMERIC(6,2),
  max_score NUMERIC(6,2),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'flagged')),
  flagged_reason TEXT,
  tab_switch_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin views all attempts"
ON public.exam_attempts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers view attempts for their exams"
ON public.exam_attempts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.online_exams oe
    JOIN public.exams e ON e.id = oe.exam_id
    JOIN public.teacher_classes tc ON tc.class_id = e.class_id AND tc.subject_id = e.subject_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE oe.id = exam_attempts.online_exam_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Students view own attempts"
ON public.exam_attempts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = exam_attempts.student_id AND s.user_id = auth.uid()
));

CREATE TRIGGER update_exam_attempts_updated_at
BEFORE UPDATE ON public.exam_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_attempts_student ON public.exam_attempts(student_id);
CREATE INDEX idx_attempts_exam ON public.exam_attempts(online_exam_id);

-- 6. ATTEMPT ANSWERS
CREATE TABLE public.attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer JSONB,
  is_correct BOOLEAN,
  awarded_marks NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin views answers"
ON public.attempt_answers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers view answers for their exams"
ON public.attempt_answers FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    JOIN public.online_exams oe ON oe.id = ea.online_exam_id
    JOIN public.exams e ON e.id = oe.exam_id
    JOIN public.teacher_classes tc ON tc.class_id = e.class_id AND tc.subject_id = e.subject_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE ea.id = attempt_answers.attempt_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Students view own answers"
ON public.attempt_answers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.exam_attempts ea
  JOIN public.students s ON s.id = ea.student_id
  WHERE ea.id = attempt_answers.attempt_id AND s.user_id = auth.uid()
));

CREATE TRIGGER update_attempt_answers_updated_at
BEFORE UPDATE ON public.attempt_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. PROCTOR EVENTS
CREATE TABLE public.proctor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'tab_switch', 'fullscreen_exit', 'copy_paste', 'right_click',
    'webcam_snapshot', 'face_missing', 'multi_face', 'network_disconnect'
  )),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proctor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin views proctor events"
ON public.proctor_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers view proctor events for their exams"
ON public.proctor_events FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    JOIN public.online_exams oe ON oe.id = ea.online_exam_id
    JOIN public.exams e ON e.id = oe.exam_id
    JOIN public.teacher_classes tc ON tc.class_id = e.class_id AND tc.subject_id = e.subject_id
    JOIN public.teachers t ON t.id = tc.teacher_id
    WHERE ea.id = proctor_events.attempt_id AND t.user_id = auth.uid()
  )
);

CREATE INDEX idx_proctor_attempt ON public.proctor_events(attempt_id);
CREATE INDEX idx_proctor_event_type ON public.proctor_events(event_type);

-- ============================================================
-- RPC: start_online_attempt
--   Creates (or resumes) an attempt and returns the questions
--   WITHOUT correct_answer so students can't cheat.
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_online_attempt(_online_exam_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _student_id UUID;
  _student_class UUID;
  _attempt_id UUID;
  _oe RECORD;
  _questions JSONB;
  _saved JSONB;
BEGIN
  SELECT id, class_id INTO _student_id, _student_class
  FROM public.students WHERE user_id = _user_id;
  IF _student_id IS NULL THEN RAISE EXCEPTION 'Not a student'; END IF;

  SELECT oe.*, e.class_id AS exam_class_id, e.exam_type_id, e.subject_id
  INTO _oe
  FROM public.online_exams oe
  JOIN public.exams e ON e.id = oe.exam_id
  WHERE oe.id = _online_exam_id;
  IF _oe IS NULL THEN RAISE EXCEPTION 'Exam not found'; END IF;

  IF _student_class <> _oe.exam_class_id THEN
    RAISE EXCEPTION 'You are not in this class';
  END IF;

  IF _oe.opens_at IS NOT NULL AND now() < _oe.opens_at THEN
    RAISE EXCEPTION 'Exam not open yet';
  END IF;
  IF _oe.closes_at IS NOT NULL AND now() > _oe.closes_at THEN
    RAISE EXCEPTION 'Exam window has closed';
  END IF;

  -- Re-use in-progress attempt if any
  SELECT id INTO _attempt_id
  FROM public.exam_attempts
  WHERE online_exam_id = _online_exam_id
    AND student_id = _student_id
    AND status = 'in_progress';

  IF _attempt_id IS NULL THEN
    IF (SELECT COUNT(*) FROM public.exam_attempts
        WHERE online_exam_id = _online_exam_id
          AND student_id = _student_id) >= _oe.attempts_allowed THEN
      RAISE EXCEPTION 'No attempts remaining';
    END IF;
    INSERT INTO public.exam_attempts (online_exam_id, student_id)
    VALUES (_online_exam_id, _student_id)
    RETURNING id INTO _attempt_id;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'type', q.type,
      'text', q.text,
      'options', q.options,
      'marks', COALESCE(oeq.marks_override, q.marks),
      'display_order', oeq.display_order
    ) ORDER BY oeq.display_order
  )
  INTO _questions
  FROM public.online_exam_questions oeq
  JOIN public.questions q ON q.id = oeq.question_id
  WHERE oeq.online_exam_id = _online_exam_id;

  SELECT jsonb_object_agg(question_id::text, answer)
  INTO _saved
  FROM public.attempt_answers
  WHERE attempt_id = _attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', _attempt_id,
    'duration_minutes', _oe.duration_minutes,
    'shuffle_questions', _oe.shuffle_questions,
    'started_at', (SELECT started_at FROM public.exam_attempts WHERE id = _attempt_id),
    'questions', COALESCE(_questions, '[]'::jsonb),
    'saved_answers', COALESCE(_saved, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_online_attempt(UUID) TO authenticated;

-- RPC: save_attempt_answer
CREATE OR REPLACE FUNCTION public.save_attempt_answer(
  _attempt_id UUID, _question_id UUID, _answer JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    JOIN public.students s ON s.id = ea.student_id
    WHERE ea.id = _attempt_id
      AND s.user_id = _user_id
      AND ea.status = 'in_progress'
  ) THEN RAISE EXCEPTION 'Cannot save to this attempt'; END IF;

  INSERT INTO public.attempt_answers (attempt_id, question_id, answer)
  VALUES (_attempt_id, _question_id, _answer)
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET answer = EXCLUDED.answer, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_attempt_answer(UUID, UUID, JSONB) TO authenticated;

-- RPC: submit_online_attempt — auto-grades + writes to marks
CREATE OR REPLACE FUNCTION public.submit_online_attempt(
  _attempt_id UUID, _auto_submit BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _student_id UUID;
  _online_exam_id UUID;
  _exam RECORD;
  _total NUMERIC(6,2) := 0;
  _max NUMERIC(6,2) := 0;
BEGIN
  SELECT ea.student_id, ea.online_exam_id
  INTO _student_id, _online_exam_id
  FROM public.exam_attempts ea
  JOIN public.students s ON s.id = ea.student_id
  WHERE ea.id = _attempt_id
    AND s.user_id = _user_id
    AND ea.status = 'in_progress';
  IF _student_id IS NULL THEN RAISE EXCEPTION 'Attempt not found or already submitted'; END IF;

  -- Grade each answer — JSONB equality for mcq / true_false
  UPDATE public.attempt_answers aa
  SET
    is_correct = (aa.answer = q.correct_answer),
    awarded_marks = CASE
      WHEN aa.answer = q.correct_answer THEN COALESCE(oeq.marks_override, q.marks)
      ELSE 0
    END,
    updated_at = now()
  FROM public.questions q
  JOIN public.online_exam_questions oeq
    ON oeq.question_id = q.id AND oeq.online_exam_id = _online_exam_id
  WHERE aa.attempt_id = _attempt_id AND aa.question_id = q.id;

  SELECT
    COALESCE(SUM(aa.awarded_marks), 0),
    COALESCE(SUM(COALESCE(oeq.marks_override, q.marks)), 0)
  INTO _total, _max
  FROM public.online_exam_questions oeq
  JOIN public.questions q ON q.id = oeq.question_id
  LEFT JOIN public.attempt_answers aa
    ON aa.question_id = q.id AND aa.attempt_id = _attempt_id
  WHERE oeq.online_exam_id = _online_exam_id;

  UPDATE public.exam_attempts
  SET status = 'submitted',
      submitted_at = now(),
      auto_submitted = _auto_submit,
      score = _total,
      max_score = _max
  WHERE id = _attempt_id;

  -- Mirror to marks table so it flows through the rest of the exam pipeline
  SELECT e.exam_type_id, e.class_id, e.subject_id INTO _exam
  FROM public.online_exams oe
  JOIN public.exams e ON e.id = oe.exam_id
  WHERE oe.id = _online_exam_id;

  INSERT INTO public.marks (
    student_id, subject_id, exam_type_id, class_id,
    marks_obtained, max_marks, submission_status, entered_by
  )
  VALUES (
    _student_id, _exam.subject_id, _exam.exam_type_id, _exam.class_id,
    _total, _max, 'submitted', _user_id
  )
  ON CONFLICT (student_id, subject_id, exam_type_id) DO UPDATE
  SET marks_obtained = EXCLUDED.marks_obtained,
      max_marks = EXCLUDED.max_marks,
      submission_status = 'submitted',
      updated_at = now();

  RETURN jsonb_build_object('score', _total, 'max_score', _max);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_online_attempt(UUID, BOOLEAN) TO authenticated;

-- RPC: log_proctor_event
CREATE OR REPLACE FUNCTION public.log_proctor_event(
  _attempt_id UUID, _event_type TEXT, _payload JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    JOIN public.students s ON s.id = ea.student_id
    WHERE ea.id = _attempt_id AND s.user_id = _user_id
  ) THEN RAISE EXCEPTION 'Cannot log event for this attempt'; END IF;

  INSERT INTO public.proctor_events (attempt_id, event_type, payload)
  VALUES (_attempt_id, _event_type, _payload);

  IF _event_type = 'tab_switch' THEN
    UPDATE public.exam_attempts
    SET tab_switch_count = tab_switch_count + 1,
        updated_at = now()
    WHERE id = _attempt_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_proctor_event(UUID, TEXT, JSONB) TO authenticated;
