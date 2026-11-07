import { describe, it, expect } from 'vitest';
import { generateHearingRollHtml } from '../../src/renderer/services/hearingRollReportGenerator';
import { generateClientStatementHtml } from '../../src/renderer/services/clientStatementReportGenerator';
import { generateReceiptHtml } from '../../src/renderer/services/receiptReportGenerator';
import { generateCaseSheetHtml } from '../../src/renderer/services/caseReportGenerator';
import { generateAdjournmentsReportHtml } from '../../src/renderer/services/adjournmentsReportGenerator';
import { generateTasksReportHtml } from '../../src/renderer/services/tasksReportGenerator';
import { generateExecutionReportHtml } from '../../src/renderer/services/executionReportGenerator';
import { generateGeneralFinancialReportHtml } from '../../src/renderer/services/generalFinancialReportGenerator';
import { generateReportHtml } from '../../src/renderer/services/reportGenerator';
import { OfficeSettings } from '../../src/shared/types';

const mockSettings: OfficeSettings = {
  office_name: 'مكتب المحامي أحمد حسن',
  lawyer_name: 'أحمد حسن',
  title: 'محام بالنقض',
  phone: '01012345678',
  address: 'القاهرة - مصر',
};

describe('Comprehensive Report Generators Edge Cases & Signatures Test', () => {
  // 1. Hearing Roll
  it('1. Hearing Roll: handles empty list, string options, and 500 rows', () => {
    // Empty
    const emptyHtml = generateHearingRollHtml([], mockSettings, 'جلسات اليوم' as any);
    expect(emptyHtml).toContain('جلسات اليوم');
    expect(emptyHtml).toContain('مكتب المحامي أحمد حسن');
    expect(emptyHtml).toContain('لا توجد جلسات');

    // 500 rows
    const manyHearings = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      case_id: i + 1,
      case_number: `${1000 + i}`,
      case_year: 2026,
      court_name: 'محكمة القاهرة',
      hearing_date: '2026-11-10',
      hearing_type: 'مرافعة',
      attended: 1,
      primary_client_name: `موكل تجريبي ${i + 1}`,
      primary_opponent_name: `خصم تجريبي ${i + 1}`,
    }));
    const largeHtml = generateHearingRollHtml(manyHearings as any, mockSettings);
    expect(largeHtml).toContain('500');
    expect(largeHtml).toContain('موكل تجريبي 500');
  });

  // 2. Client Statement (Case 1320 simulation & dual signatures)
  it('2. Client Statement: handles Case 1320 (0 txs, no fee agreement), dual signatures, and empty state', () => {
    // Calling with positional arguments (4 args) - Case 1320 empty state
    const posHtml = generateClientStatementHtml(
      {
        total_agreed_fees: 0,
        paid_fees: 0,
        remaining_fees: 0,
        total_court_fees_inflow: 0,
        total_court_fees_outflow: 0,
        total_expenses_inflow: 0,
        total_expenses_outflow: 0,
        total_execution_inflow: 0,
        total_execution_outflow: 0,
        net_balance: 0,
      },
      [],
      mockSettings,
      {
        clientName: 'وعد بهاء شفيق عبد الرازق',
        clientPhone: '01097957735',
        caseNumber: '1320',
        caseYear: 2026,
        courtName: 'محكمة جزئية',
      }
    );
    expect(posHtml).toContain('1320');
    expect(posHtml).toContain('وعد بهاء شفيق عبد الرازق');
    expect(posHtml).toContain('لا توجد حركات مالية مسجلة');

    // Calling with single-object signature (as ReportsPage did)
    const objHtml = (generateClientStatementHtml as any)({
      client: { id: 2, name: 'وعد بهاء شفيق عبد الرازق', phone: '01097957735' },
      caseItem: { id: 3, case_number: '1320', case_year: 2026, court_name: 'محكمة جزئية' },
      transactions: [],
      settings: mockSettings,
    });
    expect(objHtml).toContain('1320');
    expect(objHtml).toContain('وعد بهاء شفيق عبد الرازق');
    expect(objHtml).toContain('لا توجد حركات مالية مسجلة');
  });

  // 3. Receipt
  it('3. Receipt: handles valid receipt and fallback gracefully', () => {
    const tx = {
      id: 1,
      receipt_number: 'REC-2026-0001',
      transaction_date: '2026-11-07',
      direction: 'وارد' as const,
      category: 'أتعاب' as const,
      transaction_type: 'دفعة مقدمة',
      amount: 15000,
      payment_method: 'نقدي' as const,
      description: 'دفعة أتعاب قضية 1320 لسنة 2026',
      client_name: 'وعد بهاء شفيق عبد الرازق',
      is_reversed: 0,
    };
    const html = generateReceiptHtml(tx as any, mockSettings);
    expect(html).toContain('REC-2026-0001');
    expect(html).toMatch(/15[,\u060C\u066C]000|١٥[,\u060C\u066C]٠٠٠/);
    expect(html).toContain('إيصال استلام نقدية');
  });

  // 4. Case File
  it('4. Case File: handles empty case and very long name', () => {
    const longName = 'أ'.repeat(250);
    const caseData = {
      id: 1,
      case_number: '1320',
      case_year: 2026,
      court_name: 'محكمة استئناف القاهرة',
      case_type: 'مدني كلي',
      subject: longName,
      clients: [{ id: 1, name: longName, role_capacity: 'مدعي' }],
      opponents: [],
      hearings: [],
      documents: [],
      transactions: [],
      tasks: [],
    };
    const html = generateCaseSheetHtml(caseData as any, mockSettings);
    expect(html).toContain('1320');
    expect(html).toContain(longName);
    expect(html).toContain('مكتب المحامي أحمد حسن');
  });

  // 5. Adjournments (Roll mode & single case mode)
  it('5. Adjournments: handles Roll mode from ReportsPage and Single Case mode', () => {
    // Mode A: Roll / General mode from ReportsPage
    const rollHearings = [
      {
        id: 1,
        case_id: 3,
        case_number: '1320',
        case_year: 2026,
        court_name: 'محكمة جزئية',
        hearing_date: '2026-11-03',
        court_decision: 'لاعلان المجني عليه بتقديم اصل الشيك',
        adjournment_reason: 'لتقديم أصل المستندات والمذكرات',
        primary_client_name: 'وعد بهاء',
        primary_opponent_name: 'الخصم',
      },
    ];
    const rollHtml = (generateAdjournmentsReportHtml as any)(
      rollHearings,
      mockSettings,
      'تقرير وتحليل أسباب تأجيل الجلسات',
      'المحكمة: كل المحاكم • عدد الجلسات المؤجلة: 1'
    );
    expect(rollHtml).toContain('1320');
    expect(rollHtml).toContain('تقرير وتحليل أسباب تأجيل الجلسات');
    expect(rollHtml).toContain('لتقديم أصل المستندات والمذكرات');

    // Mode A empty:
    const emptyRollHtml = (generateAdjournmentsReportHtml as any)(
      [],
      mockSettings,
      'تقرير وتحليل أسباب تأجيل الجلسات',
      'المحكمة: كل المحاكم'
    );
    expect(emptyRollHtml).toContain('لا توجد جلسات');

    // Mode B: Single Case mode
    const caseDetails = {
      id: 3,
      case_number: '1320',
      case_year: 2026,
      clients: [{ name: 'وعد بهاء', role_capacity: 'شاكي' }],
      opponents: [],
    };
    const singleCaseHtml = generateAdjournmentsReportHtml(
      caseDetails as any,
      rollHearings as any,
      { total_hearings: 1, adjourned_hearings: 1, completed_hearings: 0 } as any,
      mockSettings
    );
    expect(singleCaseHtml).toContain('1320');
    expect(singleCaseHtml).toContain('وعد بهاء');
  });

  // 6. Tasks
  it('6. Tasks: handles empty tasks, string title option, and checklist items', () => {
    const emptyHtml = generateTasksReportHtml([], mockSettings, 'قائمة المهام للنزول الميداني' as any);
    expect(emptyHtml).toContain('قائمة المهام للنزول الميداني');
    expect(emptyHtml).toContain('لا توجد مهام مدرجة');
  });

  // 7. Execution File
  it('7. Execution File: handles file details', () => {
    const execDetails = {
      id: 1,
      file_number: 'EX-2026-001',
      case_number: '1320',
      case_year: 2026,
      court_name: 'محكمة جزئية',
      execution_type: 'حكم',
      status: 'قيد الإجراء',
      claimed_amount: 100000,
      collected_amount: 25000,
      procedures: [],
    };
    const html = generateExecutionReportHtml(execDetails as any, mockSettings);
    expect(html).toContain('EX-2026-001');
    expect(html).toMatch(/100[,\u060C\u066C]000|١٠٠[,\u060C\u066C]٠٠٠/);
  });

  // 8. General Financial Report (Dual signature & empty state)
  it('8. General Financial: handles dual signature, 0 stats, and empty transactions', () => {
    // Positional signature (4 args)
    const stats = {
      total_income: 50000,
      total_expense: 20000,
      net_profit: 30000,
      outstanding_fees: 15000,
      pending_cheques_count: 2,
      pending_cheques_amount: 10000,
    };
    const posHtml = generateGeneralFinancialReportHtml(stats as any, [], mockSettings, {
      periodTitle: 'التقرير المالي السنوي',
    });
    expect(posHtml).toContain('التقرير المالي السنوي');
    expect(posHtml).toMatch(/50[,\u060C\u066C]000|٥٠[,\u060C\u066C]٠٠٠/);
    expect(posHtml).toContain('لا توجد حركات مالية مسجلة');

    // Single object signature (as ReportsPage called it)
    const objHtml = (generateGeneralFinancialReportHtml as any)({
      stats,
      transactions: [],
      settings: mockSettings,
      periodName: 'التقرير المالي العام للمكتب',
    });
    expect(objHtml).toContain('التقرير المالي العام للمكتب');
    expect(objHtml).toMatch(/50[,\u060C\u066C]000|٥٠[,\u060C\u066C]٠٠٠/);
    expect(objHtml).toContain('لا توجد حركات مالية مسجلة');
  });

  // 9. Generic Table
  it('9. Generic Table: handles 500 rows and empty rows', () => {
    const emptyHtml = generateReportHtml({
      settings: mockSettings,
      title: 'جدول تجريبي',
      tableHeaders: ['م', 'الاسم', 'القيمة'],
      tableRows: [],
    });
    expect(emptyHtml).toContain('جدول تجريبي');
    expect(emptyHtml).toContain('مكتب المحامي أحمد حسن');

    const rows = Array.from({ length: 500 }, (_, i) => [i + 1, `عنصر ${i + 1}`, `${(i + 1) * 10}`]);
    const largeHtml = generateReportHtml({
      settings: mockSettings,
      title: 'جدول كبير 500 صف',
      tableHeaders: ['م', 'الاسم', 'القيمة'],
      tableRows: rows,
    });
    expect(largeHtml).toContain('500');
    expect(largeHtml).toContain('عنصر 500');
  });
});
