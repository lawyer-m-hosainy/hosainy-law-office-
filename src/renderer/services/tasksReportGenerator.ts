import { Task, OfficeSettings } from '../../shared/types';

export interface TasksReportOptions {
  title?: string;
  periodText?: string;
  filterLabel?: string;
}

export function generateTasksReportHtml(
  tasks: Task[],
  settings: OfficeSettings,
  options?: TasksReportOptions
): string {
  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const reportTitle = options?.title || 'قائمة المهام والمأموريات القضائية';
  const periodText = options?.periodText || 'لكافة المهام المحددة';

  // Stats
  const totalTasks = tasks.length;
  const urgentCount = tasks.filter(t => t.priority === 'عاجلة').length;
  const importantCount = tasks.filter(t => t.priority === 'مهمة').length;
  const completedCount = tasks.filter(t => t.status === 'منتهية').length;
  const pendingCount = tasks.filter(t => t.status !== 'منتهية' && t.status !== 'ملغاة').length;

  // Table rows with pen checkboxes
  const tableRows = tasks.length === 0
    ? `<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b;">لا توجد مهام مدرجة في هذه القائمة</td></tr>`
    : tasks.map((task, idx) => {
        const isUrgent = task.priority === 'عاجلة';
        const isImportant = task.priority === 'مهمة';
        const priorityColor = isUrgent ? '#b91c1c' : isImportant ? '#b45309' : '#475569';
        const priorityBg = isUrgent ? '#fef2f2' : isImportant ? '#fffbeb' : '#f8fafc';

        // Checklists inline display
        let checklistHtml = '';
        if (task.checklists && task.checklists.length > 0) {
          checklistHtml = `
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0; font-size: 8pt; color: #475569;">
              ${task.checklists.map(cl => `
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                  <span style="display: inline-block; width: 10px; height: 10px; border: 1px solid #64748b; border-radius: 2px; ${cl.is_completed ? 'background: #94a3b8;' : 'background: #fff;'}"></span>
                  <span style="${cl.is_completed ? 'text-decoration: line-through; color: #94a3b8;' : ''}">${cl.title}</span>
                </div>
              `).join('')}
            </div>
          `;
        }

        return `
          <tr style="${task.status === 'منتهية' ? 'opacity: 0.65; background: #f8fafc;' : ''}">
            <!-- Pen Checkbox -->
            <td style="text-align: center; width: 35px; vertical-align: middle;">
              <div style="width: 16px; height: 16px; border: 1.5px solid #0f172a; border-radius: 3px; margin: auto; background: #fff; ${task.status === 'منتهية' ? 'background: #cbd5e1;' : ''}">
                ${task.status === 'منتهية' ? '✓' : ''}
              </div>
            </td>

            <!-- Serial -->
            <td style="text-align: center; width: 25px; font-weight: bold; color: #64748b;">${idx + 1}</td>

            <!-- Task Title & Description -->
            <td style="vertical-align: top;">
              <div style="font-weight: 700; color: #0f172a; font-size: 9pt;">${task.title}</div>
              ${task.description ? `<div style="font-size: 8pt; color: #64748b; margin-top: 1px;">${task.description}</div>` : ''}
              ${checklistHtml}
            </td>

            <!-- Category -->
            <td style="text-align: center; width: 100px; font-size: 8pt; color: #334155;">
              ${task.category}
            </td>

            <!-- Priority -->
            <td style="text-align: center; width: 60px;">
              <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; color: ${priorityColor}; background: ${priorityBg}; border: 1px solid ${priorityColor}40;">
                ${task.priority}
              </span>
            </td>

            <!-- Due Date & Time -->
            <td style="text-align: center; width: 85px; white-space: nowrap; font-size: 8pt;">
              <strong>${task.due_date}</strong>
              ${task.due_time ? `<br><span style="font-size: 7.5pt; color: #64748b;">${task.due_time}</span>` : ''}
              ${task.estimated_duration ? `<br><span style="font-size: 7pt; color: #0284c7;">(${task.estimated_duration})</span>` : ''}
            </td>

            <!-- Case / Client -->
            <td style="width: 120px; font-size: 8pt; color: #1e293b;">
              ${task.case_number ? `<div><strong>قضية:</strong> ${task.case_number}/${task.case_year || ''} (${task.court_name || ''})</div>` : ''}
              ${task.client_name ? `<div style="color: #64748b;"><strong>موكل:</strong> ${task.client_name}</div>` : ''}
              ${!task.case_number && !task.client_name ? '<span style="color: #94a3b8;">مهمة عامة / مكتبية</span>' : ''}
            </td>

            <!-- Assigned To -->
            <td style="text-align: center; width: 75px; font-size: 8pt; font-weight: bold; color: #0f172a;">
              ${task.assigned_to || 'أنا'}
            </td>

            <!-- Empty Hand-written Result Notes Column -->
            <td style="width: 110px; background: #fafafa; border-right: 1px dashed #cbd5e1;"></td>
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
      size: A4 portrait;
      margin: 10mm 8mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 8.5pt;
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
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .header-right {
      flex: 1;
      text-align: right;
    }

    .office-name {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
    }

    .lawyer-name {
      font-size: 10.5pt;
      font-weight: 700;
      color: #b45309;
      margin: 0 0 2px 0;
    }

    .header-center {
      text-align: center;
      padding: 0 15px;
    }

    .logo-img {
      max-width: 60px;
      max-height: 60px;
      object-fit: contain;
    }

    .emblem-icon {
      font-size: 26pt;
      line-height: 1;
    }

    .header-left {
      flex: 1;
      text-align: left;
      font-size: 8pt;
      color: #475569;
      line-height: 1.35;
    }

    .title-banner {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-right: 5px solid #0284c7;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 4px;
    }

    .title-banner h1 {
      margin: 0;
      font-size: 12pt;
      font-weight: 800;
      color: #0f172a;
    }

    .stats-strip {
      display: flex;
      gap: 15px;
      font-size: 8pt;
      color: #475569;
    }

    .stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .stat-pill strong {
      color: #0f172a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8pt;
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
      padding: 6px 6px;
      border: 1px solid #0f172a;
      text-align: right;
    }

    td {
      padding: 6px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }

    tbody tr:nth-child(even) {
      background: #fbfcfe;
    }

    .footer-section {
      margin-top: 15px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8pt;
      color: #64748b;
    }

    .signatures {
      display: flex;
      gap: 50px;
      text-align: center;
    }

    .sig-box {
      min-width: 110px;
    }

    .sig-line {
      margin-top: 30px;
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
        ${settings.phone ? ` | ت: ${settings.phone}` : ''}
      </div>
    </div>

    <div class="header-center">
      ${settings.logo_path ? `<img src="${settings.logo_path}" class="logo-img" alt="Logo" />` : '<div class="emblem-icon">📋</div>'}
    </div>

    <div class="header-left">
      <div><strong>التاريخ:</strong> ${printDate}</div>
      <div><strong>الفترة:</strong> ${periodText}</div>
      ${options?.filterLabel ? `<div><strong>التصفية:</strong> ${options.filterLabel}</div>` : ''}
    </div>
  </div>

  <!-- Title & Stats Banner -->
  <div class="title-banner">
    <div>
      <h1>${reportTitle}</h1>
    </div>
    <div class="stats-strip">
      <span class="stat-pill">الإجمالي: <strong>${totalTasks}</strong></span>
      <span class="stat-pill" style="color: #b91c1c;">عاجلة: <strong>${urgentCount}</strong></span>
      <span class="stat-pill" style="color: #b45309;">مهمة: <strong>${importantCount}</strong></span>
      <span class="stat-pill" style="color: #0369a1;">قيد التنفيذ: <strong>${pendingCount}</strong></span>
      <span class="stat-pill" style="color: #166534;">منتهية: <strong>${completedCount}</strong></span>
    </div>
  </div>

  <!-- Tasks Table with pen check boxes -->
  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">تم</th>
        <th style="width: 25px; text-align: center;">م</th>
        <th>المهمة والبيان وقائمة الفحص (Checklist)</th>
        <th style="width: 100px; text-align: center;">التصنيف</th>
        <th style="width: 60px; text-align: center;">الأولوية</th>
        <th style="width: 85px; text-align: center;">تاريخ الاستحقاق</th>
        <th style="width: 120px;">القضية / الموكل</th>
        <th style="width: 75px; text-align: center;">المكلف</th>
        <th style="width: 110px; text-align: center;">ملاحظات النتيجة بخط اليد</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <!-- Footer with Signatures -->
  <div class="footer-section">
    <div>
      <div>* ضع علامة (✓) بالقلم الجاف داخل المربع عند إتمام المهمة، ودوّن نتيجة المأمورية بالعمود المخصص.</div>
      <div>تم الاستخراج والطباعة من برنامج إدارة مكتب المحاماة — أوفلاين محلياً</div>
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div>المكلّف بالمأمورية</div>
        <div class="sig-line"></div>
      </div>
      <div class="sig-box">
        <div>المحامي المسؤول / المدير</div>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>

</body>
</html>
  `;
}
