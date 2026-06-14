-- Add new employment status values
ALTER TYPE public.employment_status ADD VALUE IF NOT EXISTS 'resigned';
ALTER TYPE public.employment_status ADD VALUE IF NOT EXISTS 'holiday';