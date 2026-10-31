import { CaseDetails, OfficeSettings } from '../../shared/types';

export function generateCaseSheetHtml(caseData: CaseDetails, settings: OfficeSettings): string {
  const printDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>ملف بيانات القضية - ${caseData.case_number} لسنة ${caseData.case_year}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 10pt;
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
      margin-bottom: 10px;
    }

    .header-right {
      flex: 1;
      text-align: right;
    }

    .office-name {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 3px 0;
    }

    .lawyer-name {
      font-size: 12pt;
      font-weight: 700;
      color: #b45309;
      margin: 0 0 2px 0;
    }

    .lawyer-title {
      font-size: 9.5pt;
      color: #475569;
      font-weight: 600;
      margin: 0 0 2px 0;
    }

    .bar-reg {
      font-size: 8.5pt;
      color: #64748b;
      margin: 0;
    }

    .header-center {
      width: 100px;
      text-align: center;
    }

    .emblem-icon {
      font-size: 34pt;
      line-height: 1;
    }

    .logo-img {
      max-width: 80px;
      max-height: 80px;
      object-fit: contain;
    }

    .header-left {
      flex: 1;
      text-align: left;
      font-size: 8.5pt;
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
    .case-title-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-right: 5px solid #0f172a;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .case-main-id {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
    }

    .case-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 700;
      background: #0f172a;
      color: white;
    }

    /* Grid Sections */
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 12px;
      margin-bottom: 12px;
      font-size: 9.5pt;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      border-radius: 4px;
    }

    .info-label {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2px;
    }

    .info-val {
      font-weight: 700;
      color: #0f172a;
    }

    .full-width {
      grid-column: span 3;
    }

    .two-cols {
      grid-column: span 2;
    }

    /* Tables */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 14px;
      font-size: 9pt;
    }

    .report-table th {
      background-color: #0f172a !important;
      color: #ffffff !important;
      font-weight: 700;
      padding: 6px 8px;
      text-align: right;
      border: 1px solid #0f172a;
    }

    .report-table td {
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-align: right;
    }

    .report-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .juvenile-card {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-right: 4px solid #f59e0b;
      padding: 10px 14px;
      border-radius: 6px;
      margin-top: 10px;
      margin-bottom: 14px;
    }

    /* Footer & Signature */
    .report-footer {
      margin-top: 25px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #64748b;
      break-inside: avoid;
    }

    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      margin-bottom: 15px;
      break-inside: avoid;
    }

    .signature-box {
      text-align: center;
      width: 180px;
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }

    .signature-line {
      margin-top: 40px;
      border-bottom: 1px dashed #64748b;
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
            ? `<img src="local-file://attachments/${settings.logo_path}" class="logo-img" alt="الشعار" onerror="this.style.display='none'" />`
            : `<div class="emblem-icon">⚖️</div>`
        }
      </div>

      <div class="header-left">
        <div><strong>الهاتف:</strong> ${settings.phone}</div>
        ${settings.phone2 ? `<div><strong>موبايل:</strong> ${settings.phone2}</div>` : ''}
        ${settings.email ? `<div><strong>البريد:</strong> ${settings.email}</div>` : ''}
        ${settings.address ? `<div><strong>العنوان:</strong> ${settings.address}</div>` : ''}
      </div>
    </div>

    <div class="gold-bar"></div>

    <!-- Case Title Header -->
    <div class="case-title-box">
      <div>
        <div class="case-main-id">القضية رقم ${caseData.case_number} لسنة ${caseData.case_year} قضائية</div>
        <div style="font-size: 9.5pt; color: #475569; margin-top: 3px;">
          <strong>${caseData.court_name}</strong> ${caseData.court_circuit ? ` - الدائرة: ${caseData.court_circuit}` : ''}
        </div>
      </div>
      <div>
        <span class="case-badge">${caseData.case_type}</span>
        <span class="case-badge" style="background: #b45309; margin-right: 4px;">${caseData.status}</span>
      </div>
    </div>

    <!-- 1. الأساسيات -->
    <div class="section-title">⚖️ بيانات القيد والمحكمة</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">المحكمة والجهة</span>
        <span class="info-val">${caseData.court_name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">الدائرة / القاعة</span>
        <span class="info-val">${caseData.court_circuit || 'غير محدد'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">الدرجة القضائية</span>
        <span class="info-val">${caseData.court_degree}</span>
      </div>

      <div class="info-item">
        <span class="info-label">رقم الحصر / الجدول</span>
        <span class="info-val">${caseData.table_number || 'لا يوجد'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">رقم المحضر / النيابة</span>
        <span class="info-val">${caseData.police_report_number || 'لا يوجد'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">تاريخ القيد</span>
        <span class="info-val">${caseData.filing_date || 'غير مسجل'}</span>
      </div>

      <div class="info-item">
        <span class="info-label">درجة الأهمية</span>
        <span class="info-val">${caseData.priority}</span>
      </div>
      <div class="info-item">
        <span class="info-label">المحامي المسؤول</span>
        <span class="info-val">${caseData.assigned_lawyer || settings.lawyer_name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">الزملاء المشاركون</span>
        <span class="info-val">${caseData.colleague_lawyers || 'لا يوجد'}</span>
      </div>

      <div class="info-item full-width">
        <span class="info-label">موضوع الدعوى</span>
        <span class="info-val" style="font-weight: 800;">${caseData.subject}</span>
      </div>

      ${
        caseData.claims
          ? `
      <div class="info-item full-width">
        <span class="info-label">الطلبات الختامية</span>
        <span class="info-val">${caseData.claims}</span>
      </div>`
          : ''
      }

      ${
        caseData.description
          ? `
      <div class="info-item full-width">
        <span class="info-label">الوصف والملخص</span>
        <span class="info-val" style="font-weight: 500;">${caseData.description}</span>
      </div>`
          : ''
      }
    </div>

    <!-- 2. الموكلين -->
    <div class="section-title">👥 الموكلون في الدعوى</div>
    <table class="report-table">
      <thead>
        <tr>
          <th>م</th>
          <th>اسم الموكل</th>
          <th>الصفة في الدعوى</th>
          <th>الهاتف</th>
          <th>رقم التوكيل</th>
          <th>صفة التمثيل</th>
        </tr>
      </thead>
      <tbody>
        ${
          caseData.clients && caseData.clients.length > 0
            ? caseData.clients
                .map(
                  (c, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${c.client_name || '-'}</strong></td>
            <td><span style="color: #b45309; font-weight: 700;">${c.role_capacity}</span></td>
            <td>${c.client_phone || '-'}</td>
            <td>${c.poa_number || '-'}</td>
            <td>${c.is_primary ? 'موكل رئيسي' : 'موكل إضافي'}</td>
          </tr>
        `
                )
                .join('')
            : '<tr><td colspan="6" style="text-align:center;">لا يوجد موكلون مسجلون</td></tr>'
        }
      </tbody>
    </table>

    <!-- 3. الخصوم ومحاميهم -->
    <div class="section-title">⚔️ الخصوم والمحامون المقابلون</div>
    <table class="report-table">
      <thead>
        <tr>
          <th>م</th>
          <th>اسم الخصم</th>
          <th>الصفة في الدعوى</th>
          <th>العنوان والهاتف</th>
          <th>اسم المحامي المقابل</th>
          <th>هاتف المحامي</th>
        </tr>
      </thead>
      <tbody>
        ${
          caseData.opponents && caseData.opponents.length > 0
            ? caseData.opponents
                .map(
                  (op, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${op.name}</strong></td>
            <td>${op.role_capacity}</td>
            <td>${op.address || op.phone || '-'}</td>
            <td>${op.lawyer_name || 'غير مسجل'}</td>
            <td>${op.lawyer_phone || '-'}</td>
          </tr>
        `
                )
                .join('')
            : '<tr><td colspan="6" style="text-align:center;">لا يوجد خصوم مسجلون</td></tr>'
        }
      </tbody>
    </table>

    <!-- 4. حقول جنح الأطفال إن وجدت -->
    ${
      caseData.is_juvenile === 1
        ? `
      <div class="section-title">👶 بيانات خاصة بمحكمة الطفل (جنح أحداث)</div>
      <div class="juvenile-card">
        <div class="info-grid" style="margin-bottom: 0;">
          <div class="info-item">
            <span class="info-label">اسم الحدث</span>
            <span class="info-val">${caseData.juvenile_name || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">السن وقت الواقعة</span>
            <span class="info-val">${caseData.juvenile_age ? `${caseData.juvenile_age} سنة` : '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">الاتهام المنسوب</span>
            <span class="info-val">${caseData.juvenile_charge || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">ولي الأمر والصفة</span>
            <span class="info-val">${caseData.guardian_name ? `${caseData.guardian_name} (${caseData.guardian_relation || ''})` : '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">مراقب السلوك</span>
            <span class="info-val">${caseData.probation_officer || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">المؤسسة / الدار المودع بها</span>
            <span class="info-val">${caseData.care_facility || '-'}</span>
          </div>
          ${
            caseData.imposed_measures
              ? `
          <div class="info-item full-width">
            <span class="info-label">التدابير المقضي بها</span>
            <span class="info-val">${caseData.imposed_measures}</span>
          </div>`
              : ''
          }
        </div>
      </div>
    `
        : ''
    }

    <!-- 5. القضية الأصلية المرتبطة إن وجدت -->
    ${
      caseData.parent_case
        ? `
      <div style="margin-top: 10px; padding: 8px 12px; background: #f1f5f9; border-radius: 4px; font-size: 9pt;">
        <strong>القضية الأصلية المرتبطة:</strong> رقم ${caseData.parent_case.case_number} لسنة ${caseData.parent_case.case_year} (${caseData.parent_case.court_name})
      </div>
    `
        : ''
    }

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
      <div>طُبع آلياً بواسطة برنامج إدارة مكتب المحاماة - تاريخ الطباعة: ${printDate}</div>
      <div>صفحة 1 من 1</div>
    </div>
  </div>
</body>
</html>
  `;
}
