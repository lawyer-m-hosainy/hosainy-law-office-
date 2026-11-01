import { CaseFinancialSummary, FinancialTransaction, OfficeSettings } from '../../shared/types';
import { tafqit } from '../../shared/tafqit';
import { escapeHtml } from '../../shared/htmlUtils';

export interface ClientStatementOptions {
  clientName: string;
  clientPhone?: string;
  caseNumber?: string;
  caseYear?: number;
  courtName?: string;
  subject?: string;
  periodText?: string;
}

export function generateClientStatementHtml(
  summary: CaseFinancialSummary,
  transactions: FinancialTransaction[],
  settings: OfficeSettings,
  options: ClientStatementOptions
): string {
  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isCredit = summary.net_balance >= 0;
  const netBalanceText = isCredit ? 'رصيد دائن للموكل (له أمانة لدينا)' : 'مستحق على الموكل للمكتب (مدين)';
  const netBalanceTafqit = tafqit(Math.abs(summary.net_balance));

  // Compute running balance for chronological transactions
  const activeTx = [...transactions]
    .filter(t => !t.is_reversed)
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

  let runningBalance = 0;
  const tableRows = activeTx.length === 0
    ? `<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b;">لا توجد حركات مالية مسجلة لهذه الفترة</td></tr>`
    : activeTx.map((tx, idx) => {
        const inflow = tx.direction === 'وارد' ? tx.amount : 0;
        const outflow = tx.direction === 'صادر' ? tx.amount : 0;
        runningBalance += (inflow - outflow);

        return `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="text-align: center; white-space: nowrap;">${tx.transaction_date}</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #0369a1;">${escapeHtml(tx.receipt_number)}</td>
            <td style="text-align: center;"><span class="cat-pill">${escapeHtml(tx.category)}</span></td>
            <td>
              <strong>${escapeHtml(tx.description)}</strong>
              ${tx.notes ? `<br><span style="font-size: 8pt; color: #64748b;">${escapeHtml(tx.notes)}</span>` : ''}
            </td>
            <td style="text-align: center;">${escapeHtml(tx.payment_method)}</td>
            <td style="text-align: left; font-weight: bold; color: #166534; direction: ltr;">
              ${inflow > 0 ? inflow.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
            </td>
            <td style="text-align: left; font-weight: bold; color: #991b1b; direction: ltr;">
              ${outflow > 0 ? outflow.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
            </td>
          </tr>
        `;
      }).join('\n');

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>كشف حساب مالي - ${options.clientName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.5;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      direction: rtl;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .header-right {
      flex: 1;
      text-align: right;
    }

    .office-name {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
    }

    .lawyer-name {
      font-size: 11pt;
      font-weight: 700;
      color: #b45309;
      margin: 0 0 2px 0;
    }

    .header-center {
      text-align: center;
      padding: 0 15px;
    }

    .logo-img {
      max-width: 65px;
      max-height: 65px;
      object-fit: contain;
    }

    .emblem-icon {
      font-size: 28pt;
      line-height: 1;
    }

    .header-left {
      flex: 1;
      text-align: left;
      font-size: 8.5pt;
      color: #475569;
    }

    .title-banner {
      text-align: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 12px;
    }

    .report-title {
      font-size: 13pt;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 3px 0;
    }

    .client-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 12px;
      background: #fdfdfd;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 9pt;
    }

    .stats-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
      text-align: center;
    }

    .card-val {
      font-size: 11.5pt;
      font-weight: 800;
      color: #0f172a;
      direction: ltr;
    }

    .card-lbl {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }

    .net-balance-box {
      border: 2px solid ${isCredit ? '#16a34a' : '#dc2626'};
      background: ${isCredit ? '#f0fdf4' : '#fef2f2'};
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .net-title {
      font-size: 10pt;
      font-weight: 800;
      color: ${isCredit ? '#166534' : '#991b1b'};
    }

    .net-tafqit {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 2px;
    }

    .net-amount {
      font-size: 14pt;
      font-weight: 900;
      color: ${isCredit ? '#15803d' : '#b91c1c'};
      direction: ltr;
    }

    table.statement-table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    table.statement-table thead {
      display: table-header-group;
    }

    table.statement-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    table.statement-table th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      font-size: 8.5pt;
      padding: 7px 6px;
      border: 1px solid #0f172a;
      text-align: center;
    }

    table.statement-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 7px;
      vertical-align: top;
      font-size: 8.5pt;
    }

    table.statement-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .cat-pill {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 700;
      background: #e2e8f0;
      color: #334155;
      padding: 1px 5px;
      border-radius: 3px;
    }

    .signatures-section {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      font-size: 8.5pt;
    }

    .sig-col {
      text-align: center;
      width: 200px;
    }

    .sig-line {
      margin-top: 40px;
      border-bottom: 1px solid #475569;
    }

    .report-footer {
      margin-top: 15px;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="header-right">
      <div class="office-name">${settings.office_name || 'مكتب المحاماة'}</div>
      <div class="lawyer-name">${settings.lawyer_name || ''}</div>
    </div>
    <div class="header-center">
      ${settings.logo_path
        ? `<img class="logo-img" src="${settings.logo_path}" alt="شعار المكتب" />`
        : `<div class="emblem-icon">⚖️</div>`}
    </div>
    <div class="header-left">
      <div><strong>تاريخ الكشف:</strong> ${printDate}</div>
      ${settings.phone ? `<div><strong>هاتف:</strong> ${settings.phone}</div>` : ''}
    </div>
  </div>

  <div class="title-banner">
    <h1 class="report-title">كشف حساب مالي تفصيلي</h1>
    <div style="font-size: 8.5pt; color: #475569;">
      ${options.periodText || 'بيان شامل للحركات المالية المسجلة'}
    </div>
  </div>

  <div class="client-info-grid">
    <div><strong>اسم الموكل:</strong> ${options.clientName}</div>
    <div><strong>الهاتف:</strong> ${options.clientPhone || 'غير مسجل'}</div>
    ${options.caseNumber ? `<div><strong>رقم القضية:</strong> ${options.caseNumber} لسنة ${options.caseYear || ''}</div>` : ''}
    ${options.courtName ? `<div><strong>المحكمة:</strong> ${options.courtName}</div>` : ''}
    ${options.subject ? `<div style="grid-column: span 2;"><strong>موضوع الدعوى:</strong> ${options.subject}</div>` : ''}
  </div>

  <!-- Summary of Agreed Fees & Actual Inflows/Outflows -->
  <div class="stats-summary-grid">
    <div class="summary-card">
      <div class="card-val">${(summary.total_agreed_fees || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="card-lbl">إجمالي الأتعاب المتفق عليها</div>
    </div>
    <div class="summary-card">
      <div class="card-val" style="color: #166534;">${(summary.paid_fees ?? summary.total_paid_fees ?? 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="card-lbl">المدفوع من الأتعاب</div>
    </div>
    <div class="summary-card">
      <div class="card-val" style="color: #b45309;">${(summary.remaining_fees || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="card-lbl">متبقي الأتعاب</div>
    </div>

    <div class="summary-card">
      <div class="card-val">${(summary.total_inflow || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="card-lbl">إجمالي الوارد من الموكل</div>
    </div>
    <div class="summary-card">
      <div class="card-val">${((summary.total_court_fees_outflow || 0) + (summary.total_expenses_outflow || 0) + (summary.total_execution_outflow || 0) || (summary.total_expenses || 0) || (summary.total_outflow || 0)).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="card-lbl">إجمالي المصروفات والرسوم الفعلية</div>
    </div>
    <div class="summary-card">
      <div class="card-val">${(summary.total_outflow || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="card-lbl">إجمالي المنصرف من المكتب</div>
    </div>
  </div>

  <!-- Net Balance Box with Tafqit -->
  <div class="net-balance-box">
    <div>
      <div class="net-title">${netBalanceText}</div>
      <div class="net-tafqit">${netBalanceTafqit}</div>
    </div>
    <div class="net-amount">
      ${Math.abs(summary.net_balance).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
    </div>
  </div>

  <!-- Detailed Transactions Table -->
  <table class="statement-table">
    <thead>
      <tr>
        <th style="width: 25px;">م</th>
        <th style="width: 80px;">التاريخ</th>
        <th style="width: 85px;">رقم الإيصال</th>
        <th style="width: 75px;">الفئة</th>
        <th>البيان والتفاصيل</th>
        <th style="width: 75px;">طريقة الدفع</th>
        <th style="width: 90px;">وارد (له)</th>
        <th style="width: 90px;">صادر (عليه)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="signatures-section">
    <div class="sig-col">
      <div>المحاسب المسؤول</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-col">
      <div>توقيع الموكل بالعلم والاعتماد</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-col">
      <div>خاتم واعتماد المكتب</div>
      <div class="sig-line"></div>
    </div>
  </div>

  <div class="report-footer">
    <div>برنامج إدارة مكتب المحاماة — كشف حساب معتمد</div>
    <div>المبالغ مسجلة بالجنيه المصري ومطابقة لسجلات الإيصالات الرسمية</div>
  </div>
</body>
</html>
  `;
}
