/**
 * financialLogic.ts: منطق الحسابات المالية والقيود العكسية وكشوف الحسابات
 * يخضع لقواعد RULES.md و TESTING_RULES.md:
 * - حسابات الأتعاب والرسوم والمصاريف والتنفيذ مفرقة ومجتمعة.
 * - دقة القروش، منع القيم السالبة والصفرية.
 * - إلغاء الحركات بالقيود العكسية مع الاحتفاظ بالسجل الأصلي.
 * - كشف الحساب الدوري بالأرصدة الافتتاحية والختامية.
 */

import { FinancialTransaction, CaseFinancialSummary } from './types';

/**
 * تقريب المبالغ لأقرب قرشين (خانتين عشريتين)
 */
export function roundCurrency(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * تحويل الجنيه إلى قروش (أعداد صحيحة لتفادي مشاكل الفاصلة العائمة)
 */
export function toPiasters(pounds: number): number {
  if (typeof pounds !== 'number' || isNaN(pounds)) return 0;
  return Math.round(pounds * 100);
}

/**
 * تحويل القروش إلى جنيهات
 */
export function fromPiasters(piasters: number): number {
  if (typeof piasters !== 'number' || isNaN(piasters)) return 0;
  return roundCurrency(piasters / 100);
}

/**
 * التحقق من صحة مبلغ الحركة المالية
 * يرفض الصفر والقيم السالبة وغير الرقمية
 */
export function validateTransactionAmount(amount: any): number {
  const num = Number(amount);
  if (typeof num !== 'number' || isNaN(num)) {
    throw new Error('قيمة المبلغ غير صالحة');
  }
  if (num <= 0) {
    throw new Error('المبلغ يجب أن يكون قيمة موجبة أكبر من الصفر');
  }
  return roundCurrency(num);
}

/**
 * ملخص الموقف المالي للقضية (حسب فئات RULES.md الأربعة)
 */
export function calculateFinancialSummary(
  totalAgreedFees: number,
  transactions: FinancialTransaction[]
): CaseFinancialSummary {
  const safeAgreedFees = Math.max(0, roundCurrency(Number(totalAgreedFees) || 0));

  // استبعاد الحركات الملغاة بقيد عكسي
  const activeTx = (transactions || []).filter(t => !t.is_reversed);

  let paidFeesPiasters = 0;
  let courtInPiasters = 0;
  let courtOutPiasters = 0;
  let expInPiasters = 0;
  let expOutPiasters = 0;
  let execInPiasters = 0;
  let execOutPiasters = 0;
  let totalInPiasters = 0;
  let totalOutPiasters = 0;

  for (const t of activeTx) {
    const piasters = toPiasters(t.amount);
    if (t.direction === 'وارد') {
      totalInPiasters += piasters;
      if (t.category === 'أتعاب') paidFeesPiasters += piasters;
      else if (t.category === 'رسوم قضائية') courtInPiasters += piasters;
      else if (t.category === 'مصاريف') expInPiasters += piasters;
      else if (t.category === 'تنفيذ') execInPiasters += piasters;
    } else if (t.direction === 'صادر') {
      totalOutPiasters += piasters;
      if (t.category === 'رسوم قضائية') courtOutPiasters += piasters;
      else if (t.category === 'مصاريف') expOutPiasters += piasters;
      else if (t.category === 'تنفيذ') execOutPiasters += piasters;
    }
  }

  const agreedPiasters = toPiasters(safeAgreedFees);
  // المتبقي من الأتعاب لا يقل عن صفر حتى لو دفع الموكل أكثر من المتفق عليه
  const remainingPiasters = Math.max(0, agreedPiasters - paidFeesPiasters);

  // المصاريف الفعلية المنصرفة من المكتب (رسوم + مصاريف + مصاريف تنفيذ)
  const actualCostsSpentPiasters = courtOutPiasters + expOutPiasters + execOutPiasters;
  // إجمالي المطلوب من الموكل = الأتعاب المتفق عليها + المصروفات الفعلية
  const totalDemandedPiasters = agreedPiasters + actualCostsSpentPiasters;
  // صافي رصيد الموكل = المقبوض منه (وارد) - المطلوب منه
  // موجب = له رصيد دائن | سالب = عليه رصيد مدين للمكتب
  const netBalancePiasters = totalInPiasters - totalDemandedPiasters;

  return {
    total_agreed_fees: fromPiasters(agreedPiasters),
    paid_fees: fromPiasters(paidFeesPiasters),
    remaining_fees: fromPiasters(remainingPiasters),
    total_court_fees_inflow: fromPiasters(courtInPiasters),
    total_court_fees_outflow: fromPiasters(courtOutPiasters),
    total_expenses_inflow: fromPiasters(expInPiasters),
    total_expenses_outflow: fromPiasters(expOutPiasters),
    total_execution_inflow: fromPiasters(execInPiasters),
    total_execution_outflow: fromPiasters(execOutPiasters),
    total_inflow: fromPiasters(totalInPiasters),
    total_outflow: fromPiasters(totalOutPiasters),
    net_balance: fromPiasters(netBalancePiasters),
  };
}

export interface StatementPeriodResult {
  openingBalance: number;
  periodInflow: number;
  periodOutflow: number;
  closingBalance: number;
  transactions: FinancialTransaction[];
}

/**
 * حساب كشف الحساب لفترة مع الرصيد الافتتاحي والختامي
 */
export function calculateStatementForPeriod(
  transactions: FinancialTransaction[],
  options: {
    startDate?: string;
    endDate?: string;
    initialBalance?: number;
  } = {}
): StatementPeriodResult {
  const activeTx = (transactions || []).filter(t => !t.is_reversed);
  const initialPiasters = toPiasters(options.initialBalance || 0);

  let openingPiasters = initialPiasters;
  let periodInPiasters = 0;
  let periodOutPiasters = 0;
  const periodTx: FinancialTransaction[] = [];

  // ترتيب الحركات زمنيًا
  const sorted = [...activeTx].sort((a, b) => {
    const diff = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
    return diff !== 0 ? diff : (a.id || 0) - (b.id || 0);
  });

  for (const t of sorted) {
    const piasters = toPiasters(t.amount);
    const dateStr = t.transaction_date.split('T')[0];

    if (options.startDate && dateStr < options.startDate) {
      // قبل بداية الفترة يضاف للرصيد الافتتاحي
      if (t.direction === 'وارد') {
        openingPiasters += piasters;
      } else {
        openingPiasters -= piasters;
      }
    } else if (!options.endDate || dateStr <= options.endDate) {
      // داخل الفترة
      periodTx.push(t);
      if (t.direction === 'وارد') {
        periodInPiasters += piasters;
      } else {
        periodOutPiasters += piasters;
      }
    }
  }

  const closingPiasters = openingPiasters + periodInPiasters - periodOutPiasters;

  return {
    openingBalance: fromPiasters(openingPiasters),
    periodInflow: fromPiasters(periodInPiasters),
    periodOutflow: fromPiasters(periodOutPiasters),
    closingBalance: fromPiasters(closingPiasters),
    transactions: periodTx,
  };
}

/**
 * إنشاء بيانات القيد العكسي لإلغاء حركة مالية
 * مع الحفاظ على الحركة الأصلية مسجلة ومرئية في النظام
 */
export function prepareReversalEntry(
  original: FinancialTransaction,
  reason: string,
  reversalReceiptNumber: string,
  reversalDate?: string
): {
  reversalTransaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>;
  originalUpdates: {
    is_reversed: number;
    reversal_reason: string;
  };
} {
  if (original.is_reversed) {
    throw new Error('هذه الحركة تم إلغاؤها بقيد عكسي مسبقاً');
  }

  const invertedDirection: 'وارد' | 'صادر' = original.direction === 'وارد' ? 'صادر' : 'وارد';
  const todayStr = reversalDate || new Date().toISOString().split('T')[0];

  const reversalTransaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'> = {
    receipt_number: reversalReceiptNumber,
    case_id: original.case_id,
    client_id: original.client_id,
    execution_id: original.execution_id,
    hearing_id: original.hearing_id,
    installment_id: original.installment_id,
    transaction_date: todayStr,
    category: original.category,
    transaction_type: `قيد عكسي - ${original.transaction_type}`,
    direction: invertedDirection,
    amount: original.amount,
    payment_method: original.payment_method,
    description: `قيد عكسي لإلغاء الإيصال رقم ${original.receipt_number} — السبب: ${reason}`,
    notes: `قيد تسوية عكسي للإيصال ${original.receipt_number}`,
    is_reversed: 0,
    reversal_of_id: original.id,
  };

  const originalUpdates = {
    is_reversed: 1,
    reversal_reason: reason,
  };

  return {
    reversalTransaction,
    originalUpdates,
  };
}
