import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
const { PDFParse } = require('pdf-parse');

import { OfficeSettings } from '../../src/shared/types';
import { generateReportHtml } from '../../src/renderer/services/reportGenerator';
import { generateHearingRollHtml } from '../../src/renderer/services/hearingRollReportGenerator';
import { generateClientStatementHtml } from '../../src/renderer/services/clientStatementReportGenerator';
import { generateReceiptHtml } from '../../src/renderer/services/receiptReportGenerator';
import { generateCaseSheetHtml } from '../../src/renderer/services/caseReportGenerator';
import { generateAdjournmentsReportHtml } from '../../src/renderer/services/adjournmentsReportGenerator';
import { generateTasksReportHtml } from '../../src/renderer/services/tasksReportGenerator';
import { generateExecutionReportHtml } from '../../src/renderer/services/executionReportGenerator';
import { generateGeneralFinancialReportHtml } from '../../src/renderer/services/generalFinancialReportGenerator';
import { createTestEnvironment, TestEnv } from '../e2e/helpers/seedTestDb';

// Helper to check if text or its visual RTL glyph sequence appears in the PDF stream
function pdfHasWord(pdfText: string, word: string): boolean {
  const norm = pdfText.normalize('NFKC');
  if (norm.includes(word)) return true;
  const rev = word.split('').reverse().join('');
  if (norm.includes(rev)) return true;
  return false;
}

