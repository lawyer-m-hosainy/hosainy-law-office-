import { describe, it, expect } from 'vitest';
import ICAL from 'ical.js';
import {
  CalendarExportDataset,
  CalendarExportOptions,
  buildIcsFromDataset,
  generateTodaySummaryText,
  transformHearingsToIcsEvents,
  transformTasksToIcsEvents,
  transformAppealsToIcsEvents,
  transformChequesToIcsEvents,
  transformPoaToIcsEvents,
  buildAlarmsFromOptions
} from '../../src/shared/calendarExportLogic';
import { getUtf8ByteLength } from '../../src/shared/icsGenerator';

describe('Calendar Export Logic & Privacy Verification Tests (منظومة تصدير التقويم ووضع الخصوصية)', () => {
  const sampleDataset: CalendarExportDataset = {
    hearings: [
      {
        id: 1,
        case_id: 10,
        case_number: '1234',
        case_year: 2024,
        court_name: 'محكمة شمال القاهرة الابتدائية',
        court_circuit: 'الدائرة 5 مدني كلي',
        court_hall: '2',
        roll_number: 14,
        hearing_date: '2026-11-10',
        hearing_time: '10:30',
        requests: 'تقديم أصل عقد البيع الابتدائي وسداد الأمانة',
        adjournment_reason: 'لإعادة إعلان المدعى عليه بالطلبات الختامية',
        previous_decision: 'التأجيل للإعلان',
        primary_client_name: 'أحمد محمود حسن إبراهيم',
        primary_opponent_name: 'شركة النور للاستثمار والتجارة',
        status: 'محددة'
      },
      {
        id: 2,
        case_id: 11,
        case_number: '5678',
        case_year: 2025,
        court_name: 'محكمة استئناف القاهرة',
        hearing_date: '2026-11-12',
        hearing_time: null, // Untimed -> all-day event
        requests: 'المرافعة الشفوية',
        adjournment_reason: 'لحجز الدعوى للحكم',
        primary_client_name: 'فاطمة علي السيد',
        primary_opponent_name: 'حسين إبراهيم مصطفى',
        status: 'محددة'
      }
    ],
    tasks: [
      {
        id: 20,
        title: 'استخراج شهادة من جدول جنح مستأنف بولاق',
        category: 'مأمورية محكمة',
        priority: 'عاجلة',
        due_date: '2026-11-10',
        due_time: '09:00',
        estimated_duration: 'ساعتان',
        description: 'التوجه إلى سكرتارية الجدول لطلب الشهادة',
        case_number: '987',
        case_year: 2024,
        court_name: 'محكمة جنوب القاهرة',
        client_name: 'محمود عبد الرازق',
        status: 'جديدة'
      }
    ],
    appeals: [
      {
        id: 30,
        case_id: 10,
        case_number: '1234',
        case_year: 2024,
        court_name: 'محكمة شمال القاهرة',
        appeal_type: 'استئناف مدني',
        judgment_date: '2026-10-01',
        deadline_date: '2026-11-11',
        client_name: 'أحمد محمود حسن إبراهيم'
      }
    ],
    cheques: [
      {
        id: 40,
        cheque_number: 'CHQ-889922',
        bank_name: 'البنك الأهلي المصري',
        amount: 2500000, // 25,000 EGP in piasters
        due_date: '2026-11-15',
        drawer_name: 'سالم عبد العليم',
        client_name: 'أحمد محمود حسن إبراهيم'
      }
    ],
    poas: [
      {
        id: 50,
        client_name: 'أحمد محمود حسن إبراهيم',
        poa_number: '1234 / أ لسنة 2023',
        poa_type: 'توكيل عام قضايا',
        poa_date: '2023-11-20',
        poa_issuing_office: 'مكتب توثيق مصر الجديدة',
        poa_expiry_date: '2026-11-20'
      }
    ]
  };

  const defaultOptions: CalendarExportOptions = {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    includeHearings: true,
    includeTasks: true,
    includeAppeals: true,
    includeCheques: true,
    includePoaExpiry: true,
    privacyMode: true,
    alarmTriggerDays: 1,
    alarmTriggerHours: 1
  };

  // 1. Strict Privacy Mode Verification
  it('وضع الخصوصية (Privacy Mode = true) يحجب أسماء الموكلين والخصوم تماماً من ملف التقويم', () => {
    const { icsContent, eventsCount } = buildIcsFromDataset(sampleDataset, {
      ...defaultOptions,
      privacyMode: true
    });

    expect(eventsCount).toBe(6);

    // Assert strictly that neither client name nor opponent name appears anywhere in the generated .ics file
    expect(icsContent).not.toContain('أحمد محمود حسن إبراهيم');
    expect(icsContent).not.toContain('فاطمة علي السيد');
    expect(icsContent).not.toContain('شركة النور للاستثمار والتجارة');
    expect(icsContent).not.toContain('حسين إبراهيم مصطفى');
    expect(icsContent).not.toContain('سالم عبد العليم');

    // But essential case data MUST be present
    expect(icsContent).toContain('1234');
    expect(icsContent).toContain('2024');
    expect(icsContent).toContain('محكمة شمال القاهرة');
  });

  // 2. Non-Privacy Mode includes client and opponent names
  it('الوضع العادي (Privacy Mode = false) يتيح تضمين أسماء الموكلين والخصوم عند الرغبة', () => {
    const { icsContent } = buildIcsFromDataset(sampleDataset, {
      ...defaultOptions,
      privacyMode: false
    });

    expect(icsContent).toContain('أحمد محمود حسن إبراهيم');
    expect(icsContent).toContain('شركة النور للاستثمار والتجارة');
  });

  // 3. Stable UID between multiple export operations
  it('ثبات معرّف الحدث (UID) عبر عمليات التصدير المتكررة لمنع التكرار', () => {
    const alarms = buildAlarmsFromOptions({ alarmTriggerDays: 1, alarmTriggerHours: 1 });

    const export1 = transformHearingsToIcsEvents(sampleDataset.hearings!, true, alarms);
    const export2 = transformHearingsToIcsEvents(sampleDataset.hearings!, true, alarms);

    expect(export1[0].uid).toBe('hearing-1@lawoffice.local');
    expect(export2[0].uid).toBe('hearing-1@lawoffice.local');
    expect(export1[1].uid).toBe('hearing-2@lawoffice.local');
    expect(export2[1].uid).toBe('hearing-2@lawoffice.local');
    expect(export1[0].uid).toBe(export2[0].uid);
  });

  // 4. Floating Time vs All-Day Event Verification
  it('الجلسة ذات الوقت تسجل كوقت عائم، والجلسة بدون وقت تسجل كحدث يوم كامل', () => {
    const { icsContent } = buildIcsFromDataset(sampleDataset, defaultOptions);

    const jcal = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents('vevent');

    // First hearing has time: 10:30
    const timedHearing = vevents.find(v => v.getFirstPropertyValue('uid') === 'hearing-1@lawoffice.local')!;
    expect(timedHearing).toBeDefined();
    const event1 = new ICAL.Event(timedHearing);
    expect(event1.startDate.isDate).toBe(false); // floating datetime with hours/mins
    expect(event1.startDate.hour).toBe(10);
    expect(event1.startDate.minute).toBe(30);

    // Second hearing has no time -> all-day event
    const untimedHearing = vevents.find(v => v.getFirstPropertyValue('uid') === 'hearing-2@lawoffice.local')!;
    expect(untimedHearing).toBeDefined();
    const event2 = new ICAL.Event(untimedHearing);
    expect(event2.startDate.isDate).toBe(true); // all-day date
  });

  // 5. VALARM Verification
  it('يحتوي كل حدث على تنبيهات VALARM مطابقة للإعدادات (يوم وساعة قبل الموعد)', () => {
    const { icsContent } = buildIcsFromDataset(sampleDataset, {
      ...defaultOptions,
      alarmTriggerDays: 1,
      alarmTriggerHours: 1
    });

    const jcal = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getAllSubcomponents('vevent')[0];
    const valarms = vevent.getAllSubcomponents('valarm');

    expect(valarms.length).toBe(2);
    const triggers = valarms.map(a => a.getFirstPropertyValue('trigger').toString());
    expect(triggers).toContain('-P1D');
    expect(triggers).toContain('-PT1H');
  });

  // 6. UTF-8 Line Folding Check with long Arabic descriptions
  it('يقسم الملف الطويل بدقة دون تجاوز 75 بايت لكل سطر ودون تشويه أي حرف عربي', () => {
    const { icsContent } = buildIcsFromDataset(sampleDataset, defaultOptions);

    const lines = icsContent.split('\r\n');
    for (const line of lines) {
      if (line.length === 0) continue;
      const bytes = getUtf8ByteLength(line);
      expect(bytes).toBeLessThanOrEqual(75);
    }

    // Must be completely parsable by ical.js
    expect(() => ICAL.parse(icsContent)).not.toThrow();
  });

  // 7. Today's Summary text generation (نسخ ملخص اليوم)
  it('يولد نص ملخص اليوم العربي بالحجم المناسب للواتساب أو الرسائل بوضع الخصوصية', () => {
    const summaryPrivacy = generateTodaySummaryText({
      todayDateStr: '2026-11-10',
      hearings: [sampleDataset.hearings![0]],
      tasks: [sampleDataset.tasks![0]],
      privacyMode: true
    });

    expect(summaryPrivacy).toContain('ملخص أعمال اليوم');
    expect(summaryPrivacy).toContain('وضع الخصوصية');
    expect(summaryPrivacy).toContain('ق 1234 لسنة 2024');
    expect(summaryPrivacy).not.toContain('أحمد محمود حسن إبراهيم');
    expect(summaryPrivacy).not.toContain('شركة النور');

    const summaryOpen = generateTodaySummaryText({
      todayDateStr: '2026-11-10',
      hearings: [sampleDataset.hearings![0]],
      tasks: [sampleDataset.tasks![0]],
      privacyMode: false
    });

    expect(summaryOpen).toContain('أحمد محمود حسن إبراهيم');
  });
});
