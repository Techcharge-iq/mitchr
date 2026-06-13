import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const fmt = (v?: number | null) => `OMR ${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const displayAdvanceStatus = (status?: string | null, amount?: number, remaining?: number) => {
  if (status === 'rejected') return 'Rejected';
  const remainingAmount = Number(remaining || 0);
  const original = Number(amount || 0);
  if (remainingAmount <= 0) return 'Completed';
  if (remainingAmount < original) return 'Partially Recovered';
  if (remainingAmount === original) return 'Pending';
  return status || 'Pending';
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
      body * { visibility: hidden !important; }
      .print-area, .print-area * { visibility: visible !important; }
      .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
      .no-print { display: none !important; }
    }
    .print-area { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; }
    .print-area table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .print-area th, .print-area td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
    .print-area th { background: #f3f4f6; }
    .print-area .total-row td { background: #f9fafb; font-weight: 600; }
    .print-area .net-row td { background: #ecfdf5; color: #047857; font-weight: 700; font-size: 15px; }
  `}</style>
);

export function PrintablePayslip({
  payroll,
  salary,
  outstandingAfter,
}: {
  payroll: PayrollRecord;
  salary?: SalaryStructure;
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
      <div className="no-print mb-3 flex justify-end">
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>
      <div className="print-area" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111', paddingBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>PAYSLIP</h1>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>For the month of {format(new Date(payroll.year, payroll.month - 1), 'MMMM yyyy')}</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#666' }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#111' }}>Company HRMS</p>
            <p style={{ margin: 0 }}>Generated: {format(new Date(), 'dd MMM yyyy')}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, fontSize: 13 }}>
          <div>
            <p style={{ margin: '2px 0' }}><strong>Employee:</strong> {emp?.first_name} {emp?.last_name}</p>
            <p style={{ margin: '2px 0' }}><strong>Code:</strong> {emp?.employee_code}</p>
          </div>
          <div>
            <p style={{ margin: '2px 0' }}><strong>Status:</strong> {payroll.status}</p>
            <p style={{ margin: '2px 0' }}><strong>Days in Month:</strong> {daysInMonth}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <table>
            <thead><tr><th colSpan={2}>Earnings</th></tr></thead>
            <tbody>
              <tr><td>Basic Salary</td><td style={{ textAlign: 'right' }}>{fmt(basic)}</td></tr>
              <tr><td>Housing Allowance</td><td style={{ textAlign: 'right' }}>{fmt(housing)}</td></tr>
              <tr><td>Transport Allowance</td><td style={{ textAlign: 'right' }}>{fmt(transport)}</td></tr>
              <tr><td>Medical Allowance</td><td style={{ textAlign: 'right' }}>{fmt(medical)}</td></tr>
              <tr><td>Other Allowances</td><td style={{ textAlign: 'right' }}>{fmt(other)}</td></tr>
              <tr className="total-row"><td>Gross Salary</td><td style={{ textAlign: 'right' }}>{fmt(gross)}</td></tr>
            </tbody>
          </table>

          <table>
            <thead><tr><th colSpan={2}>Deductions</th></tr></thead>
            <tbody>
              <tr><td>Absent / Half-day / Unpaid Leave</td><td style={{ textAlign: 'right' }}>{fmt(attDed)}</td></tr>
              <tr><td>Advance Deduction</td><td style={{ textAlign: 'right' }}>{fmt(advDed)}</td></tr>
              <tr><td>Tax</td><td style={{ textAlign: 'right' }}>{fmt(taxDed)}</td></tr>
              <tr><td>Other</td><td style={{ textAlign: 'right' }}>{fmt(othDed)}</td></tr>
              <tr><td colSpan={2} style={{ fontSize: 11, color: '#666' }}>Daily rate: {fmt(daily)} ({fmt(basic)} ÷ {daysInMonth} days)</td></tr>
              <tr className="total-row"><td>Total Deductions</td><td style={{ textAlign: 'right' }}>{fmt(totalDed)}</td></tr>
            </tbody>
          </table>
        </div>

        <table style={{ marginTop: 16 }}>
          <tbody>
            <tr className="net-row">
              <td>NET SALARY PAYABLE</td>
              <td style={{ textAlign: 'right' }}>{fmt(payroll.net_salary)}</td>
            </tr>
            <tr>
              <td>Outstanding Advance Balance (after this deduction)</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(outstandingAfter)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, fontSize: 12, color: '#666' }}>
          <div style={{ borderTop: '1px solid #999', paddingTop: 4, width: 180, textAlign: 'center' }}>Employee Signature</div>
          <div style={{ borderTop: '1px solid #999', paddingTop: 4, width: 180, textAlign: 'center' }}>Authorised Signatory</div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 24 }}>This is a system-generated payslip.</p>
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
  const eligibleAdvances = advances.filter((a) => a.status !== 'pending' && a.status !== 'rejected');
  const totalAdvances = eligibleAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalRecovered = payrolls.reduce((sum, p) => sum + (Number(p.advance_deduction) || 0), 0);
  const outstanding = totalAdvances - totalRecovered;

  const advanceDetails = eligibleAdvances
    .slice()
    .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

  const salaryHistory = payrolls
    .slice()
    .sort((a, b) => new Date(a.year, a.month - 1).getTime() - new Date(b.year, b.month - 1).getTime());

  type LedgerEntry = {
    date: string;
    source: 'Advance' | 'Payroll Recovery';
    transactionId: string;
    payslipRef?: string;
    advanceRef?: string;
    debit: number;
    credit: number;
    balance: number;
  };

  const ledgerEntries: Omit<LedgerEntry, 'balance'>[] = [];
  advanceDetails.forEach((a) => {
    ledgerEntries.push({
      date: a.expense_date || a.created_at || '',
      source: 'Advance',
      transactionId: a.id,
      payslipRef: undefined,
      advanceRef: a.purpose || 'Advance',
      debit: Number(a.amount) || 0,
      credit: 0,
    });
  });

  salaryHistory.forEach((p) => {
    if ((p.advance_deduction || 0) > 0) {
      ledgerEntries.push({
        date: new Date(p.year, p.month - 1, 28).toISOString(),
        source: 'Payroll Recovery',
        transactionId: p.id,
        payslipRef: `${format(new Date(p.year, p.month - 1), 'MMM yyyy')} payroll`,
        advanceRef: undefined,
        debit: 0,
        credit: Number(p.advance_deduction) || 0,
      });
    }
  });

  ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let running = 0;
  const ledger = ledgerEntries.map((entry) => {
    running += entry.debit - entry.credit;
    return { ...entry, balance: running };
  });

  return (
    <div>
      <PrintStyles />
      <div className="no-print mb-3 flex justify-end">
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>
      <div className="print-area" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', padding: 24 }}>
        <div style={{ borderBottom: '2px solid #111', paddingBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>STATEMENT OF ACCOUNT</h1>
          <p style={{ margin: 0, color: '#666', fontSize: 12 }}>
            {employee.first_name} {employee.last_name} • {employee.employee_code} • Generated {format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>

        <h3 style={{ marginTop: 16, fontSize: 14 }}>Salary Advances</h3>
        <table>
          <thead><tr><th>Date</th><th>Purpose</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Monthly Deduction</th><th style={{ textAlign: 'right' }}>Remaining</th><th>Status</th></tr></thead>
          <tbody>
            {advances.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No advances</td></tr>
            ) : (
              advances.map((a) => (
                <tr key={a.id}>
                  <td>{a.expense_date ? format(new Date(a.expense_date), 'dd MMM yyyy') : '-'}</td>
                  <td>{a.purpose || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(a.amount)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(a.monthly_deduction)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(a.remaining_amount)}</td>
                  <td>{displayAdvanceStatus(a.status, a.amount, a.remaining_amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <h3 style={{ marginTop: 16, fontSize: 14 }}>Monthly Salary History</h3>
        <table>
          <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Gross</th><th style={{ textAlign: 'right' }}>Advance Deduction</th><th style={{ textAlign: 'right' }}>Other Deductions</th><th style={{ textAlign: 'right' }}>Net Salary</th><th>Status</th></tr></thead>
          <tbody>
            {payrolls.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No payroll records</td></tr>
            ) : (
              payrolls.map((p) => (
                <tr key={p.id}>
                  <td>{format(new Date(p.year, p.month - 1), 'MMM yyyy')}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(p.gross_salary)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(p.advance_deduction)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt((p.attendance_deduction || 0) + (p.tax_deduction || 0) + (p.other_deductions || 0))}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.net_salary)}</td>
                  <td>{p.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <h3 style={{ marginTop: 16, fontSize: 14 }}>Ledger (Running Balance)</h3>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No entries</td></tr>
            ) : (
              ledger.map((e, i) => (
                <tr key={i}>
                  <td>{e.date ? format(new Date(e.date), 'dd MMM yyyy') : '-'}</td>
                  <td>{e.source}</td>
                  <td>{e.payslipRef || e.advanceRef || e.transactionId}</td>
                  <td style={{ textAlign: 'right' }}>{e.debit ? fmt(e.debit) : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{e.credit ? fmt(e.credit) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(e.balance)}</td>
                </tr>
              ))
            )}
            <tr className="total-row">
              <td colSpan={5}>Outstanding Advance Balance</td>
              <td style={{ textAlign: 'right' }}>{fmt(outstanding)}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 24 }}>This is a system-generated statement.</p>
      </div>
    </div>
  );
}
