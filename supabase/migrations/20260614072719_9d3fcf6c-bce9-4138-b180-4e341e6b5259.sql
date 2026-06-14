CREATE TABLE public.employment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status public.employment_status NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_history TO authenticated;
GRANT ALL ON public.employment_history TO service_role;

ALTER TABLE public.employment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/HR manage employment history"
ON public.employment_history FOR ALL
TO authenticated
USING (public.is_admin_or_hr(auth.uid()))
WITH CHECK (public.is_admin_or_hr(auth.uid()));

CREATE POLICY "Employees view own employment history"
ON public.employment_history FOR SELECT
TO authenticated
USING (employee_id = public.get_employee_id(auth.uid()) OR public.is_manager_or_above(auth.uid()));

CREATE TRIGGER update_employment_history_updated_at
BEFORE UPDATE ON public.employment_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: log on status change
CREATE OR REPLACE FUNCTION public.log_employee_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.employment_history (employee_id, status, effective_date, reason, created_by)
    VALUES (NEW.id, NEW.employment_status, COALESCE(NEW.hire_date, CURRENT_DATE), 'Initial hire', auth.uid());
    RETURN NEW;
  END IF;

  IF NEW.employment_status IS DISTINCT FROM OLD.employment_status THEN
    UPDATE public.employment_history
    SET end_date = CURRENT_DATE
    WHERE employee_id = NEW.id AND end_date IS NULL;

    INSERT INTO public.employment_history (employee_id, status, effective_date, created_by)
    VALUES (NEW.id, NEW.employment_status, CURRENT_DATE, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_employee_status_change
AFTER INSERT OR UPDATE OF employment_status ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.log_employee_status_change();

-- Seed initial history for existing employees
INSERT INTO public.employment_history (employee_id, status, effective_date, reason)
SELECT id, employment_status, COALESCE(hire_date, CURRENT_DATE), 'Initial record'
FROM public.employees
WHERE NOT EXISTS (
  SELECT 1 FROM public.employment_history h WHERE h.employee_id = public.employees.id
);