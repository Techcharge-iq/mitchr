CREATE POLICY "Admin/HR/Managers can create leave applications"
ON public.leave_applications FOR INSERT
TO authenticated
WITH CHECK (public.is_manager_or_above(auth.uid()));