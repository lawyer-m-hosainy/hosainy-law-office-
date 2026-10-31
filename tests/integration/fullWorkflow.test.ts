import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('Integration Test: Full Scenario (سيناريو تكامل كامل بدون واجهة)', () => {
  const testDbDir = path.resolve(__dirname, '../../tests/data');
  const testDbPath = path.join(testDbDir, `integration_${Date.now()}.db`);
  let db: Database.Database;

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    db = new Database(testDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // تنفيذ الهجرات الـ 8
    const migrationsDir = path.resolve(__dirname, '../../src/main/database/migrations');
    const files = [
      '001_initial.sql',
      '002_clients_and_cases.sql',
      '003_hearings_and_timeline.sql',
      '004_financial_system.sql',
      '005_executions.sql',
      '006_tasks.sql',
      '007_documents_and_notes.sql',
      '008_security_and_audit.sql'
    ];
    for (const f of files) {
      db.exec(fs.readFileSync(path.join(migrationsDir, f), 'utf-8'));
    }
  });

  afterAll(() => {
    db.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch (e) {}
  });

  it('ينفذ الدورة الكاملة لملف الدعوى من التسجيل وحتى التنفيذ واستيفاء الحقوق', () => {
    // ----------------------------------------------------
    // الخطوة 1: تسجيل موكل جديد
    // ----------------------------------------------------
    const clientRes = db.prepare(`
      INSERT INTO clients (name, client_type, national_id_or_cr, phone, poa_number, status)
      VALUES ('المهندس محمد كمال الديب', 'individual', '28501011234567', '01012345678', '4521 لسنة 2025 قضايا مصر الجديدة', 'active')
    `).run();
    const clientId = clientRes.lastInsertRowid;
    expect(clientId).toBeGreaterThan(0);

    // ----------------------------------------------------
    // الخطوة 2: قيد ملف القضية والربط بالموكل واتفاقية الأتعاب
    // ----------------------------------------------------
    const caseRes = db.prepare(`
      INSERT INTO cases (case_number, case_year, court_name, court_circuit, court_degree, case_type, subject, status, priority, filing_date)
      VALUES ('120', 2026, 'محكمة شمال القاهرة الابتدائية', 'الدائرة 4 مدني كلي', 'ابتدائي', 'مدني كلي', 'دعوى مطالبة بمستحقات مقاولة وتعويض', 'متداولة', 'مهمة', '2026-01-15')
    `).run();
    const caseId = caseRes.lastInsertRowid;
    expect(caseId).toBeGreaterThan(0);

    // ربط الموكل
    db.prepare(`
      INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary)
      VALUES (?, ?, 'مدعي', 1)
    `).run(caseId, clientId);

    // تسجيل اتفاقية الأتعاب (25,000 جنيه)
    const feeRes = db.prepare(`
      INSERT INTO case_fee_agreements (case_id, client_id, agreement_type, total_amount)
      VALUES (?, ?, 'مبلغ إجمالي ثابت', 25000)
    `).run(caseId, clientId);
    expect(feeRes.lastInsertRowid).toBeGreaterThan(0);

    // ----------------------------------------------------
    // الخطوة 3: الجلسة الأولى وقرار التأجيل والتوليد التلقائي
    // ----------------------------------------------------
    const h1Res = db.prepare(`
      INSERT INTO hearings (case_id, hearing_date, court_name, court_circuit, court_hall, status, attended)
      VALUES (?, '2026-02-15', 'محكمة شمال القاهرة الابتدائية', 'الدائرة 4 مدني كلي', 'قاعة 3', 'محددة', 1)
    `).run(caseId);
    const h1Id = h1Res.lastInsertRowid;

    // تسجيل نتيجة الجلسة بتأجيل وتحديد الجلسة التالية
    const recordOutcomeTx = db.transaction(() => {
      db.prepare(`
        UPDATE hearings SET
          status = 'مؤجلة',
          court_decision = 'تأجيل نظر الدعوى لجلسة 2026-03-20 لورود تقرير الخبير',
          adjournment_reason = 'لورود تقرير الخبير',
          next_hearing_date = '2026-03-20'
        WHERE id = ?
      `).run(h1Id);

      // توليد الجلسة التالية تلقائياً
      db.prepare(`
        INSERT INTO hearings (case_id, hearing_date, court_name, court_circuit, court_hall, status, requests)
        VALUES (?, '2026-03-20', 'محكمة شمال القاهرة الابتدائية', 'الدائرة 4 مدني كلي', 'قاعة 3', 'محددة', 'مطلوب: لورود تقرير الخبير')
      `).run(caseId);
    });
    recordOutcomeTx();

    const hearingsCount = (db.prepare('SELECT COUNT(*) as c FROM hearings WHERE case_id = ?').get(caseId) as any).c;
    expect(hearingsCount).toBe(2);

    const nextHearing = db.prepare("SELECT * FROM hearings WHERE case_id = ? AND hearing_date = '2026-03-20'").get(caseId) as any;
    expect(nextHearing).toBeDefined();
    expect(nextHearing.requests).toBe('مطلوب: لورود تقرير الخبير');

    // ----------------------------------------------------
    // الخطوة 4: حجز الدعوى للحكم ثم صدور الحكم النهائي
    // ----------------------------------------------------
    const judgmentTx = db.transaction(() => {
      // تحديث الجلسة الثانية للحكم
      db.prepare(`
        UPDATE hearings SET
          status = 'محجوزة للحكم',
          court_decision = 'حجز الدعوى للحكم لجلسة 2026-04-30',
          is_judgment_hearing = 1,
          judgment_date = '2026-04-30'
        WHERE id = ?
      `).run(nextHearing.id);

      db.prepare("UPDATE cases SET status = 'محجوزة للحكم' WHERE id = ?").run(caseId);
    });
    judgmentTx();

    const caseAfterReserve = db.prepare('SELECT status FROM cases WHERE id = ?').get(caseId) as any;
    expect(caseAfterReserve.status).toBe('محجوزة للحكم');

    // صدور الحكم
    db.prepare(`
      UPDATE hearings SET
        status = 'صدر حكم',
        judgment_text = 'حكمت المحكمة بإلزام المدعى عليه بسداد مبلغ 150,000 جنيه والمصروفات'
      WHERE id = ?
    `).run(nextHearing.id);
    db.prepare("UPDATE cases SET status = 'محكوم فيها' WHERE id = ?").run(caseId);

    const caseAfterJudgment = db.prepare('SELECT status FROM cases WHERE id = ?').get(caseId) as any;
    expect(caseAfterJudgment.status).toBe('محكوم فيها');

    // ----------------------------------------------------
    // الخطوة 5: المنظومة المالية، الدفعات، القيد العكسي
    // ----------------------------------------------------
    // دفعة أولى 10,000 ج أتعاب
    const tx1 = db.prepare(`
      INSERT INTO financial_transactions (receipt_number, case_id, client_id, transaction_date, category, transaction_type, direction, amount, payment_method, description)
      VALUES ('REC-2026-0001', ?, ?, '2026-01-20', 'أتعاب', 'دفعة مقدم أتعاب', 'وارد', 10000, 'نقدي', 'مقدم أتعاب التعاقد')
    `).run(caseId, clientId);

    // سداد رسوم قضائية من الخزينة 2,500 ج
    db.prepare(`
      INSERT INTO financial_transactions (receipt_number, case_id, client_id, transaction_date, category, transaction_type, direction, amount, payment_method, description)
      VALUES ('VOU-2026-0001', ?, ?, '2026-01-22', 'رسوم قضائية', 'سداد رسوم المحكمة', 'صادر', 2500, 'نقدي', 'سداد رسم نسبي')
    `).run(caseId, clientId);

    // تسجيل دفعة خاطئة 15,000 ج
    const wrongTx = db.prepare(`
      INSERT INTO financial_transactions (receipt_number, case_id, client_id, transaction_date, category, transaction_type, direction, amount, payment_method, description)
      VALUES ('REC-2026-0002', ?, ?, '2026-02-01', 'أتعاب', 'دفعة خطأ', 'وارد', 15000, 'نقدي', 'تسجيل بالخطأ')
    `).run(caseId, clientId);
    const wrongTxId = wrongTx.lastInsertRowid;

    // إلغاء الحركة بقيد عكسي
    const reversalTx = db.transaction(() => {
      const revRes = db.prepare(`
        INSERT INTO financial_transactions (
          receipt_number, case_id, client_id, transaction_date, category,
          transaction_type, direction, amount, payment_method, description, is_reversed, reversal_of_id
        ) VALUES (
          'REV-2026-0001', @case_id, @client_id, '2026-02-02', 'أتعاب',
          'قيد عكسي', 'صادر', 15000, 'نقدي', 'قيد تسوية عكسي للإيصال REC-2026-0002', 0, @reversal_of_id
        )
      `).run({ case_id: caseId, client_id: clientId, reversal_of_id: wrongTxId });

      db.prepare(`
        UPDATE financial_transactions SET
          is_reversed = 1,
          reversed_at = CURRENT_TIMESTAMP,
          reversed_by_id = ?,
          reversal_reason = 'خطأ في الترحيل'
        WHERE id = ?
      `).run(revRes.lastInsertRowid, wrongTxId);
    });
    reversalTx();

    // التحقق من أن الحركة الخاطئة أصبحت is_reversed = 1 ولم تحذف
    const checkWrong = db.prepare('SELECT is_reversed, reversal_reason FROM financial_transactions WHERE id = ?').get(wrongTxId) as any;
    expect(checkWrong.is_reversed).toBe(1);
    expect(checkWrong.reversal_reason).toBe('خطأ في الترحيل');

    // تسجيل الدفعة الصحيحة النهائية (15,000 ج)
    db.prepare(`
      INSERT INTO financial_transactions (receipt_number, case_id, client_id, transaction_date, category, transaction_type, direction, amount, payment_method, description)
      VALUES ('REC-2026-0003', ?, ?, '2026-02-05', 'أتعاب', 'دفعة ثانية أتعاب', 'وارد', 15000, 'نقدي', 'سداد باقي الأتعاب المتفق عليها')
    `).run(caseId, clientId);

    // حساب إجمالي الأتعاب المحصلة الفعلية (باستثناء الملغاة)
    const paidFeesSum = (db.prepare(`
      SELECT SUM(amount) as s FROM financial_transactions
      WHERE case_id = ? AND category = 'أتعاب' AND direction = 'وارد' AND is_reversed = 0
    `).get(caseId) as any).s;
    expect(paidFeesSum).toBe(25000); // 10000 + 15000

    // ----------------------------------------------------
    // الخطوة 6: إجراءات التنفيذ الجبري والتحصيل
    // ----------------------------------------------------
    const execRes = db.prepare(`
      INSERT INTO execution_files (
        file_number, year, case_id, client_id, deed_type, court,
        applicant_name, enforced_against, total_claimed_amount, collected_amount, status
      ) VALUES ('552', 2026, ?, ?, 'حكم', 'محكمة شمال القاهرة الابتدائية', 'المهندس محمد كمال', 'المدين', 150000, 0, 'جاري')
    `).run(caseId, clientId);
    const execId = execRes.lastInsertRowid;

    // تسجيل إجراء حجز تنفيذي
    db.prepare(`
      INSERT INTO execution_actions (execution_id, action_type, action_date, status, amount_collected, details)
      VALUES (?, 'حجز تنفيذي على أرصدة البنك', '2026-05-10', 'تم', 50000, 'تم استلام شيك مصرفي بمبلغ 50000 جنيه من بنك مصر')
    `).run(execId);

    // تحديث المحصل في ملف التنفيذ
    db.prepare('UPDATE execution_files SET collected_amount = 50000 WHERE id = ?').run(execId);

    const execFile = db.prepare('SELECT total_claimed_amount, collected_amount FROM execution_files WHERE id = ?').get(execId) as any;
    expect(execFile.total_claimed_amount).toBe(150000);
    expect(execFile.collected_amount).toBe(50000);

    // ----------------------------------------------------
    // الخطوة 7: المهام وقوائم الفحص والتكرار
    // ----------------------------------------------------
    const taskRes = db.prepare(`
      INSERT INTO tasks (title, case_id, client_id, category, priority, due_date, recurrence, status)
      VALUES ('متابعة تنفيذ الحجز البنكي', ?, ?, 'مأمورية محكمة', 'عاجلة', '2026-05-15', 'أسبوعي', 'جديدة')
    `).run(caseId, clientId);
    const taskId = taskRes.lastInsertRowid;

    // إضافة checklist
    db.prepare('INSERT INTO task_checklists (task_id, title, is_completed, sort_order) VALUES (?, ?, 0, 1)').run(taskId, 'إعلان البنك بمحضر الحجز');
    db.prepare('INSERT INTO task_checklists (task_id, title, is_completed, sort_order) VALUES (?, ?, 0, 2)').run(taskId, 'استلام شيك الصرف');

    // إكمال البنود
    db.prepare('UPDATE task_checklists SET is_completed = 1 WHERE task_id = ?').run(taskId);
    const completedItems = (db.prepare('SELECT COUNT(*) as c FROM task_checklists WHERE task_id = ? AND is_completed = 1').get(taskId) as any).c;
    expect(completedItems).toBe(2);

    // ----------------------------------------------------
    // الخطوة 8: سلامة قاعدة البيانات والقيود
    // ----------------------------------------------------
    const integrity = db.pragma('integrity_check') as any[];
    expect(integrity).toEqual([{ integrity_check: 'ok' }]);

    const fkViolations = db.pragma('foreign_key_check') as any[];
    expect(fkViolations).toEqual([]);
  });
});
