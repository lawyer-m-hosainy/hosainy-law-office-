/**
 * taskLogic.ts: منطق المهام والمأموريات، التكرار، القوالب، وقوائم الفحص
 * متوافق مع متطلبات RULES.md و TESTING_RULES.md:
 * - حساب تواريخ التكرار (يومي، أسبوعي، شهري، مخصص).
 * - توليد المهام من القوالب بإزاحات الأيام وقوائم الفحص.
 * - حساب حالة التأخير والتقدم في الـ Checklist.
 */

import { Task, TaskRecurrence, TaskStatus, TaskTemplateItem } from './types';

/**
 * إضافة عدد محدد من الأيام لتاريخ محدد بصيغة YYYY-MM-DD
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * حساب تاريخ الاستحقاق التالي للمهمة المتكررة
 */
export function calculateNextTaskRecurrence(
  currentDueDate: string,
  recurrence: TaskRecurrence,
  customInterval?: number | null
): string {
  if (recurrence === 'لا يتكرر') {
    return currentDueDate;
  }

  if (recurrence === 'يومي') {
    return addDaysToDate(currentDueDate, 1);
  }

  if (recurrence === 'أسبوعي') {
    return addDaysToDate(currentDueDate, 7);
  }

  if (recurrence === 'شهري') {
    return addDaysToDate(currentDueDate, 30);
  }

  if (recurrence === 'مخصص') {
    const interval = Number(customInterval);
    if (!interval || interval <= 0) {
      throw new Error('الفاصل الزمني المخصص يجب أن يكون رقماً أكبر من الصفر');
    }
    return addDaysToDate(currentDueDate, interval);
  }

  return currentDueDate;
}

/**
 * فحص ما إذا كانت المهمة متأخرة
 */
export function isTaskOverdue(
  dueDate: string,
  status: TaskStatus,
  referenceDate?: string
): boolean {
  if (status === 'منتهية' || status === 'ملغاة') {
    return false;
  }
  const ref = referenceDate || new Date().toISOString().split('T')[0];
  return dueDate < ref;
}

/**
 * حساب نسبة الإنجاز والتقدم في قائمة الفحص (Checklist)
 */
export function calculateChecklistProgress(
  items: { is_completed: number | boolean }[]
): { total: number; completed: number; percentage: number } {
  if (!items || items.length === 0) {
    return { total: 0, completed: 0, percentage: 100 };
  }
  const total = items.length;
  const completed = items.filter(i => Boolean(i.is_completed)).length;
  const percentage = Math.round((completed / total) * 100);
  return { total, completed, percentage };
}

export interface GeneratedTaskFromTemplate {
  title: string;
  category: any;
  priority: any;
  dueDate: string;
  estimatedDuration?: string;
  checklistTitles: string[];
}

/**
 * توليد المهام وقوائم الفحص من قالب مهام معتمد
 */
export function generateTasksFromTemplate(
  items: TaskTemplateItem[],
  baseDate: string
): GeneratedTaskFromTemplate[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map(item => {
    const dueDate = addDaysToDate(baseDate, item.days_offset || 0);
    const checklistTitles: string[] = [];

    if (item.checklist_items && item.checklist_items.trim()) {
      const lines = item.checklist_items
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      checklistTitles.push(...lines);
    }

    return {
      title: item.title,
      category: item.category,
      priority: item.priority,
      dueDate,
      estimatedDuration: item.estimated_duration || undefined,
      checklistTitles,
    };
  });
}
