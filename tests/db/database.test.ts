import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('Database Integrity & Performance Tests (اختبارات قاعدة البيانات والمهاجرات والفهارس)', () => {
  const migrationsDir = path.resolve(__dirname, '../../src/main/database/migrations');
  const migrationFiles = [
    '001_initial.sql',
    '002_clients_and_cases.sql',
    '003_hearings_and_timeline.sql',
    '004_financial_system.sql',
    '005_executions.sql',
    '006_tasks.sql',
    '007_documents_and_notes.sql',
    '008_security_and_audit.sql'
  ];

  describe('1. اختبار المهاجرات (Migrations)', () => {
    it('ينفذ جميع المهاجرات بنجاح من قاعدة فارغة تماماً حتى أحدث إصدار', () => {
      const db = new Database(':memory:');
      db.pragma('foreign_keys = ON');

      for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        expect(() => db.exec(sql)).not.toThrow();
      }

      // التحقق من الجداول الأساسية
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t: any) => t.name);
      expect(tables).toContain('office_settings');
      expect(tables).toContain('clients');
      expect(tables).toContain('cases');
      expect(tables).toContain('hearings');
      expect(tables).toContain('financial_transactions');
      expect(tables).toContain('execution_files');
      expect(tables).toContain('tasks');
      expect(tables).toContain('case_documents');
      expect(tables).toContain('app_security');
      expect(tables).toContain('audit_logs');

      db.close();
    });

    it('ينفذ المهاجرات خطوة بخطوة مع الحفاظ على البيانات السابقة في كل مرحلة', () => {
      const db = new Database(':memory:');
      db.pragma('foreign_keys = ON');

      // 001
      db.exec(fs.readFileSync(path.join(migrationsDir, '001_initial.sql'), 'utf-8'));
      const office = db.prepare('SELECT office_name FROM office_settings WHERE id = 1').get() as any;
      expect(office).toBeDefined();

      // 002
      db.exec(fs.readFileSync(path.join(migrationsDir, '002_clients_and_cases.sql'), 'utf-8'));
      db.prepare(`
        INSERT INTO clients (name, phone, client_type) VALUES ('عمرو الشافعي', '01011111111', 'individual')
      `).run();
      db.prepare(`
        INSERT INTO cases (case_number, case_year, court_name, case_type, subject)
        VALUES ('101', 2026, 'محكمة شمال القاهرة', 'مدني', 'صحة ونفاذ')
      `).run();

      // 003
      db.exec(fs.readFileSync(path.join(migrationsDir, '003_hearings_and_timeline.sql'), 'utf-8'));
      db.prepare(`
        INSERT INTO hearings (case_id, hearing_date, court_name, status)
        VALUES (1, '2026-03-01', 'محكمة شمال القاهرة', 'محددة')
      `).run();

      // 004
      db.exec(fs.readFileSync(path.join(migrationsDir, '004_financial_system.sql'), 'utf-8'));
      db.prepare(`
        INSERT INTO financial_transactions (receipt_number, case_id, transaction_date, category, transaction_type, direction, amount, payment_method, description)
        VALUES ('REC-1', 1, '2026-03-01', 'أتعاب', 'سداد', 'وارد', 5000, 'نقدي', 'دفعة أولى')
      `).run();

      // 005
      db.exec(fs.readFileSync(path.join(migrationsDir, '005_executions.sql'), 'utf-8'));
      db.prepare(`
        INSERT INTO execution_files (file_number, year, court, applicant_name, enforced_against, total_claimed_amount)
        VALUES ('EX-1', 2026, 'محكمة شمال القاهرة', 'عمرو الشافعي', 'الخصم', 50000)
      `).run();

      // 006
      db.exec(fs.readFileSync(path.join(migrationsDir, '006_tasks.sql'), 'utf-8'));
      db.prepare(`
        INSERT INTO tasks (title, case_id, category, due_date)
        VALUES ('قيد الصحيفة', 1, 'مأمورية محكمة', '2026-03-02')
      `).run();

      // 007
      db.exec(fs.readFileSync(path.join(migrationsDir, '007_documents_and_notes.sql'), 'utf-8'));
      db.prepare(`
        INSERT INTO case_documents (case_id, title, file_name, file_extension, relative_path)
        VALUES (1, 'أصل العقد', 'contract.pdf', 'pdf', 'attachments/contract.pdf')
      `).run();

      // 008
      db.exec(fs.readFileSync(path.join(migrationsDir, '008_security_and_audit.sql'), 'utf-8'));
      db.prepare(`
        INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
        VALUES ('test', 'system', 'تجربة', 'اختبار البيانات')
      `).run();

      // التحقق التام من بقاء كافة البيانات في الجداول دون أي فقد أو تلف
      expect((db.prepare('SELECT COUNT(*) as count FROM clients').get() as any).count).toBe(1);
      expect((db.prepare('SELECT COUNT(*) as count FROM cases').get() as any).count).toBe(1);
      expect((db.prepare('SELECT COUNT(*) as count FROM hearings').get() as any).count).toBe(1);
      expect((db.prepare('SELECT COUNT(*) as count FROM financial_transactions').get() as any).count).toBe(1);
      expect((db.prepare('SELECT COUNT(*) as count FROM execution_files').get() as any).count).toBe(1);
      expect((db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count).toBe(1);
      expect((db.prepare('SELECT COUNT(*) as count FROM case_documents').get() as any).count).toBe(1);
      expect((db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any).count).toBe(1);

      db.close();
    });
  });

  describe('2. المفاتيح الأجنبية والقيود (Foreign Keys & Constraints)', () => {
    let db: Database.Database;

    beforeEach(() => {
      db = new Database(':memory:');
      db.pragma('foreign_keys = ON');
      for (const file of migrationFiles) {
        db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
      }
    });

    afterEach(() => {
      db.close();
    });

    it('يمنع حذف موكل مرتبط بقضايا مسجلة (RESTRICT constraint)', () => {
      const client = db.prepare(`
        INSERT INTO clients (name, phone, client_type) VALUES ('محمد عثمان', '01000000000', 'individual')
      `).run();
      const clientId = client.lastInsertRowid;

      const caseRes = db.prepare(`
        INSERT INTO cases (case_number, case_year, court_name, case_type, subject)
        VALUES ('501', 2026, 'محكمة جنوب الجيزة', 'مدني', 'دعوى تعويض')
      `).run();
      const caseId = caseRes.lastInsertRowid;

      // ربط الموكل بالقضية
      db.prepare(`
        INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary)
        VALUES (?, ?, 'مدعي', 1)
      `).run(caseId, clientId);

      // محاولة حذف الموكل المرتبط بقضية يجب أن تفشل
      expect(() => {
        db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
      }).toThrow(/FOREIGN KEY/i);
    });

    it('يمنع إنشاء ربط يتيم بكيان غير موجود', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO case_clients (case_id, client_id, role_capacity)
          VALUES (999999, 888888, 'مدعي')
        `).run();
      }).toThrow(/FOREIGN KEY/i);
    });

    it('يفرض الحقول الإلزامية ويمنع إدخال قيم فارغة (NOT NULL constraint)', () => {
      expect(() => {
        db.prepare(`INSERT INTO cases (court_name, case_type) VALUES ('محكمة', 'نوع')`).run();
      }).toThrow(/NOT NULL/i);
    });
  });

  describe('3. التراجع التام عند فشل المعاملات (Transaction Rollback)', () => {
    it('يتراجع بالكامل عن أي عملية متعددة الخطوات لو فشلت في المنتصف', () => {
      const db = new Database(':memory:');
      db.pragma('foreign_keys = ON');
      for (const file of migrationFiles) {
        db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
      }

      const clientCountBefore = (db.prepare('SELECT COUNT(*) as c FROM clients').get() as any).c;
      const caseCountBefore = (db.prepare('SELECT COUNT(*) as c FROM cases').get() as any).c;

      const multiStepOperation = db.transaction(() => {
        // خطوة 1: إضافة موكل
        db.prepare(`
          INSERT INTO clients (name, phone, client_type) VALUES ('موكل تجربة التراجع', '01012341234', 'individual')
        `).run();

        // خطوة 2: إضافة قضية
        db.prepare(`
          INSERT INTO cases (case_number, case_year, court_name, case_type, subject)
          VALUES ('777', 2026, 'محكمة شمال القاهرة', 'مدني', 'موضوع تجريبي')
        `).run();

        // خطوة 3: حدوث خطأ متعمد (إلقاء استثناء)
        throw new Error('فشل متعمد في الخطوة الثالثة لاختبار الـ Rollback');
      });

      expect(() => multiStepOperation()).toThrow('فشل متعمد في الخطوة الثالثة لاختبار الـ Rollback');

      // التأكد من أن قاعدة البيانات لم تحتفظ بأي من خطوات المعاملة
      const clientCountAfter = (db.prepare('SELECT COUNT(*) as c FROM clients').get() as any).c;
      const caseCountAfter = (db.prepare('SELECT COUNT(*) as c FROM cases').get() as any).c;

      expect(clientCountAfter).toBe(clientCountBefore);
      expect(caseCountAfter).toBe(caseCountBefore);

      db.close();
    });
  });

  describe('4. فحص السلامة والمفاتيح (PRAGMA integrity_check & foreign_key_check)', () => {
    it('يجتاز فحص سلامة الملف وعدم وجود أخطاء مفاتيح أجنبية', () => {
      const db = new Database(':memory:');
      db.pragma('foreign_keys = ON');
      for (const file of migrationFiles) {
        db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
      }

      // إضافة بعض البيانات المترابطة
      const cl = db.prepare("INSERT INTO clients (name, phone) VALUES ('أحمد', '0100')").run();
      const cs = db.prepare("INSERT INTO cases (case_number, case_year, court_name, case_type, subject) VALUES ('1', 2026, 'م', 'ت', 'س')").run();
      db.prepare("INSERT INTO case_clients (case_id, client_id) VALUES (?, ?)").run(cs.lastInsertRowid, cl.lastInsertRowid);

      const integrity = db.pragma('integrity_check') as any[];
      expect(integrity).toEqual([{ integrity_check: 'ok' }]);

      const fkCheck = db.pragma('foreign_key_check') as any[];
      expect(fkCheck).toEqual([]);

      db.close();
    });
  });

  describe('5. خطة تنفيذ الاستعلامات واستخدام الفهارس (EXPLAIN QUERY PLAN)', () => {
    it('يثبت أن الاستعلامات الرئيسية تستخدم الفهارس المخصصة ولا تجري مسحاً كاملاً للجداول', () => {
      const db = new Database(':memory:');
      db.pragma('foreign_keys = ON');
      for (const file of migrationFiles) {
        db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
      }

      // 1. استعلام البحث عن قضية برقم القضية والسنة
      const planCaseNumber = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM cases WHERE case_number = '1050' AND case_year = 2026
      `).all() as any[];
      const caseNumberDetails = planCaseNumber.map(p => p.detail).join(' ');
      expect(caseNumberDetails).toContain('USING INDEX');
      expect(caseNumberDetails).toContain('idx_cases_number_year');

      // 2. استعلام رول الجلسات حسب تاريخ الجلسة
      const planHearingRoll = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM hearings WHERE hearing_date = '2026-03-10'
      `).all() as any[];
      const hearingDetails = planHearingRoll.map(p => p.detail).join(' ');
      expect(hearingDetails).toContain('USING INDEX');
      expect(hearingDetails).toContain('idx_hearings_date');

      // 3. استعلام كشف الحساب والحركات المالية حسب القضية
      const planFinancialCase = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM financial_transactions WHERE case_id = 1
      `).all() as any[];
      const financeDetails = planFinancialCase.map(p => p.detail).join(' ');
      expect(financeDetails).toContain('USING INDEX');
      expect(financeDetails).toContain('idx_fin_tx_case');

      // 4. استعلام المستندات حسب القضية وحالة الحذف
      const planDocuments = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM case_documents WHERE case_id = 1 AND is_deleted = 0
      `).all() as any[];
      const docDetails = planDocuments.map(p => p.detail).join(' ');
      expect(docDetails).toContain('USING INDEX');
      expect(docDetails).toContain('idx_case_documents_case');

      db.close();
    });
  });
});
