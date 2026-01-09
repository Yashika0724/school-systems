-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'parent', 'teacher', 'admin');

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2024-25',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(name, section, academic_year)
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  class_id UUID REFERENCES public.classes(id),
  roll_number TEXT,
  admission_number TEXT UNIQUE,
  admission_date DATE DEFAULT CURRENT_DATE,
  blood_group TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create parents table
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  occupation TEXT,
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  employee_id TEXT UNIQUE,
  designation TEXT,
  qualification TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create parent_student junction table
CREATE TABLE public.parent_student (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(parent_id, student_id)
);

-- Create teacher_classes junction table
CREATE TABLE public.teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  is_class_teacher BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(teacher_id, class_id, subject_id)
);

-- Enable RLS on all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for classes (viewable by all authenticated, editable by admin)
CREATE POLICY "Classes viewable by authenticated users"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Classes editable by admin"
  ON public.classes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subjects (viewable by all authenticated, editable by admin)
CREATE POLICY "Subjects viewable by authenticated users"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Subjects editable by admin"
  ON public.subjects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view student profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_classes tc ON tc.class_id = s.class_id
      JOIN public.teachers t ON t.id = tc.teacher_id
      WHERE s.user_id = profiles.user_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'parent') AND
    EXISTS (
      SELECT 1 FROM public.parent_student ps
      JOIN public.parents p ON p.id = ps.parent_id
      JOIN public.students s ON s.id = ps.student_id
      WHERE s.user_id = profiles.user_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles (only admin can manage, users can view own)
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for students
CREATE POLICY "Students can view own record"
  ON public.students FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all students"
  ON public.students FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view assigned class students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      JOIN public.teachers t ON t.id = tc.teacher_id
      WHERE tc.class_id = students.class_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'parent') AND
    EXISTS (
      SELECT 1 FROM public.parent_student ps
      JOIN public.parents p ON p.id = ps.parent_id
      WHERE ps.student_id = students.id AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for parents
CREATE POLICY "Parents can view own record"
  ON public.parents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all parents"
  ON public.parents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teachers
CREATE POLICY "Teachers can view own record"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all teachers"
  ON public.teachers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated can view teachers"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for parent_student
CREATE POLICY "Parents can view own links"
  ON public.parent_student FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.id = parent_student.parent_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage parent_student"
  ON public.parent_student FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for teacher_classes
CREATE POLICY "Teachers can view own assignments"
  ON public.teacher_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_classes.teacher_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "All authenticated can view teacher assignments"
  ON public.teacher_classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage teacher_classes"
  ON public.teacher_classes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parents_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default classes (Indian school system)
INSERT INTO public.classes (name, section, academic_year) VALUES
  ('1', 'A', '2024-25'), ('1', 'B', '2024-25'),
  ('2', 'A', '2024-25'), ('2', 'B', '2024-25'),
  ('3', 'A', '2024-25'), ('3', 'B', '2024-25'),
  ('4', 'A', '2024-25'), ('4', 'B', '2024-25'),
  ('5', 'A', '2024-25'), ('5', 'B', '2024-25'),
  ('6', 'A', '2024-25'), ('6', 'B', '2024-25'),
  ('7', 'A', '2024-25'), ('7', 'B', '2024-25'),
  ('8', 'A', '2024-25'), ('8', 'B', '2024-25'),
  ('9', 'A', '2024-25'), ('9', 'B', '2024-25'),
  ('10', 'A', '2024-25'), ('10', 'B', '2024-25'),
  ('11', 'A', '2024-25'), ('11', 'B', '2024-25'),
  ('12', 'A', '2024-25'), ('12', 'B', '2024-25');

-- Insert default subjects
INSERT INTO public.subjects (name, code) VALUES
  ('English', 'ENG'),
  ('Hindi', 'HIN'),
  ('Mathematics', 'MAT'),
  ('Science', 'SCI'),
  ('Social Studies', 'SST'),
  ('Computer Science', 'CS'),
  ('Physical Education', 'PE'),
  ('Art', 'ART'),
  ('Music', 'MUS'),
  ('Sanskrit', 'SAN'),
  ('Physics', 'PHY'),
  ('Chemistry', 'CHE'),
  ('Biology', 'BIO'),
  ('Accountancy', 'ACC'),
  ('Business Studies', 'BS'),
  ('Economics', 'ECO');