import { describe, it, expect } from 'vitest';
import {
  processHearingOutcome,
  calculateHearingStats,
  checkHearingConflicts,
} from '../../src/shared/hearingLogic';
import { Hearing } from '../../src/shared/types';

describe('Hearing Logic Unit Tests (الاختبارات الوحدوية لمنطق الجلسات)', () => {
  function makeHearing(
    id: number,
    date: string,
    court = 'محكمة شمال القاهرة الابتدائية',
    status: any = 'محددة',
    reason?: string
  ): Hearing {
    return {
      id,
      case_id: 10,
      hearing_date: date,
      court_name: court,
      court_circuit: 'الدائرة 4 مدني',
      court_hall: 'قاعة 2',
      status,
      adjournment_reason: reason,
      attended: 1,
      is_judgment_hearing: 0,
      created_at: '2026-01-01 10:00:00',
    };
  }

  describe('1. تسجيل نتيجة جلسة بتأجيل والتوليد التلقائي للجلسة القادمة', () => {
    it('يحدث الجلسة الحالية ويولد الجلسة القادمة بالبيانات الصحيحة وتتحول حالة القضية إلى متداولة', () => {
      const current = makeHearing(1, '2026-02-10');

      const outcome = {
        attended: 1,
        attended_by: 'أحمد المحامي',
        proceedings: 'حضر المدعي بوكيله وطلب التأجيل لتقديم أصل الإيصال',
        court_decision: 'قررت المحكمة التأجيل لجلسة 2026-03-15 لتقديم أصل السند العرفي',
        adjournment_reason: 'لتقديم أصل السند العرفي',
        adjournment_notes: 'التأكيد على استخراج صورة طبق الأصل',
        next_hearing_date: '2026-03-15',
        status: 'مؤجلة' as const,
      };

      const result = processHearingOutcome(current, outcome);

      // الجلسة الحالية
      expect(result.updatedHearing.status).toBe('مؤجلة');
      expect(result.updatedHearing.adjournment_reason).toBe('لتقديم أصل السند العرفي');
      expect(result.updatedHearing.next_hearing_date).toBe('2026-03-15');

      // الجلسة التالية المتولدة تلقائياً
      expect(result.nextHearing).toBeDefined();
      expect(result.nextHearing?.hearing_date).toBe('2026-03-15');
      expect(result.nextHearing?.court_name).toBe(current.court_name);
      expect(result.nextHearing?.court_circuit).toBe(current.court_circuit);
      expect(result.nextHearing?.requests).toBe('مطلوب: لتقديم أصل السند العرفي');
      expect(result.nextHearing?.notes).toBe('ملاحظات الجلسة السابقة: التأكيد على استخراج صورة طبق الأصل');

      // حالة القضية
      expect(result.newCaseStatus).toBe('متداولة');
    });
  });

  describe('2. إحصائيات الجلسات القضائية', () => {
    it('يحسب عدد التأجيلات، أكثر سبب تكراراً، ومتوسط الفترة بين الجلسات بدقة', () => {
      const hearings: Hearing[] = [
        makeHearing(1, '2026-01-01', undefined, 'مؤجلة', 'للمذكرات'),
        makeHearing(2, '2026-01-15', undefined, 'مؤجلة', 'لورود التقرير'),
        makeHearing(3, '2026-02-01', undefined, 'مؤجلة', 'للمذكرات'),
        makeHearing(4, '2026-02-15', undefined, 'مؤجلة', 'للمذكرات'),
        makeHearing(5, '2026-03-01', undefined, 'تمت', undefined),
      ];

      const stats = calculateHearingStats(hearings);

      expect(stats.total_hearings).toBe(5);
      expect(stats.postponement_count).toBe(4);
      expect(stats.most_frequent_reason).toBe('للمذكرات');
      expect(stats.most_frequent_reason_count).toBe(3);
      expect(stats.first_hearing_date).toBe('2026-01-01');
      expect(stats.last_hearing_date).toBe('2026-03-01');

      // الفترات: بين (1 و 2) = 14 يوماً، بين (2 و 3) = 17 يوماً، بين (3 و 4) = 14 يوماً، بين (4 و 5) = 14 يوماً
      // المجموع: 59 يوماً / 4 فترات = 14.75 -> 15 يوماً
      expect(stats.avg_days_between_hearings).toBe(15);
    });

    it('يتعامل مع قائمة جلسات فارغة أو جلسة واحدة فقط دون أخطاء حسابية', () => {
      const emptyStats = calculateHearingStats([]);
      expect(emptyStats.total_hearings).toBe(0);
      expect(emptyStats.avg_days_between_hearings).toBe(0);

      const single = [makeHearing(1, '2026-01-01')];
      const singleStats = calculateHearingStats(single);
      expect(singleStats.total_hearings).toBe(1);
      expect(singleStats.avg_days_between_hearings).toBe(0);
    });
  });

  describe('3. جلسات في الماضي، نفس اليوم والمحكمة، وتعديل التأجيل القديم', () => {
    it('يكتشف تعارض وجود جلستين في نفس المحكمة ونفس اليوم لتنبيه المحامي', () => {
      const existing = [
        makeHearing(1, '2026-02-20', 'محكمة شمال القاهرة الابتدائية'),
        makeHearing(2, '2026-02-20', 'محكمة جنوب الجيزة الابتدائية'),
      ];

      const checkSameCourt = checkHearingConflicts(existing, {
        hearing_date: '2026-02-20',
        court_name: 'محكمة شمال القاهرة الابتدائية',
      });
      expect(checkSameCourt.hasConflict).toBe(true);
      expect(checkSameCourt.conflicts.length).toBe(1);

      const checkDiffCourt = checkHearingConflicts(existing, {
        hearing_date: '2026-02-20',
        court_name: 'محكمة استئناف طنطا',
      });
      expect(checkDiffCourt.hasConflict).toBe(false);

      // استبعاد نفس الجلسة عند التعديل
      const checkSelf = checkHearingConflicts(existing, {
        id: 1,
        hearing_date: '2026-02-20',
        court_name: 'محكمة شمال القاهرة الابتدائية',
      });
      expect(checkSelf.hasConflict).toBe(false);
    });

    it('يسمح بتسجيل جلسات بتاريخ سابق (إدخال تاريخي قديم) دون حذف السجلات السابقة', () => {
      const pastHearing = makeHearing(1, '2025-05-10');
      const outcome = {
        attended: 1,
        court_decision: 'حكمت المحكمة بندب خبير',
        status: 'تمت' as const,
      };

      const result = processHearingOutcome(pastHearing, outcome);
      expect(result.updatedHearing.hearing_date).toBe('2025-05-10');
      expect(result.updatedHearing.court_decision).toBe('حكمت المحكمة بندب خبير');
      expect(result.nextHearing).toBeUndefined();
    });
  });

  describe('4. حالة "محجوز للحكم" وتاريخ النطق بالحكم', () => {
    it('يحول حالة القضية إلى "محجوزة للحكم" ويثبت تاريخ النطق بالحكم', () => {
      const current = makeHearing(5, '2026-04-10');

      const outcome = {
        attended: 1,
        proceedings: 'ترافع الحاضر وقدم مذكرة بدفاعه وصمم على الطلبات',
        court_decision: 'قررت المحكمة حجز الدعوى للحكم لجلسة 2026-05-20 مع التصريح بمذكرات في أسبوعين',
        status: 'محجوزة للحكم' as const,
        is_judgment_hearing: 1,
        judgment_date: '2026-05-20',
        judgment_text: 'قيد حجز الحكم',
      };

      const result = processHearingOutcome(current, outcome);

      expect(result.updatedHearing.status).toBe('محجوزة للحكم');
      expect(result.updatedHearing.is_judgment_hearing).toBe(1);
      expect(result.updatedHearing.judgment_date).toBe('2026-05-20');
      expect(result.newCaseStatus).toBe('محجوزة للحكم');
    });

    it('يحول حالة القضية إلى "محكوم فيها" عند صدور الحكم النهائي', () => {
      const current = makeHearing(6, '2026-05-20', undefined, 'محجوزة للحكم');

      const outcome = {
        attended: 1,
        court_decision: 'حكمت المحكمة بإلزام المدعى عليه بأن يؤدي للمدعي مبلغ مائة ألف جنيه والمصروفات ومقابل أتعاب المحاماة',
        status: 'صدر حكم' as const,
        is_judgment_hearing: 1,
        judgment_date: '2026-05-20',
        judgment_text: 'إلزام المدعى عليه بالمبلغ والمصاريف',
      };

      const result = processHearingOutcome(current, outcome);

      expect(result.updatedHearing.status).toBe('صدر حكم');
      expect(result.newCaseStatus).toBe('محكوم فيها');
    });

    it('يرمي خطأ عند استدعاء معالجة النتيجة بدون جلسة حالية', () => {
      expect(() => {
        processHearingOutcome(null as any, { court_decision: 'test', status: 'تمت', attended: 1 });
      }).toThrow('بيانات الجلسة الحالية غير متوفرة');
    });
  });
});
