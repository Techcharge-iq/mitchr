## Problem

`Reports.tsx` queries `advances.expense_date`, but that column doesn't exist in the database. Result: the query returns a `SelectQueryError`, type checks fail, and any chart that depends on `expense_date` either crashes (Invalid Date) or shows wrong totals. `Payroll.tsx` also writes `expense_date` on insert, so the value is being silently dropped today.

## Fix (stay on Lovable Cloud)

### 1. Database migration — add the missing column

Add `expense_date` to `public.advances` so the frontend and backend agree:

- Add column `expense_date date` (nullable).
- Backfill existing rows with `created_at::date` so historical data shows up in the right month.
- No RLS changes needed (existing policies already cover the table).

### 2. `src/pages/Reports.tsx` — guard the query and the UI

- Keep the `expense_date` selection but treat it as optional.
- Use `created_at` as a fallback when `expense_date` is null (covers any row written before the migration).
- Replace the bare `new Date(expense.expense_date)` with a safe parser that:
  - returns `null` for missing/invalid values,
  - skips the row from monthly aggregation when invalid (still counted in totals if status is approved/rejected, just not bucketed by month).
- Keep date-range filters on `expense_date` but also accept rows where it's null by widening to `or(expense_date.gte.…,and(expense_date.is.null,created_at.gte.…))`. Simpler equivalent: filter client-side after fetching the year window using whichever of the two dates is present.
- No UI/visual changes — same cards, same charts, same labels.

### 3. `src/pages/Payroll.tsx` — small consistency tweaks (no UI change)

- The form already sends `expense_date`; once the column exists the insert just works.
- Line 637 already falls back to `created_at` for display — keep as-is.

## What stays the same

- All other tables, RLS policies, edge functions, auth, and UI.
- Lovable Cloud remains the backend.
- No changes to Payroll calculations, OT rules (300 hrs/month), or any other module.

## Files touched

- New migration: add `expense_date` column to `advances` + backfill.
- `src/pages/Reports.tsx`: safe date parsing + fallback to `created_at`.

## Verification

- Reports page loads with no runtime error even when `expense_date` is null.
- New advance requests created from Payroll save the picked date and appear in the correct month bucket on Reports.
- Year filter and employee filter on Reports continue to work.
