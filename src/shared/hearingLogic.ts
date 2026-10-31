/**
 * hearingLogic.ts: منطق الجلسات والتأجيلات والإحصائيات القضائية
 * متوافق مع متطلبات RULES.md و TESTING_RULES.md:
 * - تسجيل نتائج الجلسات والتوليد التلقائي للجلسة القادمة.
 * - حساب إحصائيات الجلسات بدقة (عدد التأجيلات، أكثر سبب، متوسط الفترة).
 * - التعامل مع الجلسات السابقة ونفس اليوم وتعديل القرارات القديمة دون مسحها.
 * - دعم حالة "محجوز للحكم" وتاريخ النطق بالحكم.
 */

import { Hearing, CaseHearingStats, HearingStatus } from './types';

export interface HearingOutcomeInput {
  attended: number;
  attended_by?: string;
  proceedings?: string;
  court_decision: string;
  adjournment_reason?: string;
  adjournment_notes?: string;
  next_hearing_date?: string;
  status: HearingStatus;
  is_judgment_hearing?: number;
  judgment_date?: string;
  judgment_text?: string;
}

export interface ProcessOutcomeResult {
  updatedHearing: Hearing;
  nextHearing?: Omit<Hearing, 'id' | 'created_at' | 'updated_at'>;
  newCaseStatus: 'متداولة' | 'محجوزة للحكم' | 'محكوم فيها' | 'منتهية';
}

/**
 * معالجة نتيجة الجلسة والتوليد التلقائي للجلسة التالية وتحديث حالة القضية
 */
export function processHearingOutcome(
  current: Hearing,
  outcome: HearingOutcomeInput
): ProcessOutcomeResult {
  if (!current) {
    throw new Error('بيانات الجلسة الحالية غير متوفرة');
  }

  // 1. تحديث الجلسة الحالية
  const updatedHearing: Hearing = {
    ...current,
    attended: outcome.attended ? 1 : 0,
    attended_by: outcome.attended_by || undefined,
    proceedings: outcome.proceedings || undefined,
    court_decision: outcome.court_decision,
    adjournment_reason: outcome.adjournment_reason || undefined,
    adjournment_notes: outcome.adjournment_notes || undefined,
    next_hearing_date: outcome.next_hearing_date || undefined,
    status: outcome.status,
    is_judgment_hearing: outcome.is_judgment_hearing ? 1 : 0,
    judgment_date: outcome.judgment_date || undefined,
    judgment_text: outcome.judgment_text || undefined,
    updated_at: new Date().toISOString(),
  };

  // 2. تحديد حالة القضية التلقائية
  let newCaseStatus: 'متداولة' | 'محجوزة للحكم' | 'محكوم فيها' | 'منتهية' = 'متداولة';
  if (outcome.status === 'صدر حكم') {
    newCaseStatus = 'محكوم فيها';
  } else if (outcome.status === 'محجوزة للحكم' || outcome.is_judgment_hearing === 1) {
    newCaseStatus = 'محجوزة للحكم';
  } else if (outcome.status === 'مؤجلة' || (outcome.next_hearing_date && outcome.next_hearing_date.trim())) {
    newCaseStatus = 'متداولة';
  }

  // 3. التوليد التلقائي للجلسة القادمة إذا تم تحديد تاريخ لها
  let nextHearing: Omit<Hearing, 'id' | 'created_at' | 'updated_at'> | undefined;
  if (outcome.next_hearing_date && outcome.next_hearing_date.trim()) {
    const nextDate = outcome.next_hearing_date.trim();
    const requests = outcome.adjournment_reason ? `مطلوب: ${outcome.adjournment_reason}` : undefined;
    const notes = outcome.adjournment_notes ? `ملاحظات الجلسة السابقة: ${outcome.adjournment_notes}` : undefined;

    nextHearing = {
      case_id: current.case_id,
      hearing_date: nextDate,
      court_name: current.court_name,
      court_circuit: current.court_circuit,
      court_hall: current.court_hall,
      status: 'محددة',
      requests,
      notes,
      attended: 0,
      is_judgment_hearing: 0,
    };
  }

  return {
    updatedHearing,
    nextHearing,
    newCaseStatus,
  };
}

/**
 * حساب إحصائيات الجلسات الشاملة لقضية ما
 */
export function calculateHearingStats(hearings: Hearing[]): CaseHearingStats {
  if (!hearings || hearings.length === 0) {
    return {
      total_hearings: 0,
      postponement_count: 0,
      avg_days_between_hearings: 0,
    };
  }

  const total = hearings.length;

  // فرز الجلسات تصاعدياً بالموعد
  const sorted = [...hearings].sort((a, b) => {
    return new Date(a.hearing_date).getTime() - new Date(b.hearing_date).getTime();
  });

  const firstDate = sorted[0]?.hearing_date;
  const lastDate = sorted[sorted.length - 1]?.hearing_date;

  // حساب التأجيلات وأسبابها
  let postponementCount = 0;
  const reasonFrequency: Record<string, number> = {};

  for (const h of hearings) {
    const isPostponed =
      h.status === 'مؤجلة' ||
      Boolean(h.next_hearing_date && h.next_hearing_date.trim()) ||
      Boolean(h.adjournment_reason && h.adjournment_reason.trim());

    if (isPostponed) {
      postponementCount++;
    }

    if (h.adjournment_reason && h.adjournment_reason.trim()) {
      const reason = h.adjournment_reason.trim();
      reasonFrequency[reason] = (reasonFrequency[reason] || 0) + 1;
    }
  }

  // أكثر سبب تأجيل تكراراً
  let mostFrequentReason: string | undefined;
  let maxCount = 0;
  for (const [reason, count] of Object.entries(reasonFrequency)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentReason = reason;
    }
  }

  // حساب متوسط الفترة بين الجلسات بالأيام
  let avgDays = 0;
  if (sorted.length > 1) {
    let totalDiffDays = 0;
    let intervals = 0;
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1].hearing_date).getTime();
      const d2 = new Date(sorted[i].hearing_date).getTime();
      const diffDays = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        totalDiffDays += diffDays;
        intervals++;
      }
    }
    avgDays = intervals > 0 ? Math.round(totalDiffDays / intervals) : 0;
  }

  return {
    total_hearings: total,
    postponement_count: postponementCount,
    most_frequent_reason: mostFrequentReason,
    most_frequent_reason_count: maxCount,
    avg_days_between_hearings: avgDays,
    first_hearing_date: firstDate,
    last_hearing_date: lastDate,
  };
}

/**
 * فحص تعارض الجلسات في نفس اليوم ونفس المحكمة
 */
export function checkHearingConflicts(
  existingHearings: Hearing[],
  newHearing: { hearing_date: string; court_name: string; id?: number }
): { hasConflict: boolean; conflicts: Hearing[] } {
  const conflicts = existingHearings.filter(h => {
    if (newHearing.id && h.id === newHearing.id) return false;
    return (
      h.hearing_date === newHearing.hearing_date &&
      h.court_name.trim().toLowerCase() === newHearing.court_name.trim().toLowerCase()
    );
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
