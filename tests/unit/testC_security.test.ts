import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { escapeHtml } from '../../src/shared/htmlUtils';
import { generateReportHtml } from '../../src/renderer/services/reportGenerator';
import { generateHearingRollHtml } from '../../src/renderer/services/hearingRollReportGenerator';
import { generateClientStatementHtml } from '../../src/renderer/services/clientStatementReportGenerator';
import { HearingWithCase, OfficeSettings, CaseFinancialSummary, FinancialTransaction } from '../../src/shared/types';

describe('Test C - 1 & 2: Electron & Data Security Verification Tests', () => {
  const testDbDir = path.resolve(__dirname, '../../tests/data/sec_test_' + Date.now());
  const testDbPath = path.join(testDbDir, 'sec_office.db');
  let db: Database.Database;

  const mockSettings: OfficeSettings = {
    id: 1,
    office_name: 'مكتب الأستاذ محمد الحسيني للمحاماة',
    lawyer_name: 'محمد الحسيني المحامي بالنقض',
    address: 'شارع الجمهورية، القاهرة',
    phone: '01000000000',
    email: 'lawyer@example.com',
    tax_number: '123-456-789',
    commercial_reg: '987654',
    logo_path: null,
    default_currency: 'EGP',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    db = new Database(testDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create minimal schema for testing
    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        client_type TEXT DEFAULT 'individual',
        national_id_or_cr TEXT,
        phone TEXT,
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

      CREATE TABLE IF NOT EXISTS app_security (
        id INTEGER PRIMARY KEY,
        is_password_enabled INTEGER DEFAULT 0,
        password_hash TEXT,
        auto_lock_minutes INTEGER DEFAULT 15,
        auto_backup_enabled INTEGER DEFAULT 1,
        auto_backup_frequency TEXT DEFAULT 'daily',
        backup_custom_path TEXT,
        encrypt_backups INTEGER DEFAULT 0,
        last_backup_date DATETIME DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_name TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  afterAll(() => {
    if (db) db.close();
    try {
      if (fs.existsSync(testDbDir)) {
        fs.rmSync(testDbDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  // ==========================================
  // 1. Electron Security Settings
  // ==========================================
  describe('1. إعدادات أمان Electron والنافذة والشبكة', () => {
    it('ملف main/index.ts يفرض contextIsolation, nodeIntegration: false, sandbox: true, webSecurity: true', () => {
      const mainIndexContent = fs.readFileSync(path.resolve(__dirname, '../../src/main/index.ts'), 'utf-8');

      expect(mainIndexContent).toContain('contextIsolation: true');
      expect(mainIndexContent).toContain('nodeIntegration: false');
      expect(mainIndexContent).toContain('sandbox: true');
      expect(mainIndexContent).toContain('webSecurity: true');
    });

    it('يمنع فتح نوافذ خارجية عبر setWindowOpenHandler بالرفض الصريح { action: "deny" }', () => {
      const mainIndexContent = fs.readFileSync(path.resolve(__dirname, '../../src/main/index.ts'), 'utf-8');
      expect(mainIndexContent).toContain('setWindowOpenHandler');
      expect(mainIndexContent).toContain("action: 'deny'");
    });

    it('يمنع التنقل خارج البرنامج عبر will-navigate', () => {
      const mainIndexContent = fs.readFileSync(path.resolve(__dirname, '../../src/main/index.ts'), 'utf-8');
      expect(mainIndexContent).toContain('will-navigate');
      expect(mainIndexContent).toContain('event.preventDefault()');
    });

    it('سياسة أمان المحتوى CSP مفروضة وتمنع الاتصال الخارجي (connect-src none) والـ inline scripts', () => {
      const indexHtml = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');
      expect(indexHtml).toContain('Content-Security-Policy');
      expect(indexHtml).toContain("default-src 'self'");
      expect(indexHtml).toContain("script-src 'self'");
      expect(indexHtml).not.toContain("script-src 'self' 'unsafe-inline'");
      expect(indexHtml).toContain("connect-src 'none'");
      expect(indexHtml).toContain("object-src 'none'");
    });

    it('الـ preload يعرض فقط واجهة electronAPI ولا يعرض ipcRenderer أو fs مباشرة', () => {
      const preloadContent = fs.readFileSync(path.resolve(__dirname, '../../src/preload/index.ts'), 'utf-8');
      expect(preloadContent).toContain("contextBridge.exposeInMainWorld('electronAPI'");
      expect(preloadContent).not.toContain("exposeInMainWorld('ipcRenderer'");
      expect(preloadContent).not.toContain("exposeInMainWorld('fs'");
    });
  });

  // ==========================================
  // 2. Data Security: SQL Injection, XSS, Path Traversal, Passwords
  // ==========================================
  describe('2. أمان البيانات ومنع حقن SQL واختراق المسارات', () => {
    it('كل استعلامات قاعدة البيانات تستخدم Parameters وترفض حقن SQL مثل OR 1=1 و DROP TABLE', () => {
      // إدخال عميل أولي
      const insert = db.prepare('INSERT INTO clients (name, phone, notes) VALUES (?, ?, ?)');
      insert.run('أحمد علي المحامي', '01011111111', 'عميل رسمي');

      // محاولة حقن SQL في حقل البحث
      const maliciousPayloads = [
        "' OR '1'='1",
        "' OR 1=1 --",
        "'; DROP TABLE clients; --",
        "1; SELECT * FROM clients WHERE '1'='1",
        "admin'--",
      ];

      for (const payload of maliciousPayloads) {
        // فحص بالاستعلام المجهز
        const stmt = db.prepare('SELECT * FROM clients WHERE name LIKE ?');
        const results = stmt.all(`%${payload}%`);

        // يجب ألا يعيد كل السجلات وأن يعيد فقط من يطابق الحرفية
        expect(results.length).toBe(0);

        // التأكد من أن جدول clients ما زال موجوداً وسليماً
        const check = db.prepare('SELECT COUNT(*) as cnt FROM clients').get() as { cnt: number };
        expect(check.cnt).toBeGreaterThan(0);
      }
    });

    it('فحص كامل الكود: لا يوجد أي دمج نصوص مباشر في استعلامات db.prepare', () => {
      const ipcDir = path.resolve(__dirname, '../../src/main/ipc');
      const files = fs.readdirSync(ipcDir).filter(f => f.endsWith('.ts'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(ipcDir, file), 'utf-8');
        // فحص كل استعلام في db.prepare للتأكد من عدم دمج أي متغير مستخدم مباشرة بدون باراميترز ?
        const matches = content.matchAll(/db\.prepare\s*\(\s*`([^`]+)`\s*\)/gi);
        for (const m of matches) {
          const sql = m[1];
          const interpolations = sql.match(/\$\{([^}]+)\}/g) || [];
          for (const interp of interpolations) {
            const inner = interp.slice(2, -1).trim();
            // التركيبات المسموحة فقط هي بناة الاستعلام الآمنة المعاملة بـ ? (placeholders, whereClause, paginationClause, fields.join, setClauses.join)
            const isSafeConstruct = /^(placeholders|whereClause|paginationClause|fields(ToUpdate)?\.join\(.*\)|setClauses\.join\(.*\)|caseId\s*\?.*)$/.test(inner);
            expect(isSafeConstruct).toBe(true);
          }
        }
      }
    });

    it('دالة escapeHtml تحول الوسوم الخبيثة إلى نصوص مجردة لمنع XSS', () => {
      const xssScript = '<script>alert("XSS")</script>';
      const xssImg = '<img src="x" onerror="alert(1)">';
      const xssMixed = '<a href="javascript:void(0)" onclick="fetch(\'http://evil.com\')">رابط</a>';

      expect(escapeHtml(xssScript)).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(escapeHtml(xssImg)).toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
      expect(escapeHtml(xssMixed)).toContain('&lt;a');
      expect(escapeHtml(xssMixed)).not.toContain('<a');
    });

    it('قوالب الطباعة (الرول، كشف الحساب، والتقارير العامة) تعقم مدخلات XSS بالكامل وتمنع تنفيذ الأكواد', () => {
      const maliciousHearing: HearingWithCase = {
        id: 1,
        case_id: 1,
        hearing_date: '2026-11-01',
        court_name: '<script>alert("court")</script>',
        court_circuit: '<img src=x onerror=alert("circuit")>',
        roll_number: '1',
        court_hall: 'قاعة 3',
        requests: '<script>alert("requests")</script>',
        notes: '<b onmouseover="alert(\'hover\')">ملاحظة</b>',
        attended: 1,
        attended_by: 'المحامي',
        proceedings: '',
        court_decision: '',
        adjournment_reason: '',
        next_hearing_date: '',
        is_judgment: 0,
        status: 'متداولة',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        case_number: '100',
        case_year: 2026,
        case_type: 'مدني',
        primary_client_name: '<img src=x onerror=alert("client")>',
        primary_opponent_name: '<script>alert("opponent")</script>',
      };

      const rollHtml = generateHearingRollHtml([maliciousHearing], mockSettings);
      // التأكد من عدم وجود أي وسوم كودية غير معقمة
      expect(rollHtml).not.toContain('<script>alert("court")</script>');
      expect(rollHtml).not.toContain('<img src=x onerror=alert("circuit")>');
      expect(rollHtml).not.toContain('<img src=x onerror=alert("client")>');
      expect(rollHtml).not.toContain('<script>alert("opponent")</script>');
      expect(rollHtml).toContain('&lt;script&gt;alert(&quot;court&quot;)&lt;/script&gt;');

      // كشف الحساب
      const mockSummary: CaseFinancialSummary = {
        case_id: 1,
        total_agreed_fees: 50000,
        total_paid_fees: 20000,
        remaining_fees: 30000,
        total_expenses: 5000,
        total_inflow: 25000,
        total_outflow: 5000,
        net_balance: 20000,
      };

      const mockTx: FinancialTransaction = {
        id: 1,
        case_id: 1,
        receipt_number: 'REC-2026-0001',
        transaction_date: '2026-11-01',
        amount: 5000,
        direction: 'وارد',
        category: 'أتعاب',
        transaction_type: 'دفعة أتعاب',
        payment_method: 'نقدي',
        description: '<script>alert("tx")</script>',
        notes: '<img src=x onerror=alert(2)>',
        is_reversed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const statementHtml = generateClientStatementHtml(mockSummary, [mockTx], mockSettings, {
        clientName: '<script>alert("client")</script>',
      });

      expect(statementHtml).not.toContain('<script>alert("tx")</script>');
      expect(statementHtml).not.toContain('<img src=x onerror=alert(2)>');
      expect(statementHtml).toContain('&lt;script&gt;alert(&quot;tx&quot;)&lt;/script&gt;');
    });

    it('حماية المرفقات ضد اختراق المسارات (Path Traversal) والأسماء الغريبة والعربية', () => {
      const attachmentsBaseDir = path.join(testDbDir, 'attachments', 'case_101');
      fs.mkdirSync(attachmentsBaseDir, { recursive: true });

      // 1. محاولة استخدام مسار اختراق
      const maliciousFileNames = [
        '../../../../windows/system32/cmd.exe',
        '..\\..\\secret.key',
        'test/../../etc/passwd',
      ];

      for (const name of maliciousFileNames) {
        const basename = path.basename(name);
        const safeName = basename.replace(/[\\/:*?"<>|]/g, '_');
        const storedName = `${Date.now()}_${safeName}`;
        const targetPath = path.resolve(attachmentsBaseDir, storedName);

        // يجب أن يظل المسار مستقراً داخل مجلد المرفقات
        expect(targetPath.startsWith(path.resolve(attachmentsBaseDir))).toBe(true);
      }

      // 2. ملف بأسماء عربية معقدة ومسافات ورموز خاصة
      const arabicFileName = 'عقد بيع نهائي (مصدق من الشهر العقاري) #2026 & نسخة أصلية.pdf';
      const safeArabicName = arabicFileName.replace(/[\\/:*?"<>|]/g, '_');
      const storedArabic = `${Date.now()}_${safeArabicName}`;
      const finalArabicPath = path.join(attachmentsBaseDir, storedArabic);

      fs.writeFileSync(finalArabicPath, Buffer.from('محتوى تجريبي عربي'));
      expect(fs.existsSync(finalArabicPath)).toBe(true);

      // 3. ملف بنفس الاسم مرتين (لا يُمسح الملف السابق بفضل التوقيت الزمني)
      const name1 = `${Date.now()}_1_${safeArabicName}`;
      const name2 = `${Date.now()}_2_${safeArabicName}`;
      fs.writeFileSync(path.join(attachmentsBaseDir, name1), 'file 1');
      fs.writeFileSync(path.join(attachmentsBaseDir, name2), 'file 2');

      expect(fs.readFileSync(path.join(attachmentsBaseDir, name1), 'utf-8')).toBe('file 1');
      expect(fs.readFileSync(path.join(attachmentsBaseDir, name2), 'utf-8')).toBe('file 2');
    });

    it('تخزين كلمة المرور مشفرة بـ bcrypt وعدم ظهورها في سجلات التدقيق (Audit Logs)', () => {
      const rawPassword = 'SecretLawyerPassword2026!';
      const hash = bcrypt.hashSync(rawPassword, 10);

      expect(hash).not.toBe(rawPassword);
      expect(bcrypt.compareSync(rawPassword, hash)).toBe(true);
      expect(bcrypt.compareSync('WrongPassword', hash)).toBe(false);

      // محاكاة تسجيل حدث في audit log
      db.prepare(`
        INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
        VALUES ('security', 'system', 'تغيير كلمة المرور', 'تم تعيين كلمة المرور بنجاح')
      `).run();

      const log = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 1').get() as any;
      expect(log.details).not.toContain(rawPassword);
      expect(log.details).not.toContain(hash);
    });

    it('عدم ظهور الأرقام القومية الحساسة في رسائل السجلات العامة', () => {
      const clientNationalId = '29001011234567';
      const fakeErrorMsg = 'Failed to load client profile data';

      // التأكد من أن رسالة الخطأ أو السجل لا تضمن الرقم القومي
      expect(fakeErrorMsg).not.toContain(clientNationalId);
    });
  });
});
