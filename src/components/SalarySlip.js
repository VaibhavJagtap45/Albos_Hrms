'use client';

import { Download } from 'lucide-react';
import companyLogoSrc from '@/assets/albos_technology.jpeg';
import { formatCurrency, formatDate, getStatusTone } from '@/lib/utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function numberToWords(amount) {
  if (!amount && amount !== 0) return '';
  const num = Math.round(amount);
  if (num === 0) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  }

  return inWords(num) + ' Rupees Only';
}

async function imageToBase64(url) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function fmt(v) { return formatCurrency(v ?? 0); }

// ── PDF HTML generator ────────────────────────────────────────────────────────

function buildPrintHTML(salary, logoBase64) {
  const emp       = salary.employeeId || salary.employee || {};
  const monthName = MONTH_NAMES[(salary.month || 1) - 1];

  const gross       = salary.grossSalary      ?? 0;
  const perDay      = salary.perDaySalary     ?? 0;
  const workDays    = salary.workingDays       ?? 0;
  const sundays     = salary.sundaysInMonth    ?? 0;
  const swiped      = salary.swipedDays        ?? 0;
  const present     = salary.daysPresent       ?? 0;
  const absent      = salary.daysAbsent        ?? 0;
  const lateCount   = salary.lateMarks         ?? 0;
  const leaveDays   = salary.approvedLeaveDays ?? 0;
  const cfLate      = salary.carryForwardLateMarks ?? 0;

  const pf          = salary.pf               ?? 0;
  const pt          = salary.pt               ?? 200;
  const pfi         = salary.pfi              ?? 0;
  const tc          = salary.tc               ?? 0;
  const absentDed   = salary.absentDeduction  ?? 0;
  const lateDed     = salary.lateDeduction    ?? 0;
  const leaveDed    = salary.leaveDeduction   ?? 0;
  const otherDed    = salary.otherDeductions  ?? 0;
  const net         = salary.netPayable       ?? 0;

  const totalDed    = pf + pt + pfi + tc + absentDed + lateDed + leaveDed + otherDed;

  const logoTag = logoBase64
    ? `<img src="${logoBase64}" alt="Albos Technology" class="logo"/>`
    : `<div class="logo-placeholder">ALBOS</div>`;

  const deductionRow = (label, value) =>
    `<tr><td class="label">${label}</td><td class="amount">${formatCurrency(value)}</td></tr>`;

  const dojFormatted = emp.doj
    ? new Date(emp.doj).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Salary Slip — ${emp.name || 'Employee'} — ${monthName} ${salary.year}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Arial',sans-serif;font-size:11.5px;color:#222;background:#fff;
       -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;min-height:270mm;margin:0 auto;padding:10mm 14mm;background:#fff}

  /* ── Header ── */
  .header{display:flex;align-items:center;justify-content:space-between;
          padding-bottom:10px;border-bottom:3px solid #1B2B5B;margin-bottom:14px}
  .header-left{display:flex;align-items:center;gap:14px}
  .logo{height:52px;width:auto;object-fit:contain;border-radius:6px}
  .logo-placeholder{height:52px;width:52px;background:#1B2B5B;color:#fff;
                    display:flex;align-items:center;justify-content:center;
                    font-weight:700;font-size:13px;border-radius:6px}
  .company-info .name{font-size:18px;font-weight:700;color:#1B2B5B;letter-spacing:.3px}
  .company-info .tagline{font-size:9px;color:#666;margin-top:2px;letter-spacing:.3px}
  .slip-meta{text-align:right}
  .slip-meta h2{font-size:13px;font-weight:700;color:#1B2B5B;text-transform:uppercase;letter-spacing:.8px}
  .slip-meta .period{font-size:10px;color:#555;margin-top:3px;font-weight:600}
  .slip-meta .badge{display:inline-block;margin-top:5px;padding:2px 10px;
                    border-radius:20px;font-size:8.5px;font-weight:700;
                    text-transform:uppercase;letter-spacing:.6px;
                    background:${salary.status === 'finalised' ? '#d1fae5' : '#fef9c3'};
                    color:${salary.status === 'finalised' ? '#065f46' : '#854d0e'}}

  /* ── Employee info grid ── */
  .emp-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #dde;
            border-radius:6px;margin-bottom:14px;overflow:hidden}
  .emp-cell{padding:5px 10px;border-bottom:1px solid #eee;display:flex;gap:8px;align-items:baseline}
  .emp-cell:nth-child(odd){border-right:1px solid #dde}
  .emp-cell .lbl{font-size:8.5px;color:#888;text-transform:uppercase;
                 letter-spacing:.4px;min-width:82px;flex-shrink:0}
  .emp-cell .val{font-size:11px;font-weight:600;color:#1a1a1a}

  /* ── Attendance summary bar ── */
  .att-bar{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:14px}
  .att-box{border:1px solid #eee;border-radius:6px;padding:6px 8px;text-align:center;background:#f8f9fb}
  .att-box .lbl{font-size:7.5px;color:#999;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px}
  .att-box .val{font-size:15px;font-weight:700;color:#1B2B5B}
  .att-box.sundays .val{color:#16a34a}
  .att-box.absent  .val{color:#dc2626}
  .att-box.late    .val{color:#d97706}

  /* ── Earnings / Deductions tables ── */
  .tables{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:10.5px}
  .tbl-head{padding:6px 10px;font-size:9px;font-weight:700;text-transform:uppercase;
            letter-spacing:.5px;color:#fff;border-radius:4px 4px 0 0}
  .earn-head{background:#1B2B5B}
  .ded-head{background:#c0392b}
  table td{padding:4.5px 10px;border-bottom:1px solid #f0f0f0}
  table td.label{color:#444}
  table td.amount{text-align:right;font-weight:600;color:#222}
  table td.amount.red{color:#c0392b}
  table tfoot td{font-weight:700;background:#f4f6fb;border-top:2px solid #1B2B5B;padding:6px 10px}
  table tfoot td.amount{text-align:right;color:#1B2B5B}
  .ded-foot td{border-top-color:#c0392b !important}
  .ded-foot td.amount{color:#c0392b !important}

  /* ── Net summary ── */
  .summary-bar{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:10px;margin-bottom:14px}
  .sum-box{border:1px solid #dde;border-radius:6px;padding:9px 12px;text-align:center}
  .sum-box .lbl{font-size:8.5px;color:#888;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}
  .sum-box .val{font-size:16px;font-weight:700;color:#1B2B5B}
  .sum-box.net-box{background:#1B2B5B;border-color:#1B2B5B}
  .sum-box.net-box .lbl{color:rgba(255,255,255,.65)}
  .sum-box.net-box .val{font-size:20px;color:#fff}

  /* ── Words row ── */
  .words-row{border:1px solid #dde;border-radius:6px;padding:7px 12px;
             margin-bottom:14px;font-size:10px;background:#f8f9fb}
  .words-row strong{color:#1B2B5B}

  /* ── Footer ── */
  .footer{display:flex;justify-content:space-between;align-items:flex-end;
          padding-top:28px;border-top:1px solid #dde}
  .footer .note{font-size:8.5px;color:#aaa;font-style:italic;max-width:260px}
  .footer .sign{text-align:center;font-size:8.5px;color:#666;line-height:1.5}
  .footer .sign-line{width:130px;border-bottom:1px solid #999;margin:0 auto 4px}

  .section-title{font-size:9px;font-weight:700;text-transform:uppercase;
                 letter-spacing:.5px;color:#1B2B5B;margin-bottom:4px}

  @media print{
    @page{size:A4 portrait;margin:8mm}
    body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="page">

  <!-- ── Header ──────────────────────────────────────────────────────── -->
  <div class="header">
    <div class="header-left">
      ${logoTag}
      <div class="company-info">
        <div class="name">Albos Technology Pvt. Ltd.</div>
        <div class="tagline">Technology · Innovation · Excellence</div>
      </div>
    </div>
    <div class="slip-meta">
      <h2>Salary Slip</h2>
      <div class="period">${monthName} ${salary.year}</div>
      <span class="badge">${(salary.status || 'DRAFT').toUpperCase()}</span>
    </div>
  </div>

  <!-- ── Employee Details ─────────────────────────────────────────────── -->
  <div class="section-title">Employee Details</div>
  <div class="emp-grid">
    <div class="emp-cell"><span class="lbl">Employee Name</span><span class="val">${emp.name || '—'}</span></div>
    <div class="emp-cell"><span class="lbl">Employee ID</span><span class="val">${emp.employeeId || '—'}</span></div>
    <div class="emp-cell"><span class="lbl">Designation</span><span class="val">${emp.designation || emp.position || '—'}</span></div>
    <div class="emp-cell"><span class="lbl">Department</span><span class="val">${emp.department || '—'}</span></div>
    <div class="emp-cell"><span class="lbl">Date of Joining</span><span class="val">${dojFormatted}</span></div>
    <div class="emp-cell"><span class="lbl">Pay Period</span><span class="val">${monthName} ${salary.year}</span></div>
    <div class="emp-cell"><span class="lbl">Email</span><span class="val">${emp.email || '—'}</span></div>
    <div class="emp-cell"><span class="lbl">Per Day Rate</span><span class="val">${formatCurrency(perDay)}</span></div>
  </div>

  <!-- ── Attendance Summary ───────────────────────────────────────────── -->
  <div class="section-title">Attendance Summary (${monthName} ${salary.year})</div>
  <div class="att-bar" style="margin-top:5px">
    <div class="att-box"><div class="lbl">Total Paid Days</div><div class="val">${workDays}</div></div>
    <div class="att-box sundays"><div class="lbl">Sundays (Paid)</div><div class="val">${sundays}</div></div>
    <div class="att-box"><div class="lbl">Swiped Days</div><div class="val">${swiped}</div></div>
    <div class="att-box"><div class="lbl">Days Present</div><div class="val">${present}</div></div>
    <div class="att-box absent"><div class="lbl">Days Absent</div><div class="val">${absent}</div></div>
    <div class="att-box late"><div class="lbl">Late Marks</div><div class="val">${lateCount}</div></div>
  </div>

  <!-- ── Earnings & Deductions ────────────────────────────────────────── -->
  <div class="tables">
    <!-- Earnings -->
    <div>
      <div class="section-title">Earnings</div>
      <table style="margin-top:5px">
        <thead><tr><td class="tbl-head earn-head" colspan="2">Particulars</td></tr></thead>
        <tbody>
          <tr><td class="label">Basic / Gross Salary</td><td class="amount">${formatCurrency(gross)}</td></tr>
          <tr><td class="label">Paid Days (incl. ${sundays} Sundays)</td><td class="amount">${workDays} days</td></tr>
          <tr><td class="label">Swiped / Present Days</td><td class="amount">${swiped} days</td></tr>
          ${leaveDays > 0 ? `<tr><td class="label">Approved Leave Days</td><td class="amount">${leaveDays} days</td></tr>` : ''}
        </tbody>
        <tfoot><tr><td>Total Earnings</td><td class="amount">${formatCurrency(gross)}</td></tr></tfoot>
      </table>
    </div>

    <!-- Deductions -->
    <div>
      <div class="section-title">Deductions</div>
      <table style="margin-top:5px">
        <thead><tr><td class="tbl-head ded-head" colspan="2">Particulars</td></tr></thead>
        <tbody>
          ${deductionRow('Provident Fund (PF)', pf)}
          ${deductionRow('Professional Tax (PT)', pt)}
          ${deductionRow('PF Insurance (PFI)', pfi)}
          ${deductionRow('Transport Charges (TC)', tc)}
          ${deductionRow('Absent Deduction', absentDed)}
          ${deductionRow('Late Mark Deduction', lateDed)}
          ${deductionRow('Leave Deduction', leaveDed)}
          ${deductionRow('Other Deductions', otherDed)}
        </tbody>
        <tfoot class="ded-foot"><tr><td>Total Deductions</td><td class="amount">${formatCurrency(totalDed)}</td></tr></tfoot>
      </table>
    </div>
  </div>

  <!-- ── Net Summary ──────────────────────────────────────────────────── -->
  <div class="summary-bar">
    <div class="sum-box">
      <div class="lbl">Gross Earnings</div>
      <div class="val">${formatCurrency(gross)}</div>
    </div>
    <div class="sum-box">
      <div class="lbl">Total Deductions</div>
      <div class="val" style="color:#c0392b">${formatCurrency(totalDed)}</div>
    </div>
    <div class="sum-box net-box">
      <div class="lbl">Net Payable Amount</div>
      <div class="val">${formatCurrency(net)}</div>
    </div>
  </div>

  <!-- ── Amount in Words ──────────────────────────────────────────────── -->
  <div class="words-row">
    Amount in Words: <strong>${numberToWords(net)}</strong>
  </div>

  <!-- ── Footer ──────────────────────────────────────────────────────── -->
  <div class="footer">
    <div class="note">
      This is a computer-generated salary slip and does not require a physical signature.<br/>
      Carry-forward late marks: <strong>${cfLate}</strong>
    </div>
    <div class="sign">
      <div class="sign-line"></div>
      Authorised Signatory<br/>
      <span style="color:#1B2B5B;font-weight:700">Albos Technology Pvt. Ltd.</span>
    </div>
  </div>

</div>
<script>window.onload = () => { setTimeout(() => { window.focus(); window.print(); }, 400); };</script>
</body>
</html>`;
}

// ── On-screen SalarySlip component ───────────────────────────────────────────

export default function SalarySlip({ salary }) {
  if (!salary) return null;

  const emp       = salary.employeeId || salary.employee || {};
  const monthName = MONTH_NAMES[(salary.month || 1) - 1];

  const gross     = salary.grossSalary      ?? 0;
  const workDays  = salary.workingDays      ?? 0;
  const sundays   = salary.sundaysInMonth   ?? 0;
  const swiped    = salary.swipedDays       ?? 0;
  const present   = salary.daysPresent      ?? 0;
  const absent    = salary.daysAbsent       ?? 0;
  const lateCount = salary.lateMarks        ?? 0;
  const leaveDays = salary.approvedLeaveDays ?? 0;
  const cfLate    = salary.carryForwardLateMarks ?? 0;

  const pf        = salary.pf              ?? 0;
  const pt        = salary.pt              ?? 200;
  const pfi       = salary.pfi             ?? 0;
  const tc        = salary.tc              ?? 0;
  const absentDed = salary.absentDeduction ?? 0;
  const lateDed   = salary.lateDeduction   ?? 0;
  const leaveDed  = salary.leaveDeduction  ?? 0;
  const otherDed  = salary.otherDeductions ?? 0;
  const net       = salary.netPayable      ?? 0;

  const totalDed  = pf + pt + pfi + tc + absentDed + lateDed + leaveDed + otherDed;

  // All deductions always shown (including ₹0 rows)
  const deductions = [
    { label: 'Provident Fund (PF)',    value: pf },
    { label: 'Professional Tax (PT)', value: pt },
    { label: 'PF Insurance (PFI)',     value: pfi },
    { label: 'Transport Charges (TC)', value: tc },
    { label: 'Absent Deduction',       value: absentDed },
    { label: 'Late Deduction',         value: lateDed },
    { label: 'Leave Deduction',        value: leaveDed },
    { label: 'Other Deductions',       value: otherDed },
  ];

  const handleDownloadPDF = async () => {
    // Convert logo to base64 so it embeds cleanly in the print window
    const logoBase64 = await imageToBase64(companyLogoSrc.src);
    const html = buildPrintHTML(salary, logoBase64);
    const win  = window.open('', '_blank', 'width=960,height=800,scrollbars=yes');
    if (!win) { alert('Please allow pop-ups for this site to download the PDF.'); return; }
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="glass-card overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-white/10 bg-gradient-to-br from-[#1f0d35] via-[#5b21b6] to-[#312e81] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Company logo */}
          <img
            src={companyLogoSrc.src}
            alt="Albos Technology"
            className="h-14 w-14 rounded-2xl border border-white/10 bg-white/95 p-1.5 object-contain shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60">Albos Technology Pvt. Ltd.</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-white">
              {emp.name || 'Employee'}
            </h3>
            <p className="mt-0.5 text-sm text-white/70">
              {emp.employeeId || '—'} &middot; {emp.designation || emp.position || '—'} &middot; {emp.department || '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/60">Salary Slip</p>
            <p className="mt-1 text-xl font-bold text-white">{monthName} {salary.year}</p>
          </div>
          <span className={`status-badge ${getStatusTone(salary.status)}`}>{salary.status}</span>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/14 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/22"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-7">

        {/* ── Attendance Summary ───────────────────────────────────── */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-purple-600">
            Attendance — {monthName} {salary.year}
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { label: 'Total Paid Days', value: workDays,  cls: '' },
              { label: `Sundays (Paid)`,  value: sundays,   cls: 'text-green-700' },
              { label: 'Swiped Days',     value: swiped,    cls: '' },
              { label: 'Days Present',    value: present,   cls: 'text-blue-700' },
              { label: 'Days Absent',     value: absent,    cls: 'text-red-600' },
              { label: 'Late Marks',      value: lateCount, cls: 'text-amber-600' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-[24px] border border-purple-100/80 bg-gradient-to-br from-white to-purple-50/70 p-3 text-center shadow-[0_8px_24px_rgba(76,29,149,0.05)]">
                <p className="text-xs text-surface-400">{label}</p>
                <p className={`mt-1 text-lg font-bold ${cls || 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Earnings / Deductions ────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Earnings */}
          <div className="overflow-hidden rounded-[24px] border border-purple-100/80 bg-white/80">
            <div className="bg-gradient-to-r from-[#2a1246] via-[#5b21b6] to-[#4338ca] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">Earnings</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-surface-100">
                  <td className="px-4 py-3 text-surface-500">Basic / Gross Salary</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(gross)}</td>
                </tr>
                <tr className="border-b border-surface-100">
                  <td className="px-4 py-3 text-surface-500">
                    Paid Days
                    <span className="ml-1.5 rounded-lg bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                      incl. {sundays} Sunday{sundays !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{workDays} days</td>
                </tr>
                <tr className="border-b border-surface-100">
                  <td className="px-4 py-3 text-surface-500">Swiped / Present Days</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{swiped} days</td>
                </tr>
                {leaveDays > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-surface-500">Approved Leave Days</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{leaveDays} days</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-violet-300 bg-violet-50">
                  <td className="px-4 py-3 font-bold text-violet-900">Total Earnings</td>
                  <td className="px-4 py-3 text-right font-bold text-violet-900">{fmt(gross)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Deductions — all rows shown including ₹0 */}
          <div className="overflow-hidden rounded-[24px] border border-rose-100/90 bg-white/80">
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">Deductions</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {deductions.map(({ label, value }, i) => (
                  <tr key={label} className={i < deductions.length - 1 ? 'border-b border-surface-100' : ''}>
                    <td className="px-4 py-2.5 text-surface-500">{label}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${value > 0 ? 'text-red-600' : 'text-surface-300'}`}>
                      {fmt(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-rose-300 bg-rose-50">
                  <td className="px-4 py-3 font-bold text-red-800">Total Deductions</td>
                  <td className="px-4 py-3 text-right font-bold text-red-800">{fmt(totalDed)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Net Payable Summary ──────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-purple-100/80 bg-gradient-to-br from-white to-purple-50/80 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-surface-400">Gross Earnings</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{fmt(gross)}</p>
          </div>
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-red-400">Total Deductions</p>
            <p className="mt-1 text-xl font-bold text-red-700">{fmt(totalDed)}</p>
          </div>
          <div className="rounded-[24px] bg-gradient-to-r from-[#2a1246] via-[#5b21b6] to-[#4338ca] p-4 text-center shadow-[0_18px_40px_rgba(76,29,149,0.24)]">
            <p className="text-xs uppercase tracking-wider text-white/60">Net Payable</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{fmt(net)}</p>
          </div>
        </div>

        {/* ── Amount in Words ──────────────────────────────────────── */}
        <div className="rounded-[24px] border border-purple-100/80 bg-gradient-to-r from-purple-50/80 to-white px-4 py-4">
          <span className="text-xs uppercase tracking-wider text-purple-500">Amount in Words: </span>
          <span className="text-sm font-semibold text-gray-800 italic">{numberToWords(net)}</span>
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-purple-100 pt-4 text-xs text-surface-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p>Generated: {formatDate(salary.generatedAt || salary.createdAt)}</p>
            <p>Carry-forward late marks: <span className="font-semibold text-amber-600">{cfLate}</span></p>
          </div>
          <p className="italic">Computer generated — no signature required</p>
        </div>

      </div>
    </div>
  );
}
