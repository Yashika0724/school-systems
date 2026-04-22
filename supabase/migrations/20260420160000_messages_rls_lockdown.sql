-- Tighten messages RLS: restrict who can send to whom based on role pairings.
-- Allowed pairs (both directions):
--   teacher <-> parent of a student in one of the teacher's classes
--   teacher <-> student in one of the teacher's classes
--   teacher <-> admin
-- Everything else (student<->admin, parent<->admin, student<->student, etc.)
-- is rejected at INSERT time.

CREATE OR REPLACE FUNCTION public.can_message(_sender UUID, _receiver UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  sender_is_admin   BOOLEAN;
  sender_is_teacher BOOLEAN;
  sender_is_parent  BOOLEAN;
  sender_is_student BOOLEAN;
  receiver_is_admin   BOOLEAN;
  receiver_is_teacher BOOLEAN;
  receiver_is_parent  BOOLEAN;
  receiver_is_student BOOLEAN;
BEGIN
  IF _sender IS NULL OR _receiver IS NULL OR _sender = _receiver THEN
    RETURN FALSE;
  END IF;

  sender_is_admin     := public.has_role(_sender,   'admin'::public.app_role);
  sender_is_teacher   := public.has_role(_sender,   'teacher'::public.app_role);
  sender_is_parent    := public.has_role(_sender,   'parent'::public.app_role);
  sender_is_student   := public.has_role(_sender,   'student'::public.app_role);
  receiver_is_admin   := public.has_role(_receiver, 'admin'::public.app_role);
  receiver_is_teacher := public.has_role(_receiver, 'teacher'::public.app_role);
  receiver_is_parent  := public.has_role(_receiver, 'parent'::public.app_role);
  receiver_is_student := public.has_role(_receiver, 'student'::public.app_role);

  -- teacher <-> admin (both directions)
  IF (sender_is_teacher AND receiver_is_admin)
     OR (sender_is_admin AND receiver_is_teacher) THEN
    RETURN TRUE;
  END IF;

  -- teacher -> parent of a student in one of teacher's classes
  IF sender_is_teacher AND receiver_is_parent THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.teachers t
      JOIN public.teacher_classes tc ON tc.teacher_id = t.id
      JOIN public.students s          ON s.class_id   = tc.class_id
      JOIN public.parent_student ps   ON ps.student_id = s.id
      JOIN public.parents p           ON p.id         = ps.parent_id
      WHERE t.user_id = _sender AND p.user_id = _receiver
    );
  END IF;

  -- parent -> teacher of their child
  IF sender_is_parent AND receiver_is_teacher THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.parents p
      JOIN public.parent_student ps ON ps.parent_id = p.id
      JOIN public.students s        ON s.id         = ps.student_id
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id
      JOIN public.teachers t        ON t.id         = tc.teacher_id
      WHERE p.user_id = _sender AND t.user_id = _receiver
    );
  END IF;

  -- teacher -> student in one of teacher's classes
  IF sender_is_teacher AND receiver_is_student THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.teachers t
      JOIN public.teacher_classes tc ON tc.teacher_id = t.id
      JOIN public.students s          ON s.class_id   = tc.class_id
      WHERE t.user_id = _sender AND s.user_id = _receiver
    );
  END IF;

  -- student -> teacher of their class
  IF sender_is_student AND receiver_is_teacher THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id
      JOIN public.teachers t          ON t.id        = tc.teacher_id
      WHERE s.user_id = _sender AND t.user_id = _receiver
    );
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.can_message(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_message(UUID, UUID) TO authenticated;

-- Replace the permissive INSERT policy with a restricted one.
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Users can send allowed messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.can_message(sender_id, receiver_id)
);

-- Split the old "Admin can manage all messages" FOR ALL policy so admins
-- retain moderation powers (read/update/delete) but cannot bypass
-- the pair-based INSERT rule.
DROP POLICY IF EXISTS "Admin can manage all messages" ON public.messages;

CREATE POLICY "Admin can view all messages"
ON public.messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin can update any message"
ON public.messages
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin can delete any message"
ON public.messages
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
