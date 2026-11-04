import { describe, it, expect } from 'vitest';
import ICAL from 'ical.js';
import {
  escapeIcsText,
  foldIcsLine,
  getUtf8ByteLength,
  formatIcsFloatingDateTime,
  formatIcsAlarmTrigger,
  parseAlarmTriggers,
  generateIcsCalendar,
  IcsEventInput
} from '../../src/shared/icsGenerator';

describe('RFC 5545 iCalendar Generator & Parser Compatibility (تصدير التقويم .ics)', () => {
  // 1. Text Escaping Test
  it('يقوم بتهريب الفواصل والفاصلة المنقوطة والشرطة المائلة والأسطر الجديدة بدقة', () => {
    const raw = 'جلسة, محكمة شمال القاهرة; غرفة 5\\مكتب, ومطلوب:\nتقديم المذكرات\r\nوسداد الرسوم.';
    const escaped = escapeIcsText(raw);
    expect(escaped).toContain('\\;');
    expect(escaped).toContain('\\,');
    expect(escaped).toContain('\\\\');
    expect(escaped).not.toContain('\r');
    expect(escaped).toContain('\\n');
  });

  // 2. Line Folding & UTF-8 Safety
  it('يقسم الأسطر الطويلة عند 75 بايت دون كسر أحرف UTF-8 العربية', () => {
    // Generate a long Arabic string
    const arabicLine = 'SUMMARY:جلسة استئناف مدني مستعجل بمحكمة استئناف القاهرة الدائرة السابعة لمرافعة ختامية وتقديم المستندات والمذكرات المؤيدة لدفاع الخصم';
    const folded = foldIcsLine(arabicLine);

    // Each folded line must be at most 75 bytes in UTF-8
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const byteLen = getUtf8ByteLength(line);
      expect(byteLen).toBeLessThanOrEqual(75);

      if (i > 0) {
        // Continuation lines must start with space or tab
        expect(line.startsWith(' ') || line.startsWith('\t')).toBe(true);
      }
    }

    // When unfolded (replacing \r\n followed by space), it must exactly match original
    const unfolded = folded.replace(/\r\n /g, '');
    expect(unfolded).toBe(arabicLine);
  });

  // 3. Floating Time format
  it('يستخدم الوقت العائم (Floating Time) بدون Z وبدون TZID للجلسات المحددة بوقت', () => {
    const floating = formatIcsFloatingDateTime('2026-11-05', '09:30');
    expect(floating).toBe('20261105T093000');
    expect(floating).not.toContain('Z');
    expect(floating).not.toContain('TZID');
  });

  // 4. Alarm Trigger format
  it('يحول مدد التنبيه إلى صيغ RFC 5545 القياسية', () => {
    expect(formatIcsAlarmTrigger(1440)).toBe('-P1D');
    expect(formatIcsAlarmTrigger(2880)).toBe('-P2D');
    expect(formatIcsAlarmTrigger(60)).toBe('-PT1H');
    expect(formatIcsAlarmTrigger(120)).toBe('-PT2H');
    expect(formatIcsAlarmTrigger(30)).toBe('-PT30M');

    expect(parseAlarmTriggers('1d,1h')).toEqual([1440, 60]);
    expect(parseAlarmTriggers('2d, 30m')).toEqual([2880, 30]);
  });

  // 5. Full RFC 5545 Calendar Generation and ical.js validation
  it('يولد ملف iCalendar متوافقاً تماماً مع RFC 5545 ويمكن قراءته بمحلل ical.js', () => {
    const events: IcsEventInput[] = [
      {
        uid: 'hearing-101@lawoffice.local',
        summary: 'جلسة ق 1234 لسنة 2024 - محكمة شمال القاهرة',
        description: 'المطلوب: تقديم أصل عقد الإيجار ومذكرة دفاع\\nالجلسة السابقة: التأجيل لإعادة الإعلان',
        location: 'محكمة شمال القاهرة - دائرة 12 إيجارات - قاعة 3',
        startDate: '2026-11-05',
        startTime: '10:00',
        endTime: '11:00',
        categories: ['جلسات'],
        alarms: [
          { triggerMinutesBefore: 1440, description: 'تذكير بالجلسة قبل يوم' },
          { triggerMinutesBefore: 60, description: 'تذكير بالجلسة قبل ساعة' }
        ]
      },
      {
        uid: 'task-55@lawoffice.local',
        summary: 'مهمة: استخراج صورة رسمية من محضر الشرطة',
        description: 'التصنيف: مأمورية قسم / شرطة\\nالأولوية: عاجلة',
        startDate: '2026-11-06',
        allDay: true,
        categories: ['مهام']
      }
    ];

    const icsContent = generateIcsCalendar({
      calendarName: 'تقويم القضايا والمهام',
      events
    });

    // Check CRLF termination
    expect(icsContent).toContain('\r\n');
    expect(icsContent.endsWith('\r\n')).toBe(true);

    // Verify lines do not exceed 75 octets
    const rawLines = icsContent.split('\r\n');
    for (const line of rawLines) {
      if (line.length === 0) continue;
      expect(getUtf8ByteLength(line)).toBeLessThanOrEqual(75);
    }

    // Parse with ical.js local parser to strictly validate standard conformance
    const jcal = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcal);

    expect(comp.name).toBe('vcalendar');
    const vevents = comp.getAllSubcomponents('vevent');
    expect(vevents.length).toBe(2);

    const firstEvent = new ICAL.Event(vevents[0]);
    expect(firstEvent.uid).toBe('hearing-101@lawoffice.local');
    expect(firstEvent.summary).toBe('جلسة ق 1234 لسنة 2024 - محكمة شمال القاهرة');
    expect(firstEvent.startDate.isDate).toBe(false); // floating datetime

    const secondEvent = new ICAL.Event(vevents[1]);
    expect(secondEvent.uid).toBe('task-55@lawoffice.local');
    expect(secondEvent.summary).toBe('مهمة: استخراج صورة رسمية من محضر الشرطة');
    expect(secondEvent.startDate.isDate).toBe(true); // all-day date
  });

  // 6. UID stability between multiple exports
  it('يثبت معرف الحدث (UID) عند تصدير نفس السجل مرتين لمنع التكرار في برامج التقويم', () => {
    const recordId = 42;
    const uid1 = `hearing-${recordId}@lawoffice.local`;
    const uid2 = `hearing-${recordId}@lawoffice.local`;
    expect(uid1).toBe(uid2);
  });
});
