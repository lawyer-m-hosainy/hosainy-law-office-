import { ExecutionDetails, OfficeSettings } from '../../shared/types';
import { tafqit } from '../../shared/tafqit';

export function generateExecutionReportHtml(
  execution: ExecutionDetails,
  settings: OfficeSettings
): string {
  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalClaimed = Number(execution?.total_claimed_amount ?? (execution as any)?.claimed_amount) || 0;
  const collected = Number(execution?.collected_amount) || 0;
  const remaining = Number(execution?.remaining_amount ?? (totalClaimed - collected)) || 0;

  const claimedTafqit = tafqit(totalClaimed);
  const collectedTafqit = tafqit(collected);
  const remainingTafqit = tafqit(remaining);

  const safeActions = Array.isArray(execution?.actions)
    ? execution.actions
    : (Array.isArray((execution as any)?.procedures) ? (execution as any).procedures : []);
  const safeHearings = Array.isArray(execution?.hearings) ? execution.hearings : [];
  const safeTransactions = Array.isArray(execution?.transactions) ? execution.transactions : [];

  // Status color pill
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'تم التنفيذ كلياً':
      case 'تم الصلح والتسوية':
        return `<span style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${status}</span>`;
      case 'جاري':
        return `<span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${status}</span>`;
      case 'موقوف':
      case 'مرفوض':
        return `<span style="background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${status}</span>`;
      default:
        return `<span style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${status}</span>`;
    }
  };

  // Actions Table Rows
  const actionsRows = safeActions.length === 0
    ? `<tr><td colspan="7" style="text-align: center; padding: 15px; color: #64748b;">لا توجد إجراءات تنفيذية مسجلة بعد</td></tr>`
    : safeActions.map((act, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="text-align: center; white-space: nowrap;">${act.action_date}</td>
          <td style="font-weight: bold; color: #0f172a;">${act.action_type}</td>
          <td style="text-align: center;">${act.police_report_or_bailiff_number || '-'}</td>
          <td style="text-align: center;">${act.dept_or_bailiff_office || '-'}${act.bailiff_name ? ` (${act.bailiff_name})` : ''}</td>
          <td style="text-align: center;">
            <span style="font-weight: bold; color: ${act.status === 'تم' ? '#166534' : act.status === 'مرفوض' ? '#991b1b' : '#b45309'};">
              ${act.status}
            </span>
          </td>
          <td style="text-align: left; font-weight: bold; color: #166534; direction: ltr;">
            ${(act.amount_collected || 0) > 0 ? (act.amount_collected || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
          </td>
          <td>${act.details || act.notes || '-'}</td>
        </tr>
      `).join('\n');

  // Hearings Table Rows
  const hearingsRows = safeHearings.length === 0
    ? `<tr><td colspan="6" style="text-align: center; padding: 15px; color: #64748b;">لا توجد جلسات أو إشكالات تنفيذ مسجلة</td></tr>`
    : safeHearings.map((h, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="text-align: center; white-space: nowrap;">${h.hearing_date}</td>
          <td style="text-align: center;">${h.court_circuit || h.court_name || '-'}</td>
          <td style="text-align: center;">${h.roll_number || '-'}</td>
          <td>
            <strong>${h.court_decision || 'لم يصدر قرار بعد'}</strong>
            ${h.proceedings ? `<br><span style="font-size: 8pt; color: #64748b;">${h.proceedings}</span>` : ''}
          </td>
          <td style="text-align: center;">
            ${h.next_hearing_date ? `<strong>${h.next_hearing_date}</strong>` : '-'}
            ${h.adjournment_reason ? `<br><span style="font-size: 8pt; color: #b45309;">(${h.adjournment_reason})</span>` : ''}
          </td>
        </tr>
      `).join('\n');

  // Transactions Rows
  const txRows = safeTransactions.length === 0
    ? `<tr><td colspan="7" style="text-align: center; padding: 15px; color: #64748b;">لا توجد حركات مالية مقيدة على هذا التنفيذ</td></tr>`
    : safeTransactions.map((tx, idx) => {
        const isInflow = tx.direction === 'وارد';
        return `
          <tr style="${tx.is_reversed ? 'text-decoration: line-through; opacity: 0.6; background: #fff1f2;' : ''}">
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="text-align: center; white-space: nowrap;">${tx.transaction_date}</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #0369a1;">${tx.receipt_number}</td>
            <td>
              <strong>${tx.description}</strong>
              ${tx.notes ? `<br><span style="font-size: 8pt; color: #64748b;">${tx.notes}</span>` : ''}
            </td>
            <td style="text-align: center;">${tx.payment_method}</td>
            <td style="text-align: left; font-weight: bold; color: #166534; direction: ltr;">
              ${isInflow ? tx.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
            </td>
            <td style="text-align: left; font-weight: bold; color: #991b1b; direction: ltr;">
              ${!isInflow ? tx.amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
            </td>
          </tr>
        `;
      }).join('\n');

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>ملف التنفيذ الجبري - ${execution.file_number}</title>
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
      line-height: 1.4;
    }

    .title-banner {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-right: 5px solid #b45309;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 4px;
    }

    .title-banner h1 {
      margin: 0;
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
    }

    .title-banner .sub-title {
      font-size: 9pt;
      color: #475569;
      margin-top: 2px;
    }

    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-title::before {
      content: "";
      display: inline-block;
      width: 7px;
      height: 7px;
      background: #b45309;
      border-radius: 50%;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 10px;
    }

    .info-label {
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 2px;
      display: block;
    }

    .info-val {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }

    /* Financial Summary Box */
    .finance-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 10px 0 6px 0;
    }

    .fin-box {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 8px;
      text-align: center;
    }

    .fin-box-claimed {
      background: #f8fafc;
      border-top: 3px solid #0284c7;
    }

    .fin-box-collected {
      background: #ecfdf5;
      border-top: 3px solid #10b981;
    }

    .fin-box-remaining {
      background: #fef2f2;
      border-top: 3px solid #ef4444;
    }

    .fin-box .fin-title {
      font-size: 8pt;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
    }

    .fin-box .fin-amount {
      font-size: 13pt;
      font-weight: 800;
      direction: ltr;
    }

    .fin-tafqit-box {
      background: #fafaf9;
      border: 1px dashed #d6d3d1;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 8.5pt;
      color: #44403c;
      margin-bottom: 12px;
    }

    /* Settlement Box */
    .settlement-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-right: 4px solid #16a34a;
      border-radius: 4px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }

    /* Table Styles */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8.5pt;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
    }

    th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      padding: 6px 8px;
      border: 1px solid #0f172a;
      text-align: right;
    }

    td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .footer-section {
      margin-top: 25px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8pt;
      color: #64748b;
    }

    .signatures {
      display: flex;
      gap: 60px;
      text-align: center;
      margin-top: 10px;
    }

    .sig-box {
      min-width: 120px;
    }

    .sig-line {
      margin-top: 35px;
      border-top: 1px dashed #94a3b8;
    }
  </style>
