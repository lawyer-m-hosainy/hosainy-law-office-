import { describe, it, expect } from 'vitest';
import {
  roundCurrency,
  toPiasters,
  fromPiasters,
  validateTransactionAmount,
  calculateFinancialSummary,
  calculateStatementForPeriod,
  prepareReversalEntry,
} from '../../src/shared/financialLogic';
import { FinancialTransaction } from '../../src/shared/types';

describe('Financial Logic Unit Tests (الاختبارات الوحدوية للمنطق المالي)', () => {
  // Helper to create sample transactions
  function makeTx(
    id: number,
    category: 'أتعاب' | 'رسوم قضائية' | 'مصاريف' | 'تنفيذ',
    direction: 'وارد' | 'صادر',
    amount: number,
    date = '2026-02-15',
    isReversed = false
  ): FinancialTransaction {
    return {
      id,
      receipt_number: `REC-2026-${String(id).padStart(4, '0')}`,
      case_id: 1,
      client_id: 1,
      transaction_date: date,
      category,
      transaction_type: `سداد ${category}`,
      direction,
      amount,
      payment_method: 'نقدي',
      description: `حركة ${category} بمبلغ ${amount}`,
      is_reversed: isReversed ? 1 : 0,
      created_at: `${date} 10:00:00`,
    };
  }

  describe('1. جمع الفئات الأربعة كل نوع لوحده ومع بعض', () => {
    it('يحسب الأتعاب والرسوم والمصاريف ومصاريف التنفيذ مفرقة ومجتمعة بدقة', () => {
      const transactions: FinancialTransaction[] = [
        makeTx(1, 'أتعاب', 'وارد', 10000),
        makeTx(2, 'أتعاب', 'وارد', 5000),
        makeTx(3, 'رسوم قضائية', 'وارد', 2000),
        makeTx(4, 'رسوم قضائية', 'صادر', 1500),
        makeTx(5, 'مصاريف', 'وارد', 1000),
        makeTx(6, 'مصاريف', 'صادر', 800),
        makeTx(7, 'تنفيذ', 'وارد', 4000),
        makeTx(8, 'تنفيذ', 'صادر', 3500),
      ];

      const summary = calculateFinancialSummary(20000, transactions);

      // كل فئة لوحدها
      expect(summary.paid_fees).toBe(15000);
      expect(summary.remaining_fees).toBe(5000);
      expect(summary.total_court_fees_inflow).toBe(2000);
      expect(summary.total_court_fees_outflow).toBe(1500);
      expect(summary.total_expenses_inflow).toBe(1000);
      expect(summary.total_expenses_outflow).toBe(800);
      expect(summary.total_execution_inflow).toBe(4000);
      expect(summary.total_execution_outflow).toBe(3500);

      // مجتمعة
      expect(summary.total_inflow).toBe(22000); // 15000 + 2000 + 1000 + 4000
      expect(summary.total_outflow).toBe(5800);  // 1500 + 800 + 3500
    });
  });

  describe('2. المتفق والمدفوع والمتبقي ورصيد الموكل (له / عليه)', () => {
    it('يحسب رصيد الموكل إذا كان مديناً للمكتب (عليه)', () => {
      // الاتفاق 30,000 ج. دفع 10,000 ج فقط، والمكتب صرف رسوم 3,000 ج
      // المطلوب: 30,000 + 3,000 = 33,000 ج
      // المقبوض: 10,000 ج
      // الرصيد: 10,000 - 33,000 = -23,000 ج (عليه)
      const transactions = [
        makeTx(1, 'أتعاب', 'وارد', 10000),
        makeTx(2, 'رسوم قضائية', 'صادر', 3000),
      ];

      const summary = calculateFinancialSummary(30000, transactions);
      expect(summary.total_agreed_fees).toBe(30000);
      expect(summary.paid_fees).toBe(10000);
      expect(summary.remaining_fees).toBe(20000);
      expect(summary.net_balance).toBe(-23000);
    });

    it('يحسب رصيد الموكل إذا كان دائناً للمكتب (له أمانة)', () => {
      // الاتفاق 10,000 ج. دفع أتعاب 10,000 ج + أودع أمانة مصاريف 5,000 ج.
      // المكتب صرف 2,000 ج فقط رسوم.
      // المطلوب: 10,000 + 2,000 = 12,000 ج
      // المقبوض: 10,000 + 5,000 = 15,000 ج
      // الرصيد: 15,000 - 12,000 = +3,000 ج (له)
      const transactions = [
        makeTx(1, 'أتعاب', 'وارد', 10000),
        makeTx(2, 'مصاريف', 'وارد', 5000),
        makeTx(3, 'مصاريف', 'صادر', 2000),
      ];

      const summary = calculateFinancialSummary(10000, transactions);
      expect(summary.paid_fees).toBe(10000);
      expect(summary.remaining_fees).toBe(0);
      expect(summary.net_balance).toBe(3000);
    });
  });

  describe('3. إلغاء حركة بقيد عكسي', () => {
    it('يعيد الرصيد إلى حالته السابقة تماماً مع بقاء الحركة الأصلية في السجل', () => {
      const originalTx = makeTx(1, 'أتعاب', 'وارد', 5000);

      // الرصيد قبل الإلغاء
      const summaryBefore = calculateFinancialSummary(10000, [originalTx]);
      expect(summaryBefore.paid_fees).toBe(5000);
      expect(summaryBefore.remaining_fees).toBe(5000);

      // إنشاء القيد العكسي
      const { reversalTransaction, originalUpdates } = prepareReversalEntry(
        originalTx,
        'خطأ في تسجيل الإيصال مرتين',
        'REV-2026-0001'
      );

      expect(reversalTransaction.direction).toBe('صادر');
      expect(reversalTransaction.amount).toBe(5000);
      expect(reversalTransaction.reversal_of_id).toBe(1);
      expect(originalUpdates.is_reversed).toBe(1);
      expect(originalUpdates.reversal_reason).toBe('خطأ في تسجيل الإيصال مرتين');

      // عند استبعاد الحركة الملغاة، يعود الرصيد
      const updatedOriginal: FinancialTransaction = {
        ...originalTx,
        is_reversed: 1,
        reversal_reason: originalUpdates.reversal_reason,
      };

      const summaryAfter = calculateFinancialSummary(10000, [updatedOriginal]);
      expect(summaryAfter.paid_fees).toBe(0);
      expect(summaryAfter.remaining_fees).toBe(10000);
      // التأكد من أن السجل الأصلي لم يتم حذفه بل يحمل صفة is_reversed = 1
      expect(updatedOriginal.id).toBe(1);
      expect(updatedOriginal.is_reversed).toBe(1);
    });

    it('يرفض إلغاء حركة ملغاة مسبقاً بقيد عكسي آخر', () => {
      const reversedTx = makeTx(1, 'أتعاب', 'وارد', 5000, '2026-02-15', true);
      expect(() => {
        prepareReversalEntry(reversedTx, 'محاولة ثانية', 'REV-002');
      }).toThrow('هذه الحركة تم إلغاؤها بقيد عكسي مسبقاً');
    });
  });

  describe('4. دفعات أكبر من المتفق، دفعات صفرية وسالبة، وتقريب القروش', () => {
    it('يتعامل مع دفعات أكبر من المتفق عليها دون أخطاء ويثبت المتبقي عند صفر', () => {
      // الاتفاق 10,000 ج والموكل سدد 12,000 ج
      const tx = [makeTx(1, 'أتعاب', 'وارد', 12000)];
      const summary = calculateFinancialSummary(10000, tx);

      expect(summary.paid_fees).toBe(12000);
      expect(summary.remaining_fees).toBe(0); // لا يصبح سالباً
      expect(summary.net_balance).toBe(2000);  // رصيد دائن للموكل
    });

    it('يرفض المبالغ الصفرية والسالبة وغير الرقمية', () => {
      expect(() => validateTransactionAmount(0)).toThrow('المبلغ يجب أن يكون قيمة موجبة أكبر من الصفر');
      expect(() => validateTransactionAmount(-500)).toThrow('المبلغ يجب أن يكون قيمة موجبة أكبر من الصفر');
      expect(() => validateTransactionAmount('abc')).toThrow('قيمة المبلغ غير صالحة');
      expect(() => validateTransactionAmount(NaN)).toThrow('قيمة المبلغ غير صالحة');
    });

    it('يقبل المبالغ الموجبة ويقرب القروش بدقة', () => {
      expect(validateTransactionAmount(150.256)).toBe(150.26);
      expect(validateTransactionAmount('100.50')).toBe(100.50);
      expect(toPiasters(123.45)).toBe(12345);
      expect(fromPiasters(12345)).toBe(123.45);
      expect(roundCurrency(10.1234)).toBe(10.12);

      // تغطية الحالات الحدية (Non-numbers)
      expect(roundCurrency(null as any)).toBe(0);
      expect(roundCurrency(NaN)).toBe(0);
      expect(toPiasters(null as any)).toBe(0);
      expect(toPiasters(NaN)).toBe(0);
      expect(fromPiasters(null as any)).toBe(0);
      expect(fromPiasters(NaN)).toBe(0);
    });
  });

  describe('5. كشف الحساب لفترة مع الرصيد الافتتاحي والختامي', () => {
    it('يحسب الرصيد الافتتاحي والحركات والختامي بدقة مطابقة للقواعد', () => {
      const allTx: FinancialTransaction[] = [
        // حركات قبل 2026-02-01 (تدخل في الرصيد الافتتاحي)
        makeTx(1, 'أتعاب', 'وارد', 5000, '2026-01-10'),
        makeTx(2, 'رسوم قضائية', 'صادر', 1200, '2026-01-20'),
        // حركات داخل الفترة من 2026-02-01 إلى 2026-02-28
        makeTx(3, 'أتعاب', 'وارد', 3000, '2026-02-05'),
        makeTx(4, 'مصاريف', 'صادر', 500, '2026-02-15'),
        makeTx(5, 'تنفيذ', 'وارد', 2000, '2026-02-25'),
        // حركة بعد الفترة
        makeTx(6, 'أتعاب', 'وارد', 4000, '2026-03-05'),
      ];

      const statement = calculateStatementForPeriod(allTx, {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        initialBalance: 0,
      });

      // الرصيد الافتتاحي = وارد (5000) - صادر (1200) = 3800 ج
      expect(statement.openingBalance).toBe(3800);

      // حركات الفترة
      expect(statement.transactions.length).toBe(3);
      expect(statement.transactions.map(t => t.id)).toEqual([3, 4, 5]);

      // إجمالي وارد الفترة = 3000 + 2000 = 5000 ج
      expect(statement.periodInflow).toBe(5000);
      // إجمالي صادر الفترة = 500 ج
      expect(statement.periodOutflow).toBe(500);

      // الرصيد الختامي = 3800 + 5000 - 500 = 8300 ج
      expect(statement.closingBalance).toBe(8300);
    });

    it('يحسب كشف الحساب لكافة الحركات عند عدم تمرير تواريخ محددة', () => {
      const allTx = [
        makeTx(1, 'أتعاب', 'وارد', 2000, '2026-01-01'),
        makeTx(2, 'مصاريف', 'صادر', 500, '2026-01-02'),
      ];
      const stmt = calculateStatementForPeriod(allTx);
      expect(stmt.openingBalance).toBe(0);
      expect(stmt.periodInflow).toBe(2000);
      expect(stmt.periodOutflow).toBe(500);
      expect(stmt.closingBalance).toBe(1500);

      // تغطية الحالات الفارغة
      const emptyStmt = calculateStatementForPeriod([]);
      expect(emptyStmt.closingBalance).toBe(0);
    });
  });
});
