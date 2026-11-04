import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationService } from '../../src/main/services/MigrationService';
import { CaseAnnouncement, CreateAnnouncementInput, AnnouncementWarning } from '../../src/shared/types';

describe('Phase 10: Case Announcements & Process Serving Logic', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrationService = new MigrationService(db);
    migrationService.runMigrations();

    // Insert dummy case
    db.prepare(`
      INSERT INTO cases (id, case_number, case_year, subject, court_name, court_degree, case_type, status)
      VALUES (1, '1234', 2026, 'دعوى صحة ونفاذ', 'محكمة شمال القاهرة الابتدائية', 'أول درجة', 'مدني', 'متداولة')
    `).run();

    // Insert dummy hearing
    db.prepare(`
      INSERT INTO hearings (id, case_id, hearing_date, court_name, status)
      VALUES (1, 1, '2026-11-20', 'محكمة شمال القاهرة الابتدائية', 'محددة')
    `).run();
  });

  it('creates an announcement and automatically generates a linked financial transaction when fee > 0', () => {
    const feePiasters = 15000; // 150.00 EGP
    const announcementType = 'صحيفة دعوى';
    const recipientName = 'أحمد السيد محمود';

    // Insert announcement
    const stmt = db.prepare(`
      INSERT INTO case_announcements (
        case_id, hearing_id, recipient_name, recipient_capacity,
        announcement_type, bailiff_office, request_number,
        delivery_date, status, fee_amount, attempt_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'قيد الانتظار', ?, 1)
    `);

    const res = stmt.run(
      1, 1, recipientName, 'المدعى عليه الأول',
      announcementType, 'محضرين النزهة', 'REC-9988',
      '2026-11-04', feePiasters
    );
    const annId = Number(res.lastInsertRowid);

    // Create linked financial transaction
    const finStmt = db.prepare(`
      INSERT INTO financial_transactions (
        case_id, category, transaction_type, direction, amount,
        transaction_date, payment_method, receipt_number, description, notes, announcement_id
      ) VALUES (?, 'رسوم قضائية', 'رسوم إعلان محضرين', 'صادر', ?, '2026-11-04', 'نقدي', 'REC-2026-0001', 'رسم إعلان', 'ملاحظات', ?)
    `);
    const finRes = finStmt.run(1, feePiasters, annId);
    const txId = Number(finRes.lastInsertRowid);

    db.prepare('UPDATE case_announcements SET transaction_id = ? WHERE id = ?').run(txId, annId);

    // Verify announcement
    const ann = db.prepare('SELECT * FROM case_announcements WHERE id = ?').get(annId) as any;
    expect(ann.id).toBe(annId);
    expect(ann.fee_amount).toBe(15000);
    expect(ann.transaction_id).toBe(txId);
    expect(ann.attempt_number).toBe(1);

    // Verify financial transaction
    const tx = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(txId) as any;
    expect(tx.amount).toBe(15000);
    expect(tx.category).toBe('رسوم قضائية');
    expect(tx.transaction_type).toBe('رسوم إعلان محضرين');
    expect(tx.direction).toBe('صادر');
    expect(tx.announcement_id).toBe(annId);
    expect(tx.is_reversed).toBe(0);
  });

  it('creates re-attempts (إعادة إعلان) correctly incrementing attempt_number and preserving link to root parent', () => {
    // Attempt 1 (Root)
    const rootRes = db.prepare(`
      INSERT INTO case_announcements (
        case_id, hearing_id, recipient_name, announcement_type, status, attempt_number
      ) VALUES (1, 1, 'محمود حسن', 'صحيفة دعوى', 'لم يُعلن', 1)
    `).run();
    const rootId = Number(rootRes.lastInsertRowid);

    // Attempt 2 (Reattempt 1)
    const att2Res = db.prepare(`
      INSERT INTO case_announcements (
        case_id, hearing_id, recipient_name, announcement_type, status, parent_id, attempt_number
      ) VALUES (1, 1, 'محمود حسن', 'إعادة إعلان (صحيفة دعوى)', 'لم يُعلن', ?, 2)
    `).run(rootId);
    const att2Id = Number(att2Res.lastInsertRowid);

    // Attempt 3 (Reattempt 2)
    const maxAtt = db.prepare(`
      SELECT MAX(attempt_number) as max_att FROM case_announcements WHERE id = ? OR parent_id = ?
    `).get(rootId, rootId) as { max_att: number };

    expect(maxAtt.max_att).toBe(2);

    const att3Res = db.prepare(`
      INSERT INTO case_announcements (
        case_id, hearing_id, recipient_name, announcement_type, status, parent_id, attempt_number
      ) VALUES (1, 1, 'محمود حسن', 'إعادة إعلان (صحيفة دعوى)', 'أُعلن', ?, ?)
    `).run(rootId, maxAtt.max_att + 1);
    const att3Id = Number(att3Res.lastInsertRowid);

    // Verify attempts chain
    const allAttempts = db.prepare(`
      SELECT id, attempt_number, parent_id, status FROM case_announcements
      WHERE id = ? OR parent_id = ?
      ORDER BY attempt_number ASC
    `).all(rootId, rootId) as any[];

    expect(allAttempts).toHaveLength(3);
    expect(allAttempts[0].id).toBe(rootId);
    expect(allAttempts[0].attempt_number).toBe(1);
    expect(allAttempts[0].status).toBe('لم يُعلن');

    expect(allAttempts[1].id).toBe(att2Id);
    expect(allAttempts[1].attempt_number).toBe(2);
    expect(allAttempts[1].parent_id).toBe(rootId);

    expect(allAttempts[2].id).toBe(att3Id);
    expect(allAttempts[2].attempt_number).toBe(3);
    expect(allAttempts[2].parent_id).toBe(rootId);
    expect(allAttempts[2].status).toBe('أُعلن');
  });

  it('reverses financial transaction with reversing entry (قيد عكسي) upon announcement deletion', () => {
    // 1. Create announcement
    const annRes = db.prepare(`
      INSERT INTO case_announcements (
        case_id, recipient_name, announcement_type, fee_amount
      ) VALUES (1, 'سعيد عبد الله', 'إعلان حكم', 8000)
    `).run();
    const annId = Number(annRes.lastInsertRowid);

    // 2. Create original transaction
    const finRes = db.prepare(`
      INSERT INTO financial_transactions (
        case_id, category, transaction_type, direction, amount,
        transaction_date, payment_method, receipt_number, description, notes, announcement_id
      ) VALUES (1, 'رسوم قضائية', 'رسوم إعلان محضرين', 'صادر', 8000, '2026-11-04', 'نقدي', 'REC-001', 'رسم إعلان حكم', 'ملاحظات', ?)
    `).run(annId);
    const origTxId = Number(finRes.lastInsertRowid);

    db.prepare('UPDATE case_announcements SET transaction_id = ? WHERE id = ?').run(origTxId, annId);

    // 3. Perform Deletion with Reversal logic
    const origTx = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(origTxId) as any;
    expect(origTx.is_reversed).toBe(0);

    const revRes = db.prepare(`
      INSERT INTO financial_transactions (
        case_id, category, transaction_type, direction, amount,
        transaction_date, payment_method, receipt_number, description, notes,
        announcement_id, is_reversed, reversal_of_id
      ) VALUES (?, ?, ?, 'وارد', ?, '2026-11-04', 'نقدي', 'REV-001', 'قيد عكسي لحذف الإعلان', 'ملاحظات', ?, 1, ?)
    `).run(origTx.case_id, origTx.category, origTx.transaction_type, origTx.amount, annId, origTx.id);

    db.prepare(`
      UPDATE financial_transactions
      SET is_reversed = 1, reversed_by_id = ?, reversal_reason = 'حذف الإعلان القضائي'
      WHERE id = ?
    `).run(Number(revRes.lastInsertRowid), origTx.id);

    db.prepare('DELETE FROM case_announcements WHERE id = ?').run(annId);

    // 4. Assertions
    const deletedAnn = db.prepare('SELECT * FROM case_announcements WHERE id = ?').get(annId);
    expect(deletedAnn).toBeUndefined();

    const updatedOrig = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(origTxId) as any;
    expect(updatedOrig.is_reversed).toBe(1);
    expect(updatedOrig.reversal_reason).toBe('حذف الإعلان القضائي');
    expect(updatedOrig.reversed_by_id).toBe(Number(revRes.lastInsertRowid));

    const revEntry = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(Number(revRes.lastInsertRowid)) as any;
    expect(revEntry.direction).toBe('وارد'); // Opposite direction of 'صادر'
    expect(revEntry.amount).toBe(8000);
    expect(revEntry.reversal_of_id).toBe(origTxId);
  });

  it('calculates hearing announcement warnings based on configurable days threshold', () => {
    // Current date: 2026-11-04
    // Hearing 1: 2026-11-06 (in 2 days) -> Warning if threshold is 3
    db.prepare(`
      INSERT INTO hearings (id, case_id, hearing_date, court_name, status)
      VALUES (10, 1, '2026-11-06', 'محكمة القاهرة', 'محددة')
    `).run();

    // Hearing 2: 2026-11-15 (in 11 days) -> No warning if threshold is 3
    db.prepare(`
      INSERT INTO hearings (id, case_id, hearing_date, court_name, status)
      VALUES (11, 1, '2026-11-15', 'محكمة القاهرة', 'محددة')
    `).run();

    // Announcement for Hearing 1 (pending)
    db.prepare(`
      INSERT INTO case_announcements (
        id, case_id, hearing_id, recipient_name, announcement_type, status
      ) VALUES (101, 1, 10, 'خالد توفيق', 'صحيفة دعوى', 'قيد الانتظار')
    `).run();

    // Announcement for Hearing 2 (pending)
    db.prepare(`
      INSERT INTO case_announcements (
        id, case_id, hearing_id, recipient_name, announcement_type, status
      ) VALUES (102, 1, 11, 'طارق مصطفى', 'إعلان بالحضور', 'قيد الانتظار')
    `).run();

    // Announcement for Hearing 1 that is already served (أُعلن) -> Should not trigger warning
    db.prepare(`
      INSERT INTO case_announcements (
        id, case_id, hearing_id, recipient_name, announcement_type, status
      ) VALUES (103, 1, 10, 'سامح شكري', 'إعلان بالحضور', 'أُعلن')
    `).run();

    const today = '2026-11-04';
    const thresholdDays = 3;

    const sql = `
      SELECT 
        a.id as announcement_id,
        a.hearing_id,
        h.hearing_date,
        a.status,
        CAST(julianday(h.hearing_date) - julianday(?) AS INTEGER) as days_until_hearing
      FROM case_announcements a
      JOIN hearings h ON h.id = a.hearing_id
      WHERE h.hearing_date >= ? 
        AND julianday(h.hearing_date) - julianday(?) <= ?
        AND a.status IN ('قيد الانتظار', 'لم يُعلن', 'ورد بدون نتيجة')
    `;

    const warnings = db.prepare(sql).all(today, today, today, thresholdDays) as any[];

    expect(warnings).toHaveLength(1);
    expect(warnings[0].announcement_id).toBe(101);
    expect(warnings[0].hearing_date).toBe('2026-11-06');
    expect(warnings[0].days_until_hearing).toBe(2);
  });
});
