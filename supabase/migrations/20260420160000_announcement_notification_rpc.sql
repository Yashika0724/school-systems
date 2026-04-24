-- Drop the premature auto-trigger that fired before announcement_targets
-- were inserted, which caused every class-scoped announcement to fan out
-- to all students/parents school-wide.
DROP TRIGGER IF EXISTS announcement_notify ON public.announcements;

-- Track whether fan-out already happened, so the RPC is idempotent.
ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Explicit RPC the client calls AFTER inserting both the announcement and
-- its target rows.
CREATE OR REPLACE FUNCTION public.notify_announcement(p_announcement_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller UUID := auth.uid();
    ann RECORD;
    target_class_ids UUID[];
    targets_all BOOLEAN;
    recipient RECORD;
    notif_priority TEXT;
    sent INTEGER := 0;
BEGIN
    IF caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO ann FROM announcements WHERE id = p_announcement_id;
    IF ann IS NULL THEN
        RAISE EXCEPTION 'Announcement not found: %', p_announcement_id;
    END IF;

    IF NOT (ann.created_by = caller OR has_role(caller, 'admin'::app_role)) THEN
        RAISE EXCEPTION 'Not allowed to publish this announcement';
    END IF;

    IF ann.notified_at IS NOT NULL THEN
        RETURN 0;
    END IF;
    IF ann.is_active IS NOT TRUE THEN
        RETURN 0;
    END IF;

    notif_priority := COALESCE(ann.priority, 'normal');

    SELECT
        array_agg(class_id) FILTER (WHERE class_id IS NOT NULL),
        bool_or(class_id IS NULL)
    INTO target_class_ids, targets_all
    FROM announcement_targets
    WHERE announcement_id = ann.id;

    -- No target rows at all => documented broadcast-to-all behavior.
    IF target_class_ids IS NULL AND targets_all IS NOT TRUE THEN
        targets_all := true;
    END IF;

    IF ann.announcement_type IN ('general', 'student', 'both') THEN
        FOR recipient IN
            SELECT DISTINCT s.user_id
            FROM students s
            WHERE s.user_id IS NOT NULL
              AND (targets_all OR s.class_id = ANY(target_class_ids))
        LOOP
            PERFORM public._notify(
                recipient.user_id, ann.title, ann.content,
                'announcement', notif_priority,
                '/student/announcements', 'announcements', ann.id, ann.created_by
            );
            sent := sent + 1;
        END LOOP;
    END IF;

    IF ann.announcement_type IN ('general', 'parent', 'both') THEN
        FOR recipient IN
            SELECT DISTINCT pr.user_id
            FROM parent_student ps
            JOIN parents pr ON pr.id = ps.parent_id
            JOIN students s ON s.id = ps.student_id
            WHERE pr.user_id IS NOT NULL
              AND (targets_all OR s.class_id = ANY(target_class_ids))
        LOOP
            PERFORM public._notify(
                recipient.user_id, ann.title, ann.content,
                'announcement', notif_priority,
                '/parent/announcements', 'announcements', ann.id, ann.created_by
            );
            sent := sent + 1;
        END LOOP;
    END IF;

    UPDATE announcements SET notified_at = now() WHERE id = ann.id;
    RETURN sent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_announcement(UUID) TO authenticated;

-- Old trigger-fan-out function is no longer referenced.
DROP FUNCTION IF EXISTS public.notify_announcement_published();
