import { CaseAnnouncement, OfficeSettings } from '../../shared/types';
import { generateReportHtml } from './reportGenerator';

export function generateAnnouncementsReportHtml(
  settings: OfficeSettings,
  announcements: CaseAnnouncement[],
  filterTitle: string = 'كشف الإعلانات القضائية والمحضرين'
): string {
  const tableHeaders = [
    'م',
    'رقم الدعوى',
    'المحكمة',
    'المطلوب إعلانه وصفته',
    'نوع الإعلان',
    'قلم المحضرين',
    'رقم القيد',
    'تاريخ التسليم',
    'تاريخ الجلسة',
    'الحالة والنتيجة',
    'الرسم'
  ];

  const tableRows = announcements.map((a, idx) => {
    const feeFormatted = (a.fee_amount / 100).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' ج.م';

    const caseInfo = a.case_number ? `${a.case_number}` : (a.case_title || '-');
    const recipientInfo = `${a.recipient_name} ${a.recipient_capacity ? `(${a.recipient_capacity})` : ''}`;
    const attemptBadge = a.attempt_number > 1 ? ` [محاولة ${a.attempt_number}]` : '';

    return [
      idx + 1,
      caseInfo,
      a.court_name || '-',
      recipientInfo,
      `${a.announcement_type}${attemptBadge}`,
      a.bailiff_office || '-',
      a.request_number || '-',
      a.delivery_date || '-',
      a.hearing_date || '-',
      a.status,
      feeFormatted
    ];
  });

  const totalFeePiasters = announcements.reduce((sum, a) => sum + (a.fee_amount || 0), 0);
  const totalFeeFormatted = (totalFeePiasters / 100).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ج.م';

  const notes = `إجمالي عدد الإعلانات المسجلة بالتقرير: ${announcements.length} إعلان | إجمالي الرسوم المسددة: ${totalFeeFormatted}`;

  return generateReportHtml({
    settings,
    title: filterTitle,
    subtitle: `تم الاستخراج بتاريخ ${new Date().toLocaleDateString('ar-EG')}`,
    landscape: true,
    tableHeaders,
    tableRows,
    notes
  });
}
