-- ============================================================
-- NOTIFICATIONS SYSTEM
-- Persistent per-user notifications with realtime delivery.
-- Triggers generate notifications for key events.
-- Admin/teacher can also send custom notifications via RPC.
-- ============================================================

-- ----------------------------------------
-- TABLE
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(40) NOT NULL DEFAULT 'general'
        CHECK (type IN (
            'general', 'attendance', 'marks', 'fees', 'announcement',
            'homework', 'leave', 'exam', 'library', 'transport', 'custom'
        )),
    priority VARCHAR(10) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    link TEXT,
    related_table TEXT,
    related_id UUID,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own notifications.
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Recipients can mark their own notifications as read.
CREATE POLICY "notifications_update_own_read"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Recipients (or admins) can delete.
CREATE POLICY "notifications_delete_own_or_admin"
ON public.notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can see/manage all (for debugging and custom sends).
CREATE POLICY "notifications_admin_all"
ON public.notifications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- INSERTs are performed by SECURITY DEFINER trigger functions and RPCs,
-- so no general INSERT policy is needed.

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ----------------------------------------
-- CORE HELPER: insert a notification bypassing RLS
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public._notify(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'general',
    p_priority TEXT DEFAULT 'normal',
    p_link TEXT DEFAULT NULL,
    p_related_table TEXT DEFAULT NULL,
    p_related_id UUID DEFAULT NULL,
    p_sender_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id UUID;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    INSERT INTO public.notifications
        (user_id, title, message, type, priority, link, related_table, related_id, sender_id)
    VALUES
        (p_user_id, p_title, p_message, p_type, p_priority, p_link, p_related_table, p_related_id, p_sender_id)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$;

-- ----------------------------------------
-- TRIGGER: attendance -> student + parents
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.notify_attendance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student_user_id UUID;
    student_name TEXT;
    parent_user_id UUID;
    class_label TEXT;
    notif_title TEXT;
    notif_message TEXT;
    notif_priority TEXT;
    should_notify BOOLEAN := false;
BEGIN
    -- Only notify on INSERT or when status actually changes on UPDATE
    IF TG_OP = 'INSERT' THEN
        should_notify := true;
    ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        should_notify := true;
    END IF;
    IF NOT should_notify THEN
        RETURN NEW;
    END IF;

    SELECT s.user_id, p.full_name INTO student_user_id, student_name
    FROM students s
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE s.id = NEW.student_id;

    SELECT c.name || '-' || c.section INTO class_label
    FROM classes c WHERE c.id = NEW.class_id;

    notif_priority := CASE WHEN NEW.status = 'absent' THEN 'high' ELSE 'normal' END;

    -- Student notification
    notif_title := 'Attendance marked: ' || UPPER(NEW.status);
    notif_message := 'Your attendance for ' || TO_CHAR(NEW.date, 'DD Mon YYYY') ||
                     COALESCE(' (' || class_label || ')', '') ||
                     ' was marked as ' || NEW.status || '.';
    PERFORM public._notify(
        student_user_id, notif_title, notif_message,
        'attendance', notif_priority,
        '/student/attendance', 'attendance', NEW.id, NEW.marked_by
    );

    -- Parent notifications
    FOR parent_user_id IN
        SELECT pr.user_id
        FROM parent_student ps
        JOIN parents pr ON pr.id = ps.parent_id
        WHERE ps.student_id = NEW.student_id
    LOOP
        notif_title := COALESCE(student_name, 'Your child') || ': ' || UPPER(NEW.status);
        notif_message := COALESCE(student_name, 'Your child') ||
                         ' was marked ' || NEW.status ||
                         ' on ' || TO_CHAR(NEW.date, 'DD Mon YYYY') || '.';
        PERFORM public._notify(
            parent_user_id, notif_title, notif_message,
            'attendance', notif_priority,
            '/parent/attendance', 'attendance', NEW.id, NEW.marked_by
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_notify ON public.attendance;
CREATE TRIGGER attendance_notify
    AFTER INSERT OR UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.notify_attendance_change();

-- ----------------------------------------
-- TRIGGER: marks -> student + parents
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.notify_marks_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student_user_id UUID;
    student_name TEXT;
    parent_user_id UUID;
    subject_name TEXT;
    exam_name TEXT;
    notif_title TEXT;
    notif_message TEXT;
BEGIN
    -- Notify on INSERT or when marks change
    IF TG_OP = 'UPDATE' AND NEW.marks_obtained = OLD.marks_obtained THEN
        RETURN NEW;
    END IF;

    SELECT s.user_id, p.full_name INTO student_user_id, student_name
    FROM students s
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE s.id = NEW.student_id;

    SELECT name INTO subject_name FROM subjects WHERE id = NEW.subject_id;
    SELECT name INTO exam_name FROM exam_types WHERE id = NEW.exam_type_id;

    notif_title := 'Marks published: ' || COALESCE(subject_name, 'Subject');
    notif_message := COALESCE(exam_name, 'Exam') || ' — ' ||
                     COALESCE(subject_name, 'Subject') || ': ' ||
                     NEW.marks_obtained || '/' || NEW.max_marks ||
                     COALESCE(' (Grade ' || NEW.grade || ')', '') || '.';

    PERFORM public._notify(
        student_user_id, notif_title, notif_message,
        'marks', 'normal',
        '/student/marks', 'marks', NEW.id, NEW.entered_by
    );

    FOR parent_user_id IN
        SELECT pr.user_id
        FROM parent_student ps
        JOIN parents pr ON pr.id = ps.parent_id
        WHERE ps.student_id = NEW.student_id
    LOOP
        PERFORM public._notify(
            parent_user_id,
            COALESCE(student_name, 'Your child') || ': ' || COALESCE(subject_name, 'Subject') || ' marks',
            COALESCE(student_name, 'Your child') || ' scored ' ||
                NEW.marks_obtained || '/' || NEW.max_marks ||
                ' in ' || COALESCE(subject_name, 'subject') ||
                COALESCE(' (' || exam_name || ')', '') || '.',
            'marks', 'normal',
            '/parent/marks', 'marks', NEW.id, NEW.entered_by
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marks_notify ON public.marks;
CREATE TRIGGER marks_notify
    AFTER INSERT OR UPDATE ON public.marks
    FOR EACH ROW EXECUTE FUNCTION public.notify_marks_change();

-- ----------------------------------------
-- TRIGGER: fee_invoices -> student + parents
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.notify_fee_invoice_new()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student_user_id UUID;
    student_name TEXT;
    parent_user_id UUID;
    notif_title TEXT;
    notif_message TEXT;
BEGIN
    SELECT s.user_id, p.full_name INTO student_user_id, student_name
    FROM students s
    LEFT JOIN profiles p ON p.user_id = s.user_id
    WHERE s.id = NEW.student_id;

    notif_title := 'New fee invoice: ' || NEW.invoice_number;
    notif_message := 'An invoice of ₹' || NEW.total_amount::TEXT ||
                     ' has been generated. Due by ' ||
                     TO_CHAR(NEW.due_date, 'DD Mon YYYY') || '.';

    PERFORM public._notify(
        student_user_id, notif_title, notif_message,
        'fees', 'high',
        '/student/fees', 'fee_invoices', NEW.id, NULL
    );

    FOR parent_user_id IN
        SELECT pr.user_id
        FROM parent_student ps
        JOIN parents pr ON pr.id = ps.parent_id
        WHERE ps.student_id = NEW.student_id
    LOOP
        PERFORM public._notify(
            parent_user_id,
            'Fee invoice for ' || COALESCE(student_name, 'your child'),
            'Invoice ' || NEW.invoice_number || ' of ₹' || NEW.total_amount::TEXT ||
                ' is due by ' || TO_CHAR(NEW.due_date, 'DD Mon YYYY') || '.',
            'fees', 'high',
            '/parent/fees', 'fee_invoices', NEW.id, NULL
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fee_invoice_notify ON public.fee_invoices;
CREATE TRIGGER fee_invoice_notify
    AFTER INSERT ON public.fee_invoices
    FOR EACH ROW EXECUTE FUNCTION public.notify_fee_invoice_new();

-- ----------------------------------------
-- TRIGGER: announcements -> targeted users
-- Fires when announcement goes active. Fan-out by targets + type.
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.notify_announcement_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_class_ids UUID[];
    targets_all BOOLEAN;
    recipient RECORD;
    notif_priority TEXT;
BEGIN
    IF NEW.is_active IS NOT TRUE THEN
        RETURN NEW;
    END IF;

    notif_priority := COALESCE(NEW.priority, 'normal');

    -- Collect targets. If no rows exist OR any row has NULL class_id,
    -- treat it as "all classes".
    SELECT
        array_agg(class_id) FILTER (WHERE class_id IS NOT NULL),
        bool_or(class_id IS NULL)
    INTO target_class_ids, targets_all
    FROM announcement_targets
    WHERE announcement_id = NEW.id;

    IF target_class_ids IS NULL AND targets_all IS NOT TRUE THEN
        -- No targets configured yet; treat as all.
        targets_all := true;
    END IF;

    -- Students in scope
    IF NEW.announcement_type IN ('general', 'student', 'both') THEN
        FOR recipient IN
            SELECT DISTINCT s.user_id
            FROM students s
            WHERE s.user_id IS NOT NULL
              AND (targets_all OR s.class_id = ANY(target_class_ids))
        LOOP
            PERFORM public._notify(
                recipient.user_id, NEW.title, NEW.content,
                'announcement', notif_priority,
                '/student/announcements', 'announcements', NEW.id, NEW.created_by
            );
        END LOOP;
    END IF;

    -- Parents in scope (parents of students in the target classes)
    IF NEW.announcement_type IN ('general', 'parent', 'both') THEN
        FOR recipient IN
            SELECT DISTINCT pr.user_id
            FROM parent_student ps
            JOIN parents pr ON pr.id = ps.parent_id
            JOIN students s ON s.id = ps.student_id
            WHERE pr.user_id IS NOT NULL
              AND (targets_all OR s.class_id = ANY(target_class_ids))
        LOOP
            PERFORM public._notify(
                recipient.user_id, NEW.title, NEW.content,
                'announcement', notif_priority,
                '/parent/announcements', 'announcements', NEW.id, NEW.created_by
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcement_notify ON public.announcements;
CREATE TRIGGER announcement_notify
    AFTER INSERT ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.notify_announcement_published();

-- ----------------------------------------
-- RPC: send_custom_notification
-- Admin can target any role/class/student/user.
-- Teacher can target their own classes or students in those classes.
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.send_custom_notification(
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'normal',
    p_target_type TEXT DEFAULT 'user',   -- 'user' | 'student' | 'class' | 'role' | 'all'
    p_target_user_ids UUID[] DEFAULT NULL,
    p_target_student_ids UUID[] DEFAULT NULL,
    p_target_class_ids UUID[] DEFAULT NULL,
    p_target_role TEXT DEFAULT NULL,     -- used when p_target_type='role' or 'all'
    p_include_parents BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller UUID := auth.uid();
    is_admin BOOLEAN;
    is_teacher BOOLEAN;
    v_teacher_id UUID;
    allowed_class_ids UUID[] := ARRAY[]::UUID[];
    recipient_ids UUID[] := ARRAY[]::UUID[];
    recipient_user_id UUID;
    inserted_count INTEGER := 0;
BEGIN
    IF caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    is_admin := has_role(caller, 'admin'::app_role);
    is_teacher := has_role(caller, 'teacher'::app_role);

    IF NOT (is_admin OR is_teacher) THEN
        RAISE EXCEPTION 'Only admin or teacher can send custom notifications';
    END IF;

    IF p_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
        RAISE EXCEPTION 'Invalid priority: %', p_priority;
    END IF;

    -- For teachers (non-admin), determine which classes they can target.
    IF is_teacher AND NOT is_admin THEN
        SELECT id INTO v_teacher_id FROM teachers WHERE user_id = caller;
        IF v_teacher_id IS NULL THEN
            RAISE EXCEPTION 'Teacher profile not found';
        END IF;
        SELECT COALESCE(array_agg(DISTINCT tc.class_id), ARRAY[]::UUID[])
        INTO allowed_class_ids
        FROM teacher_classes tc WHERE tc.teacher_id = v_teacher_id;
    END IF;

    -- Gather recipients into an array.
    IF p_target_type = 'user' THEN
        IF p_target_user_ids IS NULL OR array_length(p_target_user_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'No target users provided';
        END IF;
        IF is_admin THEN
            SELECT COALESCE(array_agg(DISTINCT uid), ARRAY[]::UUID[])
            INTO recipient_ids
            FROM unnest(p_target_user_ids) AS uid;
        ELSE
            WITH allowed AS (
                SELECT s.user_id FROM students s
                WHERE s.user_id = ANY(p_target_user_ids)
                  AND s.class_id = ANY(allowed_class_ids)
                UNION
                SELECT pr.user_id FROM parents pr
                JOIN parent_student ps ON ps.parent_id = pr.id
                JOIN students s ON s.id = ps.student_id
                WHERE pr.user_id = ANY(p_target_user_ids)
                  AND s.class_id = ANY(allowed_class_ids)
            )
            SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
            INTO recipient_ids FROM allowed WHERE user_id IS NOT NULL;
        END IF;

    ELSIF p_target_type = 'student' THEN
        IF p_target_student_ids IS NULL OR array_length(p_target_student_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'No target students provided';
        END IF;
        WITH allowed AS (
            SELECT s.user_id FROM students s
            WHERE s.id = ANY(p_target_student_ids)
              AND s.user_id IS NOT NULL
              AND (is_admin OR s.class_id = ANY(allowed_class_ids))
            UNION
            SELECT pr.user_id FROM parent_student ps
            JOIN parents pr ON pr.id = ps.parent_id
            JOIN students s ON s.id = ps.student_id
            WHERE p_include_parents
              AND s.id = ANY(p_target_student_ids)
              AND pr.user_id IS NOT NULL
              AND (is_admin OR s.class_id = ANY(allowed_class_ids))
        )
        SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
        INTO recipient_ids FROM allowed WHERE user_id IS NOT NULL;

    ELSIF p_target_type = 'class' THEN
        IF p_target_class_ids IS NULL OR array_length(p_target_class_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'No target classes provided';
        END IF;
        IF NOT is_admin THEN
            IF NOT (p_target_class_ids <@ allowed_class_ids) THEN
                RAISE EXCEPTION 'Teacher cannot target classes outside their assignments';
            END IF;
        END IF;
        WITH allowed AS (
            SELECT s.user_id FROM students s
            WHERE s.class_id = ANY(p_target_class_ids)
              AND s.user_id IS NOT NULL
            UNION
            SELECT pr.user_id FROM parent_student ps
            JOIN parents pr ON pr.id = ps.parent_id
            JOIN students s ON s.id = ps.student_id
            WHERE p_include_parents
              AND s.class_id = ANY(p_target_class_ids)
              AND pr.user_id IS NOT NULL
        )
        SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
        INTO recipient_ids FROM allowed WHERE user_id IS NOT NULL;

    ELSIF p_target_type = 'role' THEN
        IF NOT is_admin THEN
            RAISE EXCEPTION 'Only admin can broadcast to a role';
        END IF;
        IF p_target_role NOT IN ('student', 'parent', 'teacher', 'admin') THEN
            RAISE EXCEPTION 'Invalid target role: %', p_target_role;
        END IF;
        SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
        INTO recipient_ids
        FROM user_roles WHERE role = p_target_role::app_role;

    ELSIF p_target_type = 'all' THEN
        IF NOT is_admin THEN
            RAISE EXCEPTION 'Only admin can broadcast to all';
        END IF;
        SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
        INTO recipient_ids FROM user_roles;

    ELSE
        RAISE EXCEPTION 'Unknown target_type: %', p_target_type;
    END IF;

    FOREACH recipient_user_id IN ARRAY recipient_ids LOOP
        PERFORM public._notify(
            recipient_user_id, p_title, p_message,
            'custom', p_priority,
            NULL, NULL, NULL, caller
        );
        inserted_count := inserted_count + 1;
    END LOOP;

    RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_custom_notification(
    TEXT, TEXT, TEXT, TEXT, UUID[], UUID[], UUID[], TEXT, BOOLEAN
) TO authenticated;

-- ----------------------------------------
-- RPC: mark_all_notifications_read
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    UPDATE public.notifications
    SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
