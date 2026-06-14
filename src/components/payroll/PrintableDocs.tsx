import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const COMPANY = 'PRIME GLOBAL PERFECT TRADING HRMS';
const BRAND_BLUE = '#1e3a8a';
const BRAND_BLUE_SOFT = '#dbeafe';

const fmt = (v?: number | null) =>
  `OMR ${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const parseDate = (value?: string | null) => {
  const date = new Date(value ?? '');
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

type Employee = { id: string; first_name: string; last_name: string; employee_code: string };

type PayrollRecord = {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary?: number | null;
  gross_salary: number;
  attendance_deduction: number | null;
  advance_deduction: number | null;
  tax_deduction: number | null;
  other_deductions: number | null;
  net_salary: number;
  status: string | null;
  employees?: Employee | null;
};

type SalaryStructure = {
  employee_id: string;
  basic_salary: number;
  housing_allowance: number | null;
  transport_allowance: number | null;
  medical_allowance: number | null;
  other_allowances: number | null;
};

type Advance = {
  id: string;
  employee_id: string;
  amount: number;
  remaining_amount: number;
  monthly_deduction: number;
  purpose?: string | null;
  expense_date: string;
  status: string | null;
  created_at: string | null;
};

const PrintStyles = () => (
  <style>{`
    @media print {
      * { margin: 0; padding: 0; }
      body { visibility: hidden; }
      .print-area, .print-area * { visibility: visible !important; }
      .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; background: white; }
      .no-print { display: none !important; }
      .print-area table { page-break-inside: avoid; }
    }
    @page { margin: 0.4in; }
    .print-area { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; line-height: 1.45; }
    .print-area table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .print-area th, .print-area td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; vertical-align: middle; }
    .pa-brand { display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid ${BRAND_BLUE}; padding-bottom: 10px; margin-bottom: 14px; }
    .pa-brand h1 { font-size: 19px; font-weight: 800; color: ${BRAND_BLUE}; letter-spacing: 0.5px; margin:0; }
    .pa-brand .doc-type { font-size: 16px; font-weight: 700; color: #334155; letter-spacing: 2px; }
    .pa-meta td.label { background:#f1f5f9; font-weight:600; width:18%; color:#334155; }
    .pa-section-bar th { background: ${BRAND_BLUE}; color: white; font-weight: 700; letter-spacing: 0.5px; font-size: 12.5px; padding: 8px 10px; border: 1px solid ${BRAND_BLUE}; }
    .pa-total td { background: ${BRAND_BLUE_SOFT}; font-weight: 700; }
    .pa-net td { background: ${BRAND_BLUE}; color: white; font-weight: 800; font-size: 14px; padding: 10px 12px; }
    .pa-outstanding td { background: #f8fafc; font-weight: 600; }
    .pa-footer-note { text-align: center; font-size: 11px; color: #64748b; margin-top: 18px; }
    .pa-amount { text-align: right; font-variant-numeric: tabular-nums; }
  `}</style>
);

function BrandHeader({ docType }: { docType: string }) {
  return (
    <div className="pa-brand">
      <h1>{COMPANY}</h1>
      <div className="doc-type">{docType}</div>
    </div>
  );
}

function PrintButton() {
  return (
    <div className="no-print mb-3 flex justify-end">
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
      </Button>
    </div>
  );
}

export function PrintablePayslip({
  payroll,
  salary,
  outstandingBefore,
  outstandingAfter,
}: {
  payroll: PayrollRecord;
  salary?: SalaryStructure;
  outstandingBefore: number;
  outstandingAfter: number;
}) {
  const emp = payroll.employees;
  const basic = Number(payroll.basic_salary ?? salary?.basic_salary ?? 0);
  const housing = Number(salary?.housing_allowance ?? 0);
  const transport = Number(salary?.transport_allowance ?? 0);
  const medical = Number(salary?.medical_allowance ?? 0);
  const other = Number(salary?.other_allowances ?? 0);
  const gross = Number(payroll.gross_salary) || basic + housing + transport + medical + other;
  const attDed = Number(payroll.attendance_deduction || 0);
  const advDed = Number(payroll.advance_deduction || 0);
  const taxDed = Number(payroll.tax_deduction || 0);
  const othDed = Number(payroll.other_deductions || 0);
  const totalDed = attDed + advDed + taxDed + othDed;
  const daysInMonth = new Date(payroll.year, payroll.month, 0).getDate();
  const daily = basic / daysInMonth;

  return (
    <div>
      <PrintStyles />
      <PrintButton />
      <div className="print-area" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', padding: 24, boxSizing: 'border-box' }}>
        <BrandHeader docType="PAYSLIP" />

        <table className="pa-meta" style={{ marginBottom: 14 }}>
          <tbody>
            <tr>
              <td className="label">Employee Name:</td>
              <td>{emp?.first_name} {emp?.last_name}</td>
              <td className="label">For the Month:</td>
              <td>{format(new Date(payroll.year, payroll.month - 1), 'MMMM yyyy')}</td>
            </tr>
            <tr>
              <td className="label">Employee Code:</td>
              <td>{emp?.employee_code}</td>
              <td className="label">Days in Month:</td>
              <td>{daysInMonth}</td>
            </tr>
            <tr>
              <td className="label">Status:</td>
              <td><span style={{ display: 'inline-block', padding: '2px 10px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{payroll.status}</span></td>
              <td className="label">Generated Date:</td>
              <td>{format(new Date(), 'dd MMM yyyy')}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <table>
            <thead className="pa-section-bar"><tr><th colSpan={2}>EARNINGS</th></tr></thead>
            <tbody>
              <tr><td>Basic Salary</td><td className="pa-amount">{fmt(basic)}</td></tr>
              <tr><td>Housing Allowance</td><td className="pa-amount">{fmt(housing)}</td></tr>
              <tr><td>Transport Allowance</td><td className="pa-amount">{fmt(transport)}</td></tr>
              <tr><td>Medical Allowance</td><td className="pa-amount">{fmt(medical)}</td></tr>
              <tr><td>Other Allowances</td><td className="pa-amount">{fmt(other)}</td></tr>
              <tr className="pa-total"><td>Gross Salary</td><td className="pa-amount">{fmt(gross)}</td></tr>
            </tbody>
          </table>

          <table>
            <thead className="pa-section-bar"><tr><th colSpan={2}>DEDUCTIONS</th></tr></thead>
            <tbody>
              <tr><td>Absent / Unpaid Leave</td><td className="pa-amount">{fmt(attDed)}</td></tr>
              <tr><td>Advance Deduction</td><td className="pa-amount">{fmt(advDed)}</td></tr>
              <tr><td>Tax</td><td className="pa-amount">{fmt(taxDed)}</td></tr>
              <tr><td>Other</td><td className="pa-amount">{fmt(othDed)}</td></tr>
              <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
              <tr className="pa-total"><td>Total Deductions</td><td className="pa-amount">{fmt(totalDed)}</td></tr>
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 11, color: '#64748b', margin: '8px 0 14px 0' }}>
          Daily rate calculation: {fmt(daily)} (Based on {fmt(basic)} Basic Salary / {daysInMonth} days)
        </p>

        <table>
          <tbody>
            <tr className="pa-net">
              <td>NET SALARY PAYABLE</td>
              <td className="pa-amount">{fmt(payroll.net_salary)}</td>
            </tr>
            <tr className="pa-outstanding">
              <td>Outstanding Advance Balance (Before this month)</td>
              <td className="pa-amount">{fmt(outstandingBefore)}</td>
            </tr>
            <tr className="pa-outstanding">
              <td>Outstanding Advance Balance (After this deduction)</td>
              <td className="pa-amount">{fmt(outstandingAfter)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, fontSize: 12, color: '#475569' }}>
          <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4, width: 180, textAlign: 'center' }}>Employee Signature</div>
          <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4, width: 180, textAlign: 'center' }}>Authorised Signatory</div>
        </div>
        <p className="pa-footer-note">This is a system-generated payslip. No physical signature required.</p>
      </div>
    </div>
  );
}

export function PrintableStatement({
  employee,
  advances,
  payrolls,
}: {
  employee: Employee;
  advances: Advance[];
  payrolls: PayrollRecord[];
}) {
  const sortedAdvances = [...advances].sort(
    (a, b) => parseDate(a.created_at ?? a.expense_date) - parseDate(b.created_at ?? b.expense_date),
  );
  const sortedPayrolls = [...payrolls].sort(
    (a, b) => new Date(a.year, a.month - 1).getTime() - new Date(b.year, b.month - 1).getTime(),
  );

  // Recovery allocation FIFO
  const recovery = sortedAdvances
    .filter((a) => a.status !== 'rejected')
    .map((a) => ({ id: a.id, amount: Number(a.amount) || 0, remaining: Number(a.amount) || 0, recovered: 0 }));

  sortedPayrolls.forEach((p) => {
    let rem = Number(p.advance_deduction || 0);
    for (const r of recovery) {
      if (rem <= 0) break;
      if (r.remaining <= 0) continue;
      const applied = Math.min(r.remaining, rem);
      r.remaining -= applied;
      r.recovered += applied;
      rem -= applied;
    }
  });

  const recoveredById = new Map(recovery.map((r) => [r.id, r.recovered]));

  const computedAdvances = advances.map((a) => {
    if (a.status === 'rejected') {
      return { ...a, computedRemaining: Number(a.amount) || 0, computedStatus: 'Rejected' };
    }
    const total = Number(a.amount) || 0;
    const recovered = recoveredById.get(a.id) ?? 0;
    const remaining = Math.max(total - recovered, 0);
    const computedStatus = remaining <= 0 ? 'Completed' : recovered > 0 ? 'Partially Recovered' : 'Pending';
    return { ...a, computedRemaining: remaining, computedStatus };
  });

  const totalAdvances = computedAdvances
    .filter((a) => a.status !== 'rejected')
    .reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalRecovered = sortedPayrolls.reduce((s, p) => s + (Number(p.advance_deduction) || 0), 0);
  const outstanding = Math.max(totalAdvances - totalRecovered, 0);

  // Monthly running outstanding
  let runningRecovered = 0;
  const monthlyRows = sortedPayrolls.map((p) => {
    runningRecovered += Number(p.advance_deduction) || 0;
    const outstandingAfter = Math.max(totalAdvances - runningRecovered, 0);
    return { p, outstandingAfter };
  });

  // Ledger
  type LedgerEntry = { date: string; source: string; ref: string; debit: number; credit: number; balance: number };
  const entries: Omit<LedgerEntry, 'balance'>[] = [];
  computedAdvances
    .slice()
    .sort((a, b) => parseDate(a.expense_date ?? a.created_at) - parseDate(b.expense_date ?? b.created_at))
    .forEach((a) => {
      entries.push({ date: a.expense_date || a.created_at || '', source: 'Advance', ref: a.purpose || 'Advance', debit: Number(a.amount) || 0, credit: 0 });
    });
  sortedPayrolls.forEach((p) => {
    if ((p.advance_deduction || 0) > 0) {
      entries.push({
        date: new Date(p.year, p.month - 1, 28).toISOString(),
        source: 'Payroll Recovery',
        ref: `${format(new Date(p.year, p.month - 1), 'MMM yyyy')} payroll`,
        debit: 0,
        credit: Number(p.advance_deduction) || 0,
      });
    }
  });
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let bal = 0;
  const ledger: LedgerEntry[] = entries.map((e) => {
    bal += e.debit - e.credit;
    return { ...e, balance: bal };
  });

  return (
    <div>
      <PrintStyles />
      <PrintButton />
      <div className="print-area" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', padding: 24, boxSizing: 'border-box' }}>
        <BrandHeader docType="STATEMENT OF ACCOUNT" />

        <table className="pa-meta" style={{ marginBottom: 14 }}>
          <tbody>
            <tr>
              <td className="label">Employee Name:</td>
              <td>{employee.first_name} {employee.last_name}</td>
              <td className="label">Generated Date:</td>
              <td>{format(new Date(), 'dd MMM yyyy')}</td>
            </tr>
            <tr>
              <td className="label">Employee Code:</td>
              <td>{employee.employee_code}</td>
              <td className="label">Outstanding Balance:</td>
              <td style={{ fontWeight: 700, color: BRAND_BLUE }}>{fmt(outstanding)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ marginBottom: 14 }}>
          <thead className="pa-section-bar"><tr><th colSpan={6}>SALARY ADVANCES</th></tr></thead>
          <thead><tr><th>Date</th><th>Purpose</th><th className="pa-amount">Amount</th><th className="pa-amount">Monthly Deduction</th><th className="pa-amount">Remaining</th><th>Status</th></tr></thead>
          <tbody>
            {computedAdvances.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>No advances</td></tr>
            ) : (
              computedAdvances.map((a) => (
                <tr key={a.id}>
                  <td>{a.expense_date ? format(new Date(a.expense_date), 'dd MMM yyyy') : '-'}</td>
                  <td>{a.purpose || '-'}</td>
                  <td className="pa-amount">{fmt(a.amount)}</td>
                  <td className="pa-amount">{fmt(a.monthly_deduction)}</td>
                  <td className="pa-amount">{fmt(a.computedRemaining)}</td>
                  <td>{a.computedStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <table style={{ marginBottom: 14 }}>
          <thead className="pa-section-bar"><tr><th colSpan={6}>MONTHLY SALARY HISTORY</th></tr></thead>
          <thead><tr><th>Month</th><th className="pa-amount">Gross</th><th className="pa-amount">Advance Deduction</th><th className="pa-amount">Other Deductions</th><th className="pa-amount">Net Salary</th><th className="pa-amount">Outstanding After</th></tr></thead>
          <tbody>
            {monthlyRows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>No payroll records</td></tr>
            ) : (
              monthlyRows.map(({ p, outstandingAfter }) => (
                <tr key={p.id}>
                  <td>{format(new Date(p.year, p.month - 1), 'MMM yyyy')}</td>
                  <td className="pa-amount">{fmt(p.gross_salary)}</td>
                  <td className="pa-amount">{fmt(p.advance_deduction)}</td>
                  <td className="pa-amount">{fmt((p.attendance_deduction || 0) + (p.tax_deduction || 0) + (p.other_deductions || 0))}</td>
                  <td className="pa-amount" style={{ fontWeight: 600 }}>{fmt(p.net_salary)}</td>
                  <td className="pa-amount" style={{ fontWeight: 600, color: BRAND_BLUE }}>{fmt(outstandingAfter)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <table>
          <thead className="pa-section-bar"><tr><th colSpan={6}>LEDGER (RUNNING BALANCE)</th></tr></thead>
          <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th className="pa-amount">Debit</th><th className="pa-amount">Credit</th><th className="pa-amount">Balance</th></tr></thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>No entries</td></tr>
            ) : (
              ledger.map((e, i) => (
                <tr key={i}>
                  <td>{e.date ? format(new Date(e.date), 'dd MMM yyyy') : '-'}</td>
                  <td>{e.source}</td>
                  <td>{e.ref}</td>
                  <td className="pa-amount">{e.debit ? fmt(e.debit) : '-'}</td>
                  <td className="pa-amount">{e.credit ? fmt(e.credit) : '-'}</td>
                  <td className="pa-amount" style={{ fontWeight: 600 }}>{fmt(e.balance)}</td>
                </tr>
              ))
            )}
            <tr className="pa-total">
              <td colSpan={5}>Outstanding Advance Balance</td>
              <td className="pa-amount">{fmt(outstanding)}</td>
            </tr>
          </tbody>
        </table>

        <p className="pa-footer-note">This is a system-generated statement. No physical signature required.</p>
      </div>
    </div>
  );
}
