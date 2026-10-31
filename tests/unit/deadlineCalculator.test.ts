import { describe, it, expect } from 'vitest';
import {
  calculateAppealDeadline,
  getAllowedDaysFromSettings,
  isWeekend,
} from '../../src/shared/deadlineCalculator';
import { OfficeSettings } from '../../src/shared/types';

describe('Deadline Calculator Unit Tests (حاسبة المواعيد القانونية والطعون)', () => {
  const baseSettings: Partial<OfficeSettings> = {
    appeal_deadline_civil: 40,
    appeal_deadline_misdemeanor: 10,
    appeal_deadline_cassation: 60,
    appeal_deadline_urgent: 15,
    appeal_deadline_family: 40,
    appeal_deadline_admin: 60,
  };

  describe('1. الحساب من الإعدادات وليس من الكود الثابت', () => {
    it('يتغير الميعاد فوراً عند تغيير القيمة في الإعدادات', () => {
      // 1. القيمة العادية: 40 يوماً
      const result1 = calculateAppealDeadline({
        baseDate: '2026-03-01',
        appealType: 'مدني',
        settings: baseSettings,
        weekendBehavior: 'exact', // لا نريد تمديد عطلات لهذا الاختبار للتحقق من الأيام المجردة
      });
      expect(result1.allowedDays).toBe(40);
      expect(result1.finalDeadlineDate).toBe('2026-04-10');

      // 2. تغيير الإعدادات إلى 45 يوماً
      const modifiedSettings: Partial<OfficeSettings> = {
        ...baseSettings,
        appeal_deadline_civil: 45,
      };

      const result2 = calculateAppealDeadline({
        baseDate: '2026-03-01',
        appealType: 'مدني',
        settings: modifiedSettings,
        weekendBehavior: 'exact',
      });
      expect(result2.allowedDays).toBe(45);
      expect(result2.finalDeadlineDate).toBe('2026-04-15');
      // التأكد من أن النتيجة تغيرت تماماً
      expect(result2.finalDeadlineDate).not.toBe(result1.finalDeadlineDate);
    });

    it('يقرأ مدد الجنح والنقض والمستعجل والأسرة من الإعدادات بدقة', () => {
      expect(getAllowedDaysFromSettings('جنح', baseSettings)).toBe(10);
      expect(getAllowedDaysFromSettings('طعن بالنقض', baseSettings)).toBe(60);
      expect(getAllowedDaysFromSettings('استئناف مستعجل', baseSettings)).toBe(15);
      expect(getAllowedDaysFromSettings('استئناف أسرة', baseSettings)).toBe(40);
      expect(getAllowedDaysFromSettings('طعن أمام الإدارية العليا', baseSettings)).toBe(60);
    });
  });

  describe('2. وقوع الميعاد في عطلة أسبوعية (جمعة/سبت) أو إجازة رسمية', () => {
    it('يمتد الميعاد تلقائياً إلى أول يوم عمل (الأحد) إذا وافق الجمعة أو السبت', () => {
      // لنفترض تاريخ أساس بحيث يكون اليوم الأخير يوم جمعة
      // 2026-05-01 هو يوم جمعة (5)
      // 2026-05-02 هو يوم سبت (6)
      // 2026-05-03 هو يوم أحد (يوم عمل 0)
      const res = calculateAppealDeadline({
        baseDate: '2026-04-21', // إضافة 10 أيام جنح -> 2026-05-01 (جمعة)
        appealType: 'جنح',
        settings: baseSettings,
        weekendBehavior: 'extend_to_next_workday',
      });

      expect(res.exactTargetDate).toBe('2026-05-01'); // وافق يوم جمعة
      expect(res.isExtended).toBe(true);
      expect(res.finalDeadlineDate).toBe('2026-05-03'); // امتد إلى الأحد
      expect(res.extendedDaysCount).toBe(2);
    });

    it('يمتد الميعاد إذا صادف اليوم الأخير إجازة رسمية محددة', () => {
      // 2026-04-25 عيد تحرير سيناء (إجازة رسمية)
      const holidays = ['2026-04-25', '2026-04-26']; // إجازة تمتد ليومين

      const res = calculateAppealDeadline({
        baseDate: '2026-04-15', // + 10 أيام -> 2026-04-25
        appealType: 'جنح',
        settings: baseSettings,
        holidays,
        weekendBehavior: 'extend_to_next_workday',
      });

      expect(res.exactTargetDate).toBe('2026-04-25');
      expect(res.isExtended).toBe(true);
      // يمتد بعد 26 إلى 27
      expect(res.finalDeadlineDate).toBe('2026-04-27');
    });

    it('ينفذ السلوك المحدد في الخيارات بدقة (مثل عدم الامتداد لو اختار exact)', () => {
      const res = calculateAppealDeadline({
        baseDate: '2026-04-21',
        appealType: 'جنح',
        settings: baseSettings,
        weekendBehavior: 'exact',
      });

      expect(res.finalDeadlineDate).toBe('2026-05-01');
      expect(res.isExtended).toBe(false);
    });

    it('ينفذ سلوك التقديم لآخر يوم عمل سابق (preceding_workday)', () => {
      const res = calculateAppealDeadline({
        baseDate: '2026-04-21',
        appealType: 'جنح',
        settings: baseSettings,
        weekendBehavior: 'preceding_workday',
      });

      // 2026-05-01 (جمعة) -> يرجع إلى 2026-04-30 (خميس)
      expect(res.finalDeadlineDate).toBe('2026-04-30');
      expect(res.isExtended).toBe(true);
      expect(res.extensionReason).toBe('تقديم لآخر يوم عمل سابق');
    });

    it('يرمي خطأ إذا لم يتم تمرير تاريخ الأساس', () => {
      expect(() => {
        calculateAppealDeadline({ baseDate: '', appealType: 'مدني' });
      }).toThrow('تاريخ الأساس (الحكم أو الإعلان) مطلوب');
    });

    it('يستخدم القيم الافتراضية إذا لم يتم تمرير الإعدادات', () => {
      const resCivil = calculateAppealDeadline({ baseDate: '2026-01-01', appealType: 'مدني' });
      expect(resCivil.allowedDays).toBe(40);
      const resCassation = calculateAppealDeadline({ baseDate: '2026-01-01', appealType: 'نقض' });
      expect(resCassation.allowedDays).toBe(60);
      const resUrgent = calculateAppealDeadline({ baseDate: '2026-01-01', appealType: 'مستعجل' });
      expect(resUrgent.allowedDays).toBe(15);
      const resFamily = calculateAppealDeadline({ baseDate: '2026-01-01', appealType: 'أسرة' });
      expect(resFamily.allowedDays).toBe(40);
      const resAdmin = calculateAppealDeadline({ baseDate: '2026-01-01', appealType: 'إداري' });
      expect(resAdmin.allowedDays).toBe(60);
    });
  });

  describe('3. أول الشهر وآخره، السنوات الكبيسة، وتغير السنة', () => {
    it('يتعامل بدقة مع السنة الكبيسة وشهر فبراير (29 يوماً)', () => {
      // سنة 2024 سنة كبيسة (فبراير 29 يوم)
      // الحكم صدر 2024-02-20، استئناف جنح 10 أيام:
      // 20 + 10 = 30 -> 1 مارس 2024
      const leapResult = calculateAppealDeadline({
        baseDate: '2024-02-20',
        appealType: 'جنح',
        settings: baseSettings,
        weekendBehavior: 'exact',
      });
      expect(leapResult.finalDeadlineDate).toBe('2024-03-01');

      // سنة 2025 سنة بسيطة (فبراير 28 يوم)
      // الحكم صدر 2025-02-20، استئناف جنح 10 أيام -> 2 مارس 2025
      const nonLeapResult = calculateAppealDeadline({
        baseDate: '2025-02-20',
        appealType: 'جنح',
        settings: baseSettings,
        weekendBehavior: 'exact',
      });
      expect(nonLeapResult.finalDeadlineDate).toBe('2025-03-02');
    });

    it('يتعامل بدقة مع تغير السنة عند العبور من ديسمبر إلى يناير', () => {
      // حكم صدر في 2025-12-25 وميعاد النقض 60 يوماً
      // 25 ديسمبر 2025 + 60 يوماً = 23 فبراير 2026
      const yearChangeResult = calculateAppealDeadline({
        baseDate: '2025-12-25',
        appealType: 'نقض',
        settings: baseSettings,
        weekendBehavior: 'exact',
      });

      expect(yearChangeResult.finalDeadlineDate).toBe('2026-02-23');
    });

    it('يتعامل مع أول الشهر وآخر الشهر بدقة', () => {
      // صدر الحكم 2026-01-31، ميعاد 10 أيام -> 2026-02-10
      const endOfMonth = calculateAppealDeadline({
        baseDate: '2026-01-31',
        appealType: 'جنح',
        settings: baseSettings,
        weekendBehavior: 'exact',
      });
      expect(endOfMonth.finalDeadlineDate).toBe('2026-02-10');

      // صدر الحكم 2026-01-01، ميعاد 10 أيام -> 2026-01-11
      const startOfMonth = calculateAppealDeadline({
        baseDate: '2026-01-01',
        appealType: 'جنح',
        settings: baseSettings,
        weekendBehavior: 'exact',
      });
      expect(startOfMonth.finalDeadlineDate).toBe('2026-01-11');
    });
  });
});
