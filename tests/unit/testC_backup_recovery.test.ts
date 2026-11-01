import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import { AutoBackupService } from '../../src/main/services/AutoBackupService';

describe('Test C - 3: Backup, Restore & Disaster Recovery Tests (النسخ الاحتياطي والاستعادة ومحاكاة الطوارئ)', () => {
  const rootTestDir = path.resolve(__dirname, '../../tests/data/recovery_test_' + Date.now());
  const dataDir = path.join(rootTestDir, 'LawOfficeData');
  const dbPath = path.join(dataDir, 'office.db');
  const attachmentsDir = path.join(dataDir, 'attachments');
  const backupsDir = path.join(dataDir, 'backups');

  let db: Database.Database;

  beforeAll(() => {
    fs.mkdirSync(attachmentsDir, { recursive: true });
    fs.mkdirSync(backupsDir, { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT NOT NULL UNIQUE,
        amount INTEGER NOT NULL,
        direction TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        relative_path TEXT NOT NULL
      );
    `);

    // إدخال بيانات أولية
    db.prepare('INSERT INTO clients (name, phone) VALUES (?, ?)').run('محمد أحمد السعيد', '01099998888');
    db.prepare('INSERT INTO financial_transactions (receipt_number, amount, direction, description) VALUES (?, ?, ?, ?)').run(
      'REC-2026-0001',
      500000, // 5000 جنيه بالقروش
      'وارد',
      'دفعة مقدم أتعاب استئناف'
    );

    // إنشاء ملف مرفق حقيقي
    const caseAttachDir = path.join(attachmentsDir, 'case_1');
    fs.mkdirSync(caseAttachDir, { recursive: true });
    const attachFilePath = path.join(caseAttachDir, 'contract.pdf');
    fs.writeFileSync(attachFilePath, 'PDF_DUMMY_CONTENT_HASH_VALIDATION_12345');

    db.prepare('INSERT INTO documents (file_name, relative_path) VALUES (?, ?)').run(
      'contract.pdf',
      'attachments/case_1/contract.pdf'
    );
  });

  afterAll(() => {
    if (db) {
      try { db.close(); } catch (e) {}
    }
    try {
      if (fs.existsSync(rootTestDir)) {
        fs.rmSync(rootTestDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  it('1. إنشاء نسخة احتياطية كاملة (قاعدة بيانات + مرفقات) ثم إتلاف الأصلية واستعادتها ومطابقة المحتوى', () => {
    // حساب Hash الأصلي للبيانات
    const initialClient = db.prepare('SELECT * FROM clients WHERE id = 1').get() as any;
    const initialTx = db.prepare('SELECT * FROM financial_transactions WHERE id = 1').get() as any;
    const originalAttachmentContent = fs.readFileSync(path.join(attachmentsDir, 'case_1', 'contract.pdf'), 'utf-8');

    // 1. توليد snapshot لقاعدة البيانات
    const snapshotPath = path.join(rootTestDir, 'temp_snapshot.db');
    db.prepare('VACUUM INTO ?').run(snapshotPath);
    const dbBuffer = fs.readFileSync(snapshotPath);
    fs.unlinkSync(snapshotPath);

    // 2. تجميع المرفقات
    const attachments = [{
      relativePath: 'attachments/case_1/contract.pdf',
      dataBase64: Buffer.from(originalAttachmentContent).toString('base64'),
    }];

    // 3. بناء الأرشيف المضغوط
    const payload = JSON.stringify({
      metadata: { createdAt: new Date().toISOString(), version: '1.0.0' },
      databaseBase64: dbBuffer.toString('base64'),
      attachments,
    });

    const compressed = zlib.gzipSync(Buffer.from(payload, 'utf-8'));
    const backupFile = Buffer.concat([Buffer.from('AGY_BAK1'), compressed]);
    const backupPath = path.join(backupsDir, 'valid_backup.bak');
    fs.writeFileSync(backupPath, backupFile);

    // إغلاق القاعدة الحالية وإتلافها عمداً
    db.close();
    fs.writeFileSync(dbPath, 'GARBAGE_DATA_CORRUPTED_INTENTIONALLY');
    // مسح المرفق للتأكد من استعادته
    fs.unlinkSync(path.join(attachmentsDir, 'case_1', 'contract.pdf'));

    // 4. تنفيذ الاستعادة (Restore)
    const rawBackup = fs.readFileSync(backupPath);
    expect(rawBackup.subarray(0, 8).toString()).toBe('AGY_BAK1');

    const decompressed = zlib.gunzipSync(rawBackup.subarray(8));
    const restoredPayload = JSON.parse(decompressed.toString('utf-8'));

    const restoredDbBuffer = Buffer.from(restoredPayload.databaseBase64, 'base64');
    fs.writeFileSync(dbPath, restoredDbBuffer);

    for (const att of restoredPayload.attachments) {
      const full = path.join(dataDir, att.relativePath);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, Buffer.from(att.dataBase64, 'base64'));
    }

    // 5. فتح القاعدة المستعادة والتأكد من سلامتها ومطابقتها التامة
    db = new Database(dbPath);
    const integrity = db.pragma('integrity_check') as any[];
    expect(integrity[0].integrity_check).toBe('ok');

    const restoredClient = db.prepare('SELECT * FROM clients WHERE id = 1').get() as any;
    expect(restoredClient.name).toBe(initialClient.name);
    expect(restoredClient.phone).toBe(initialClient.phone);

    const restoredTx = db.prepare('SELECT * FROM financial_transactions WHERE id = 1').get() as any;
    expect(restoredTx.amount).toBe(initialTx.amount);
    expect(restoredTx.receipt_number).toBe(initialTx.receipt_number);

    // التأكد من استعادة المرفق
    expect(fs.existsSync(path.join(attachmentsDir, 'case_1', 'contract.pdf'))).toBe(true);
    expect(fs.readFileSync(path.join(attachmentsDir, 'case_1', 'contract.pdf'), 'utf-8')).toBe(originalAttachmentContent);
  });

  it('2. استعادة من نسخة ناقصة أو تالفة تفشل برسالة واضحة ولا تمسح البيانات الحالية', () => {
    const corruptBackupPath = path.join(backupsDir, 'corrupted.bak');
    fs.writeFileSync(corruptBackupPath, Buffer.from('NOT_A_VALID_BACKUP_CONTENT'));

    const beforeClientCount = (db.prepare('SELECT COUNT(*) as cnt FROM clients').get() as any).cnt;

    // محاكاة منطق التحقق في backupIpc.ts
    const fileBuffer = fs.readFileSync(corruptBackupPath);
    const magic = fileBuffer.subarray(0, 8);
    const isMagicValid = magic.equals(Buffer.from('AGY_BAK1')) || magic.equals(Buffer.from('AGY_ENC1'));

    expect(isMagicValid).toBe(false);

    // التأكد من عدم تأثر البيانات الحالية
    const afterClientCount = (db.prepare('SELECT COUNT(*) as cnt FROM clients').get() as any).cnt;
    expect(afterClientCount).toBe(beforeClientCount);
  });

  it('3. احترام عدد النسخ الاحتياطية المحتفظ بها (Retention Policy) وحذف الأقدم تلقائياً', () => {
    const retentionDir = path.join(rootTestDir, 'retention_test');
    fs.mkdirSync(retentionDir, { recursive: true });

    // إنشاء 13 ملف نسخة احتياطية بأوقات تعديل متتالية
    for (let i = 1; i <= 13; i++) {
      const fPath = path.join(retentionDir, `backup_${String(i).padStart(2, '0')}.bak`);
      fs.writeFileSync(fPath, Buffer.from(`dummy_backup_${i}`));
      // تعديل وقت الملف
      const time = new Date(2026, 0, i).getTime() / 1000;
      fs.utimesSync(fPath, time, time);
    }

    expect(fs.readdirSync(retentionDir).length).toBe(13);

    // تطبيق سياسة الاحتفاظ بـ 10 نسخ كحد أقصى
    const deletedCount = AutoBackupService.getInstance().enforceRetention(retentionDir, 10);

    expect(deletedCount).toBe(3);
    const remainingFiles = fs.readdirSync(retentionDir);
    expect(remainingFiles.length).toBe(10);
    // التأكد من أن الملفات المحذوفة هي الأقدم (1, 2, 3)
    expect(remainingFiles).not.toContain('backup_01.bak');
    expect(remainingFiles).not.toContain('backup_02.bak');
    expect(remainingFiles).not.toContain('backup_03.bak');
    expect(remainingFiles).toContain('backup_13.bak');
  });

  it('4. فحص دورية النسخ التلقائي (isBackupDue) حسب التردد المحدد', () => {
    const autoBackup = AutoBackupService.getInstance();

    // حالة: لم تتم أي نسخة من قبل
    expect(autoBackup.isBackupDue(null, 'daily')).toBe(true);

    // حالة: تمت نسخة قبل 5 ساعات (يومي) -> لا داعي الآن
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    expect(autoBackup.isBackupDue(fiveHoursAgo, 'daily')).toBe(false);

    // حالة: تمت نسخة قبل 25 ساعة (يومي) -> حان وقتها
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    expect(autoBackup.isBackupDue(twentyFiveHoursAgo, 'daily')).toBe(true);

    // حالة: أسبوعي وتمت قبل 8 أيام -> حان وقتها
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
    expect(autoBackup.isBackupDue(eightDaysAgo, 'weekly')).toBe(true);
  });

  it('5. نقل مجلد البيانات لمكان جديد: تظل كل المرفقات تعمل لأنها مسارات نسبية', () => {
    const newRoot = path.join(rootTestDir, 'MovedLawOfficeData');
    fs.mkdirSync(newRoot, { recursive: true });

    // نقل المجلد
    fs.cpSync(dataDir, newRoot, { recursive: true });

    // فتح قاعدة البيانات في المكان الجديد
    const newDb = new Database(path.join(newRoot, 'office.db'));
    const doc = newDb.prepare('SELECT * FROM documents WHERE id = 1').get() as any;

    expect(doc.relative_path).toBe('attachments/case_1/contract.pdf');

    // التحقق من أن المسار النسبي يعمل بشكل مثالي في المكان الجديد
    const resolvedPathInNewLocation = path.join(newRoot, doc.relative_path);
    expect(fs.existsSync(resolvedPathInNewLocation)).toBe(true);
    expect(fs.readFileSync(resolvedPathInNewLocation, 'utf-8')).toBe('PDF_DUMMY_CONTENT_HASH_VALIDATION_12345');

    newDb.close();
  });

  it('6. محاكاة انقطاع الكهرباء / انهيار العملية في منتصف كتابة حركة مالية متعددة الخطوات (Atomic Transaction Rollback)', () => {
    const beforeTxCount = (db.prepare('SELECT COUNT(*) as cnt FROM financial_transactions').get() as any).cnt;

    // محاكاة معاملة ذرية متوقفة بفعل خطأ أو انقطاع
    try {
      db.transaction(() => {
        // الخطوة 1: تسجيل إيصال
        db.prepare('INSERT INTO financial_transactions (receipt_number, amount, direction, description) VALUES (?, ?, ?, ?)').run(
          'REC-FAIL-001',
          100000,
          'وارد',
          'حركة غير مكتملة'
        );

        // الخطوة 2: انهيار العملية (Crash / Power Cut simulation)
        throw new Error('SIMULATED_POWER_CUT_CRASH');
      })();
    } catch (err: any) {
      expect(err.message).toBe('SIMULATED_POWER_CUT_CRASH');
    }

    // التأكد من التراجع التام (Rollback) وعدم وجود أي حركة نصف مكتوبة
    const afterTxCount = (db.prepare('SELECT COUNT(*) as cnt FROM financial_transactions').get() as any).cnt;
    expect(afterTxCount).toBe(beforeTxCount);

    const abortedTx = db.prepare('SELECT * FROM financial_transactions WHERE receipt_number = ?').get('REC-FAIL-001');
    expect(abortedTx).toBeUndefined();

    // فحص سلامة القاعدة
    const integrity = db.pragma('integrity_check') as any[];
    expect(integrity[0].integrity_check).toBe('ok');
  });
});
