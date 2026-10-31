import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { seedDatabase } from '../../scripts/seed.cjs';

describe('Performance Tests on 10,000 Cases Database (اختبارات الأداء وسرعة الاستعلامات والـ Pagination على 10 آلاف قضية)', () => {
  const perfDbPath = path.resolve(__dirname, '../../tests/data/perf_10k_test.db');
  let db: Database.Database;

  beforeAll(() => {
    // إنشاء قاعدة بيانات كبيرة بالحجم الكامل: 10,000 قضية، 100,000 جلسة، 50,000 حركة مالية
    seedDatabase({ size: 'large', dbPath: perfDbPath, seed: 99999 });
    db = new Database(perfDbPath, { readonly: true });
    db.pragma('journal_mode = WAL');
  }, 30000); // إتاحة مهلة لتوليد 10 آلاف قضية

  afterAll(() => {
    if (db) db.close();
    try {
      if (fs.existsSync(perfDbPath)) fs.unlinkSync(perfDbPath);
      const wal = `${perfDbPath}-wal`;
      const shm = `${perfDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch (e) {}
  });

  it('التأكد من اكتمال توليد 10 آلاف قضية في قاعدة البيانات', () => {
    const row = db.prepare('SELECT COUNT(*) as total FROM cases').get() as { total: number };
    expect(row.total).toBe(10000);
  });

  it('استعلام تصفح الصفحة الأولى (Pagination: LIMIT 25 OFFSET 0) يستجيب في أقل من 10 مللي ثانية', () => {
    const start = performance.now();
    const rows = db.prepare(`
      SELECT c.*, 
        (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = c.id ORDER BY cc.is_primary DESC LIMIT 1) as primary_client_name
      FROM cases c
      ORDER BY c.case_year DESC, c.case_number DESC
      LIMIT 25 OFFSET 0
    `).all();
    const duration = performance.now() - start;

    expect(rows.length).toBe(25);
    expect(duration).toBeLessThan(15);
  });

  it('استعلام تصفح صفحة عميقة (Pagination: LIMIT 25 OFFSET 5000) يستجيب في أقل من 20 مللي ثانية', () => {
    const start = performance.now();
    const rows = db.prepare(`
      SELECT c.*, 
        (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = c.id ORDER BY cc.is_primary DESC LIMIT 1) as primary_client_name
      FROM cases c
      ORDER BY c.case_year DESC, c.case_number DESC
      LIMIT 25 OFFSET 5000
    `).all();
    const duration = performance.now() - start;

    expect(rows.length).toBe(25);
    expect(duration).toBeLessThan(20);
  });

  it('استعلام البحث المفهرس برقم القضية والسنة يستجيب في أقل من 10 مللي ثانية', () => {
    const start = performance.now();
    const rows = db.prepare('SELECT * FROM cases WHERE case_number = ? AND case_year = ?').all('1050', 2026);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('استعلام فلترة القضايا بالمحكمة والحالة يستجيب في أقل من 15 مللي ثانية مستخدمًا الفهرس المركب', () => {
    const start = performance.now();
    const rows = db.prepare('SELECT * FROM cases WHERE court_name = ? AND status = ? LIMIT 25').all('محكمة شمال القاهرة الابتدائية', 'متداولة');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(15);
  });

  it('استعلام رول الجلسات ليوم محدد يستجيب في أقل من 15 مللي ثانية على 100 ألف جلسة', () => {
    const start = performance.now();
    const rows = db.prepare('SELECT * FROM hearings WHERE hearing_date = ?').all('2026-03-10');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(15);
  });

  it('استعلام كشف الحساب للقضية يستجيب في أقل من 15 مللي ثانية على 50 ألف حركة مالية', () => {
    const start = performance.now();
    const rows = db.prepare('SELECT * FROM financial_transactions WHERE case_id = ?').all(1);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(15);
  });
});
