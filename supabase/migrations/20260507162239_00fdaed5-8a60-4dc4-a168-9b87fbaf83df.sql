
-- Add missing columns to advances table that the UI expects
ALTER TABLE public.advances 
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS others text,
  ADD COLUMN IF NOT EXISTS salary_adjusted_at timestamp with time zone;

-- Allow admins to delete employees
CREATE POLICY "Admin can delete employees"
  ON public.employees FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update profiles (for user management)
CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Add is_active column to profiles for activate/deactivate
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
