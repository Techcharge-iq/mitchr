## Goals

1. Add a missing **Purpose** selector to the "New Request" form on the Employee Advances & Expenses page.
2. Allow **Admin only** to **edit and delete**:
   - Employee Advances & Expenses (rows on the Advances tab)
   - Payslips (rows on the Payslips tab)

Stay on Lovable Cloud. UI/business-logic only — no DB schema changes (existing `advances` and `payroll` tables already support update/delete via RLS for admin/HR/accountant; we'll restrict UI to admin role).

---

## Changes — `src/pages/Payroll.tsx`

### 1. Purpose field in New Request dialog
The form state already has `purpose` (typed `Purpose | ''`) and the submit button already disables when empty, but the `<Select>` UI is missing. Add it directly above the Amount/Expense Date row inside the advances dialog (around line 624):

```tsx
<div className="grid gap-2">
  <Label>Purpose *</Label>
  <Select value={advanceForm.purpose} onValueChange={(v) => setAdvanceForm({ ...advanceForm, purpose: v as Purpose })}>
    <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
    <SelectContent>
      {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
```

### 2. Admin-only Edit / Delete

- Import `useAuth` from `@/hooks/useAuth` and read `userRole`. Compute `const isAdmin = userRole === 'admin'`.

- **Advances — Edit**
  - Add `editingAdvance: AdvanceRecord | null` state and reuse the existing advance dialog (refactor: when `editingAdvance` is set, the dialog title becomes "Edit Request", inputs are prefilled, and submit calls `updateAdvance.mutate()` instead of `createAdvance.mutate()`).
  - New `updateAdvance` mutation: `supabase.from('advances').update({ amount, monthly_deduction, purpose, others, expense_date }).eq('id', editingAdvance.id)`.

- **Advances — Delete**
  - New `deleteAdvance` mutation: `supabase.from('advances').delete().eq('id', id)`. Wrap trigger in `AlertDialog` (confirm "Delete this request?").

- Render Edit/Delete buttons inside `renderWorkflowActions(advance)` only when `isAdmin === true`. Same buttons added to the mobile card list.

- **Payslips — Edit**
  - Add `editingPayroll: PayrollRecord | null` state + a small dialog (Edit Payslip) with fields: `gross_salary`, `attendance_deduction`, `advance_deduction`, `tax_deduction`, `other_deductions`, `status` (draft/pending/paid). On save, recompute `net_salary = gross_salary - sum(deductions)` and update the row.
  - Mutation: `supabase.from('payroll').update({...}).eq('id', editingPayroll.id)`.

- **Payslips — Delete**
  - New `deletePayroll` mutation: `supabase.from('payroll').delete().eq('id', id)`, wrapped in `AlertDialog` confirm.

- In the Recent Payslips table, add a new "Actions" column (rendered only when `isAdmin`) with Edit and Delete buttons. Hide the column entirely for non-admins.

### 3. Cache invalidation & toasts
All new mutations invalidate `['advances']` or `['payrolls']` and show success/error toasts via `sonner`, matching existing patterns.

---

## Verification

- Open `/payroll/advances` → "New Request" → confirm Purpose dropdown shows Food / Petrol / Personal Advance / Office Expenses, and Submit stays disabled until selected.
- As an admin user, confirm Edit + Delete buttons appear on advances rows and payslip rows; clicking Edit opens a prefilled dialog, Save updates the row, Delete asks for confirmation then removes the row.
- As a non-admin (employee/hr/manager/accountant), confirm Edit/Delete are not rendered.
- After edits, totals on the Statements tab and summary cards refresh automatically.

## Files touched

- `src/pages/Payroll.tsx` (only file)
