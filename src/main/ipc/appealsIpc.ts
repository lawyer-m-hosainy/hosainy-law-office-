import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import { AppealDeadline } from '../../shared/types';

export function registerAppealsIpc(): void {
  const dbService = DatabaseService.getInstance();

  // 1. Get Appeal Deadlines (for a specific case or all cases)
  ipcMain.handle('appeals:getDeadlines', async (_event, caseId?: number): Promise<AppealDeadline[]> => {
    const db = dbService.getDb();
    const sql = `
      SELECT 
        a.*,
        c.case_number,
        c.case_year,
        c.court_name,
        c.subject,
        (SELECT cl.name FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = a.case_id AND cc.is_primary = 1 LIMIT 1) as primary_client_name
      FROM case_appeal_deadlines a
      JOIN cases c ON c.id = a.case_id
      ${caseId ? 'WHERE a.case_id = ?' : ''}
      ORDER BY a.is_appeal_filed ASC, a.deadline_date ASC
    `;

    const rows = (caseId ? db.prepare(sql).all(caseId) : db.prepare(sql).all()) as (AppealDeadline & {
      case_number: string;
      case_year: number;
      court_name: string;
      subject: string;
      primary_client_name?: string;
    })[];

    const todayStr = new Date().toISOString().split('T')[0];
    const todayMs = new Date(todayStr).getTime();

    return rows.map(r => {
      const deadlineMs = new Date(r.deadline_date).getTime();
      const diffMs = deadlineMs - todayMs;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isExpired = daysRemaining < 0 && !r.is_appeal_filed;

      return {
        ...r,
        days_remaining: daysRemaining,
        is_expired: isExpired
      };
    });
  });

  // 2. Save Appeal Deadline (Insert or Update)
  ipcMain.handle('appeals:save', async (_event, deadline: Omit<AppealDeadline, 'created_at' | 'days_remaining' | 'is_expired'>): Promise<AppealDeadline> => {
    const db = dbService.getDb();

    if (deadline.id) {
      // Update
      const stmt = db.prepare(`
        UPDATE case_appeal_deadlines SET
          judgment_date = @judgment_date,
          announcement_date = @announcement_date,
          appeal_type = @appeal_type,
          days_allowed = @days_allowed,
          deadline_date = @deadline_date,
          is_appeal_filed = @is_appeal_filed,
          appeal_case_number = @appeal_case_number,
          notes = @notes
        WHERE id = @id
      `);

      stmt.run({
        id: deadline.id,
        judgment_date: deadline.judgment_date,
        announcement_date: deadline.announcement_date || null,
        appeal_type: deadline.appeal_type,
        days_allowed: deadline.days_allowed,
        deadline_date: deadline.deadline_date,
        is_appeal_filed: deadline.is_appeal_filed ? 1 : 0,
        appeal_case_number: deadline.appeal_case_number || null,
        notes: deadline.notes || null
      });

      return db.prepare('SELECT * FROM case_appeal_deadlines WHERE id = ?').get(deadline.id) as AppealDeadline;
    } else {
      // Insert
      const stmt = db.prepare(`
        INSERT INTO case_appeal_deadlines (
          case_id, judgment_date, announcement_date, appeal_type,
          days_allowed, deadline_date, is_appeal_filed, appeal_case_number, notes
        ) VALUES (
          @case_id, @judgment_date, @announcement_date, @appeal_type,
          @days_allowed, @deadline_date, @is_appeal_filed, @appeal_case_number, @notes
        )
      `);

      const result = stmt.run({
        case_id: deadline.case_id,
        judgment_date: deadline.judgment_date,
        announcement_date: deadline.announcement_date || null,
        appeal_type: deadline.appeal_type,
        days_allowed: deadline.days_allowed,
        deadline_date: deadline.deadline_date,
        is_appeal_filed: deadline.is_appeal_filed ? 1 : 0,
        appeal_case_number: deadline.appeal_case_number || null,
        notes: deadline.notes || null
      });

      return db.prepare('SELECT * FROM case_appeal_deadlines WHERE id = ?').get(result.lastInsertRowid) as AppealDeadline;
    }
  });

  // 3. Delete Appeal Deadline
  ipcMain.handle('appeals:delete', async (_event, id: number): Promise<{ success: boolean }> => {
    const db = dbService.getDb();
    db.prepare('DELETE FROM case_appeal_deadlines WHERE id = ?').run(id);
    return { success: true };
  });
}
