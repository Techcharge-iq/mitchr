-- Add account_number column to employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS account_number TEXT;