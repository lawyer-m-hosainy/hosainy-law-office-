import { describe, it, expect } from 'vitest';
import { generateReportHtml } from '../../src/renderer/services/reportGenerator';
import { generateHearingRollHtml } from '../../src/renderer/services/hearingRollReportGenerator';
import { generateReceiptHtml } from '../../src/renderer/services/receiptReportGenerator';
import { generateTasksReportHtml } from '../../src/renderer/services/tasksReportGenerator';
import { OfficeSettings } from '../../src/shared/types';

describe('Print System & Report Templates Tests (خدمة وقوالب الطباعة الموحدة)', () => {
  const dummySettings: OfficeSettings = {
    office_name: 'مكتب الأستاذ أحمد عزمي المحامي بالنقض',
    lawyer_name: 'أحمد عزمي',
    title: 'محامٍ بالنقض والدستورية العليا',
    phone: '01012345678',
    phone2: '0223456789',
    email: 'lawyer@cairo-bar.org',
    address: '15 شارع شريف - وسط البلد - القاهرة',
    bar_registration_number: '123456',
    tax_number: '123-456-789',
    appeal_deadline_civil: 40,
    appeal_deadline_misdemeanor: 10,
    appeal_deadline_cassation: 60,
    appeal_deadline_urgent: 15,
    appeal_deadline_family: 40,
    appeal_deadline_admin: 60,
    date_format: 'ar-EG',
    alert_days_before: 3,
  };

  it('يولد قالب HTML للتقرير العام باتجاه RTL وتضمين خط Cairo', () => {
    const html = generateReportHtml({
      title: 'تقرير تجريبي للتحقق',
      settings: dummySettings,
      contentHtml: '<p>محتوى التقرير التجريبي</p>',
      landscape: false,
    });

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('Cairo');
    expect(html).toContain('مكتب الأستاذ أحمد عزمي المحامي بالنقض');
    expect(html).toContain('@media print');
    expect(html).toContain('page-break-inside');
  });

  it('يولد رول الجلسات الرسمي بأعمدة الجلسة السابقة والمطلوب وملاحظات خط الإيد', () => {
    const dummyHearings = [
      {
        id: 1,
        case_id: 1,
        hearing_date: '2026-03-10',
        court_name: 'محكمة شمال القاهرة الابتدائية',
        court_circuit: 'الدائرة 4 مدني',
        court_hall: 'قاعة 3',
        status: 'محددة' as const,
        case_number: '1050',
        case_year: 2026,
        subject: 'دعوى صحة ونفاذ',
        primary_client_name: 'محمود أحمد',
        primary_client_role: 'مدعي',
        primary_opponent_name: 'سعيد عثمان',
        primary_opponent_role: 'مدعى عليه',
        previous_decision: 'تأجيل لورود التقرير',
        requests: 'تقديم المذكرات وسداد أمانة الخبير',
      },
    ];

    const rollHtml = generateHearingRollHtml(dummyHearings as any, dummySettings, {
      title: 'رول الجلسات القضائية',
      filterSummary: 'محكمة شمال القاهرة الابتدائية',
    });

    expect(rollHtml).toContain('رول الجلسات القضائية');
    expect(rollHtml).toContain('1050');
    expect(rollHtml).toContain('2026');
    expect(rollHtml).toContain('محمود أحمد');
    expect(rollHtml).toContain('تقديم المذكرات وسداد أمانة الخبير');
    expect(rollHtml).toContain('ملاحظات وقرار الجلسة (بخط اليد)');
  });

  it('يولد إيصال استلام نقدية مرقم ومفقط بالحروف العربية تفقيطاً صحيحاً', () => {
    const dummyTx = {
      id: 1,
      receipt_number: 'REC-2026-0042',
      case_id: 1,
      client_id: 1,
      transaction_date: '2026-03-01',
      category: 'أتعاب' as const,
      transaction_type: 'سداد دفعة أتعاب',
      direction: 'وارد' as const,
      amount: 15000,
      payment_method: 'نقدي' as const,
      description: 'دفعة أتعاب مرحلة أول درجة',
      case_number: '1050',
      case_year: 2026,
      client_name: 'الأستاذ إبراهيم متولي',
    };

    const receiptHtml = generateReceiptHtml(dummyTx as any, dummySettings);

    expect(receiptHtml).toContain('إيصال استلام نقدية');
    expect(receiptHtml).toContain('REC-2026-0042');
    expect(receiptHtml).toContain('إبراهيم متولي');
    // التفقيط بالعربي
    expect(receiptHtml).toContain('فقط خمسة عشر ألف جنيه مصري لا غير');
  });

  it('يولد قائمة المهام بخانات الاختيار المفرغة [ ] للتأشير بالقلم الجاف', () => {
    const dummyTasks = [
      {
        id: 1,
        title: 'استخراج شهادة جدول من محكمة استئناف القاهرة',
        category: 'مأمورية محكمة',
        priority: 'عاجلة',
        due_date: '2026-03-12',
        status: 'جديدة',
        assigned_to: 'أنا',
        checklists: [
          { id: 1, task_id: 1, title: 'سحب دمغة', is_completed: 0, sort_order: 1 },
          { id: 2, task_id: 1, title: 'سداد الرسوم بالخزينة', is_completed: 0, sort_order: 2 },
        ],
      },
    ];

    const tasksHtml = generateTasksReportHtml(dummyTasks as any, dummySettings, {
      title: 'قائمة المهام والمأموريات',
      periodText: 'اليوم',
    });

    expect(tasksHtml).toContain('قائمة المهام والمأموريات');
    expect(tasksHtml).toContain('استخراج شهادة جدول');
    expect(tasksHtml).toContain('border: 1.5px solid #0f172a'); // صندوق المربع الفارغ للتأشير بالقلم
  });
});
