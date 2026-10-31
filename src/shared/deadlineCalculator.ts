/**
 * deadlineCalculator.ts: حاسبة مواعيد الطعون والمدد القانونية
 * يخضع لقواعد RULES.md و TESTING_RULES.md:
 * - الحساب ديناميكيًا من القيم المحددة في الإعدادات (غير ثابت في الكود).
 * - التعامل مع العطلات الأسبوعية (الجمعة والسبت) والإجازات الرسمية المصرية (امتداد لأول يوم عمل).
 * - التعامل الدقيق مع بداية ونهاية الشهور، السنوات الكبيسة، وتغير السنوات.
 */

import { OfficeSettings } from './types';

export type WeekendBehavior = 'extend_to_next_workday' | 'exact' | 'preceding_workday';

export interface DeadlineCalculationOptions {
  baseDate: string; // YYYY-MM-DD (تاريخ الحكم أو تاريخ الإعلان)
  appealType:
    | 'مدني'
    | 'جنح'
    | 'نقض'
    | 'مستعجل'
    | 'أسرة'
    | 'إداري'
    | string;
  settings?: Partial<OfficeSettings>;
  customDays?: number;
  holidays?: string[]; // قائمة بتواريخ الإجازات الرسمية 'YYYY-MM-DD'
  weekendBehavior?: WeekendBehavior; // الافتراضي: امتداد لأول يوم عمل
}

export interface DeadlineCalculationResult {
  baseDate: string;
  allowedDays: number;
  exactTargetDate: string; // التاريخ المجرد قبل فحص العطلات
  finalDeadlineDate: string; // التاريخ النهائي بعد تطبيق العطلات
  isExtended: boolean;
  extendedDaysCount: number;
  extensionReason?: string;
  isHolidayOrWeekend: boolean;
}

/**
 * الحصول على عدد الأيام المقررة للطعن من الإعدادات
 */
export function getAllowedDaysFromSettings(
  appealType: string,
  settings?: Partial<OfficeSettings>
): number {
  const normType = appealType.trim();

  if (normType.includes('جنح')) {
    return settings?.appeal_deadline_misdemeanor !== undefined
      ? settings.appeal_deadline_misdemeanor
      : 10;
  }
  if (normType.includes('نقض')) {
    return settings?.appeal_deadline_cassation !== undefined
      ? settings.appeal_deadline_cassation
      : 60;
  }
  if (normType.includes('مستعجل')) {
    return settings?.appeal_deadline_urgent !== undefined
      ? settings.appeal_deadline_urgent
      : 15;
  }
  if (normType.includes('أسرة')) {
    return settings?.appeal_deadline_family !== undefined
      ? settings.appeal_deadline_family
      : 40;
  }
  if (normType.includes('إداري')) {
    return settings?.appeal_deadline_admin !== undefined
      ? settings.appeal_deadline_admin
      : 60;
  }

  // الافتراضي المدني
  return settings?.appeal_deadline_civil !== undefined
    ? settings.appeal_deadline_civil
    : 40;
}

/**
 * فحص ما إذا كان التاريخ عطلة أسبوعية (الجمعة 5 أو السبت 6)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6; // 5 = الجمعة, 6 = السبت
}

/**
 * فحص ما إذا كان التاريخ إجازة رسمية محددة
 */
export function isOfficialHoliday(dateStr: string, holidays: string[] = []): boolean {
  return holidays.includes(dateStr);
}

/**
 * تنسيق التاريخ إلى YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * حساب ميعاد الطعن النهائي بدقة
 */
export function calculateAppealDeadline(
  options: DeadlineCalculationOptions
): DeadlineCalculationResult {
  if (!options.baseDate) {
    throw new Error('تاريخ الأساس (الحكم أو الإعلان) مطلوب');
  }

  // 1. تحديد عدد الأيام من الإعدادات أو القيمة المخصصة
  const allowedDays =
    options.customDays !== undefined
      ? options.customDays
      : getAllowedDaysFromSettings(options.appealType, options.settings);

  // 2. إضافة الأيام على التاريخ الأساسي (مع مراعاة الشهور والكبيسة)
  // ملاحظة: قاعدة المواعيد القضائية في القانون المصري (المادة 15 مرافعات):
  // "لا يحسب منها يوم الإعلان أو الإجراء، وينقضي الميعاد بانقضاء اليوم الأخير منه"
  const [y, m, d] = options.baseDate.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  targetDate.setDate(targetDate.getDate() + allowedDays);

  const exactTargetDate = formatDate(targetDate);
  const weekendBehavior = options.weekendBehavior || 'extend_to_next_workday';
  const holidays = options.holidays || [];

  let finalDate = new Date(targetDate);
  let isExtended = false;
  let extensionReason: string | undefined;
  const wasWeekendOrHoliday = isWeekend(targetDate) || isOfficialHoliday(exactTargetDate, holidays);

  // 3. تطبيق سلوك العطلات والإجازات
  if (weekendBehavior === 'extend_to_next_workday') {
    while (isWeekend(finalDate) || isOfficialHoliday(formatDate(finalDate), holidays)) {
      isExtended = true;
      if (isWeekend(finalDate)) {
        extensionReason = 'عطلة نهاية الأسبوع (الجمعة/السبت)';
      } else {
        extensionReason = 'إجازة رسمية مصرح بها';
      }
      finalDate.setDate(finalDate.getDate() + 1);
    }
  } else if (weekendBehavior === 'preceding_workday') {
    while (isWeekend(finalDate) || isOfficialHoliday(formatDate(finalDate), holidays)) {
      isExtended = true;
      extensionReason = 'تقديم لآخر يوم عمل سابق';
      finalDate.setDate(finalDate.getDate() - 1);
    }
  }

  const finalDeadlineDate = formatDate(finalDate);
  const extendedDaysCount = Math.round(
    (finalDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    baseDate: options.baseDate,
    allowedDays,
    exactTargetDate,
    finalDeadlineDate,
    isExtended,
    extendedDaysCount,
    extensionReason,
    isHolidayOrWeekend: wasWeekendOrHoliday,
  };
}