</head>
<body>

  <!-- Official Office Header -->
  <div class="report-header">
    <div class="header-right">
      <div class="office-name">${settings.office_name || 'مكتب المحاماة'}</div>
      <div class="lawyer-name">${settings.lawyer_name || ''} - ${settings.title || 'محامٍ بالنقض'}</div>
      <div style="font-size: 8pt; color: #475569;">
        ${settings.bar_registration_number ? `قيد نقابة: ${settings.bar_registration_number}` : ''}
        ${settings.tax_number ? ` | بطاقة ضريبية: ${settings.tax_number}` : ''}
      </div>
    </div>

    <div class="header-center">
      ${settings.logo_path ? `<img src="${settings.logo_path}" class="logo-img" alt="Logo" />` : '<div class="emblem-icon">⚖️</div>'}
    </div>

    <div class="header-left">
      <div><strong>الهاتف:</strong> ${settings.phone || '-'}${settings.phone2 ? ` / ${settings.phone2}` : ''}</div>
      <div><strong>العنوان:</strong> ${settings.address || '-'}</div>
      <div><strong>تاريخ التقرير:</strong> ${printDate}</div>
    </div>
  </div>

  <!-- Document Title Banner -->
  <div class="title-banner">
    <div>
      <h1>ملف التنفيذ الجبري رقم (${execution.file_number}) ${execution.year ? `لسنة ${execution.year}` : ''}</h1>
      <div class="sub-title">
        المحكمة: <strong>${execution.court}</strong> | قاضي التنفيذ: <strong>${execution.execution_judge || 'غير محدد'}</strong> | إدارة التنفيذ: <strong>${execution.execution_dept || 'غير محدد'}</strong>
      </div>
    </div>
    <div>
      ${getStatusBadge(execution.status)}
    </div>
  </div>

  <!-- Parties and Deed Details -->
  <div class="section-title">بيانات السند والأطراف</div>
  <div class="info-grid">
    <div class="info-card">
      <span class="info-label">طالب التنفيذ (المنفذ):</span>
      <span class="info-val">${execution.applicant_name} <span style="font-size: 8pt; color: #64748b;">(${execution.applicant_capacity || 'طالب التنفيذ'})</span></span>
      ${execution.client_name ? `<div style="font-size: 8pt; color: #0284c7; margin-top: 3px;">الموكل بالملف: ${execution.client_name}</div>` : ''}
    </div>

    <div class="info-card">
      <span class="info-label">المنفذ ضده:</span>
      <span class="info-val">${execution.enforced_against} <span style="font-size: 8pt; color: #64748b;">(${execution.enforced_against_capacity || 'المنفذ ضده'})</span></span>
      ${execution.enforced_against_phone ? `<div style="font-size: 8pt; color: #475569; margin-top: 3px;">هاتف: ${execution.enforced_against_phone}</div>` : ''}
      ${execution.enforced_against_address ? `<div style="font-size: 8pt; color: #475569;">عنوان: ${execution.enforced_against_address}</div>` : ''}
    </div>

    <div class="info-card">
      <span class="info-label">نوع السند التنفيذي ورقمه:</span>
      <span class="info-val">${execution.deed_type} ${execution.deed_number ? `— ${execution.deed_number}` : ''}</span>
      <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">
        تاريخ الإعلان بالسند: <strong>${execution.announcement_date || 'غير مسجل'}</strong>
      </div>
    </div>

    <div class="info-card">
      <span class="info-label">القضية المرتبطة:</span>
      <span class="info-val">
        ${execution.case_number ? `قضية رقم ${execution.case_number} لسنة ${execution.case_year} — ${execution.case_court_name || ''}` : 'ملف تنفيذ مستقل (غير مرتبط بدعوى)'}
      </span>
      ${execution.notes ? `<div style="font-size: 8pt; color: #64748b; margin-top: 3px;">ملاحظات: ${execution.notes}</div>` : ''}
    </div>
  </div>

  <!-- Financial Summary -->
  <div class="section-title">الموقف المالي للمطالبة والتحصيلات</div>
  <div class="finance-cards">
    <div class="fin-box fin-box-claimed">
      <div class="fin-title">إجمالي المبلغ المطلوب تنفيذه</div>
      <div class="fin-amount" style="color: #0369a1;">${totalClaimed.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="fin-box fin-box-collected">
      <div class="fin-title">إجمالي المبالغ المحصلة فعلياً</div>
      <div class="fin-amount" style="color: #047857;">${collected.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
    </div>

    <div class="fin-box fin-box-remaining">
      <div class="fin-title">المبلغ المتبقي للتحصيل</div>
      <div class="fin-amount" style="color: #b91c1c;">${remaining.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</div>
    </div>
  </div>

  <div class="fin-tafqit-box">
    <strong>تفقيط المبالغ:</strong> فقط ${claimedTafqit} مطلوب تنفيذها، وحُصّل منها حتى تاريخه ${collectedTafqit}، والمتبقي ${remainingTafqit}.
  </div>

  <!-- Settlement Section (if exists) -->
  ${execution.settlement_minutes ? `
    <div class="settlement-box">
      <div style="font-weight: 800; color: #166534; font-size: 10pt; margin-bottom: 4px;">
        محضر الصلح والتسوية الودية ${execution.settlement_date ? `(بتاريخ: ${execution.settlement_date})` : ''}
      </div>
      <div style="font-size: 9pt; color: #14532d; white-space: pre-wrap; line-height: 1.6;">${execution.settlement_minutes}</div>
    </div>
  ` : ''}

  <!-- Execution Actions Table -->
  <div class="section-title">سجل إجراءات التنفيذ المتسلسلة (${safeActions.length})</div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">م</th>
        <th style="width: 85px; text-align: center;">التاريخ</th>
        <th style="width: 140px;">نوع الإجراء</th>
        <th style="width: 90px; text-align: center;">رقم المحضر</th>
        <th style="width: 120px; text-align: center;">الجهة / المعاون</th>
        <th style="width: 60px; text-align: center;">الحالة</th>
        <th style="width: 85px; text-align: left;">المحصل</th>
        <th>التفاصيل والملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${actionsRows}
    </tbody>
  </table>

  <!-- Hearings Table (if any) -->
  ${safeHearings.length > 0 ? `
    <div class="section-title">جلسات ومنازعات التنفيذ والإشكالات (${safeHearings.length})</div>
    <table>
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">م</th>
          <th style="width: 85px; text-align: center;">التاريخ</th>
          <th style="width: 120px; text-align: center;">المحكمة / الدائرة</th>
          <th style="width: 60px; text-align: center;">الرول</th>
          <th>قرار المحكمة والإجراء</th>
          <th style="width: 140px; text-align: center;">الجلسة القادمة والسبب</th>
        </tr>
      </thead>
      <tbody>
        ${hearingsRows}
      </tbody>
    </table>
  ` : ''}

  <!-- Financial Transactions Table (if any) -->
  ${safeTransactions.length > 0 ? `
    <div class="section-title">سجل الحركات المالية والإيصالات لملف التنفيذ (${safeTransactions.length})</div>
    <table>
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">م</th>
          <th style="width: 85px; text-align: center;">التاريخ</th>
          <th style="width: 95px; text-align: center;">رقم الإيصال</th>
          <th>البيان والتفاصيل</th>
          <th style="width: 75px; text-align: center;">طريقة الدفع</th>
          <th style="width: 85px; text-align: left;">وارد (تحصيل)</th>
          <th style="width: 85px; text-align: left;">صادر (مصاريف)</th>
        </tr>
      </thead>
      <tbody>
        ${txRows}
      </tbody>
    </table>
  ` : ''}

  <!-- Footer & Signatures -->
  <div class="footer-section">
    <div>
      <div>تم طباعة هذا الملف آلياً من برنامج إدارة مكتب المحاماة</div>
      <div>التاريخ والوقت: ${printDate}</div>
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div>المحامي المسؤول</div>
        <div class="sig-line"></div>
      </div>
      <div class="sig-box">
        <div>اعتماد المكتب</div>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>

</body>
</html>
  `;
}
