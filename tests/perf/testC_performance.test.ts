import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { seedDatabase } from '../../scripts/seed.cjs';
import { generateHearingRollHtml } from '../../src/renderer/services/hearingRollReportGenerator';
import { generateClientStatementHtml } from '../../src/renderer/services/clientStatementReportGenerator';
import { HearingWithCase, OfficeSettings, CaseFinancialSummary, FinancialTransaction } from '../../src/shared/types';

describe('Test C - 4: Comprehensive Performance Benchmarks on Large Seed (قياسات الأداء على قاعدة بيانات ضخمة)', () => {
  const perfDir = path.resolve(__dirname, '../../tests/data/testC_perf_' + Date.now());
  const perfDbPath = path.join(perfDir, 'large_office.db');
  let db: Database.Database;

  const mockSettings: OfficeSettings = {
    id: 1,
    office_name: 'مكتب الأستاذ محمد الحسيني للمحاماة والاستشارات القانونية',
    lawyer_name: 'محمد الحسيني',
    address: 'شارع الجمهورية، وسط البلد، القاهرة',
    phone: '01012345678',
    email: 'hosainy@law.eg',
    tax_number: '123-456-789',
    commercial_reg: '987654',
    logo_path: null,
    default_currency: 'EGP',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeAll(() => {
    fs.mkdirSync(perfDir, { recursive: true });
    // توليد قاعدة بيانات كبيرة: 10 آلاف قضية، 100 ألف جلسة، 50 ألف حركة مالية
    seedDatabase({ size: 'large', dbPath: perfDbPath, seed: 12345 });

    db = new Database(perfDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('cache_size = -64000'); // 64MB cache
  }, 45000);

  afterAll(() => {
    if (db) {
      try { db.close(); } catch (e) {}
    }
    try {
      if (fs.existsSync(perfDir)) {
        fs.rmSync(perfDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  it('1. بدء التشغيل وتهيئة الاتصال بالقاعدة يستغرق أقل من 3 ثواني (< 3000ms)', () => {
    const t0 = performance.now();

    // محاكاة بدء تشغيل البرنامج وفتح الاتصال وقراءة الإعدادات
    const testDb = new Database(perfDbPath, { readonly: true });
    testDb.pragma('journal_mode = WAL');
    testDb.pragma('query_only = ON');

    const office = testDb.prepare('SELECT * FROM office_settings WHERE id = 1').get();
    const counts = testDb.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM cases) as casesCount,
        (SELECT COUNT(*) FROM clients) as clientsCount,
        (SELECT COUNT(*) FROM hearings) as hearingsCount,
        (SELECT COUNT(*) FROM financial_transactions) as txCount
    `).get() as any;

    testDb.close();
    const duration = performance.now() - t0;

    console.log(`[PERF] Database startup & initialization: ${duration.toFixed(2)} ms (Cases: ${counts.casesCount}, Hearings: ${counts.hearingsCount})`);
    expect(duration).toBeLessThan(3000);
    expect(counts.casesCount).toBe(10000);
  });

  it('2. فتح قائمة القضايا والتنقل بين الصفحات (Pagination) يستغرق أقل من 300ms', () => {
    const t0 = performance.now();

    // استعلام تصفح الصفحة الأولى مع جلب اسم الموكل الرئيسي
    const page1 = db.prepare(`
      SELECT c.*, 
        (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = c.id ORDER BY cc.is_primary DESC LIMIT 1) as primary_client_name
      FROM cases c
      ORDER BY c.case_year DESC, c.case_number DESC
      LIMIT 25 OFFSET 0
    `).all();

    const tPage1 = performance.now() - t0;

    // استعلام تصفح صفحة منتصف (صفحة 200)
    const t1 = performance.now();
    const page200 = db.prepare(`
      SELECT c.*, 
        (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = c.id ORDER BY cc.is_primary DESC LIMIT 1) as primary_client_name
      FROM cases c
      ORDER BY c.case_year DESC, c.case_number DESC
      LIMIT 25 OFFSET 5000
    `).all();
    const tPage200 = performance.now() - t1;

    console.log(`[PERF] Cases Page 1: ${tPage1.toFixed(2)} ms | Page 200: ${tPage200.toFixed(2)} ms`);
    expect(page1.length).toBe(25);
    expect(page200.length).toBe(25);
    expect(tPage1).toBeLessThan(300);
    expect(tPage200).toBeLessThan(300);
  });

  it('3. البحث الشامل السريع (Universal Search) يستجيب في أقل من 200ms', () => {
    const query = 'القاهرة';

    const t0 = performance.now();

    // بحث متوازي في القضايا والموكلين والجلسات
    const cases = db.prepare(`
      SELECT id, case_number, case_year, court_name 
      FROM cases 
      WHERE court_name LIKE '%' || ? || '%' 
      LIMIT 10
    `).all(query);

    const clients = db.prepare(`
      SELECT id, name, phone 
      FROM clients 
      WHERE name LIKE '%' || ? || '%' 
      LIMIT 10
    `).all('أحمد');

    const duration = performance.now() - t0;
    console.log(`[PERF] Universal Search latency: ${duration.toFixed(2)} ms`);

    expect(duration).toBeLessThan(200);
  });

  it('4. فتح صفحة قضية محملة بكثافة (200 جلسة + 500 حركة مالية) في أقل من 500ms', () => {
    // 1. زرع قضية خاصة محملة بـ 200 جلسة و 500 حركة مالية
    const heavyCaseId = 999999;
    db.prepare(`
      INSERT OR REPLACE INTO cases (id, case_number, case_year, court_name, case_type, subject, status)
      VALUES (?, '77777', 2026, 'محكمة استئناف القاهرة', 'استئناف مدني', 'دعوى تعويض مدني عن إخلال تعاقدي', 'متداولة')
    `).run(heavyCaseId);

    // إضافة 200 جلسة
    const insertHearing = db.prepare(`
      INSERT INTO hearings (case_id, hearing_date, court_name, status)
      VALUES (?, ?, ?, 'متداولة')
    `);

    // إضافة 500 حركة مالية
    const insertTx = db.prepare(`
      INSERT INTO financial_transactions (case_id, receipt_number, amount, transaction_date, direction, category, transaction_type, payment_method, description, is_reversed)
      VALUES (?, ?, ?, '2026-11-01', 'وارد', 'أتعاب', 'دفعة', 'نقدي', 'بيان مالي تجريبي', 0)
    `);

    db.transaction(() => {
      for (let i = 1; i <= 200; i++) {
        insertHearing.run(heavyCaseId, `2026-05-${String((i % 28) + 1).padStart(2, '0')}`, 'محكمة استئناف القاهرة');
      }
      for (let j = 1; j <= 500; j++) {
        insertTx.run(heavyCaseId, `HEAVY-REC-${j}`, 100000);
      }
    })();

    // 2. قياس سرعة تحميل القضية مع كافة جلساتها ومعاملاتها
    const t0 = performance.now();

    const caseData = db.prepare('SELECT * FROM cases WHERE id = ?').get(heavyCaseId);
    const hearings = db.prepare('SELECT * FROM hearings WHERE case_id = ? ORDER BY hearing_date DESC').all(heavyCaseId);
    const transactions = db.prepare('SELECT * FROM financial_transactions WHERE case_id = ? ORDER BY transaction_date DESC').all(heavyCaseId);
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN direction = 'وارد' AND is_reversed = 0 THEN amount ELSE 0 END), 0) as total_inflow,
        COALESCE(SUM(CASE WHEN direction = 'صادر' AND is_reversed = 0 THEN amount ELSE 0 END), 0) as total_outflow
      FROM financial_transactions
      WHERE case_id = ?
    `).get(heavyCaseId);

    const loadDuration = performance.now() - t0;

    console.log(`[PERF] Heavy Case Loading (200 hearings + 500 tx): ${loadDuration.toFixed(2)} ms`);
    expect(hearings.length).toBe(200);
    expect(transactions.length).toBe(500);
    expect(loadDuration).toBeLessThan(500);
  });

  it('5. توليد رول جلسات اليوم (100 جلسة) وكشف حساب موكل (1000 حركة) يستغرق أقل من 3 ثواني (< 3000ms)', () => {
    // تجهيز 100 جلسة
    const hearingsList: HearingWithCase[] = [];
    for (let i = 1; i <= 100; i++) {
      hearingsList.push({
        id: i,
        case_id: i,
        case_number: `قضية-${i}`,
        case_year: 2026,
        court_name: 'محكمة شمال القاهرة الابتدائية',
        court_circuit: 'الدائرة 5 مدني كلي',
        roll_number: String(i),
        hearing_date: '2026-11-01',
        primary_client_name: `الموكل رقم ${i} التجريبي`,
        primary_opponent_name: `الخصم رقم ${i}`,
        requests: 'تقديم المذكرات والمستندات الختامية وسماع الشهود',
        status: 'متداولة',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // تجهيز 1000 حركة مالية
    const transactionsList: FinancialTransaction[] = [];
    for (let j = 1; j <= 1000; j++) {
      transactionsList.push({
        id: j,
        case_id: 1,
        receipt_number: `REC-PERF-${String(j).padStart(4, '0')}`,
        transaction_date: '2026-11-01',
        amount: 250000,
        direction: j % 3 === 0 ? 'صادر' : 'وارد',
        category: 'أتعاب',
        transaction_type: 'دفعة أتعاب دورية',
        payment_method: 'نقدي',
        description: `بيان الحركة المالية رقم ${j} لسداد المصروفات القضائية ورسوم الدعوى`,
        is_reversed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const summary: CaseFinancialSummary = {
      case_id: 1,
      total_agreed_fees: 50000000,
      total_paid_fees: 25000000,
      remaining_fees: 25000000,
      total_expenses: 5000000,
      total_inflow: 30000000,
      total_outflow: 5000000,
      net_balance: 25000000,
    };

    const t0 = performance.now();

    // 1. توليد HTML لرول 100 جلسة
    const rollHtml = generateHearingRollHtml(hearingsList, mockSettings);
    // 2. توليد HTML لكشف حساب 1000 حركة
    const statementHtml = generateClientStatementHtml(summary, transactionsList, mockSettings, {
      clientName: 'شركة المقاولات والأعمال الهندسية الحديثة',
    });

    const duration = performance.now() - t0;

    console.log(`[PERF] HTML Report Generation (100 Hearings + 1000 Tx Statement): ${duration.toFixed(2)} ms (Roll: ${(rollHtml.length / 1024).toFixed(1)} KB, Statement: ${(statementHtml.length / 1024).toFixed(1)} KB)`);
    expect(rollHtml.length).toBeGreaterThan(10000);
    expect(statementHtml.length).toBeGreaterThan(50000);
    expect(duration).toBeLessThan(3000);
  });

  it('6. فحص تسريب الذاكرة: عدم استمرار تضخم الذاكرة بعد تكرار العمليات المكثفة (Leak Check)', () => {
    // إجبار محرك Node على تنظيف الذاكرة المبدئية إذا كان متاحاً
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;

    // تكرار استعلامات دورية 50 مرة
    for (let step = 0; step < 50; step++) {
      const rows = db.prepare('SELECT * FROM cases LIMIT 100 OFFSET ?').all(step * 50);
      expect(rows.length).toBe(100);
    }

    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const diffMb = (finalMemory - initialMemory) / (1024 * 1024);

    console.log(`[PERF] Memory heap difference after 50 intense queries: ${diffMb.toFixed(2)} MB`);
    // يجب ألا يزيد استهلاك الذاكرة أكثر من 50 ميجابايت كدلالة على خلو العمليات من التسريب
    expect(diffMb).toBeLessThan(50);
  });
});
