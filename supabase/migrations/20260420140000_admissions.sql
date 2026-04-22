-- ============================
-- ADMISSIONS MODULE
-- Public application intake + admin review queue.
-- ============================

-- Single-row settings
CREATE TABLE IF NOT EXISTS public.admissions_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_open BOOLEAN NOT NULL DEFAULT true,
    academic_year TEXT NOT NULL DEFAULT '2026-27',
    application_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    instructions TEXT,
    contact_email TEXT,
    required_documents TEXT[] DEFAULT ARRAY[]::TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.admissions_settings (is_open, academic_year)
SELECT true, '2026-27'
WHERE NOT EXISTS (SELECT 1 FROM public.admissions_settings);

ALTER TABLE public.admissions_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read settings so the public page knows if admissions are open.
CREATE POLICY "admissions_settings_public_read"
ON public.admissions_settings FOR SELECT
USING (true);

CREATE POLICY "admissions_settings_admin_write"
ON public.admissions_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Sequence for generating readable application numbers
CREATE SEQUENCE IF NOT EXISTS public.admission_application_seq START 1;

-- Main applications table
CREATE TABLE IF NOT EXISTS public.admission_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number TEXT UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted'
        CHECK (status IN (
            'submitted', 'under_review', 'interview_scheduled',
            'approved', 'rejected', 'waitlisted', 'enrolled', 'withdrawn'
        )),

    -- Applicant (student) details
    student_first_name TEXT NOT NULL,
    student_last_name TEXT NOT NULL,
    student_date_of_birth DATE NOT NULL,
    student_gender VARCHAR(20),
    student_blood_group VARCHAR(5),
    student_nationality TEXT,

    -- Previous academic info
    previous_school TEXT,
    previous_class TEXT,
    previous_percentage NUMERIC(5,2),
    previous_board TEXT,

    -- Desired class
    desired_class_id UUID REFERENCES public.classes(id),
    desired_academic_year TEXT,

    -- Parent/guardian info
    parent_name TEXT NOT NULL,
    parent_email TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    parent_relationship TEXT NOT NULL DEFAULT 'parent',
    parent_occupation TEXT,
    secondary_parent_name TEXT,
    secondary_parent_phone TEXT,

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,

    -- Applicant notes / additional info
    notes TEXT,

    -- Documents: array of storage paths or URLs
    documents JSONB DEFAULT '[]'::jsonb,

    -- Review fields
    review_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    interview_at TIMESTAMPTZ,
    interview_notes TEXT,

    -- Linked student after enrollment
    converted_student_id UUID REFERENCES public.students(id),

    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admission_applications_status
    ON public.admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_applications_submitted_at
    ON public.admission_applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_admission_applications_email
    ON public.admission_applications(parent_email);

-- Application number generator
CREATE OR REPLACE FUNCTION public.generate_application_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    yr TEXT;
    nxt BIGINT;
BEGIN
    IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
        yr := to_char(now(), 'YYYY');
        nxt := nextval('public.admission_application_seq');
        NEW.application_number := 'ADM-' || yr || '-' || lpad(nxt::TEXT, 5, '0');
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_application_number ON public.admission_applications;
CREATE TRIGGER trg_generate_application_number
BEFORE INSERT OR UPDATE ON public.admission_applications
FOR EACH ROW
EXECUTE FUNCTION public.generate_application_number();

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit an application.
CREATE POLICY "admission_applications_public_insert"
ON public.admission_applications FOR INSERT
WITH CHECK (status = 'submitted');

-- Anyone (including anon) can read their application by application_number — enforced at app level
-- via RPC. For defense in depth, limit anon SELECT to no rows; applicants use get_admission_status().
CREATE POLICY "admission_applications_admin_read"
ON public.admission_applications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "admission_applications_admin_write"
ON public.admission_applications FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "admission_applications_admin_delete"
ON public.admission_applications FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Public status lookup by number + email. Returns minimal fields.
CREATE OR REPLACE FUNCTION public.get_admission_status(
    _application_number TEXT,
    _email TEXT
)
RETURNS TABLE (
    application_number TEXT,
    status TEXT,
    student_first_name TEXT,
    student_last_name TEXT,
    desired_academic_year TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    interview_at TIMESTAMPTZ,
    review_notes TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        a.application_number,
        a.status::TEXT,
        a.student_first_name,
        a.student_last_name,
        a.desired_academic_year,
        a.submitted_at,
        a.reviewed_at,
        a.interview_at,
        a.review_notes
    FROM public.admission_applications a
    WHERE a.application_number = _application_number
      AND lower(a.parent_email) = lower(_email);
$$;

GRANT EXECUTE ON FUNCTION public.get_admission_status(TEXT, TEXT) TO anon, authenticated;
