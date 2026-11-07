import { HearingWithCase, OfficeSettings } from '../../shared/types';
import { escapeHtml } from '../../shared/htmlUtils';

export interface HearingRollReportOptions {
  title?: string;
  subtitle?: string;
  filterSummary?: string;
  orientation?: 'landscape' | 'portrait';
}

export function generateHearingRollHtml(
  hearings: HearingWithCase[],
  settings: OfficeSettings,
  options?: HearingRollReportOptions | string
): string {
  const resolvedOptions: HearingRollReportOptions = typeof options === 'string' ? { title: options } : (options || {});

  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const orientation = resolvedOptions?.orientation || 'landscape';
  const reportTitle = resolvedOptions?.title || 'رول الجلسات القضائية';
  const filterSummary = resolvedOptions?.filterSummary || '';

  const safeHearings = Array.isArray(hearings) ? hearings : [];

  const tableRows = safeHearings.length === 0
    ? `<tr><td colspan="9" style="text-align: center; padding: 25px; color: #64748b;">لا توجد جلسات مسجلة وفق الفلاتر المحددة</td></tr>`
    : safeHearings.map((h, idx) => {
        const clientText = h.primary_client_name 
          ? `<strong>${escapeHtml(h.primary_client_name)}</strong>${h.primary_client_role ? `<br><span class="role-badge">(${escapeHtml(h.primary_client_role)})</span>` : ''}`
          : '-';

        const opponentText = h.primary_opponent_name
          ? `<strong>${escapeHtml(h.primary_opponent_name)}</strong>${h.primary_opponent_role ? `<br><span class="role-badge">(${escapeHtml(h.primary_opponent_role)})</span>` : ''}`
          : '-';

        const prevSessionText = h.previous_hearing_date
          ? `<strong>${escapeHtml(h.previous_hearing_date)}</strong>${h.previous_decision ? `<br>${escapeHtml(h.previous_decision)}` : ''}${h.previous_adjournment_reason ? `<br><span class="reason-tag">${escapeHtml(h.previous_adjournment_reason)}</span>` : ''}`
          : '<span style="color:#94a3b8;">أول جلسة</span>';

        const requiredAction = h.requests ? escapeHtml(h.requests) : (h.notes ? escapeHtml(h.notes) : '-');

        const hallAndRoll = [
          h.roll_number ? `رول: ${escapeHtml(h.roll_number)}` : '',
          h.court_hall ? `قاعة: ${escapeHtml(h.court_hall)}` : ''
        ].filter(Boolean).join(' / ');

        return `
          <tr>
            <td class="col-num">${idx + 1}</td>
            <td class="col-court">
              <strong>${escapeHtml(h.court_name)}</strong>
              ${h.court_circuit ? `<br><span class="text-circuit">${escapeHtml(h.court_circuit)}</span>` : ''}
              ${hallAndRoll ? `<br><span class="text-hall">${hallAndRoll}</span>` : ''}
            </td>
            <td class="col-case">
              <span class="case-number">${escapeHtml(h.case_number)}</span> لسنة <span class="case-year">${escapeHtml(h.case_year)}</span>
              ${h.case_type ? `<br><span class="case-type">${escapeHtml(h.case_type)}</span>` : ''}
              ${h.hearing_date ? `<br><span class="hearing-date">📅 ${escapeHtml(h.hearing_date)}</span>` : ''}
            </td>
            <td class="col-client">${clientText}</td>
            <td class="col-opponent">${opponentText}</td>
            <td class="col-prev">${prevSessionText}</td>
            <td class="col-req">${requiredAction}</td>
            <td class="col-notes-empty"></td>
          </tr>
        `;
      }).join('\n');

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>
    @page {
      size: A4 ${orientation};
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.4;
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

    .lawyer-title {
      font-size: 9pt;
      color: #475569;
      margin: 0;
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
      font-size: 30pt;
      line-height: 1;
    }

    .header-left {
      flex: 1;
      text-align: left;
      font-size: 8.5pt;
      color: #475569;
    }

    .report-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 10px;
    }

    .report-main-title {
      font-size: 13pt;
      font-weight: 800;
      color: #1e293b;
      margin: 0;
    }

    .filter-summary {
      font-size: 9pt;
      font-weight: 600;
      color: #0369a1;
      background: #e0f2fe;
      padding: 3px 10px;
      border-radius: 4px;
      border: 1px solid #bae6fd;
    }

    .count-badge {
      font-size: 8.5pt;
      font-weight: 700;
      color: #334155;
    }

    /* Long table rules: repeat header on each page, avoid page break inside rows */
    table.roll-table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    table.roll-table thead {
      display: table-header-group;
    }

    table.roll-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    table.roll-table th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      font-size: 8.5pt;
      padding: 6px 8px;
      border: 1px solid #0f172a;
      text-align: center;
    }

    table.roll-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 7px;
      vertical-align: top;
      font-size: 8.5pt;
    }

    table.roll-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .col-num {
      width: 25px;
      text-align: center;
      font-weight: 700;
      color: #475569;
    }

    .col-court {
      width: 14%;
    }

    .col-case {
      width: 13%;
      text-align: center;
    }

    .col-client {
      width: 15%;
    }

    .col-opponent {
      width: 15%;
    }

    .col-prev {
      width: 17%;
      font-size: 8pt;
    }

    .col-req {
      width: 12%;
      font-size: 8pt;
      color: #0369a1;
    }

    /* Handwritten notes empty column */
    .col-notes-empty {
      width: 14%;
      background: #ffffff !important;
      border: 1px dashed #94a3b8 !important;
      min-width: 90px;
    }

    .case-number {
      font-weight: 800;
      font-size: 9.5pt;
      color: #0f172a;
    }

    .case-year {
      font-weight: 700;
      color: #0f172a;
    }

    .case-type {
      display: inline-block;
      font-size: 7.5pt;
      color: #475569;
      background: #e2e8f0;
      padding: 1px 4px;
      border-radius: 3px;
      margin-top: 2px;
    }

    .hearing-date {
      display: inline-block;
      font-size: 7.5pt;
      color: #1e293b;
      margin-top: 2px;
      font-weight: 600;
    }

    .role-badge {
      font-size: 7.5pt;
      color: #64748b;
    }

    .text-circuit {
      font-size: 8pt;
      color: #475569;
    }

    .text-hall {
      font-size: 7.5pt;
      color: #64748b;
    }

    .reason-tag {
      display: inline-block;
      font-size: 7.5pt;
      color: #b45309;
      background: #fef3c7;
      padding: 1px 4px;
      border-radius: 3px;
      margin-top: 2px;
    }

    .report-footer {
      margin-top: 15px;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #64748b;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="header-right">
      <div class="office-name">${settings.office_name || 'مكتب المحاماة'}</div>
      <div class="lawyer-name">${settings.lawyer_name || ''}</div>
      <div class="lawyer-title">${settings.lawyer_title || 'المحامي بالنقض والدستورية العليا'}</div>
    </div>
    <div class="header-center">
      ${settings.logo_path
        ? `<img class="logo-img" src="${settings.logo_path}" alt="شعار المكتب" />`
        : `<div class="emblem-icon">⚖️</div>`}
    </div>
    <div class="header-left">
      <div><strong>تاريخ الطباعة:</strong> ${printDate}</div>
      ${settings.phone ? `<div><strong>هاتف:</strong> ${settings.phone}</div>` : ''}
      ${settings.address ? `<div><strong>العنوان:</strong> ${settings.address}</div>` : ''}
    </div>
  </div>

  <div class="report-title-bar">
    <h1 class="report-main-title">📋 ${reportTitle}</h1>
    ${filterSummary ? `<div class="filter-summary">${filterSummary}</div>` : ''}
    <div class="count-badge">إجمالي الجلسات: <strong>${hearings.length}</strong></div>
  </div>

  <table class="roll-table">
    <thead>
      <tr>
        <th class="col-num">م</th>
        <th class="col-court">المحكمة والدائرة والقاعة</th>
        <th class="col-case">رقم القضية والسنة</th>
        <th class="col-client">الموكل وصفته</th>
        <th class="col-opponent">الخصم وصفته</th>
        <th class="col-prev">الجلسة السابقة والقرار وسبب التأجيل</th>
        <th class="col-req">المطلوب في الجلسة</th>
        <th class="col-notes-empty">ملاحظات وقرار الجلسة (بخط اليد)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="report-footer">
    <div>برنامج إدارة مكتب المحاماة — رول جلسات المحكمة</div>
    <div>الملاحظات المدونة بخط اليد معتمدة وتفرغ فور العودة للمكتب</div>
  </div>
</body>
</html>
  `;
}
