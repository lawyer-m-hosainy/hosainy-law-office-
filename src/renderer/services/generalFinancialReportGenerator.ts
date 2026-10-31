import { FinancialTransaction, GeneralFinancialStats, OfficeSettings } from '../../shared/types';

export interface GeneralFinancialReportOptions {
  periodTitle?: string;
  startDate?: string;
  endDate?: string;
}

export function generateGeneralFinancialReportHtml(
  stats: GeneralFinancialStats,
  transactions: FinancialTransaction[],
  settings: OfficeSettings,
  options?: GeneralFinancialReportOptions
): string {
  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const periodLabel = options?.periodTitle || 
    (options?.startDate && options?.endDate 
      ? `الفترة من ${options.startDate} إلى ${options.endDate}` 
      : 'التقرير المالي العام الشامل');

  // Group transactions by category to calculate category breakdown
  let feesInflow = 0;
  let courtFeesInflow = 0;
  let courtFeesOutflow = 0;
  let expensesInflow = 0;
  let expensesOutflow = 0;
  let executionInflow = 0;
  let executionOutflow = 0;

  const activeTransactions = transactions.filter(t => !t.is_reversed);

  activeTransactions.forEach(t => {
    if (t.direction === 'وارد') {
      if (t.category === 'أتعاب') feesInflow += t.amount;
      else if (t.category === 'رسوم قضائية') courtFeesInflow += t.amount;
      else if (t.category === 'مصاريف') expensesInflow += t.amount;
      else if (t.category === 'تنفيذ') executionInflow += t.amount;
    } else {
      if (t.category === 'رسوم قضائية') courtFeesOutflow += t.amount;
      else if (t.category === 'مصاريف') expensesOutflow += t.amount;
      else if (t.category === 'تنفيذ') executionOutflow += t.amount;
    }
  });

  const tableRows = activeTransactions.length === 0
    ? `<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b;">لا توجد حركات مالية مسجلة لهذه الفترة</td></tr>`
    : activeTransactions.map((tx, idx) => {
        const isIncome = tx.direction === 'وارد';
        return `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="text-align: center; white-space: nowrap;">${tx.transaction_date}</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #0369a1;">${tx.receipt_number}</td>
            <td style="text-align: center;"><span class="badge-cat">${tx.category}</span></td>
            <td>
              <strong>${tx.description}</strong>
              ${tx.case_number ? `<br><span style="font-size: 8pt; color: #64748b;">قضية: ${tx.case_number}/${tx.case_year || ''} (${tx.court_name || ''})</span>` : ''}
              ${tx.client_name ? `<br><span style="font-size: 8pt; color: #475569;">موكل: ${tx.client_name}</span>` : ''}
            </td>
            <td style="text-align: center;">${tx.payment_method}</td>
            <td style="text-align: left; font-weight: bold; color: #166534; direction: ltr;">
              ${isIncome ? tx.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
            </td>
            <td style="text-align: left; font-weight: bold; color: #991b1b; direction: ltr;">
              ${!isIncome ? tx.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
            </td>
          </tr>
        `;
      }).join('\n');

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>التقرير المالي العام - ${settings.office_name}</title>
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
      padding: 10px;
      margin-bottom: 14px;
    }

    .report-title {
      font-size: 14pt;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    .period-text {
      font-size: 9pt;
      font-weight: 600;
      color: #0369a1;
    }

    .main-metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .metric-card {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }

    .metric-val {
      font-size: 12pt;
      font-weight: 800;
      direction: ltr;
    }

    .metric-lbl {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }

    .categories-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
      background: #fafafa;
    }

    .cat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      font-size: 8.5pt;
      text-align: center;
    }

    .cat-item strong {
      display: block;
      color: #334155;
      font-size: 8pt;
    }

    table.tx-table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    table.tx-table thead {
      display: table-header-group;
    }

    table.tx-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    table.tx-table th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      font-size: 8.5pt;
      padding: 7px 6px;
      border: 1px solid #0f172a;
      text-align: center;
    }

    table.tx-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 7px;
      vertical-align: top;
      font-size: 8.5pt;
    }

    table.tx-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .badge-cat {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 700;
      background: #e2e8f0;
      color: #334155;
      padding: 1px 5px;
      border-radius: 3px;
    }

    .report-footer {
      margin-top: 20px;
      border-top: 1px solid #cbd5e1;
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
      <div><strong>تاريخ التقرير:</strong> ${printDate}</div>
    </div>
  </div>

  <div class="title-banner">
    <h1 class="report-title">📊 التقرير المالي العام وإيرادات المكتب</h1>
    <div class="period-text">${periodLabel}</div>
  </div>

  <div class="main-metrics-grid">
    <div class="metric-card">
      <div class="metric-val" style="color: #166534;">${stats.total_income.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="metric-lbl">إجمالي الإيرادات (وارد)</div>
    </div>
    <div class="metric-card">
      <div class="metric-val" style="color: #991b1b;">${stats.total_expense.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="metric-lbl">إجمالي المصروفات (صادر)</div>
    </div>
    <div class="metric-card">
      <div class="metric-val" style="color: #0369a1;">${stats.net_profit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="metric-lbl">صافي الأرباح / الفائض</div>
    </div>
    <div class="metric-card">
      <div class="metric-val" style="color: #b45309;">${stats.outstanding_fees.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
      <div class="metric-lbl">الأتعاب المعلقة والمتأخرات</div>
    </div>
  </div>

  <div class="categories-box">
    <div style="font-weight: 700; margin-bottom: 6px; font-size: 8.5pt; color: #475569;">تفصيل الحركات حسب الفئات:</div>
    <div class="cat-grid">
      <div class="cat-item">
        <strong>أتعاب المحاماة المحصلة:</strong>
        <span style="font-weight: 800; color: #166534;">${feesInflow.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
      </div>
      <div class="cat-item">
        <strong>رسوم قضائية (منصرفة):</strong>
        <span style="font-weight: 800; color: #991b1b;">${courtFeesOutflow.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
      </div>
      <div class="cat-item">
        <strong>مصاريف إدارية ومأموريات:</strong>
        <span style="font-weight: 800; color: #991b1b;">${expensesOutflow.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
      </div>
      <div class="cat-item">
        <strong>شيكات مؤجلة تحت التحصيل:</strong>
        <span style="font-weight: 800; color: #b45309;">${stats.pending_cheques_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م (${stats.pending_cheques_count} شيك)</span>
      </div>
    </div>
  </div>

  <table class="tx-table">
    <thead>
      <tr>
        <th style="width: 25px;">م</th>
        <th style="width: 80px;">التاريخ</th>
        <th style="width: 85px;">رقم الإيصال</th>
        <th style="width: 75px;">الفئة</th>
        <th>البيان والقضية والموكل</th>
        <th style="width: 75px;">طريقة الدفع</th>
        <th style="width: 90px;">وارد (إيراد)</th>
        <th style="width: 90px;">صادر (مصروف)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="report-footer">
    <div>برنامج إدارة مكتب المحاماة — التقرير المالي العام</div>
    <div>الحسابات مسجلة ومطابقة لقواعد القيود العكسية وسجلات المحاسبة</div>
  </div>
</body>
</html>
  `;
}
