import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import { Case, CaseDetails, CaseFilter, CreateCaseInput } from '../../shared/types';

export function registerCasesIpc(): void {
  const dbService = DatabaseService.getInstance();

  // Get Cases list with filters & normalized Arabic search
  ipcMain.handle('cases:getCases', async (_event, filter?: CaseFilter): Promise<Case[]> => {
    const db = dbService.getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status && filter.status !== 'الكل') {
      conditions.push('c.status = ?');
      params.push(filter.status);
    }

    if (filter?.court_name && filter.court_name !== 'الكل') {
      conditions.push('c.court_name = ?');
      params.push(filter.court_name);
    }

    if (filter?.case_type && filter.case_type !== 'الكل') {
      conditions.push('c.case_type = ?');
      params.push(filter.case_type);
    }

    if (filter?.court_degree && filter.court_degree !== 'الكل') {
      conditions.push('c.court_degree = ?');
      params.push(filter.court_degree);
    }

    if (filter?.priority && filter.priority !== 'الكل') {
      conditions.push('c.priority = ?');
      params.push(filter.priority);
    }

    if (filter?.client_id) {
      conditions.push('EXISTS (SELECT 1 FROM case_clients cc WHERE cc.case_id = c.id AND cc.client_id = ?)');
      params.push(filter.client_id);
    }

    // Normalized Arabic search across:
    // case_number, year, subject, court, claims, police/table numbers, AND clients/opponents names
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim();
      conditions.push(`(
        c.case_number LIKE '%' || ? || '%'
        OR CAST(c.case_year AS TEXT) LIKE '%' || ? || '%'
        OR normalize_arabic(c.subject) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(c.court_name) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(c.court_circuit) LIKE '%' || normalize_arabic(?) || '%'
        OR c.police_report_number LIKE '%' || ? || '%'
        OR c.table_number LIKE '%' || ? || '%'
        OR normalize_arabic(c.juvenile_name) LIKE '%' || normalize_arabic(?) || '%'
        OR EXISTS (
          SELECT 1 FROM case_clients cc
          JOIN clients cl ON cl.id = cc.client_id
          WHERE cc.case_id = c.id AND normalize_arabic(cl.name) LIKE '%' || normalize_arabic(?) || '%'
        )
        OR EXISTS (
          SELECT 1 FROM case_opponents co
          WHERE co.case_id = c.id AND (
            normalize_arabic(co.name) LIKE '%' || normalize_arabic(?) || '%'
            OR normalize_arabic(co.lawyer_name) LIKE '%' || normalize_arabic(?) || '%'
          )
        )
      )`);
      params.push(q, q, q, q, q, q, q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let paginationClause = '';
    const limit = filter?.limit ?? filter?.pageSize;
    if (limit && limit > 0) {
      const offset = filter?.offset ?? (filter?.page && filter.page > 1 ? (filter.page - 1) * limit : 0);
      paginationClause = ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const sql = `
      SELECT 
        c.*,
        (
          SELECT cl.name FROM case_clients cc 
          JOIN clients cl ON cl.id = cc.client_id 
          WHERE cc.case_id = c.id 
          ORDER BY cc.is_primary DESC, cc.id ASC LIMIT 1
        ) as primary_client_name,
        (
          SELECT co.name FROM case_opponents co 
          WHERE co.case_id = c.id 
          ORDER BY co.id ASC LIMIT 1
        ) as primary_opponent_name,
        (
          SELECT COUNT(*) FROM case_clients cc 
          WHERE cc.case_id = c.id
        ) as clients_count
      FROM cases c
      ${whereClause}
      ORDER BY c.case_year DESC, c.case_number DESC, c.id DESC
      ${paginationClause}
    `;

    return db.prepare(sql).all(...params) as Case[];
  });

  // Get Case Details by ID (with all linked clients, opponents, and parent case)
  ipcMain.handle('cases:getCaseById', async (_event, id: number): Promise<CaseDetails | null> => {
    const db = dbService.getDb();
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as Case | undefined;
    if (!caseRow) return null;

    // Get linked clients
    const clients = db.prepare(`
      SELECT 
        cc.id, cc.case_id, cc.client_id, cc.role_capacity, cc.is_primary,
        cl.name as client_name, cl.phone as client_phone, cl.client_type, cl.poa_number
      FROM case_clients cc
      JOIN clients cl ON cl.id = cc.client_id
      WHERE cc.case_id = ?
      ORDER BY cc.is_primary DESC, cc.id ASC
    `).all(id) as any[];

    // Get opponents
    const opponents = db.prepare(`
      SELECT * FROM case_opponents WHERE case_id = ? ORDER BY id ASC
    `).all(id) as any[];

    // Get parent case if linked
    let parentCase = null;
    if (caseRow.parent_case_id) {
      parentCase = db.prepare('SELECT id, case_number, case_year, court_name FROM cases WHERE id = ?').get(caseRow.parent_case_id) as any;
    }

    return {
      ...caseRow,
      clients,
      opponents,
      parent_case: parentCase,
    };
  });

  // Create Case
  ipcMain.handle('cases:createCase', async (_event, input: CreateCaseInput): Promise<CaseDetails> => {
    const db = dbService.getDb();

    return dbService.transaction(() => {
      const caseStmt = db.prepare(`
        INSERT INTO cases (
          case_number, case_year, court_name, court_circuit, court_degree,
          case_type, table_number, police_report_number, filing_date,
          subject, claims, description, status, priority, assigned_lawyer,
          colleague_lawyers, parent_case_id, is_juvenile, juvenile_name,
          juvenile_age, juvenile_charge, guardian_name, guardian_relation,
          probation_officer, care_facility, imposed_measures
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?
        )
      `);

      const caseInfo = caseStmt.run(
        input.case_number.trim(),
        input.case_year,
        input.court_name.trim(),
        input.court_circuit || null,
        input.court_degree || 'أول درجة',
        input.case_type.trim(),
        input.table_number || null,
        input.police_report_number || null,
        input.filing_date || null,
        input.subject.trim(),
        input.claims || null,
        input.description || null,
        input.status || 'متداولة',
        input.priority || 'عادية',
        input.assigned_lawyer || null,
        input.colleague_lawyers || null,
        input.parent_case_id || null,
        input.is_juvenile || 0,
        input.juvenile_name || null,
        input.juvenile_age || null,
        input.juvenile_charge || null,
        input.guardian_name || null,
        input.guardian_relation || null,
        input.probation_officer || null,
        input.care_facility || null,
        input.imposed_measures || null
      );

      const caseId = caseInfo.lastInsertRowid as number;

      // Insert linked clients
      const clientStmt = db.prepare(`
        INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary)
        VALUES (?, ?, ?, ?)
      `);

      if (input.clients && input.clients.length > 0) {
        input.clients.forEach((c, idx) => {
          clientStmt.run(
            caseId,
            c.client_id,
            c.role_capacity || 'مدعي',
            c.is_primary ? 1 : idx === 0 ? 1 : 0
          );
        });
      }

      // Insert opponents
      const opponentStmt = db.prepare(`
        INSERT INTO case_opponents (
          case_id, name, role_capacity, national_id, phone, address,
          lawyer_name, lawyer_phone, notes
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?
        )
      `);

      if (input.opponents && input.opponents.length > 0) {
        input.opponents.forEach((op) => {
          if (op.name && op.name.trim()) {
            opponentStmt.run(
              caseId,
              op.name.trim(),
              op.role_capacity || 'مدعى عليه',
              op.national_id || null,
              op.phone || null,
              op.address || null,
              op.lawyer_name || null,
              op.lawyer_phone || null,
              op.notes || null
            );
          }
        });
      }

      // Return created case details
      const caseRow = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as Case;
      const clients = db.prepare(`
        SELECT cc.id, cc.case_id, cc.client_id, cc.role_capacity, cc.is_primary, cl.name as client_name, cl.phone as client_phone
        FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = ?
      `).all(caseId) as any[];
      const opponents = db.prepare('SELECT * FROM case_opponents WHERE case_id = ?').all(caseId) as any[];

      return {
        ...caseRow,
        clients,
        opponents,
      };
    });
  });

  // Update Case
  ipcMain.handle('cases:updateCase', async (_event, id: number, input: Partial<CreateCaseInput>): Promise<CaseDetails> => {
    const db = dbService.getDb();

    return dbService.transaction(() => {
      const allowedCaseKeys = [
        'case_number', 'case_year', 'court_name', 'court_circuit', 'court_degree',
        'case_type', 'table_number', 'police_report_number', 'filing_date',
        'subject', 'claims', 'description', 'status', 'priority', 'assigned_lawyer',
        'colleague_lawyers', 'parent_case_id', 'is_juvenile', 'juvenile_name',
        'juvenile_age', 'juvenile_charge', 'guardian_name', 'guardian_relation',
        'probation_officer', 'care_facility', 'imposed_measures'
      ];

      const fields: string[] = [];
      const values: any[] = [];

      for (const key of allowedCaseKeys) {
        if (key in input) {
          fields.push(`${key} = ?`);
          values.push((input as any)[key]);
        }
      }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        db.prepare(`UPDATE cases SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }

      // If clients provided, reconcile them
      if (input.clients !== undefined) {
        db.prepare('DELETE FROM case_clients WHERE case_id = ?').run(id);
        const clientStmt = db.prepare(`
          INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary)
          VALUES (?, ?, ?, ?)
        `);
        input.clients.forEach((c, idx) => {
          clientStmt.run(
            id,
            c.client_id,
            c.role_capacity || 'مدعي',
            c.is_primary ? 1 : idx === 0 ? 1 : 0
          );
        });
      }

      // If opponents provided, reconcile them
      if (input.opponents !== undefined) {
        db.prepare('DELETE FROM case_opponents WHERE case_id = ?').run(id);
        const opponentStmt = db.prepare(`
          INSERT INTO case_opponents (
            case_id, name, role_capacity, national_id, phone, address,
            lawyer_name, lawyer_phone, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        input.opponents.forEach((op) => {
          if (op.name && op.name.trim()) {
            opponentStmt.run(
              id,
              op.name.trim(),
              op.role_capacity || 'مدعى عليه',
              op.national_id || null,
              op.phone || null,
              op.address || null,
              op.lawyer_name || null,
              op.lawyer_phone || null,
              op.notes || null
            );
          }
        });
      }

      // Return updated case
      const caseRow = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as Case;
      const clients = db.prepare(`
        SELECT cc.id, cc.case_id, cc.client_id, cc.role_capacity, cc.is_primary, cl.name as client_name, cl.phone as client_phone
        FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = ?
      `).all(id) as any[];
      const opponents = db.prepare('SELECT * FROM case_opponents WHERE case_id = ?').all(id) as any[];

      return {
        ...caseRow,
        clients,
        opponents,
      };
    });
  });

  // Delete Case
  ipcMain.handle('cases:deleteCase', async (_event, id: number): Promise<{ success: boolean; message?: string }> => {
    const db = dbService.getDb();
    return dbService.transaction(() => {
      db.prepare('DELETE FROM case_clients WHERE case_id = ?').run(id);
      db.prepare('DELETE FROM case_opponents WHERE case_id = ?').run(id);
      db.prepare('DELETE FROM cases WHERE id = ?').run(id);
      return { success: true };
    });
  });
}
