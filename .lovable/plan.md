## Scope (minimum credits, ~3–4 edits, no DB changes)

Three files touched. No migrations, no schema changes. All deduction logic stays client-side using existing columns (`attendance.status`, `leave_applications`, `advances`, `salary_structures`, `payroll.attendance_deduction` / `advance_deduction`).

---

### 1. Attendance — default = Present (`src/pages/Attendance.tsx`)

- Change the merged view so unmarked employees display as **Present** by default (replace the `not_marked` placeholder + badge with `present`).
- Keep the per-row `Select` (Admin can change to Absent, Half Day, On Leave, Holiday).
- Remove the "Mark all Present" button (now redundant) **and** keep `markAttendance` upsert exactly as-is so admin overrides still persist.
- No salary/deduction calculation happens here — confirmed; the page only writes status.

### 2. Payroll — auto-calculate deductions + breakdown (`src/pages/Payroll.tsx`)

Update `generatePayroll` only:

- Treat **unmarked days as Present** (so no deduction unless explicitly Absent/Half-day).
- Fetch unpaid leave for the month from `leave_applications` (status = `approved`, overlap with month, and `leave_type` flagged unpaid — fallback: count days where attendance status = `on_leave` AND the matching leave_application's leave_type `is_paid = false`; if unsure, count `on_leave` as unpaid by default). Add those days into `attendanceDeduction` at daily rate.
- Daily rate = `basic_salary / 30` (calendar-month standard) so deductions are stable regardless of how many rows exist.
- Persist a per-line breakdown (absent_days, half_days, unpaid_leave_days) by stuffing into existing `notes`/`remarks` text field if present; otherwise compute on-the-fly when rendering the payslip — **no schema change**.

Edit Payslip dialog: add read-only "Deduction Breakdown" block listing Absent / Half-day / Unpaid Leave / Advance amounts.

### 3. Professional A4 Payslip + SOA print (`src/pages/Payroll.tsx`)

- Add a **"View / Print Payslip"** action button per payroll row that opens a print-ready dialog rendering an A4 layout:
  - Header: company name + month/year
  - Employee block: name, code, department, designation, bank acct
  - Earnings table: Basic, Housing, Transport, Medical, Other → Gross
  - Deductions table: Absent (days × rate), Half-day (days × rate × 0.5), Unpaid Leave, Advance, Tax, Other → Total Deductions
  - **Net Salary** highlighted
  - **Outstanding advance balance after deduction** (sum of `remaining_amount` for that employee post-run)
  - `window.print()` button; CSS `@media print` hides app chrome, A4 page size.

- Statements tab: add a **"Print / Export Statement"** button per employee row that opens a printable SOA showing:
  - All advances (date, purpose, amount, monthly deduction)
  - Monthly payroll history (month, gross, advance deduction, net)
  - **Running balance column** (outstanding after each event, chronologically merged)
  - Same `@media print` styling, A4.

Export: print-to-PDF via browser (no new deps → keeps credits low).

---

## Files touched

1. `src/pages/Attendance.tsx` — default Present, drop bulk button.
2. `src/pages/Payroll.tsx` — deduction calc upgrade, A4 payslip print dialog, SOA print dialog, deduction breakdown in edit form.
3. (Optional) tiny shared `src/components/payroll/PrintablePayslip.tsx` + `PrintableStatement.tsx` to keep `Payroll.tsx` readable.

No DB migration. No new dependencies. Existing RLS and mutations untouched.

## Verification

- Mark no attendance for an employee → payroll shows 0 absent deduction.
- Mark 2 days Absent + 1 Half-day → payroll deducts `2.5 × (basic/30)`.
- Approved unpaid leave for 3 days → deducted at daily rate.
- Active advance with monthly deduction → deducted, `remaining_amount` decreases, payslip shows outstanding.
- Click "Print" on payslip → clean A4 layout; only the payslip prints.
- SOA for an employee shows chronological ledger with running balance.