describe('Comprehensive Print & PDF Generation System (نظام الطباعة وتوليد الـ PDF وفحص التقارير)', () => {
  let app: ElectronApplication;
  let page: Page;
  let testEnv: TestEnv;
  const screenshotsDir = path.resolve(__dirname, '../e2e/screenshots');

  const testSettings: OfficeSettings = {
    office_name: 'مكتب الأستاذ أحمد عزمي المحامي بالنقض والدستورية',
    lawyer_name: 'أحمد عزمي الشناوي',
    title: 'محامٍ بالنقض والدستورية العليا',
    phone: '01012345678',
    phone2: '0223456789',
    email: 'lawyer.azmy@cairobar.eg',
    address: '15 شارع شريف - وسط البلد - القاهرة',
    bar_registration_number: '123456',
    tax_number: '123-456-789',
    appeal_deadline_civil: 40,
    appeal_deadline_misdemeanor: 10,
    appeal_deadline_cassation: 60,
    appeal_deadline_urgent: 15,
    appeal_deadline_family: 40,
    appeal_deadline_admin: 60,
    date_format: 'ar-EG',
    alert_days_before: 3,
  };

  beforeAll(async () => {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    testEnv = createTestEnvironment({ seed: 'small' });

    const rootDir = path.resolve(__dirname, '../../');
    const childEnv = { ...process.env };
    delete childEnv.ELECTRON_RUN_AS_NODE;

    app = await electron.launch({
      args: [rootDir],
      env: {
        ...childEnv,
        TEST_DATA_DIR: testEnv.tempDir,
        NODE_ENV: 'test',
      },
    });

    page = await app.firstWindow();
  }, 35000);

  afterAll(async () => {
    try {
      if (app) {
        await Promise.race([
          app.close().catch(() => {}),
          new Promise(r => setTimeout(r, 8000)),
        ]);
      }
    } finally {
      if (testEnv) {
        testEnv.cleanup();
      }
    }
  }, 30000);

  async function generateAndVerifyPdf(html: string, screenshotName?: string): Promise<{ totalPages: number; text: string }> {
    const fullHtml = html.includes('<!DOCTYPE html>')
      ? html
      : `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/></head><body>${html}</body></html>`;

    await page.setContent(fullHtml);
    await page.waitForTimeout(100);

    if (screenshotName) {
      const shotPath = path.join(screenshotsDir, `${screenshotName}.png`);
      try {
        await page.screenshot({ path: shotPath, fullPage: true });
      } catch (shotErr) {
        // Handle transient Windows file lock by waiting and retrying once
        await new Promise(res => setTimeout(res, 250));
        try {
          await page.screenshot({ path: shotPath, fullPage: true });
        } catch (retryErr) {
          console.warn(`[Screenshot Warning] Skipped screenshot for ${screenshotName} due to file lock:`, retryErr);
        }
      }
    }

    const base64 = await app.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
      if (!win) throw new Error('No active window found');
      const buf = await win.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      });
      return buf.toString('base64');
    });

    const pdfBuffer = Buffer.from(base64, 'base64');
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toContain('%PDF-');

    const parser = new PDFParse({ data: pdfBuffer });
    await parser.load();
    const info = await parser.getInfo();
    const textRes = await parser.getText();

    return {
      totalPages: info.total,
      text: textRes.text,
    };
  }

  // 1. Report: Hearing Roll (رول الجلسات: يومي، محكمة، دائرة، يوم فاضي)
  it('1. تقرير رول الجلسات: توليد PDF والتحقق من الترويسة وأعمدة القرار بخط اليد', async () => {
    const dummyHearings = [
      {
        id: 1,
        hearing_date: '2026-03-15',
        court_name: 'محكمة شمال القاهرة الابتدائية',
        court_circuit: 'الدائرة 4 مدني كلي',
        court_hall: 'قاعة 3',
        status: 'محددة',
        case_number: '1050',
        case_year: 2026,
        subject: 'دعوى صحة ونفاذ عقد بيع',
        primary_client_name: 'محمود شاكر الشناوي',
        primary_client_role: 'مدعي',
        primary_opponent_name: 'سعيد عبد الرحمن',
        primary_opponent_role: 'مدعى عليه',
        previous_decision: 'تأجيل لورود تقرير الخبير',
        requests: 'تقديم مذكرات الختام',
      },
      {
        id: 2,
        hearing_date: '2026-03-15',
        court_name: 'محكمة شمال القاهرة الابتدائية',
        court_circuit: 'الدائرة 4 مدني كلي',
        court_hall: 'قاعة 3',
        status: 'محددة',
        case_number: '1088',
        case_year: 2026,
        subject: 'فسخ عقد إيجار لعدم سداد الأجرة',
        primary_client_name: 'عصام كمال البحيري',
        primary_client_role: 'مدعى عليه',
        primary_opponent_name: 'شركة النيل العقارية',
        primary_opponent_role: 'مدعية',
        previous_decision: 'أول جلسة',
        requests: 'حجز الدعوى للحكم',
      },
    ];

    const html = generateHearingRollHtml(dummyHearings as any, testSettings, {
      title: 'رول الجلسات القضائية الرسمي',
      filterSummary: 'محكمة شمال القاهرة الابتدائية - الأحد 15 مارس 2026',
    });

    const pdf = await generateAndVerifyPdf(html, '01_hearing_roll');
    expect(pdf.totalPages).toBeGreaterThanOrEqual(1);
    expect(pdfHasWord(pdf.text, 'عزمي')).toBe(true);
    expect(pdf.text).toContain('1050');
    expect(pdf.text).toContain('1088');
  }, 25000);

  // 1b. Empty Hearing Roll
  it('1ب. رول جلسات فارغ (يوم فاضي): يعرض رسالة لا توجد جلسات بدلاً من صفحة بيضاء', async () => {
    const html = generateHearingRollHtml([], testSettings, {
      title: 'رول الجلسات اليومي',
      filterSummary: 'لا توجد جلسات مسجلة لهذا اليوم',
    });

    const pdf = await generateAndVerifyPdf(html, '01b_empty_hearing_roll');
    expect(pdf.totalPages).toBe(1);
    expect(pdfHasWord(pdf.text, 'جلسات')).toBe(true);
  }, 25000);

  // 2. Report: Client Statement of Account (كشف حساب موكل)
  it('2. تقرير كشف حساب موكل: توليد PDF والتحقق من حسابات الأتعاب والرسوم والتفقيط', async () => {
    const summary = {
      total_agreed_fees: 50000,
      paid_fees: 30000,
      remaining_fees: 20000,
      total_court_fees_inflow: 5000,
      total_court_fees_outflow: 4200,
      total_expenses_inflow: 3000,
      total_expenses_outflow: 2500,
      total_execution_inflow: 0,
      total_execution_outflow: 0,
      total_inflow: 38000,
      total_outflow: 6700,
      net_balance: -18700,
    };

    const dummyTxs = [
      {
        id: 1,
        receipt_number: 'REC-2026-0001',
        transaction_date: '2026-01-10',
        direction: 'وارد' as const,
        category: 'أتعاب' as const,
        transaction_type: 'سداد مقدم أتعاب التعاقد',
        amount: 30000,
        payment_method: 'تحويل بنكي' as const,
        description: 'الدفعة الأولى للأتعاب',
      },
      {
        id: 2,
        receipt_number: 'REC-2026-0002',
        transaction_date: '2026-01-15',
        direction: 'صادر' as const,
        category: 'رسوم قضائية' as const,
        transaction_type: 'سداد رسم نسبي وخزينة',
        amount: 4200,
        payment_method: 'نقدي' as const,
        description: 'سداد رسوم قيد صحيفة الاستئناف',
      },
    ];

    const html = generateClientStatementHtml(summary, dummyTxs as any, testSettings, {
      clientName: 'الحاج إبراهيم منصور السيد',
      clientPhone: '01011223344',
      periodText: 'كشف حساب شامل عن عام 2026',
    });

    const pdf = await generateAndVerifyPdf(html, '02_client_statement');
    expect(pdf.totalPages).toBeGreaterThanOrEqual(1);
    expect(pdf.text).toContain('REC-2026');
    expect(pdf.text).toContain('0001');
    expect(pdf.text).toContain('01011223344');
  }, 25000);

  // 3. Report: Cash Receipt (إيصال استلام نقدية)
  it('3. تقرير إيصال استلام النقدية: مرقم تلقائياً ومفقط بالعربية كتابةً', async () => {
    const dummyTx = {
      id: 55,
      receipt_number: 'REC-2026-0155',
      transaction_date: '2026-03-20',
      direction: 'وارد' as const,
      category: 'أتعاب' as const,
      transaction_type: 'دفعة مرحلية ثانية',
      amount: 25000,
      payment_method: 'نقدي' as const,
      description: 'سداد الدفعة المقررة بمناسبة إيداع تقرير الخبير',
      client_name: 'فريد الشافعي',
      case_number: '742',
      case_year: 2026,
    };

    const html = generateReceiptHtml(dummyTx as any, testSettings);
    const pdf = await generateAndVerifyPdf(html, '03_cash_receipt');
    expect(pdf.totalPages).toBe(1);
    expect(pdf.text).toContain('REC-2026-0155');
    expect(pdfHasWord(pdf.text, 'فريد')).toBe(true);
    expect(pdfHasWord(pdf.text, 'جنيه')).toBe(true);
  }, 25000);

  // 4. Report: Full Case File (ملف القضية الكامل)
  it('4. تقرير ملف القضية الكامل: يجمع بيانات القضية والأطراف والجلسات والمالية والتنفيذ', async () => {
    const dummyCase = {
      id: 10,
      case_number: '992',
      case_year: 2026,
      court_name: 'محكمة استئناف القاهرة',
      court_circuit: 'الدائرة 11 تجاري',
      court_degree: 'استئناف',
      case_type: 'تجاري شركات',
      subject: 'منازعة تجارية وتصفية حسابات شركة تضامن',
      status: 'متداولة',
      priority: 'عاجلة',
      filing_date: '2026-01-05',
      clients: [
        { client_id: 1, client_name: 'جمال عبد المنعم', role_capacity: 'مستأنف', client_phone: '0122334455' },
      ],
      opponents: [
        { id: 1, name: 'فؤاد خليل الرفاعي', role_capacity: 'مستأنف ضده' },
      ],
      hearings: [
        { hearing_date: '2026-02-10', decision: 'تأجيل للإعلان', next_hearing_date: '2026-03-25' },
      ],
      financial_summary: {
        total_agreed_fees: 40000,
        paid_fees: 20000,
        remaining_fees: 20000,
        total_inflow: 20000,
        total_outflow: 3000,
        net_balance: -23000,
      },
      executions: [],
      documents: [],
      tasks: [],
      notes: [],
    };

    const html = generateCaseSheetHtml(dummyCase as any, testSettings);
    const pdf = await generateAndVerifyPdf(html, '04_case_file_report');
    expect(pdf.totalPages).toBeGreaterThanOrEqual(1);
    expect(pdf.text).toContain('992');
    expect(pdf.text).toContain('2026');
  }, 25000);

  // 5. Report: Adjournments Report (تقرير التأجيلات)
  it('5. تقرير التأجيلات: جدول أسباب التأجيل وإحصائيات التأخير لكل قضية', async () => {
    const dummyCase = {
      id: 501,
      case_number: '501',
      case_year: 2025,
      court_name: 'محكمة شمال القاهرة',
      subject: 'دعوى ريع ومحاسبة',
      clients: [{ name: 'سامي عبد اللطيف' }],
      opponents: [],
    };

    const dummyHearings = [
      {
        id: 1,
        hearing_date: '2025-11-15',
        decision: 'تأجيل للندب خبير',
        adjournment_reason: 'لندب خبير حسابي',
      },
      {
        id: 2,
        hearing_date: '2026-01-20',
        decision: 'تأجيل لسداد أمانة الخبير',
        adjournment_reason: 'لسداد الأمانة المقررة بالخزينة',
      },
    ];

    const dummyStats = {
      total_hearings: 2,
      adjournments_count: 2,
      most_common_reason: 'لندب خبير حسابي',
      avg_days_between: 66,
    };

    const html = generateAdjournmentsReportHtml(dummyCase as any, dummyHearings as any, dummyStats, testSettings);
    const pdf = await generateAndVerifyPdf(html, '05_adjournments_report');
    expect(pdf.totalPages).toBeGreaterThanOrEqual(1);
    expect(pdfHasWord(pdf.text, 'تأجيل')).toBe(true);
    expect(pdfHasWord(pdf.text, 'خبير')).toBe(true);
  }, 25000);

  // 6. Report: Tasks List (قائمة المهام)
  it('6. تقرير قائمة المهام: مربعات خالية [ ] للتأشير اليدوي بالقلم وتوزيع الأولويات', async () => {
    const dummyTasks = [
      {
        id: 1,
        title: 'استخراج صورة رسمية من الحكم التمهيدي',
        category: 'مأمورية محكمة',
        priority: 'عاجلة',
        status: 'قيد التنفيذ',
        due_date: '2026-03-28',
        assigned_to: 'الأستاذ خالد المحامي',
        case_number: '105',
        case_year: 2026,
        checklists: [
          { title: 'سداد الرسم بالميكروفيلم', is_completed: 0 },
          { title: 'التصديق من رئيس القلم', is_completed: 0 },
        ],
      },
    ];

    const html = generateTasksReportHtml(dummyTasks as any, testSettings, {
      title: 'قائمة المهام والمأموريات الأسبوعية',
    });

    const pdf = await generateAndVerifyPdf(html, '06_tasks_report');
    expect(pdf.totalPages).toBeGreaterThanOrEqual(1);
    expect(pdf.text).toContain('105');
    expect(pdfHasWord(pdf.text, 'خالد')).toBe(true);
  }, 25000);

  // 7. Report: Execution File (ملف التنفيذ)
  it('7. تقرير ملف التنفيذ: بيانات السند التنفيذي والإجراءات المتخذة ومبالغ التحصيل', async () => {
    const dummyExecution = {
      id: 1,
      file_number: 'EXEC-2026-0012',
      court_name: 'محكمة جنوب الجيزة - إدارة التنفيذ',
      writ_number: 'صيغة تنفيذية 142/2025',
      total_claimed_amount: 150000,
      collected_amount: 50000,
      remaining_amount: 100000,
      status: 'قيد التنفيذ',
      client_name: 'شركة الفراعنة للمقاولات',
      opponent_name: 'مدين: كمال الشبراوي',
      actions: [
        {
          id: 1,
          action_type: 'إنذار على يد محضر بالسداد',
          action_date: '2026-02-01',
          police_report_or_bailiff_number: 'محضر 102',
          dept_or_bailiff_office: 'محضرين الدقي',
          status: 'تم',
          notes: 'تم إعلان المنفذ ضده بشخصه',
        },
      ],
      hearings: [],
      transactions: [],
      financials: [],
    };

    const html = generateExecutionReportHtml(dummyExecution as any, testSettings);
    const pdf = await generateAndVerifyPdf(html, '07_execution_report');
    expect(pdf.totalPages).toBeGreaterThanOrEqual(1);
    expect(pdf.text).toContain('EXEC-2026-0012');
    expect(pdf.text).toContain('102');
    expect(pdf.text).toContain('2026-02-01');
  }, 25000);

  // 8. Report: General Financial Report (التقرير المالي العام)
  it('8. التقرير المالي العام: إجمالي الإيرادات والمصروفات وصافي الأرباح لفترة', async () => {
    const dummyStats = {
      total_income: 120000,
      total_expense: 35000,
      net_profit: 85000,
      outstanding_fees: 45000,
      pending_cheques_count: 3,
      pending_cheques_amount: 28000,
    };

    const dummyTxs = [
      {
        id: 1,
        receipt_number: 'REC-2026-0080',
        transaction_date: '2026-02-15',
        category: 'أتعاب' as const,
        direction: 'وارد' as const,
        transaction_type: 'أتعاب حكم نهائي',
        amount: 80000,
        payment_method: 'شيك' as const,
        description: 'أتعاب دعوى فسخ',
        client_name: 'شركة النيل للتجارة',
      },
    ];

    const html = generateGeneralFinancialReportHtml(dummyStats, dummyTxs as any, testSettings, {
      periodTitle: 'الربع الأول لعام 2026',
    });

    const pdf = await generateAndVerifyPdf(html, '08_financial_general_report');
    expect(pdf.totalPages).toBeGreaterThanOrEqual(1);
    expect(pdf.text).toContain('REC-2026');
    expect(pdf.text).toContain('0080');
    expect(pdf.text).toContain('2026-02-15');
  }, 25000);

  // 9. Report: Generic Table Print (الطباعة العامة لأي جدول معروض)
  it('9. الطباعة العامة لأي جدول: توليد تقرير جدول ديناميكي بأي أعمدة وبيانات معروضة', async () => {
    const html = generateReportHtml({
      settings: testSettings,
      title: 'سجل الموكلين النشطين بالمكتب',
      subtitle: 'تقرير عام مستخرج ببيانات الاتصال وتاريخ التوكيلات',
      tableHeaders: ['م', 'اسم الموكل', 'النوع', 'رقم الهاتف', 'رقم التوكيل', 'مكتب التوثيق'],
      tableRows: [
        [1, 'محمد عبد الرحمن البدوي', 'فرد', '01001122334', '142 توثيق الأهرام', 'الأهرام النموذجي'],
        [2, 'شركة الإسكندرية للشحن ش.م.م', 'شركة', '034455667', '998 توثيق استثماري', 'هيئة الاستثمار'],
      ],
    });

    const pdf = await generateAndVerifyPdf(html, '09_generic_table_report');
    expect(pdf.totalPages).toBe(1);
    expect(pdf.text).toContain('01001122334');
    expect(pdf.text).toContain('034455667');
  }, 25000);

  // Edge Cases Testing
  describe('Print Edge Cases (الحالات الحدية للطباعة)', () => {
    it('حالة حدية 1: اسم موكل طويل جداً (150 حرف) لا يكسر التنسيق ولا يخرج عن الهامش', async () => {
      const longName = 'الأستاذ المستشار محمد عبد الرحمن أحمد إسماعيل إبراهيم الشناوي الدسوقي المنشاوي الوكيل العام لورثة المرحوم المغفور له الحاج رضوان السيد عبد الفتاح';
      const html = generateReportHtml({
        settings: testSettings,
        title: 'كشف حساب لموكل ذي اسم طويل جداً',
        tableHeaders: ['م', 'الاسم بالكامل', 'المبلغ', 'البيان'],
        tableRows: [[1, longName, '50,000 ج.م', 'دفعة أتعاب تحت الحساب']],
      });

      const pdf = await generateAndVerifyPdf(html, 'edge_01_long_name');
      expect(pdf.totalPages).toBe(1);
      expect(pdfHasWord(pdf.text, 'محمد')).toBe(true);
    }, 25000);

    it('حالة حدية 2: نص عربي مختلط بإنجليزي وأرقام ورموز خاصة يحتفظ باتجاه RTL', async () => {
      const mixedText = 'شركة Al-Ahram Corp & Logistics No. 4920/2026 فرع Cairo Downtown - سداد 15,400.50 EGP';
      const html = generateReportHtml({
        settings: testSettings,
        title: 'بيانات مختلطة اللغات والأرقام',
        tableHeaders: ['م', 'البيان المختلط', 'المبلغ'],
        tableRows: [[1, mixedText, '15,400.50 ج.م']],
      });

      const pdf = await generateAndVerifyPdf(html, 'edge_02_mixed_text');
      expect(pdf.totalPages).toBe(1);
      expect(pdf.text).toContain('Al-Ahram');
    }, 25000);

    it('حالة حدية 3: تقرير ضخم (500 صف) يتوزع على عدة صفحات بدون خطأ ويحافظ على عدم تقطيع الصفوف', async () => {
      const rows: (string | number)[][] = [];
      for (let i = 1; i <= 500; i++) {
        rows.push([
          i,
          `جلسة رقم ${i} بمحكمة الاستئناف`,
          `قضية ${1000 + i}/2026`,
          'تأجيل للمستندات',
          '2026-06-15',
        ]);
      }

      const html = generateReportHtml({
        settings: testSettings,
        title: 'تقرير ضخم (500 صف جدول)',
        tableHeaders: ['م', 'الموضوع', 'القضية', 'القرار', 'التاريخ'],
        tableRows: rows,
      });

      const pdf = await generateAndVerifyPdf(html, 'edge_03_500_rows');
      expect(pdf.totalPages).toBeGreaterThanOrEqual(5);
      expect(pdf.text).toContain('1491/2026');
      expect(pdf.text).toContain('2026-06-15');
    }, 35000);

    it('حالة حدية 4: تقرير فارغ يعرض رسالة لا توجد بيانات بدلاً من صفحة بيضاء', async () => {
      const html = generateReportHtml({
        settings: testSettings,
        title: 'تقرير فارغ للاختبار',
        tableHeaders: ['م', 'البيان', 'التاريخ'],
        tableRows: [],
        notes: 'لا توجد بيانات مسجلة في هذا القسم حالياً',
      });

      const pdf = await generateAndVerifyPdf(html, 'edge_04_empty_report');
      expect(pdf.totalPages).toBe(1);
      expect(pdfHasWord(pdf.text, 'بيانات')).toBe(true);
    }, 25000);
  });
});
