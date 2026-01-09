-- =============================================
-- TIMETABLE SYSTEM
-- =============================================

-- Timetable slots (defines the schedule structure)
CREATE TABLE public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  slot_number integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, day_of_week, slot_number)
);

-- Enable RLS
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timetable_slots
CREATE POLICY "Admin can manage all timetable slots"
  ON public.timetable_slots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view timetable slots"
  ON public.timetable_slots FOR SELECT
  USING (true);

-- =============================================
-- CLASS SESSIONS (Teacher's lesson planning)
-- =============================================

CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_slot_id uuid REFERENCES public.timetable_slots(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  topic text,
  description text,
  prerequisites text,
  resources text,
  learning_objectives text,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id, session_date, timetable_slot_id)
);

-- Enable RLS
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_sessions
CREATE POLICY "Admin can manage all class sessions"
  ON public.class_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage their own class sessions"
  ON public.class_sessions FOR ALL
  USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = class_sessions.teacher_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their class sessions"
  ON public.class_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.class_id = class_sessions.class_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's class sessions"
  ON public.class_sessions FOR SELECT
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM parent_student ps
      JOIN parents p ON p.id = ps.parent_id
      JOIN students s ON s.id = ps.student_id
      WHERE s.class_id = class_sessions.class_id AND p.user_id = auth.uid()
    )
  );

-- =============================================
-- ANNOUNCEMENTS SYSTEM
-- =============================================

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  announcement_type text NOT NULL DEFAULT 'general' CHECK (announcement_type IN ('general', 'student', 'parent', 'both')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by uuid NOT NULL,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Announcement targets (which classes see which announcements)
CREATE TABLE public.announcement_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE, -- NULL means all classes
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcement_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Admin can manage all announcements"
  ON public.announcements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Class teachers can create announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
      SELECT 1 FROM teacher_classes tc
      JOIN teachers t ON t.id = tc.teacher_id
      WHERE tc.is_class_teacher = true AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Class teachers can manage their announcements"
  ON public.announcements FOR UPDATE
  USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    created_by = auth.uid()
  );

CREATE POLICY "Class teachers can delete their announcements"
  ON public.announcements FOR DELETE
  USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can view relevant announcements"
  ON public.announcements FOR SELECT
  USING (
    is_active = true AND
    (start_date IS NULL OR start_date <= now()) AND
    (end_date IS NULL OR end_date >= now())
  );

-- RLS Policies for announcement_targets
CREATE POLICY "Admin can manage all announcement targets"
  ON public.announcement_targets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage targets for their announcements"
  ON public.announcement_targets FOR ALL
  USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = announcement_targets.announcement_id AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view announcement targets"
  ON public.announcement_targets FOR SELECT
  USING (true);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_timetable_slots_updated_at
  BEFORE UPDATE ON public.timetable_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();