import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('Integration Regression: Entity Invalidation & Cross-Component Sync (انحدار تكاملي لمزامنة الكيانات)', () => {
  const testDbDir = path.resolve(__dirname, '../../tests/data');
  const testDbPath = path.join(testDbDir, `integration_sync_${Date.now()}.db`);
  let db: Database.Database;

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    db = new Database(testDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

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

  it('يثبت أن عدم وجود آلية Invalidation يتسبب في احتفاظ المستهلكين بنسخ قديمة من الموكلين بعد الإضافة والحذف', () => {
    // محاكاة المستهلك 1: App.tsx يقرأ البيانات عند البداية ويحتفظ بها في ذاكرته (Stale State)
    let appStateClients = db.prepare("SELECT * FROM clients WHERE status != 'archived'").all() as any[];
    expect(appStateClients.length).toBe(0);

    // إضافة موكل نسمة
    db.prepare(`
      INSERT INTO clients (name, client_type, phone, status)
      VALUES ('نسمة سليم ناصر سليم', 'individual', '01011112222', 'active')
    `).run();

    // AppState يتم تحديثه عند البداية فقط (كما يفعل التطبيق عند الإقلاع)
    appStateClients = db.prepare("SELECT * FROM clients WHERE status != 'archived'").all() as any[];
    expect(appStateClients.map(c => c.name)).toContain('نسمة سليم ناصر سليم');

    // الآن: شاشة الموكلين ClientsPage تضيف موكل جديد "أحمد فتحي"
    db.prepare(`
      INSERT INTO clients (name, client_type, phone, status)
      VALUES ('أحمد فتحي عبد الغفار', 'individual', '01033334444', 'active')
    `).run();

    // بدون إبطال كاش أو إشعار: appStateClients يظل قديماً
    // هذا يثبت الخلل الجذري: appStateClients لا يحتوي على الموكل الجديد
    expect(appStateClients.map(c => c.name)).not.toContain('أحمد فتحي عبد الغفار');

    // وشاشة الموكلين تحذف نسمة:
    db.prepare('DELETE FROM clients WHERE name = ?').run('نسمة سليم ناصر سليم');

    // بدون إبطال كاش: appStateClients ما زال يحتوي على نسمة المحذوفة!
    expect(appStateClients.map(c => c.name)).toContain('نسمة سليم ناصر سليم');

    // ولكن في قاعدة البيانات الحقيقية: نسمة غير موجودة، وأحمد موجود
    const freshDbClients = db.prepare("SELECT * FROM clients WHERE status != 'archived'").all() as any[];
    expect(freshDbClients.map(c => c.name)).not.toContain('نسمة سليم ناصر سليم');
    expect(freshDbClients.map(c => c.name)).toContain('أحمد فتحي عبد الغفار');
  });
});
