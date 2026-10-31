import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import { normalizeArabicText } from '../../shared/arabicUtils';
import { AuditLog, AuditLogFilter } from '../../shared/types';

export function registerAuditLogsIpc(): void {
  const db = DatabaseService.getInstance().getDatabase();

  ipcMain.handle('audit:getLogs', async (_, filter?: AuditLogFilter): Promise<AuditLog[]> => {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (filter?.action_type && filter.action_type !== 'all') {
      sql += ' AND action_type = ?';
      params.push(filter.action_type);
    }

    if (filter?.entity_type && filter.entity_type !== 'all') {
      sql += ' AND entity_type = ?';
      params.push(filter.entity_type);
    }

    if (filter?.startDate) {
      sql += ' AND created_at >= ?';
      params.push(filter.startDate);
    }

    if (filter?.endDate) {
      sql += ' AND created_at <= ?';
      params.push(`${filter.endDate} 23:59:59`);
    }

    sql += ' ORDER BY created_at DESC LIMIT 500';

    const rows = db.prepare(sql).all(...params) as AuditLog[];

    // If query filter is provided, filter with Arabic normalization
    if (filter?.query && filter.query.trim().length > 0) {
      const q = normalizeArabicText(filter.query);
      return rows.filter((r) => {
        const nameMatch = normalizeArabicText(r.entity_name).includes(q);
        const detailsMatch = normalizeArabicText(r.details || '').includes(q);
        const actionMatch = normalizeArabicText(r.action_type).includes(q);
        return nameMatch || detailsMatch || actionMatch;
      });
    }

    return rows;
  });

  ipcMain.handle('audit:createLog', async (_, entry: { action_type: string; entity_type: string; entity_id?: number | null; entity_name: string; details?: string }): Promise<AuditLog> => {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action_type, entity_type, entity_id, entity_name, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    const res = stmt.run(
      entry.action_type,
      entry.entity_type,
      entry.entity_id || null,
      entry.entity_name,
      entry.details || ''
    );

    return db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(res.lastInsertRowid) as AuditLog;
  });
}
