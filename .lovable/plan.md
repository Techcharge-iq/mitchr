# Plan: Branded Payslip/SOA + Employee Status & Rejoin History

## 1. Database changes (single migration)

**Extend `employment_status` enum**
- Add values: `resigned`, `holiday` (alongside existing `active`, `on_leave`, `terminated`, `suspended`).

**New table: `public.employment_history`**
- Columns: `employee_id` (FK), `status` (employment_status), `effective_date` (date), `end_date` (date, nullable), `reason` (text), `notes` (text), `created_by` (uuid), plus standard id/created_at/updated_at.
- GRANTs for `authenticated` + `service_role`.
- RLS:
  - Admin/HR can manage all rows.
  - Employee can read their own rows.
- Trigger on `employees` UPDATE: when `employment_status` changes, auto-insert a history row (closes the previous open period by setting its `end_date`, opens a new one). This means rejoining = setting status back to `active` and a new active period is recorded automatically.

## 2. Employees page (`src/pages/Employees.tsx`)

- Add a **Status** column with badge (color-coded incl. new `resigned` = red, `holiday` = blue).
- Row action **"Change Status"** opens a small dialog: select new status (active/on_leave/holiday/resigned/terminated/suspended), effective date, reason. Submit → updates `employees.employment_status` (trigger logs history). If switching from `resigned`/`terminated` back to `active`, the dialog title becomes **"Rejoin Employee"**.
- Row action **"View History"** opens a dialog listing the employee's status timeline (from `employment_history`): date range, status, reason.

## 3. Payroll: monthly outstanding

- In `Payroll.tsx` `generatePayroll`, compute `outstanding_before` (sum of `remaining_amount` across active advances BEFORE deduction) and pass both into the printable payslip props.
- No schema change — derived live from `advances` history + this month's `advance_deduction`.

## 4. Payslip redesign (`PrintableDocs.tsx` → `PrintablePayslip`)

Match the attached mockup:
- Top brand bar: **"PRIME GLOBAL PERFECT TRADING HRMS"** (left, bold) + **"PAYSLIP"** (right).
- Employee/meta block as a single bordered table with light-gray label cells (Employee Name, For the Month, Employee Code, Days in Month, Status with badge, Generated Date).
- Two side-by-side tables with **solid blue header bars** (white text): **EARNINGS** and **DEDUCTIONS**. Rows aligned right for amounts. Gross/Total rows highlighted.
- Daily rate note line under the two tables.
- **NET SALARY PAYABLE** row with full-width blue bar.
- Two new lines below net salary:
  - `Outstanding Advance Balance (Before this month): OMR X`
  - `Outstanding Advance Balance (After this deduction): OMR Y`
- Signature blocks unchanged.
- Footer: *"This is a system-generated payslip. No physical signature required."*

## 5. SOA redesign (`PrintableStatement`)

- Same brand header bar (PRIME GLOBAL... + STATEMENT OF ACCOUNT).
- Employee meta block as bordered table (Name, Code, Generated Date, Outstanding Balance).
- Three sections with **blue header bars**: Salary Advances, Monthly Salary History, Ledger (Running Balance).
- **Monthly Salary History** gets a new right-most **"Outstanding After"** column showing running outstanding balance at end of each month.
- Footer note: system-generated.

## 6. Files touched

- `supabase/migrations/<new>.sql` — enum values, `employment_history` table, RLS, trigger.
- `src/types/hrms.ts` — extend `EmploymentStatus` type, add `EmploymentHistory` interface.
- `src/pages/Employees.tsx` — status column, change-status dialog, history dialog.
- `src/pages/Payroll.tsx` — compute outstanding_before/after, pass to printable.
- `src/components/payroll/PrintableDocs.tsx` — full redesign of both printables; accept outstanding props; running balance per month in SOA.

## Verification

- Change employee `active → resigned` → row appears in `employment_history` with reason; old period closed.
- Set back to `active` → new history row, badge updates, employee can be included in payroll again.
- Generate a payslip after an advance with partial recovery → "Before" and "After" outstanding values match SOA ledger.
- Print preview (window.print) renders A4 layout matching mockup with blue bars and brand header.
