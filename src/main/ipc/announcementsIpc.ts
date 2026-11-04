import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import {
  CaseAnnouncement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementFilter,
  AnnouncementWarning
} from '../../shared/types';

export function registerAnnouncementsIpc(): void {
  const dbService = DatabaseService.getInstance();

  function generateReceiptNumber(db: any, prefix = 'REC'): string {
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;
    const lastRow = db.prepare(`
      SELECT receipt_number FROM financial_transactions
      WHERE receipt_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).get(pattern) as { receipt_number: string } | undefined;

    let seq = 1;
    if (lastRow?.receipt_number) {
      const parts = lastRow.receipt_number.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) {
        seq = num + 1;
      }
    }
    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
  }

  // 1. Get Announcements by Case
  ipcMain.handle('announcements:getByCase', async (_event, caseId: number): Promise<CaseAnnouncement[]> => {
    const db = dbService.getDb();
    const sql = `
      SELECT 
        a.*,
        c.subject as case_title,
        c.case_number,
        c.court_name,
        h.hearing_date,
        h.court_decision as hearing_decision
      FROM case_announcements a
      LEFT JOIN cases c ON c.id = a.case_id
      LEFT JOIN hearings h ON h.id = a.hearing_id
      WHERE a.case_id = ?
      ORDER BY COALESCE(a.parent_id, a.id) ASC, a.attempt_number ASC, a.id ASC
    `;
    return db.prepare(sql).all(caseId) as CaseAnnouncement[];
  });

  // 2. Get All Announcements with Filter
  ipcMain.handle('announcements:getAll', async (_event, filter?: AnnouncementFilter): Promise<CaseAnnouncement[]> => {
    const db = dbService.getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.case_id) {
      conditions.push('a.case_id = ?');
      params.push(filter.case_id);
    }

    if (filter?.hearing_id) {
      conditions.push('a.hearing_id = ?');
      params.push(filter.hearing_id);
    }

    if (filter?.status) {
      if (filter.status === 'pending_only') {
        conditions.push("a.status IN ('قيد الانتظار', 'لم يُعلن', 'ورد بدون نتيجة')");
      } else {
        conditions.push('a.status = ?');
        params.push(filter.status);
      }
    }

    if (filter?.bailiff_office && filter.bailiff_office !== 'الكل') {
      conditions.push('a.bailiff_office = ?');
      params.push(filter.bailiff_office);
    }

    if (filter?.announcement_type && filter.announcement_type !== 'الكل') {
      conditions.push('a.announcement_type = ?');
      params.push(filter.announcement_type);
    }

    if (filter?.startDate) {
      conditions.push('(a.delivery_date >= ? OR a.return_date >= ?)');
      params.push(filter.startDate, filter.startDate);
    }

    if (filter?.endDate) {
      conditions.push('(a.delivery_date <= ? OR a.return_date <= ?)');
      params.push(filter.endDate, filter.endDate);
    }

    if (filter?.query && filter.query.trim()) {
      const q = `%${filter.query.trim()}%`;
      conditions.push(`(
        a.recipient_name LIKE ? OR
        a.bailiff_office LIKE ? OR
        a.request_number LIKE ? OR
        a.bailiff_name LIKE ? OR
        c.subject LIKE ? OR
        c.case_number LIKE ?
      )`);
      params.push(q, q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        a.*,
        c.subject as case_title,
        c.case_number,
        c.court_name,
        h.hearing_date,
        h.court_decision as hearing_decision
      FROM case_announcements a
      LEFT JOIN cases c ON c.id = a.case_id
      LEFT JOIN hearings h ON h.id = a.hearing_id
      ${whereClause}
      ORDER BY a.id DESC
    `;

    return db.prepare(sql).all(...params) as CaseAnnouncement[];
  });

  // 3. Get Announcement by ID
  ipcMain.handle('announcements:getById', async (_event, id: number): Promise<CaseAnnouncement | null> => {
    const db = dbService.getDb();
    const sql = `
      SELECT 
        a.*,
        c.subject as case_title,
        c.case_number,
        c.court_name,
        h.hearing_date,
        h.court_decision as hearing_decision
      FROM case_announcements a
      LEFT JOIN cases c ON c.id = a.case_id
      LEFT JOIN hearings h ON h.id = a.hearing_id
      WHERE a.id = ?
    `;
    const res = db.prepare(sql).get(id) as CaseAnnouncement | undefined;
    return res || null;
  });

  // 4. Create Announcement (with optional fee transaction)
  ipcMain.handle('announcements:create', async (_event, input: CreateAnnouncementInput): Promise<CaseAnnouncement> => {
    const db = dbService.getDb();

    const tx = db.transaction(() => {
      let attemptNumber = 1;
      let parentId = input.parent_id || null;

      if (parentId) {
        const parent = db.prepare('SELECT id, parent_id, attempt_number FROM case_announcements WHERE id = ?').get(parentId) as any;
        if (parent) {
          // If parent itself has a parent, link to top root or parent
          const rootId = parent.parent_id || parent.id;
          parentId = rootId;

          // Find max attempt_number for this root
          const maxAttemptRow = db.prepare(`
            SELECT MAX(attempt_number) as max_att FROM case_announcements
            WHERE id = ? OR parent_id = ?
          `).get(rootId, rootId) as { max_att: number | null };

          attemptNumber = (maxAttemptRow?.max_att || 1) + 1;
        }
      }

      const stmt = db.prepare(`
        INSERT INTO case_announcements (
          case_id, hearing_id, recipient_name, recipient_capacity, recipient_address,
          announcement_type, bailiff_office, request_number, bailiff_name,
          delivery_date, return_date, status, failure_reason, notes,
          fee_amount, parent_id, attempt_number
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `);

      const result = stmt.run(
        input.case_id,
        input.hearing_id || null,
        input.recipient_name,
        input.recipient_capacity || 'المطلوب إعلانه',
        input.recipient_address || null,
        input.announcement_type,
        input.bailiff_office || null,
        input.request_number || null,
        input.bailiff_name || null,
        input.delivery_date || null,
        input.return_date || null,
        input.status || 'قيد الانتظار',
        input.failure_reason || null,
        input.notes || null,
        input.fee_amount || 0,
        parentId,
        attemptNumber
      );

      const announcementId = Number(result.lastInsertRowid);

      // If fee > 0, create financial transaction
      let transactionId: number | null = null;
      if (input.fee_amount && input.fee_amount > 0) {
        const receiptNumber = generateReceiptNumber(db, 'REC-ANN');
        const today = new Date().toISOString().split('T')[0];
        const date = input.delivery_date || today;

        const finStmt = db.prepare(`
          INSERT INTO financial_transactions (
            case_id, category, transaction_type, direction, amount,
            transaction_date, payment_method, receipt_number, description, notes, announcement_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const finRes = finStmt.run(
          input.case_id,
          'رسوم قضائية',
          'رسوم إعلان محضرين',
          'صادر',
          input.fee_amount,
          date,
          'نقدي',
          receiptNumber,
          `رسم إعلان (${input.announcement_type}) للمطلوب إعلانه: ${input.recipient_name}`,
          input.notes || null,
          announcementId
        );

        transactionId = Number(finRes.lastInsertRowid);

        db.prepare('UPDATE case_announcements SET transaction_id = ? WHERE id = ?').run(transactionId, announcementId);
      }

      return db.prepare(`
        SELECT 
          a.*,
          c.subject as case_title,
          c.case_number,
          c.court_name,
          h.hearing_date,
          h.court_decision as hearing_decision
        FROM case_announcements a
        LEFT JOIN cases c ON c.id = a.case_id
        LEFT JOIN hearings h ON h.id = a.hearing_id
        WHERE a.id = ?
      `).get(announcementId) as CaseAnnouncement;
    });

    return tx();
  });

  // 5. Update Announcement
  ipcMain.handle('announcements:update', async (_event, id: number, input: UpdateAnnouncementInput): Promise<CaseAnnouncement> => {
    const db = dbService.getDb();

    const existing = db.prepare('SELECT * FROM case_announcements WHERE id = ?').get(id) as CaseAnnouncement | undefined;
    if (!existing) {
      throw new Error(`Announcement with id ${id} not found`);
    }

    const setClauses: string[] = [];
    const params: any[] = [];

    if (input.hearing_id !== undefined) {
      setClauses.push('hearing_id = ?');
      params.push(input.hearing_id);
    }
    if (input.recipient_name !== undefined) {
      setClauses.push('recipient_name = ?');
      params.push(input.recipient_name);
    }
    if (input.recipient_capacity !== undefined) {
      setClauses.push('recipient_capacity = ?');
      params.push(input.recipient_capacity);
    }
    if (input.recipient_address !== undefined) {
      setClauses.push('recipient_address = ?');
      params.push(input.recipient_address);
    }
    if (input.announcement_type !== undefined) {
      setClauses.push('announcement_type = ?');
      params.push(input.announcement_type);
    }
    if (input.bailiff_office !== undefined) {
      setClauses.push('bailiff_office = ?');
      params.push(input.bailiff_office);
    }
    if (input.request_number !== undefined) {
      setClauses.push('request_number = ?');
      params.push(input.request_number);
    }
    if (input.bailiff_name !== undefined) {
      setClauses.push('bailiff_name = ?');
      params.push(input.bailiff_name);
    }
    if (input.delivery_date !== undefined) {
      setClauses.push('delivery_date = ?');
      params.push(input.delivery_date);
    }
    if (input.return_date !== undefined) {
      setClauses.push('return_date = ?');
      params.push(input.return_date);
    }
    if (input.status !== undefined) {
      setClauses.push('status = ?');
      params.push(input.status);
    }
    if (input.failure_reason !== undefined) {
      setClauses.push('failure_reason = ?');
      params.push(input.failure_reason);
    }
    if (input.notes !== undefined) {
      setClauses.push('notes = ?');
      params.push(input.notes);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      db.prepare(`UPDATE case_announcements SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    }

    return db.prepare(`
      SELECT 
        a.*,
        c.subject as case_title,
        c.case_number,
        c.court_name,
        h.hearing_date,
        h.court_decision as hearing_decision
      FROM case_announcements a
      LEFT JOIN cases c ON c.id = a.case_id
      LEFT JOIN hearings h ON h.id = a.hearing_id
      WHERE a.id = ?
    `).get(id) as CaseAnnouncement;
  });

  // 6. Create Reattempt Announcement
  ipcMain.handle('announcements:createReattempt', async (_event, parentAnnouncementId: number, input: Partial<CreateAnnouncementInput>): Promise<CaseAnnouncement> => {
    const db = dbService.getDb();
    const parent = db.prepare('SELECT * FROM case_announcements WHERE id = ?').get(parentAnnouncementId) as CaseAnnouncement | undefined;
    if (!parent) {
      throw new Error(`Parent announcement with id ${parentAnnouncementId} not found`);
    }

    const rootParentId = parent.parent_id || parent.id;

    // Use parent's values as default if not overridden
    const createInput: CreateAnnouncementInput = {
      case_id: input.case_id || parent.case_id,
      hearing_id: input.hearing_id !== undefined ? input.hearing_id : parent.hearing_id,
      recipient_name: input.recipient_name || parent.recipient_name,
      recipient_capacity: input.recipient_capacity || parent.recipient_capacity,
      recipient_address: input.recipient_address || parent.recipient_address,
      announcement_type: input.announcement_type || (parent.announcement_type.includes('إعادة') ? parent.announcement_type : `إعادة إعلان (${parent.announcement_type})`),
      bailiff_office: input.bailiff_office || parent.bailiff_office,
      request_number: input.request_number || null,
      bailiff_name: input.bailiff_name || null,
      delivery_date: input.delivery_date || new Date().toISOString().split('T')[0],
      return_date: input.return_date || null,
      status: input.status || 'قيد الانتظار',
      failure_reason: input.failure_reason || null,
      notes: input.notes || `محاولة جديدة مرتبطة بالإعلان رقم ${parentAnnouncementId}`,
      fee_amount: input.fee_amount || 0,
      parent_id: rootParentId
    };

    // Forward to creation logic
    const tx = db.transaction(() => {
      // Find max attempt for root
      const maxAttemptRow = db.prepare(`
        SELECT MAX(attempt_number) as max_att FROM case_announcements
        WHERE id = ? OR parent_id = ?
      `).get(rootParentId, rootParentId) as { max_att: number | null };

      const attemptNumber = (maxAttemptRow?.max_att || 1) + 1;

      const stmt = db.prepare(`
        INSERT INTO case_announcements (
          case_id, hearing_id, recipient_name, recipient_capacity, recipient_address,
          announcement_type, bailiff_office, request_number, bailiff_name,
          delivery_date, return_date, status, failure_reason, notes,
          fee_amount, parent_id, attempt_number
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `);

      const result = stmt.run(
        createInput.case_id,
        createInput.hearing_id || null,
        createInput.recipient_name,
        createInput.recipient_capacity || 'المطلوب إعلانه',
        createInput.recipient_address || null,
        createInput.announcement_type,
        createInput.bailiff_office || null,
        createInput.request_number || null,
        createInput.bailiff_name || null,
        createInput.delivery_date || null,
        createInput.return_date || null,
        createInput.status || 'قيد الانتظار',
        createInput.failure_reason || null,
        createInput.notes || null,
        createInput.fee_amount || 0,
        rootParentId,
        attemptNumber
      );

      const announcementId = Number(result.lastInsertRowid);

      if (createInput.fee_amount && createInput.fee_amount > 0) {
        const receiptNumber = generateReceiptNumber(db, 'REC-ANN');
        const today = new Date().toISOString().split('T')[0];
        const date = createInput.delivery_date || today;

        const finStmt = db.prepare(`
          INSERT INTO financial_transactions (
            case_id, category, transaction_type, direction, amount,
            transaction_date, payment_method, receipt_number, description, notes, announcement_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const finRes = finStmt.run(
          createInput.case_id,
          'رسوم قضائية',
          'رسوم إعلان محضرين',
          'صادر',
          createInput.fee_amount,
          date,
          'نقدي',
          receiptNumber,
          `رسم إعادة إعلان (${createInput.announcement_type}) للمطلوب إعلانه: ${createInput.recipient_name}`,
          createInput.notes || null,
          announcementId
        );

        db.prepare('UPDATE case_announcements SET transaction_id = ? WHERE id = ?').run(Number(finRes.lastInsertRowid), announcementId);
      }

      return db.prepare(`
        SELECT 
          a.*,
          c.subject as case_title,
          c.case_number,
          c.court_name,
          h.hearing_date,
          h.court_decision as hearing_decision
        FROM case_announcements a
        LEFT JOIN cases c ON c.id = a.case_id
        LEFT JOIN hearings h ON h.id = a.hearing_id
        WHERE a.id = ?
      `).get(announcementId) as CaseAnnouncement;
    });

    return tx();
  });

  // 7. Delete Announcement (with reversal of fee transaction if exists)
  ipcMain.handle('announcements:delete', async (_event, id: number): Promise<{ success: boolean; message?: string }> => {
    const db = dbService.getDb();
    const existing = db.prepare('SELECT * FROM case_announcements WHERE id = ?').get(id) as CaseAnnouncement | undefined;
    if (!existing) {
      return { success: false, message: 'الإعلان غير موجود' };
    }

    const tx = db.transaction(() => {
      // If there is an associated financial transaction, reverse it via reversal entry
      if (existing.transaction_id) {
        const origTx = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(existing.transaction_id) as any;
        if (origTx && origTx.is_reversed === 0) {
          const revReceipt = generateReceiptNumber(db, 'REV');
          const oppDirection = origTx.direction === 'صادر' ? 'وارد' : 'صادر';
          const today = new Date().toISOString().split('T')[0];

          // Insert reversal transaction
          const revRes = db.prepare(`
            INSERT INTO financial_transactions (
              case_id, category, transaction_type, direction, amount,
              transaction_date, payment_method, receipt_number, description, notes,
              announcement_id, is_reversed, reversal_of_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `).run(
            origTx.case_id,
            origTx.category,
            origTx.transaction_type,
            oppDirection,
            origTx.amount,
            today,
            origTx.payment_method || 'نقدي',
            revReceipt,
            `قيد عكسي لإلغاء رسم الإعلان رقم #${existing.id}`,
            `إلغاء لحركة الإيصال ${origTx.receipt_number}`,
            existing.id,
            origTx.id
          );

          // Mark original as reversed
          db.prepare(`
            UPDATE financial_transactions
            SET is_reversed = 1, reversed_by_id = ?, reversal_reason = 'حذف الإعلان القضائي'
            WHERE id = ?
          `).run(Number(revRes.lastInsertRowid), origTx.id);
        }
      }

      // Delete announcement record
      db.prepare('DELETE FROM case_announcements WHERE id = ?').run(id);
      return { success: true };
    });

    return tx();
  });

  // 8. Get Announcement Warnings for Upcoming Hearings
  ipcMain.handle('announcements:getWarnings', async (_event, daysThreshold?: number): Promise<AnnouncementWarning[]> => {
    const db = dbService.getDb();

    let threshold = daysThreshold;
    if (threshold === undefined || threshold === null) {
      const settings = db.prepare('SELECT announcement_warning_days FROM office_settings WHERE id = 1').get() as { announcement_warning_days?: number } | undefined;
      threshold = settings?.announcement_warning_days ?? 3;
    }

    const today = new Date().toISOString().split('T')[0];

    // Compute end date: today + threshold days
    const endObj = new Date();
    endObj.setDate(endObj.getDate() + threshold);
    const maxDate = endObj.toISOString().split('T')[0];

    // Find announcements linked to hearings within [today, maxDate]
    // where status is NOT ('أُعلن', 'جهة إدارة', 'مخاطبة مع شخص آخر', 'ورد')
    // or return_date is null
    const sql = `
      SELECT 
        a.id as announcement_id,
        a.case_id,
        c.subject as case_title,
        c.case_number,
        a.hearing_id,
        h.hearing_date,
        a.recipient_name,
        a.announcement_type,
        a.bailiff_office,
        a.delivery_date,
        a.status,
        CAST(julianday(h.hearing_date) - julianday(?) AS INTEGER) as days_until_hearing
      FROM case_announcements a
      JOIN hearings h ON h.id = a.hearing_id
      JOIN cases c ON c.id = a.case_id
      WHERE h.hearing_date >= ? AND h.hearing_date <= ?
        AND a.status IN ('قيد الانتظار', 'لم يُعلن', 'ورد بدون نتيجة')
      ORDER BY h.hearing_date ASC, a.id ASC
    `;

    return db.prepare(sql).all(today, today, maxDate) as AnnouncementWarning[];
  });
}
