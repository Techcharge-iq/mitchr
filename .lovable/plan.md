## Issues

1. **Leave application RLS error**: Inserting a leave application fails because the existing INSERT policy on `leave_applications` only allows `employee_id = get_employee_id(auth.uid())`. Admin/HR/managers (and any user submitting on behalf of someone else, or a user whose auth account isn't yet linked to an employee row) get blocked.
2. **Attendance is hard to manage**: The Attendance page lists records and has a `markAttendance` mutation, but there's no UI to actually mark or change status per employee. Users want a simple way to manage daily attendance.

---

## Fix 1 — Leave RLS (DB migration)

Add an INSERT policy that lets managers/HR/admin file leave for anyone, while still letting employees file their own:

```sql
CREATE POLICY "Admin/HR/Managers can create leave applications"
ON public.leave_applications FOR INSERT
TO authenticated
WITH CHECK (public.is_manager_or_above(auth.uid()));
```

(Existing "Users can create leave applications" policy stays — employees keep filing their own; PostgreSQL OR-combines permissive policies.)

## Fix 2 — Leave UI (`src/pages/Leave.tsx`)

- For non-manager users (`!is_manager_or_above`), hide the employee selector and auto-default `employee_id` to the current user's employee record (fetched via a lightweight query of `employees` where `user_id = auth.uid()`).
- Managers/HR/admin keep the employee dropdown.
- Surface clearer error toast if the current user has no linked employee record ("Your account is not linked to an employee profile — contact admin").

## Fix 3 — Attendance management UI (`src/pages/Attendance.tsx`)

Make the existing page actually usable for admin/HR:

- Add an **"All Employees" mode toggle** so when no attendance rows exist for the selected date, every active employee still appears in the table (left-joined with their attendance record for that date, if any).
- Add an **Actions column** (admin/HR only via `useAuth`) with a small `Select` (Present / Absent / Half Day / On Leave / Holiday) that calls the existing `markAttendance` mutation on change. Existing rows show current status as the value; missing rows show "Not marked".
- Add a **"Mark all Present"** button at the top (admin/HR only) that bulk-upserts the visible employees for the selected date.
- Keep the existing filters, search, and stats cards.

No new tables; uses existing `attendance` table and its RLS (admin/HR already has full manage policy).

---

## Files touched

- New migration: add INSERT policy on `leave_applications` for managers/HR/admin.
- `src/pages/Leave.tsx` — conditional employee selector + safer error handling.
- `src/pages/Attendance.tsx` — show all active employees, per-row status selector, "Mark all Present" bulk action (admin/HR only).

## Verification

- As employee: submit leave for self → succeeds (no RLS error).
- As admin/HR: submit leave for any employee → succeeds.
- As admin/HR on `/attendance`: pick a date, see all active employees, change a row's status via dropdown, "Mark all Present" updates everyone in one click; stats cards refresh.
