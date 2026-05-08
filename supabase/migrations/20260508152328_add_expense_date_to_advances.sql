-- Add expense_date column to advances table
ALTER TABLE public.advances
  ADD COLUMN IF NOT EXISTS expense_date DATE;

-- Update existing records to use created_at date as default
UPDATE public.advances
SET expense_date = DATE(created_at)
WHERE expense_date IS NULL;

-- Make expense_date NOT NULL for future records
ALTER TABLE public.advances
  ALTER COLUMN expense_date SET NOT NULL;

-- Add index for expense_date
CREATE INDEX IF NOT EXISTS idx_advances_expense_date ON public.advances (expense_date);
