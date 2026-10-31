import { CaseDetails, CaseHearingStats, Hearing, OfficeSettings } from '../../shared/types';

export function generateAdjournmentsReportHtml(
  caseData: CaseDetails,
  hearings: Hearing[],
  stats: CaseHearingStats,
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

  const clientsText = (caseData.clients || [])
    .map(c => `${c.name} (${c.role_capacity || 'موكل'})`)
    .join('، ');

  const opponentsText = (caseData.opponents || [])
    .map(o => `${o.name} (${o.role_capacity || 'خصم'})`)
    .join('، ');

  // Sort chronological for timeline report
  const sortedHearings = [...hearings].sort((a, b) => new Date(a.hearing_date).getTime() - new Date(b.hearing_date).getTime());

  const rowsHtml = sortedHearings.length === 0
    ? `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b;">لا توجد جلسات مسجلة لهذه القضية حتى الآن</td></tr>`
    : sortedHearings.map((h, idx) => {
        const attendanceBadge = h.attended === 1
          ? `<span class="badge-green">حضر (${h.attended_by || 'المحامي'})</span>`
          : `<span class="badge-gray">لم يحضر</span>`;

        const reasonBadge = h.adjournment_reason
          ? `<span class="badge-amber">${h.adjournment_reason}</span>`
          : '-';

        return `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="text-align: center; font-weight: 700; white-space: nowrap;">
              ${h.hearing_date}
              ${h.hearing_time ? `<br><span style="font-size: 8pt; color: #64748b;">${h.hearing_time}</span>` : ''}
            </td>
            <td style="text-align: center;">${attendanceBadge}</td>
            <td>${h.proceedings || '-'}</td>
            <td style="font-weight: 600; color: #0f172a;">${h.court_decision || '-'}</td>
            <td>${reasonBadge}</td>
            <td style="text-align: center; font-weight: 700; color: #0369a1;">
              ${h.next_hearing_date || (h.is_judgment_hearing ? `حكم: ${h.judgment_date || 'محدد'}` : '-')}
            </td>
          </tr>
        `;
      }).join('\n');

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير جلسات وتأجيلات القضية ${caseData.case_number} لسنة ${caseData.case_year}</title>
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
      font-size: 9.5pt;
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

    .report-title-bar {
      text-align: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 12px;
    }

    .report-title {
      font-size: 13pt;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    .case-sub-banner {
      font-size: 10pt;
      color: #475569;
      font-weight: 600;
    }

    /* Case Info Summary Grid */
    .case-info-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      background: #fafafa;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 12px;
      font-size: 9pt;
    }

    .info-row strong {
      color: #334155;
    }

    /* Stats Grid */
    .stats-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .stat-card {
      border: 1px solid #cbd5e1;
      background: #f1f5f9;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
    }

    .stat-val {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
    }

    .stat-lbl {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }

    /* Timeline Table */
    table.timeline-table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    table.timeline-table thead {
      display: table-header-group;
    }

    table.timeline-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    table.timeline-table th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      font-size: 8.5pt;
      padding: 7px 8px;
      border: 1px solid #0f172a;
      text-align: center;
    }

    table.timeline-table td {
      border: 1px solid #cbd5e1;
      padding: 7px 8px;
      vertical-align: top;
      font-size: 8.5pt;
    }

    table.timeline-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .badge-green {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 3px;
    }

    .badge-gray {
      display: inline-block;
      background: #f1f5f9;
      color: #64748b;
      font-size: 7.5pt;
      font-weight: 600;
      padding: 2px 5px;
      border-radius: 3px;
    }

    .badge-amber {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      font-size: 8pt;
      font-weight: 600;
      padding: 2px 5px;
      border-radius: 3px;
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

  <div class="report-title-bar">
    <h1 class="report-title">تقرير الخط الزمني للجلسات والتأجيلات</h1>
    <div class="case-sub-banner">
      القضية رقم <strong>${caseData.case_number}</strong> لسنة <strong>${caseData.case_year}</strong> (${caseData.court_name})
    </div>
  </div>

  <div class="case-info-box">
    <div class="info-row"><strong>الموكلون:</strong> ${clientsText || 'غير محدد'}</div>
    <div class="info-row"><strong>الخصوم:</strong> ${opponentsText || 'غير محدد'}</div>
    <div class="info-row"><strong>نوع الدعوى:</strong> ${caseData.case_type}</div>
    <div class="info-row"><strong>الدائرة:</strong> ${caseData.court_circuit || 'غير محددة'}</div>
    <div class="info-row" style="grid-column: span 2;"><strong>موضوع الدعوى:</strong> ${caseData.subject}</div>
  </div>

  <div class="stats-container">
    <div class="stat-card">
      <div class="stat-val">${stats.total_hearings}</div>
      <div class="stat-lbl">إجمالي الجلسات</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${stats.postponement_count}</div>
      <div class="stat-lbl">عدد التأجيلات</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${stats.most_frequent_reason || 'لا يوجد'}</div>
      <div class="stat-lbl">أكثر سبب تأجيل (${stats.most_frequent_reason_count || 0} مرات)</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${stats.avg_days_between_hearings || 0} يوم</div>
      <div class="stat-lbl">متوسط الفترة بين الجلسات</div>
    </div>
  </div>

  <table class="timeline-table">
    <thead>
      <tr>
        <th style="width: 30px;">م</th>
        <th style="width: 95px;">تاريخ الجلسة</th>
        <th style="width: 80px;">الحضور</th>
        <th style="width: 25%;">ما تم في الجلسة</th>
        <th style="width: 25%;">قرار المحكمة</th>
        <th style="width: 20%;">سبب التأجيل</th>
        <th style="width: 95px;">الجلسة القادمة</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="report-footer">
    <div>برنامج إدارة مكتب المحاماة — سجل تاريخي متسلسل للجلسات</div>
    <div>صفحة 1 من 1</div>
  </div>
</body>
</html>
  `;
}
