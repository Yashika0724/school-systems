-- ============================
-- ATTENDANCE SETTINGS (single-row admin-configurable)
-- ============================
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_attendance_percent INTEGER NOT NULL DEFAULT 75
        CHECK (min_attendance_percent BETWEEN 0 AND 100),
    enforce_exam_eligibility BOOLEAN NOT NULL DEFAULT false,
    notify_parents_on_absence BOOLEAN NOT NULL DEFAULT true,
    late_counts_as_present BOOLEAN NOT NULL DEFAULT true,
    exclude_weekends BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Seed a single default row if empty.
INSERT INTO public.attendance_settings (min_attendance_percent)
SELECT 75 WHERE NOT EXISTS (SELECT 1 FROM public.attendance_settings);

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_settings_read_all"
ON public.attendance_settings FOR SELECT
TO authenticated USING (true);

CREATE POLICY "attendance_settings_admin_write"
ON public.attendance_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================
-- SCHOOL HOLIDAYS (admin CRUD, excluded from % calc)
-- ============================
CREATE TABLE IF NOT EXISTS public.school_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_holidays_date ON public.school_holidays(date);

ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_holidays_read_all"
ON public.school_holidays FOR SELECT
TO authenticated USING (true);

CREATE POLICY "school_holidays_admin_write"
ON public.school_holidays FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================
-- Justification: add request_type for correction flow
-- ============================
ALTER TABLE public.attendance_justifications
    ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) NOT NULL DEFAULT 'excuse'
        CHECK (request_type IN ('excuse', 'correction'));

-- Replace trigger to handle both excuse (→ excused) and correction (→ present)
CREATE OR REPLACE FUNCTION public.apply_approved_justification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_status TEXT;
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
        target_status := CASE
            WHEN NEW.request_type = 'correction' THEN 'present'
            ELSE 'excused'
        END;
        INSERT INTO public.attendance (student_id, class_id, date, status, remarks, marked_by)
        VALUES (NEW.student_id, NEW.class_id, NEW.date, target_status, NEW.reason, NEW.reviewed_by)
        ON CONFLICT (student_id, date) DO UPDATE
            SET status = target_status,
                remarks = EXCLUDED.remarks,
                marked_by = EXCLUDED.marked_by,
                updated_at = now();
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- ============================
-- Parent absence notification trigger
-- Sends a message to each linked parent whenever a child is newly marked absent.
-- Gated by attendance_settings.notify_parents_on_absence.
-- ============================
CREATE OR REPLACE FUNCTION public.notify_parents_on_absence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    should_notify BOOLEAN;
    student_name TEXT;
    sender_uid UUID;
    parent_user UUID;
BEGIN
    -- Only fire when status is currently 'absent' and it's a change
    IF NEW.status <> 'absent' THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'absent' THEN RETURN NEW; END IF;

    SELECT notify_parents_on_absence INTO should_notify
    FROM public.attendance_settings
    ORDER BY updated_at DESC LIMIT 1;
    IF NOT COALESCE(should_notify, false) THEN RETURN NEW; END IF;

    SELECT p.full_name INTO student_name
    FROM public.students s
    JOIN public.profiles p ON p.user_id = s.user_id
    WHERE s.id = NEW.student_id;

    sender_uid := COALESCE(NEW.marked_by, auth.uid());
    IF sender_uid IS NULL THEN RETURN NEW; END IF;

    FOR parent_user IN
        SELECT par.user_id
        FROM public.parent_student ps
        JOIN public.parents par ON par.id = ps.parent_id
        WHERE ps.student_id = NEW.student_id
          AND par.user_id IS NOT NULL
    LOOP
        INSERT INTO public.messages (sender_id, receiver_id, subject, content)
        VALUES (
            sender_uid,
            parent_user,
            'Absence notification',
            COALESCE(student_name, 'Your child')
              || ' was marked absent on ' || to_char(NEW.date, 'Mon DD, YYYY') || '.'
        );
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_parents_on_absence ON public.attendance;
CREATE TRIGGER trg_notify_parents_on_absence
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.notify_parents_on_absence();
