import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import { Hearing, HearingRollFilter, HearingWithCase, CaseHearingStats, HearingStatus } from '../../shared/types';

export function registerHearingsIpc(): void {
  const dbService = DatabaseService.getInstance();

  // 1. Get hearings by case ID (ordered descending)
  ipcMain.handle('hearings:getByCase', async (_event, caseId: number): Promise<Hearing[]> => {
    const db = dbService.getDb();
    const stmt = db.prepare(`
      SELECT * FROM hearings
      WHERE case_id = ?
      ORDER BY hearing_date DESC, id DESC
    `);
    return stmt.all(caseId) as Hearing[];
  });

  // 2. Get statistics for a case's hearings
  ipcMain.handle('hearings:getStats', async (_event, caseId: number): Promise<CaseHearingStats> => {
    const db = dbService.getDb();

    // Total and dates
    const basicStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_hearings,
        MIN(hearing_date) as first_hearing_date,
        MAX(hearing_date) as last_hearing_date
      FROM hearings
      WHERE case_id = ?
    `);
    const basic = basicStmt.get(caseId) as {
      total_hearings: number;
      first_hearing_date: string | null;
      last_hearing_date: string | null;
    };

    // Postponement count
    const postStmt = db.prepare(`
      SELECT COUNT(*) as postponement_count
      FROM hearings
      WHERE case_id = ? AND (
        status = 'مؤجلة' 
        OR (adjournment_reason IS NOT NULL AND TRIM(adjournment_reason) != '')
        OR next_hearing_date IS NOT NULL
      )
    `);
    const post = postStmt.get(caseId) as { postponement_count: number };

    // Most frequent adjournment reason
    const reasonStmt = db.prepare(`
      SELECT adjournment_reason, COUNT(*) as reason_count
      FROM hearings
      WHERE case_id = ? AND adjournment_reason IS NOT NULL AND TRIM(adjournment_reason) != ''
      GROUP BY adjournment_reason
      ORDER BY reason_count DESC
      LIMIT 1
    `);
    const topReason = reasonStmt.get(caseId) as { adjournment_reason: string; reason_count: number } | undefined;

    // Average days between consecutive hearings
    const datesStmt = db.prepare(`
      SELECT hearing_date
      FROM hearings
      WHERE case_id = ?
      ORDER BY hearing_date ASC
    `);
    const dates = (datesStmt.all(caseId) as { hearing_date: string }[]).map(d => d.hearing_date);

    let avgDays = 0;
    if (dates.length > 1) {
      let totalDiffDays = 0;
      let intervals = 0;
      for (let i = 1; i < dates.length; i++) {
        const d1 = new Date(dates[i - 1]).getTime();
        const d2 = new Date(dates[i]).getTime();
        const diff = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
        if (diff > 0) {
          totalDiffDays += diff;
          intervals++;
        }
      }
      avgDays = intervals > 0 ? Math.round(totalDiffDays / intervals) : 0;
    }

    return {
      total_hearings: basic.total_hearings || 0,
      postponement_count: post.postponement_count || 0,
      most_frequent_reason: topReason?.adjournment_reason || undefined,
      most_frequent_reason_count: topReason?.reason_count || 0,
      avg_days_between_hearings: avgDays,
      first_hearing_date: basic.first_hearing_date || undefined,
      last_hearing_date: basic.last_hearing_date || undefined
    };
  });

  // 3. Get hearing roll with filters and previous session data
  ipcMain.handle('hearings:getRoll', async (_event, filter?: HearingRollFilter): Promise<HearingWithCase[]> => {
    const db = dbService.getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.date) {
      conditions.push('h.hearing_date = ?');
      params.push(filter.date);
    } else {
      if (filter?.startDate) {
        conditions.push('h.hearing_date >= ?');
        params.push(filter.startDate);
      }
      if (filter?.endDate) {
        conditions.push('h.hearing_date <= ?');
        params.push(filter.endDate);
      }
    }

    if (filter?.court_name && filter.court_name !== 'الكل') {
      conditions.push('h.court_name = ?');
      params.push(filter.court_name);
    }

    if (filter?.court_circuit && filter.court_circuit.trim()) {
      conditions.push("normalize_arabic(h.court_circuit) LIKE '%' || normalize_arabic(?) || '%'");
      params.push(filter.court_circuit.trim());
    }

    if (filter?.status && filter.status !== 'الكل') {
      conditions.push('h.status = ?');
      params.push(filter.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        h.*,
        c.case_number,
        c.case_year,
        c.case_type,
        c.subject,
        c.priority,
        (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = h.case_id AND cc.is_primary = 1 LIMIT 1) as primary_client_name,
        (SELECT cc.role_capacity FROM case_clients cc WHERE cc.case_id = h.case_id AND cc.is_primary = 1 LIMIT 1) as primary_client_role,
        (SELECT co.name FROM case_opponents co WHERE co.case_id = h.case_id LIMIT 1) as primary_opponent_name,
        (SELECT co.role_capacity FROM case_opponents co WHERE co.case_id = h.case_id LIMIT 1) as primary_opponent_role,
        prev.hearing_date as previous_hearing_date,
        prev.court_decision as previous_decision,
        prev.adjournment_reason as previous_adjournment_reason
      FROM hearings h
      JOIN cases c ON c.id = h.case_id
      LEFT JOIN hearings prev ON prev.id = (
        SELECT id FROM hearings p
        WHERE p.case_id = h.case_id AND (p.hearing_date < h.hearing_date OR (p.hearing_date = h.hearing_date AND p.id < h.id))
        ORDER BY p.hearing_date DESC, p.id DESC
        LIMIT 1
      )
      ${whereClause}
      ORDER BY h.hearing_date ASC, h.court_name ASC, h.court_circuit ASC, h.roll_number ASC, h.id ASC
    `;

    return db.prepare(sql).all(...params) as HearingWithCase[];
  });

  // 4. Create hearing
  ipcMain.handle('hearings:create', async (_event, hearing: Omit<Hearing, 'id' | 'created_at' | 'updated_at'>): Promise<Hearing> => {
    const db = dbService.getDb();
    const stmt = db.prepare(`
      INSERT INTO hearings (
        case_id, hearing_date, hearing_time, court_name, court_circuit, court_hall,
        roll_number, attended, attended_by, proceedings, court_decision,
        adjournment_reason, adjournment_notes, next_hearing_date, requests,
        submitted_documents, notes, is_judgment_hearing, judgment_date, judgment_text, status
      ) VALUES (
        @case_id, @hearing_date, @hearing_time, @court_name, @court_circuit, @court_hall,
        @roll_number, @attended, @attended_by, @proceedings, @court_decision,
        @adjournment_reason, @adjournment_notes, @next_hearing_date, @requests,
        @submitted_documents, @notes, @is_judgment_hearing, @judgment_date, @judgment_text, @status
      )
    `);

    const result = stmt.run({
      case_id: hearing.case_id,
      hearing_date: hearing.hearing_date,
      hearing_time: hearing.hearing_time || null,
      court_name: hearing.court_name,
      court_circuit: hearing.court_circuit || null,
      court_hall: hearing.court_hall || null,
      roll_number: hearing.roll_number || null,
      attended: hearing.attended ? 1 : 0,
      attended_by: hearing.attended_by || null,
      proceedings: hearing.proceedings || null,
      court_decision: hearing.court_decision || null,
      adjournment_reason: hearing.adjournment_reason || null,
      adjournment_notes: hearing.adjournment_notes || null,
      next_hearing_date: hearing.next_hearing_date || null,
      requests: hearing.requests || null,
      submitted_documents: hearing.submitted_documents || null,
      notes: hearing.notes || null,
      is_judgment_hearing: hearing.is_judgment_hearing ? 1 : 0,
      judgment_date: hearing.judgment_date || null,
      judgment_text: hearing.judgment_text || null,
      status: hearing.status || 'محددة'
    });

    const inserted = db.prepare('SELECT * FROM hearings WHERE id = ?').get(result.lastInsertRowid) as Hearing;
    return inserted;
  });

  // 5. Record hearing outcome & auto-generate next hearing
  ipcMain.handle('hearings:recordOutcome', async (_event, hearingId: number, outcome: {
    attended: number;
    attended_by?: string;
    proceedings?: string;
    court_decision: string;
    adjournment_reason?: string;
    adjournment_notes?: string;
    next_hearing_date?: string;
    status: HearingStatus;
    is_judgment_hearing?: number;
    judgment_date?: string;
    judgment_text?: string;
  }): Promise<{ currentHearing: Hearing; nextHearing?: Hearing }> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      // Fetch current hearing
      const current = db.prepare('SELECT * FROM hearings WHERE id = ?').get(hearingId) as Hearing | undefined;
      if (!current) {
        throw new Error(`الجلسة رقم ${hearingId} غير موجودة`);
      }

      // Update current hearing
      const updateStmt = db.prepare(`
        UPDATE hearings SET
          attended = @attended,
          attended_by = @attended_by,
          proceedings = @proceedings,
          court_decision = @court_decision,
          adjournment_reason = @adjournment_reason,
          adjournment_notes = @adjournment_notes,
          next_hearing_date = @next_hearing_date,
          status = @status,
          is_judgment_hearing = @is_judgment_hearing,
          judgment_date = @judgment_date,
          judgment_text = @judgment_text,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `);

      updateStmt.run({
        id: hearingId,
        attended: outcome.attended ? 1 : 0,
        attended_by: outcome.attended_by || null,
        proceedings: outcome.proceedings || null,
        court_decision: outcome.court_decision,
        adjournment_reason: outcome.adjournment_reason || null,
        adjournment_notes: outcome.adjournment_notes || null,
        next_hearing_date: outcome.next_hearing_date || null,
        status: outcome.status,
        is_judgment_hearing: outcome.is_judgment_hearing ? 1 : 0,
        judgment_date: outcome.judgment_date || null,
        judgment_text: outcome.judgment_text || null
      });

      // Update parent case status
      if (outcome.is_judgment_hearing === 1 || outcome.status === 'محجوزة للحكم') {
        db.prepare("UPDATE cases SET status = 'محجوزة للحكم', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(current.case_id);
      } else if (outcome.status === 'صدر حكم') {
        db.prepare("UPDATE cases SET status = 'محكوم فيها', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(current.case_id);
      } else if (outcome.next_hearing_date || outcome.status === 'مؤجلة') {
        db.prepare("UPDATE cases SET status = 'متداولة', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(current.case_id);
      }

      let nextHearing: Hearing | undefined = undefined;

      // Auto-generate next hearing if next_hearing_date is provided and no hearing already scheduled on that date
      if (outcome.next_hearing_date && outcome.next_hearing_date.trim()) {
        const nextDate = outcome.next_hearing_date.trim();
        const existing = db.prepare('SELECT id FROM hearings WHERE case_id = ? AND hearing_date = ?').get(current.case_id, nextDate);

        if (!existing) {
          const reqs = outcome.adjournment_reason ? `مطلوب: ${outcome.adjournment_reason}` : null;
          const insertNextStmt = db.prepare(`
            INSERT INTO hearings (
              case_id, hearing_date, court_name, court_circuit, court_hall,
              status, requests, notes
            ) VALUES (?, ?, ?, ?, ?, 'محددة', ?, ?)
          `);

          const insertRes = insertNextStmt.run(
            current.case_id,
            nextDate,
            current.court_name,
            current.court_circuit || null,
            current.court_hall || null,
            reqs,
            outcome.adjournment_notes ? `ملاحظات الجلسة السابقة: ${outcome.adjournment_notes}` : null
          );

          nextHearing = db.prepare('SELECT * FROM hearings WHERE id = ?').get(insertRes.lastInsertRowid) as Hearing;
        }
      }

      const updatedCurrent = db.prepare('SELECT * FROM hearings WHERE id = ?').get(hearingId) as Hearing;
      return { currentHearing: updatedCurrent, nextHearing };
    });

    return transaction();
  });

  // 6. Update hearing
  ipcMain.handle('hearings:update', async (_event, id: number, updates: Partial<Hearing>): Promise<Hearing> => {
    const db = dbService.getDb();
    const allowedFields = [
      'hearing_date', 'hearing_time', 'court_name', 'court_circuit', 'court_hall',
      'roll_number', 'attended', 'attended_by', 'proceedings', 'court_decision',
      'adjournment_reason', 'adjournment_notes', 'next_hearing_date', 'requests',
      'submitted_documents', 'notes', 'is_judgment_hearing', 'judgment_date', 'judgment_text', 'status'
    ];

    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return db.prepare('SELECT * FROM hearings WHERE id = ?').get(id) as Hearing;
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(`UPDATE hearings SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    return db.prepare('SELECT * FROM hearings WHERE id = ?').get(id) as Hearing;
  });

  // 7. Delete hearing
  ipcMain.handle('hearings:delete', async (_event, id: number): Promise<{ success: boolean }> => {
    const db = dbService.getDb();
    db.prepare('DELETE FROM hearings WHERE id = ?').run(id);
    return { success: true };
  });
}
