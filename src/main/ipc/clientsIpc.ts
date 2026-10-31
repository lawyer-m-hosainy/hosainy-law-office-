import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import { Client, ClientDetails, ClientFilter } from '../../shared/types';
import { normalizeArabic } from '../../shared/arabicUtils';

export function registerClientsIpc(): void {
  const dbService = DatabaseService.getInstance();

  // Get Clients with optional query & status filter
  ipcMain.handle('clients:getClients', async (_event, filter?: ClientFilter): Promise<Client[]> => {
    const db = dbService.getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    // Filter status
    if (filter?.status && filter.status !== 'all') {
      conditions.push('status = ?');
      params.push(filter.status);
    } else if (!filter?.status) {
      // Default to active only
      conditions.push('status = ?');
      params.push('active');
    }

    // Filter by Client Type
    if (filter?.type) {
      conditions.push('client_type = ?');
      params.push(filter.type);
    }

    // Arabic Normalized Query Search across name, phone, national_id, poa_number
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim();
      conditions.push(`(
        normalize_arabic(name) LIKE '%' || normalize_arabic(?) || '%'
        OR phone LIKE '%' || ? || '%'
        OR phone2 LIKE '%' || ? || '%'
        OR national_id_or_cr LIKE '%' || ? || '%'
        OR poa_number LIKE '%' || ? || '%'
        OR normalize_arabic(represented_name) LIKE '%' || normalize_arabic(?) || '%'
      )`);
      params.push(q, q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM clients ${whereClause} ORDER BY name COLLATE NOCASE ASC`;
    return db.prepare(sql).all(...params) as Client[];
  });

  // Get Client by ID with their linked cases
  ipcMain.handle('clients:getClientById', async (_event, id: number): Promise<ClientDetails | null> => {
    const db = dbService.getDb();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined;
    if (!client) return null;

    // Get linked cases
    const cases = db.prepare(`
      SELECT c.*, cc.role_capacity
      FROM cases c
      JOIN case_clients cc ON cc.case_id = c.id
      WHERE cc.client_id = ?
      ORDER BY c.case_year DESC, c.case_number DESC
    `).all(id) as any[];

    return {
      ...client,
      cases,
    };
  });

  // Create Client
  ipcMain.handle('clients:createClient', async (_event, data: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> => {
    const db = dbService.getDb();
    const info = db.prepare(`
      INSERT INTO clients (
        name, client_type, national_id_or_cr, phone, phone2, whatsapp,
        address, email, poa_number, poa_type, poa_date, poa_issuing_office,
        poa_expiry_date, representation_type, represented_name, notes, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      data.name.trim(),
      data.client_type || 'individual',
      data.national_id_or_cr || null,
      data.phone.trim(),
      data.phone2 || null,
      data.whatsapp || null,
      data.address || null,
      data.email || null,
      data.poa_number || null,
      data.poa_type || null,
      data.poa_date || null,
      data.poa_issuing_office || null,
      data.poa_expiry_date || null,
      data.representation_type || 'أصيل',
      data.represented_name || null,
      data.notes || null,
      data.status || 'active'
    );

    return db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid) as Client;
  });

  // Update Client
  ipcMain.handle('clients:updateClient', async (_event, id: number, updates: Partial<Client>): Promise<Client> => {
    const db = dbService.getDb();
    const allowedKeys = [
      'name', 'client_type', 'national_id_or_cr', 'phone', 'phone2', 'whatsapp',
      'address', 'email', 'poa_number', 'poa_type', 'poa_date', 'poa_issuing_office',
      'poa_expiry_date', 'representation_type', 'represented_name', 'notes', 'status'
    ];

    const fields: string[] = [];
    const values: any[] = [];

    for (const key of allowedKeys) {
      if (key in updates) {
        fields.push(`${key} = ?`);
        values.push((updates as any)[key]);
      }
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      db.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client;
  });

  // Archive / Restore Client
  ipcMain.handle('clients:archiveClient', async (_event, id: number, archive: boolean): Promise<Client> => {
    const db = dbService.getDb();
    const status = archive ? 'archived' : 'active';
    db.prepare('UPDATE clients SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client;
  });

  // Delete Client (Safe check)
  ipcMain.handle('clients:deleteClient', async (_event, id: number): Promise<{ success: boolean; message?: string }> => {
    const db = dbService.getDb();

    // Check if client has linked cases
    const linked = db.prepare('SELECT COUNT(*) as count FROM case_clients WHERE client_id = ?').get(id) as { count: number };
    if (linked.count > 0) {
      return {
        success: false,
        message: `لا يمكن حذف هذا الموكل لوجود (${linked.count}) قضايا مرتبطة به في النظام. يمكنك أرشفته بدلاً من الحذف للحفاظ على السجلات.`,
      };
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    return { success: true };
  });

  // Get Clients with POAs expiring soon or expired
  ipcMain.handle('clients:getExpiringPoa', async (_event, daysThreshold: number = 30): Promise<Client[]> => {
    const db = dbService.getDb();
    const today = new Date().toISOString().slice(0, 10);
    const futureDate = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return db.prepare(`
      SELECT * FROM clients
      WHERE status = 'active'
        AND poa_expiry_date IS NOT NULL
        AND poa_expiry_date != ''
        AND poa_expiry_date <= ?
      ORDER BY poa_expiry_date ASC
    `).all(futureDate) as Client[];
  });
}
