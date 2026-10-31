import { describe, it, expect } from 'vitest';
import {
  calculateNextTaskRecurrence,
  isTaskOverdue,
  calculateChecklistProgress,
  generateTasksFromTemplate,
  addDaysToDate,
} from '../../src/shared/taskLogic';
import { TaskTemplateItem } from '../../src/shared/types';

describe('Task Logic Unit Tests (منطق المهام والتكرار والقوالب وقوائم الفحص)', () => {
  describe('1. تكرار المهام (يومي، أسبوعي، شهري، مخصص)', () => {
    it('يحسب تاريخ التكرار اليومي (+1 يوم)', () => {
      const next = calculateNextTaskRecurrence('2026-03-01', 'يومي');
      expect(next).toBe('2026-03-02');
    });

    it('يحسب تاريخ التكرار الأسبوعي (+7 أيام)', () => {
      const next = calculateNextTaskRecurrence('2026-03-01', 'أسبوعي');
      expect(next).toBe('2026-03-08');
    });

    it('يحسب تاريخ التكرار الشهري (+30 يوماً)', () => {
      const next = calculateNextTaskRecurrence('2026-03-01', 'شهري');
      expect(next).toBe('2026-03-31');
    });

    it('يحسب تاريخ التكرار المخصص بعدد أيام محدد', () => {
      const next = calculateNextTaskRecurrence('2026-03-01', 'مخصص', 14);
      expect(next).toBe('2026-03-15');
    });

    it('يرفض التكرار المخصص إذا كانت القيمة سالبة أو صفراً', () => {
      expect(() => calculateNextTaskRecurrence('2026-03-01', 'مخصص', 0)).toThrow();
      expect(() => calculateNextTaskRecurrence('2026-03-01', 'مخصص', -5)).toThrow();
    });

    it('يعيد نفس التاريخ إذا كانت المهمة غير متكررة', () => {
      const next = calculateNextTaskRecurrence('2026-03-01', 'لا يتكرر');
      expect(next).toBe('2026-03-01');
    });
  });

  describe('2. حساب المهمة المتأخرة (Overdue)', () => {
    it('تعتبر المهمة متأخرة إذا تجاوز تاريخ استحقاقها اليوم الحالي ولم تكن منتهية أو ملغاة', () => {
      const refDate = '2026-03-10';

      // تاريخ سابق وحالة جديدة -> متأخرة
      expect(isTaskOverdue('2026-03-05', 'جديدة', refDate)).toBe(true);
      expect(isTaskOverdue('2026-03-05', 'قيد التنفيذ', refDate)).toBe(true);

      // تاريخ اليوم أو قادم -> ليست متأخرة
      expect(isTaskOverdue('2026-03-10', 'جديدة', refDate)).toBe(false);
      expect(isTaskOverdue('2026-03-15', 'جديدة', refDate)).toBe(false);

      // حتى لو كان تاريخها سابق، إذا كانت منتهية أو ملغاة -> ليست متأخرة
      expect(isTaskOverdue('2026-03-01', 'منتهية', refDate)).toBe(false);
      expect(isTaskOverdue('2026-03-01', 'ملغاة', refDate)).toBe(false);
    });
  });

  describe('3. قوائم الفحص (Checklist) وحساب نسب الإنجاز', () => {
    it('يحسب نسبة الإنجاز وعدد البنود المنجزة بدقة', () => {
      const items = [
        { is_completed: 1 },
        { is_completed: 0 },
        { is_completed: 1 },
        { is_completed: 0 },
      ];

      const progress = calculateChecklistProgress(items);
      expect(progress.total).toBe(4);
      expect(progress.completed).toBe(2);
      expect(progress.percentage).toBe(50);
    });

    it('يعيد 100% إذا كانت جميع البنود مكتملة أو القائمة فارغة', () => {
      expect(calculateChecklistProgress([]).percentage).toBe(100);

      const allDone = [{ is_completed: 1 }, { is_completed: 1 }];
      expect(calculateChecklistProgress(allDone).percentage).toBe(100);
      expect(calculateChecklistProgress(allDone).completed).toBe(2);
    });
  });

  describe('4. قوالب المهام وتوليد المهام الصحيحة', () => {
    it('يولد المهام بإزاحات الأيام وقوائم الفحص التابعة لها بدقة', () => {
      const templateItems: TaskTemplateItem[] = [
        {
          id: 1,
          template_id: 1,
          title: 'إيداع صحيفة الدعوى وسداد الرسوم',
          category: 'مأمورية محكمة',
          priority: 'عاجلة',
          days_offset: 0,
          checklist_items: 'سحب دمغة المحاماة\nسداد الرسوم بالخزينة\nتأشير الجدول',
          sort_order: 1,
        },
        {
          id: 2,
          template_id: 1,
          title: 'تسليم صحيفة الدعوى لقلم المحضرين للإعلان',
          category: 'إعلان ومحضرين',
          priority: 'مهمة',
          days_offset: 3,
          checklist_items: 'التسليم للمحضر المختص\nاستلام أصل الصحيفة معلنة',
          sort_order: 2,
        },
      ];

      const baseDate = '2026-04-01';
      const tasks = generateTasksFromTemplate(templateItems, baseDate);

      expect(tasks.length).toBe(2);

      // المهمة الأولى: في نفس اليوم (offset = 0)
      expect(tasks[0].title).toBe('إيداع صحيفة الدعوى وسداد الرسوم');
      expect(tasks[0].dueDate).toBe('2026-04-01');
      expect(tasks[0].priority).toBe('عاجلة');
      expect(tasks[0].checklistTitles).toEqual([
        'سحب دمغة المحاماة',
        'سداد الرسوم بالخزينة',
        'تأشير الجدول',
      ]);

      // المهمة الثانية: بعد 3 أيام (offset = 3)
      expect(tasks[1].title).toBe('تسليم صحيفة الدعوى لقلم المحضرين للإعلان');
      expect(tasks[1].dueDate).toBe('2026-04-04');
      expect(tasks[1].priority).toBe('مهمة');
      expect(tasks[1].checklistTitles).toEqual([
        'التسليم للمحضر المختص',
        'استلام أصل الصحيفة معلنة',
      ]);

      // قائمة قوالب فارغة
      expect(generateTasksFromTemplate([], '2026-04-01')).toEqual([]);
    });
  });
});
