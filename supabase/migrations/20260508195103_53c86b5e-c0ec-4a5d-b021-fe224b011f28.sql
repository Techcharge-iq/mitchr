ALTER TABLE public.advances ADD COLUMN IF NOT EXISTS expense_date date;
UPDATE public.advances SET expense_date = created_at::date WHERE expense_date IS NULL;