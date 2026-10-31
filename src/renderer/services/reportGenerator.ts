import { OfficeSettings } from '../../shared/types';

export interface ReportContentOptions {
  settings: OfficeSettings;
  title: string;
  subtitle?: string;
  landscape?: boolean;
  tableHeaders?: string[];
  tableRows?: (string | number)[][];
  customBodyHtml?: string;
  notes?: string;
}

export function generateReportHtml(options: ReportContentOptions): string {
  const {
    settings,
    title,
    subtitle,
    landscape = false,
    tableHeaders = [],
    tableRows = [],
    customBodyHtml,
    notes,
  } = options;

  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tableHtml = tableHeaders.length > 0 ? `
    <table class="report-table">
      <thead>
        <tr>
          ${tableHeaders.map((h) => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRows
          .map(
            (row, idx) => `
          <tr class="${idx % 2 === 1 ? 'even-row' : ''}">
            ${row.map((cell) => `<td>${cell !== null && cell !== undefined ? cell : '-'}</td>`).join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 ${landscape ? 'landscape' : 'portrait'};
      margin: 12mm 10mm 15mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      direction: rtl;
    }

    .report-container {
      width: 100%;
      padding: 5px;
    }

    /* Header styling */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 15px;
    }

    .header-right {
      flex: 1;
      text-align: right;
    }

    .office-name {
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .lawyer-name {
      font-size: 13pt;
      font-weight: 700;
      color: #b45309;
      margin: 0 0 2px 0;
    }

    .lawyer-title {
      font-size: 10pt;
      color: #475569;
      font-weight: 600;
      margin: 0 0 2px 0;
    }

    .bar-reg {
      font-size: 9pt;
      color: #64748b;
      margin: 0;
    }

    .header-center {
      width: 120px;
      text-align: center;
    }

    .logo-img {
      max-width: 90px;
      max-height: 90px;
      object-fit: contain;
    }

    .emblem-icon {
      font-size: 40pt;
      color: #0f172a;
      line-height: 1;
    }

    .header-left {
      flex: 1;
      text-align: left;
      font-size: 9pt;
      color: #334155;
      line-height: 1.6;
    }

    .gold-bar {
      height: 3px;
      background: linear-gradient(90deg, #b45309, #d97706, #f59e0b, #d97706, #b45309);
      margin-top: 4px;
      margin-bottom: 15px;
    }

    /* Title Block */
    .title-block {
      text-align: center;
      margin: 10px 0 18px 0;
      padding: 8px 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .report-title {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .report-subtitle {
      font-size: 10.5pt;
      color: #475569;
      margin: 0;
    }

    .report-meta {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #64748b;
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px dashed #cbd5e1;
    }

    /* Table Styling */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9.5pt;
    }

    .report-table thead {
      display: table-header-group;
    }

    .report-table th {
      background-color: #0f172a !important;
      color: #ffffff !important;
      font-weight: 700;
      padding: 8px 10px;
      text-align: right;
      border: 1px solid #0f172a;
      white-space: nowrap;
    }

    .report-table td {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      text-align: right;
      color: #1e293b;
    }

    .report-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .even-row {
      background-color: #f8fafc !important;
    }

    /* Notes block */
    .notes-box {
      margin-top: 15px;
      padding: 10px 14px;
      background: #fffbeb;
      border-right: 4px solid #f59e0b;
      border-radius: 4px;
      font-size: 9pt;
      color: #78350f;
      break-inside: avoid;
    }

    /* Footer styling */
    .report-footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #64748b;
      break-inside: avoid;
    }

    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      margin-bottom: 25px;
      break-inside: avoid;
    }

    .signature-box {
      text-align: center;
      width: 200px;
      font-size: 10pt;
      font-weight: 600;
      color: #0f172a;
    }

    .signature-line {
      margin-top: 45px;
      border-bottom: 1px dashed #64748b;
    }

    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="report-header">
      <div class="header-right">
        <h1 class="office-name">${settings.office_name}</h1>
        <h2 class="lawyer-name">${settings.lawyer_name}</h2>
        <div class="lawyer-title">${settings.title}</div>
        ${settings.bar_registration_number ? `<div class="bar-reg">رقم القيد بالنقابة: ${settings.bar_registration_number}</div>` : ''}
      </div>

      <div class="header-center">
        ${
          settings.logo_path
            ? `<img src="local-file://attachments/${settings.logo_path}" class="logo-img" alt="شعار المكتب" onerror="this.style.display='none'" />`
            : `<div class="emblem-icon">⚖️</div>`
        }
      </div>

      <div class="header-left">
        <div><strong>الهاتف:</strong> ${settings.phone}</div>
        ${settings.phone2 ? `<div><strong>موبايل / واتساب:</strong> ${settings.phone2}</div>` : ''}
        ${settings.email ? `<div><strong>البريد:</strong> ${settings.email}</div>` : ''}
        ${settings.address ? `<div><strong>العنوان:</strong> ${settings.address}</div>` : ''}
        ${settings.tax_number ? `<div><strong>البطاقة الضريبية:</strong> ${settings.tax_number}</div>` : ''}
      </div>
    </div>

    <div class="gold-bar"></div>

    <!-- Title Block -->
    <div class="title-block">
      <div class="report-title">${title}</div>
      ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
      <div class="report-meta">
        <span>تاريخ التقرير: ${printDate}</span>
        <span>برنامج إدارة مكتب المحاماة - النسخة المعتمدة</span>
      </div>
    </div>

    <!-- Main Content -->
    ${customBodyHtml || ''}
    ${tableHtml}

    ${notes ? `<div class="notes-box"><strong>ملاحظات قانونية:</strong> ${notes}</div>` : ''}

    <!-- Signatures -->
    <div class="signature-area">
      <div class="signature-box">
        <div>المحامي المسؤول</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <div>خاتم واعتماد المكتب</div>
        <div class="signature-line"></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <div>طُبع آلياً بواسطة نظام إدارة مكتب المحاماة (يعمل محلياً وأوفلاين بالكامل)</div>
      <div>صفحة 1 من 1</div>
    </div>
  </div>
</body>
</html>
  `;
}
