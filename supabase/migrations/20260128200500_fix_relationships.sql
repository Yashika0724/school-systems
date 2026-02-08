-- Add foreign key relationship between students and profiles for easier joining
ALTER TABLE public.students 
ADD CONSTRAINT students_user_id_fkey_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key relationship for teachers as well
ALTER TABLE public.teachers
ADD CONSTRAINT teachers_user_id_fkey_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key relationship for parents as well
ALTER TABLE public.parents
ADD CONSTRAINT parents_user_id_fkey_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;
