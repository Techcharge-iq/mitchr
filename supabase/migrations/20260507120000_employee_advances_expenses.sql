-- Expand salary advances into an employee advances and expenses workflow.
ALTER TABLE public.advances
  ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'Personal Advance',
  ADD COLUMN IF NOT EXISTS others TEXT,
  ADD COLUMN IF NOT EXISTS salary_adjusted_at TIMESTAMPTZ;

ALTER TABLE public.advances
  DROP CONSTRAINT IF EXISTS advances_purpose_check;

ALTER TABLE public.advances
  ADD CONSTRAINT advances_purpose_check
  CHECK (purpose IN ('Food', 'Petrol', 'Personal Advance', 'Office Expenses'));

UPDATE public.advances
SET purpose = 'Personal Advance'
WHERE purpose IS NULL;

UPDATE public.advances
SET others = reason
WHERE others IS NULL AND reason IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advances_employee_created_at ON public.advances (employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advances_status ON public.advances (status);
CREATE INDEX IF NOT EXISTS idx_advances_salary_adjusted_at ON public.advances (salary_adjusted_at) WHERE salary_adjusted_at IS NOT NULL;
