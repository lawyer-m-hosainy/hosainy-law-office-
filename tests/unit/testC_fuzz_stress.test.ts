import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('Test C - 5: Fuzzing, Edge-Case & Stress Tests (اختبارات التحمل والإدخال العشوائي والقيم المتطرفة)', () => {
  const fuzzDir = path.resolve(__dirname, '../../tests/data/fuzz_test_' + Date.now());
  const fuzzDbPath = path.join(fuzzDir, 'fuzz_office.db');
  let db: Database.Database;

  beforeAll(() => {
    fs.mkdirSync(fuzzDir, { recursive: true });
    db = new Database(fuzzDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        client_type TEXT DEFAULT 'individual',
        national_id_or_cr TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        status TEXT DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_number TEXT NOT NULL,
        case_year INTEGER NOT NULL,
        court_name TEXT NOT NULL,
        subject TEXT,
        status TEXT DEFAULT 'متداولة'
      );

      CREATE TABLE IF NOT EXISTS hearings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        hearing_date TEXT NOT NULL,
        proceedings TEXT,
        court_decision TEXT,
        status TEXT DEFAULT 'متداولة'
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT NOT NULL UNIQUE,
        amount INTEGER NOT NULL CHECK (amount > 0),
        direction TEXT NOT NULL CHECK (direction IN ('وارد', 'صادر')),
        category TEXT NOT NULL,
        description TEXT,
        is_reversed INTEGER DEFAULT 0
      );
    `);
  });

  afterAll(() => {
    if (db) {
      try { db.close(); } catch (e) {}
    }
    try {
      if (fs.existsSync(fuzzDir)) {
        fs.rmSync(fuzzDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  it('1. اختبار مدخلات متطرفة: نصوص فائقة الطول (100 ألف حرف)، إيموجي، محارف تحكم، ونصوص مختلطة RTL/LTR', () => {
    const huge100kText = 'دعوى تعويض مدني رقم 1 لسنة 2026 '.repeat(3125); // ~100,000 characters
    expect(huge100kText.length).toBeGreaterThanOrEqual(100000);

    const emojiRichText = '⚖️ قضية مستعجلة 📜 محكمة النقض 🏛️ الدائرة الجنائية 🔥 هام جداً 💼 موكل VIP 🔒 سري';
    const controlCharsText = 'سطر أول\r\nسطر ثانٍ\tمع مسافة بادئة\0محرف صفري\u200Fعلامة RTL\u200Eعلامة LTR';
    const mixedBidiText = 'عقد Contract رقم #123456 لشركة Egyptian Legal Solutions ش.م.م بنسبة 50% أتعاب';

    // إدخال نصوص عملاقة في الملاحظات والبيانات
    const insertClient = db.prepare(`
      INSERT INTO clients (name, phone, address, notes)
      VALUES (?, ?, ?, ?)
    `);

    const result = insertClient.run(
      mixedBidiText,
      '01012345678',
      controlCharsText,
      huge100kText
    );

    const clientId = Number(result.lastInsertRowid);
    const saved = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as any;

    expect(saved).toBeDefined();
    expect(saved.name).toBe(mixedBidiText);
    expect(saved.notes.length).toBeGreaterThanOrEqual(100000);
    expect(saved.address).toContain('سطر أول');

    // إدخال إيموجي في القضية
    const insertCase = db.prepare(`
      INSERT INTO cases (case_number, case_year, court_name, subject)
      VALUES (?, ?, ?, ?)
    `);
    const cResult = insertCase.run('1234', 2026, 'محكمة جنوب القاهرة', emojiRichText);
    const savedCase = db.prepare('SELECT * FROM cases WHERE id = ?').get(Number(cResult.lastInsertRowid)) as any;
    expect(savedCase.subject).toBe(emojiRichText);
  });

  it('2. اختبار الضغط المزدوج السريع (Double-click / Concurrency prevention) يمنع تكرار الإيصال المالي', () => {
    const duplicateReceiptNumber = 'REC-RACE-001';

    // محاولة إدخال نفس الإيصال مرتين متزامنتين بنفس رقم الإيصال
    const insertTx = db.prepare(`
      INSERT INTO financial_transactions (receipt_number, amount, direction, category, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    // الإدخال الأول ينجح
    const run1 = insertTx.run(duplicateReceiptNumber, 100000, 'وارد', 'أتعاب', 'الدفعة الأولى');
    expect(run1.changes).toBe(1);

    // الإدخال الثاني بنفس رقم الإيصال يفشل فوراً بسبب قيد الـ UNIQUE
    expect(() => {
      insertTx.run(duplicateReceiptNumber, 100000, 'وارد', 'أتعاب', 'محاولة إدخال مكررة');
    }).toThrow(/UNIQUE constraint failed/);

    // التأكد من وجود سجل واحد فقط
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM financial_transactions WHERE receipt_number = ?').get(duplicateReceiptNumber) as any).cnt;
    expect(count).toBe(1);
  });

  it('3. إضافة 1000 حركة مالية بسرعة فائقة مع التحقق من ثبات ودقة الحسابات المالية والقروش', () => {
    const insertStmt = db.prepare(`
      INSERT INTO financial_transactions (receipt_number, amount, direction, category, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    let expectedNetInflow = 0;
    let expectedNetOutflow = 0;

    const t0 = performance.now();

    db.transaction(() => {
      for (let i = 1; i <= 1000; i++) {
        const isIncome = i % 4 !== 0; // 75% وارد, 25% صادر
        const amount = (i * 100) + 50; // مبالغ مختلفة بالقروش
        const dir = isIncome ? 'وارد' : 'صادر';

        if (isIncome) {
          expectedNetInflow += amount;
        } else {
          expectedNetOutflow += amount;
        }

        insertStmt.run(
          `STRESS-TX-${String(i).padStart(4, '0')}`,
          amount,
          dir,
          isIncome ? 'أتعاب' : 'مصروفات',
          `حركة اختبار سرعة رقم ${i}`
        );
      }
    })();

    const duration = performance.now() - t0;
    console.log(`[FUZZ] 1,000 financial transactions inserted in ${duration.toFixed(2)} ms`);

    // حساب المجاميع من قاعدة البيانات ومقارنتها بالرياضيات الحتمية
    const totals = db.prepare(`
      SELECT 
        SUM(CASE WHEN direction = 'وارد' AND receipt_number LIKE 'STRESS-TX-%' THEN amount ELSE 0 END) as actual_inflow,
        SUM(CASE WHEN direction = 'صادر' AND receipt_number LIKE 'STRESS-TX-%' THEN amount ELSE 0 END) as actual_outflow
      FROM financial_transactions
    `).get() as any;

    expect(totals.actual_inflow).toBe(expectedNetInflow);
    expect(totals.actual_outflow).toBe(expectedNetOutflow);
    expect(totals.actual_inflow - totals.actual_outflow).toBe(expectedNetInflow - expectedNetOutflow);
  });

  it('4. مئات العمليات العشوائية المتتالية (CRUD Fuzz) مع التأكد التام من سلامة قاعدة البيانات', () => {
    const caseId = 1;

    // 100 عملية عشوائية تشمل إدخال وتعديل وحذف
    const insertHearing = db.prepare('INSERT INTO hearings (case_id, hearing_date, proceedings) VALUES (?, ?, ?)');
    const updateHearing = db.prepare('UPDATE hearings SET proceedings = ? WHERE id = ?');
    const deleteHearing = db.prepare('DELETE FROM hearings WHERE id = ?');

    const createdIds: number[] = [];

    db.transaction(() => {
      for (let op = 1; op <= 150; op++) {
        if (op % 3 === 0 && createdIds.length > 0) {
          // تعديل عشوائي
          const targetId = createdIds[op % createdIds.length];
          updateHearing.run(`تعديل في الإجراءات رقم ${op}`, targetId);
        } else if (op % 7 === 0 && createdIds.length > 5) {
          // حذف عشوائي
          const removeIdx = op % createdIds.length;
          const targetId = createdIds[removeIdx];
          deleteHearing.run(targetId);
          createdIds.splice(removeIdx, 1);
        } else {
          // إدخال
          const res = insertHearing.run(caseId, `2026-12-${String((op % 28) + 1).padStart(2, '0')}`, `إجراء جلسة عشوائية رقم ${op}`);
          createdIds.push(Number(res.lastInsertRowid));
        }
      }
    })();

    // فحص سلامة القاعدة والمفاتيح الأجنبية بعد العاصفة العشوائية
    const integrityCheck = db.pragma('integrity_check') as any[];
    expect(integrityCheck[0].integrity_check).toBe('ok');

    const fkCheck = db.pragma('foreign_key_check') as any[];
    expect(fkCheck.length).toBe(0);
  });
});
