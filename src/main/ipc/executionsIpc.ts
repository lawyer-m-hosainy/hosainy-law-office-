import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import {
  ExecutionFile,
  ExecutionAction,
  ExecutionHearing,
  ExecutionDetails,
  ExecutionFilter,
  CreateExecutionFileInput,
  CreateExecutionActionInput,
  CreateExecutionHearingInput,
  FinancialTransaction,
  TransactionDirection,
  PaymentMethod,
  ExecutionHearingStatus
} from '../../shared/types';

export function registerExecutionsIpc(): void {
  const dbService = DatabaseService.getInstance();

  // Helper to generate next receipt number
  function generateNextReceiptNumber(db: any, prefix = 'REC'): string {
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

  // 1. Get Execution Files (with filters and Arabic normalization)
  ipcMain.handle('executions:getFiles', async (_event, filter?: ExecutionFilter): Promise<ExecutionFile[]> => {
    const db = dbService.getDb();
    let sql = `
      SELECT 
        ef.*,
        c.case_number,
        c.case_year,
        c.court_name as case_court_name,
        cl.name as client_name,
        (SELECT COUNT(*) FROM execution_actions WHERE execution_id = ef.id) as actions_count,
        (SELECT COUNT(*) FROM execution_hearings WHERE execution_id = ef.id) as hearings_count
      FROM execution_files ef
      LEFT JOIN cases c ON c.id = ef.case_id
      LEFT JOIN clients cl ON cl.id = ef.client_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.caseId) {
      sql += ' AND ef.case_id = ?';
      params.push(filter.caseId);
    }

    if (filter?.clientId) {
      sql += ' AND ef.client_id = ?';
      params.push(filter.clientId);
    }

    if (filter?.status && filter.status !== 'all' && filter.status !== 'الكل') {
      sql += ' AND ef.status = ?';
      params.push(filter.status);
    }

    if (filter?.deedType && filter.deedType !== 'all' && filter.deedType !== 'الكل') {
      sql += ' AND ef.deed_type = ?';
      params.push(filter.deedType);
    }

    if (filter?.search && filter.search.trim()) {
      sql += ` AND (
        normalize_arabic(ef.file_number) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(ef.applicant_name) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(ef.enforced_against) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(ef.court) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(COALESCE(ef.deed_number, '')) LIKE '%' || normalize_arabic(?) || '%'
      )`;
      const q = filter.search.trim();
      params.push(q, q, q, q, q);
    }

    if (filter?.startDate) {
      sql += ' AND ef.announcement_date >= ?';
      params.push(filter.startDate);
    }

    if (filter?.endDate) {
      sql += ' AND ef.announcement_date <= ?';
      params.push(filter.endDate);
    }

    sql += ' ORDER BY ef.id DESC';

    const rows = db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      ...r,
      total_claimed_amount: Number(r.total_claimed_amount) || 0,
      collected_amount: Number(r.collected_amount) || 0,
      remaining_amount: Math.max(0, (Number(r.total_claimed_amount) || 0) - (Number(r.collected_amount) || 0)),
      actions_count: Number(r.actions_count) || 0,
      hearings_count: Number(r.hearings_count) || 0
    }));
  });

  // 2. Get Execution File By ID (with actions, hearings, and transactions)
  ipcMain.handle('executions:getById', async (_event, id: number): Promise<ExecutionDetails | null> => {
    const db = dbService.getDb();
    const row = db.prepare(`
      SELECT 
        ef.*,
        c.case_number,
        c.case_year,
        c.court_name as case_court_name,
        cl.name as client_name
      FROM execution_files ef
      LEFT JOIN cases c ON c.id = ef.case_id
      LEFT JOIN clients cl ON cl.id = ef.client_id
      WHERE ef.id = ?
    `).get(id) as any;

    if (!row) return null;

    const actions = db.prepare(`
      SELECT * FROM execution_actions WHERE execution_id = ? ORDER BY action_date DESC, id DESC
    `).all(id) as ExecutionAction[];

    const hearings = db.prepare(`
      SELECT * FROM execution_hearings WHERE execution_id = ? ORDER BY hearing_date ASC, id ASC
    `).all(id) as ExecutionHearing[];

    const transactions = db.prepare(`
      SELECT ft.*, c.case_number, c.case_year, cl.name as client_name
      FROM financial_transactions ft
      LEFT JOIN cases c ON c.id = ft.case_id
      LEFT JOIN clients cl ON cl.id = ft.client_id
      WHERE ft.execution_id = ?
      ORDER BY ft.transaction_date DESC, ft.id DESC
    `).all(id) as FinancialTransaction[];

    return {
      ...row,
      total_claimed_amount: Number(row.total_claimed_amount) || 0,
      collected_amount: Number(row.collected_amount) || 0,
      remaining_amount: Math.max(0, (Number(row.total_claimed_amount) || 0) - (Number(row.collected_amount) || 0)),
      actions,
      hearings,
      transactions
    };
  });

  // 3. Create Execution File
  ipcMain.handle('executions:createFile', async (_event, input: CreateExecutionFileInput): Promise<ExecutionFile> => {
    const db = dbService.getDb();

    // If case_id is provided but client_id is not, find client from case_clients
    let clientId = input.client_id || null;
    if (!clientId && input.case_id) {
      const primaryClient = db.prepare(`
        SELECT client_id FROM case_clients WHERE case_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1
      `).get(input.case_id) as { client_id: number } | undefined;
      if (primaryClient) {
        clientId = primaryClient.client_id;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO execution_files (
        file_number, year, case_id, client_id, deed_type, deed_number,
        court, execution_judge, execution_dept, applicant_name, applicant_capacity,
        enforced_against, enforced_against_capacity, enforced_against_address, enforced_against_phone,
        total_claimed_amount, collected_amount, announcement_date, status, settlement_minutes,
        settlement_date, notes
      ) VALUES (
        @file_number, @year, @case_id, @client_id, @deed_type, @deed_number,
        @court, @execution_judge, @execution_dept, @applicant_name, @applicant_capacity,
        @enforced_against, @enforced_against_capacity, @enforced_against_address, @enforced_against_phone,
        @total_claimed_amount, 0, @announcement_date, @status, @settlement_minutes,
        @settlement_date, @notes
      )
    `);

    const result = stmt.run({
      file_number: input.file_number.trim(),
      year: input.year || null,
      case_id: input.case_id || null,
      client_id: clientId,
      deed_type: input.deed_type || 'حكم',
      deed_number: input.deed_number?.trim() || null,
      court: input.court.trim(),
      execution_judge: input.execution_judge?.trim() || null,
      execution_dept: input.execution_dept?.trim() || null,
      applicant_name: input.applicant_name.trim(),
      applicant_capacity: input.applicant_capacity?.trim() || 'طالب التنفيذ',
      enforced_against: input.enforced_against.trim(),
      enforced_against_capacity: input.enforced_against_capacity?.trim() || 'المنفذ ضده',
      enforced_against_address: input.enforced_against_address?.trim() || null,
      enforced_against_phone: input.enforced_against_phone?.trim() || null,
      total_claimed_amount: Number(input.total_claimed_amount) || 0,
      announcement_date: input.announcement_date || null,
      status: input.status || 'جاري',
      settlement_minutes: input.settlement_minutes?.trim() || null,
      settlement_date: input.settlement_date || null,
      notes: input.notes?.trim() || null
    });

    const createdId = result.lastInsertRowid as number;
    const created = db.prepare(`
      SELECT 
        ef.*,
        c.case_number,
        c.case_year,
        c.court_name as case_court_name,
        cl.name as client_name
      FROM execution_files ef
      LEFT JOIN cases c ON c.id = ef.case_id
      LEFT JOIN clients cl ON cl.id = ef.client_id
      WHERE ef.id = ?
    `).get(createdId) as any;

    return {
      ...created,
      total_claimed_amount: Number(created.total_claimed_amount) || 0,
      collected_amount: 0,
      remaining_amount: Number(created.total_claimed_amount) || 0
    };
  });

  // 4. Update Execution File
  ipcMain.handle('executions:updateFile', async (_event, id: number, updates: Partial<CreateExecutionFileInput>): Promise<ExecutionFile> => {
    const db = dbService.getDb();
    const existing = db.prepare('SELECT * FROM execution_files WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new Error('ملف التنفيذ غير موجود');
    }

    db.prepare(`
      UPDATE execution_files SET
        file_number = @file_number,
        year = @year,
        case_id = @case_id,
        client_id = @client_id,
        deed_type = @deed_type,
        deed_number = @deed_number,
        court = @court,
        execution_judge = @execution_judge,
        execution_dept = @execution_dept,
        applicant_name = @applicant_name,
        applicant_capacity = @applicant_capacity,
        enforced_against = @enforced_against,
        enforced_against_capacity = @enforced_against_capacity,
        enforced_against_address = @enforced_against_address,
        enforced_against_phone = @enforced_against_phone,
        total_claimed_amount = @total_claimed_amount,
        announcement_date = @announcement_date,
        status = @status,
        settlement_minutes = @settlement_minutes,
        settlement_date = @settlement_date,
        notes = @notes,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id,
      file_number: updates.file_number !== undefined ? updates.file_number.trim() : existing.file_number,
      year: updates.year !== undefined ? updates.year : existing.year,
      case_id: updates.case_id !== undefined ? updates.case_id : existing.case_id,
      client_id: updates.client_id !== undefined ? updates.client_id : existing.client_id,
      deed_type: updates.deed_type !== undefined ? updates.deed_type : existing.deed_type,
      deed_number: updates.deed_number !== undefined ? updates.deed_number?.trim() : existing.deed_number,
      court: updates.court !== undefined ? updates.court.trim() : existing.court,
      execution_judge: updates.execution_judge !== undefined ? updates.execution_judge?.trim() : existing.execution_judge,
      execution_dept: updates.execution_dept !== undefined ? updates.execution_dept?.trim() : existing.execution_dept,
      applicant_name: updates.applicant_name !== undefined ? updates.applicant_name.trim() : existing.applicant_name,
      applicant_capacity: updates.applicant_capacity !== undefined ? updates.applicant_capacity?.trim() : existing.applicant_capacity,
      enforced_against: updates.enforced_against !== undefined ? updates.enforced_against.trim() : existing.enforced_against,
      enforced_against_capacity: updates.enforced_against_capacity !== undefined ? updates.enforced_against_capacity?.trim() : existing.enforced_against_capacity,
      enforced_against_address: updates.enforced_against_address !== undefined ? updates.enforced_against_address?.trim() : existing.enforced_against_address,
      enforced_against_phone: updates.enforced_against_phone !== undefined ? updates.enforced_against_phone?.trim() : existing.enforced_against_phone,
      total_claimed_amount: updates.total_claimed_amount !== undefined ? Number(updates.total_claimed_amount) : existing.total_claimed_amount,
      announcement_date: updates.announcement_date !== undefined ? updates.announcement_date : existing.announcement_date,
      status: updates.status !== undefined ? updates.status : existing.status,
      settlement_minutes: updates.settlement_minutes !== undefined ? updates.settlement_minutes?.trim() : existing.settlement_minutes,
      settlement_date: updates.settlement_date !== undefined ? updates.settlement_date : existing.settlement_date,
      notes: updates.notes !== undefined ? updates.notes?.trim() : existing.notes
    });

    const updated = db.prepare(`
      SELECT 
        ef.*,
        c.case_number,
        c.case_year,
        c.court_name as case_court_name,
        cl.name as client_name
      FROM execution_files ef
      LEFT JOIN cases c ON c.id = ef.case_id
      LEFT JOIN clients cl ON cl.id = ef.client_id
      WHERE ef.id = ?
    `).get(id) as any;

    return {
      ...updated,
      total_claimed_amount: Number(updated.total_claimed_amount) || 0,
      collected_amount: Number(updated.collected_amount) || 0,
      remaining_amount: Math.max(0, (Number(updated.total_claimed_amount) || 0) - (Number(updated.collected_amount) || 0))
    };
  });

  // 5. Delete Execution File
  ipcMain.handle('executions:deleteFile', async (_event, id: number): Promise<{ success: boolean; message?: string }> => {
    const db = dbService.getDb();
    
    // Check if there are financial transactions
    const txCount = db.prepare('SELECT COUNT(*) as count FROM financial_transactions WHERE execution_id = ?').get(id) as { count: number };
    if (txCount.count > 0) {
      return {
        success: false,
        message: 'لا يمكن حذف ملف التنفيذ لوجود إيصالات وحركات مالية مقيدة به. يرجى إلغاء الحركات أولاً أو تغيير حالة الملف إلى "موقوف".'
      };
    }

    db.prepare('DELETE FROM execution_files WHERE id = ?').run(id);
    return { success: true };
  });

  // 6. Record Execution Settlement
  ipcMain.handle('executions:recordSettlement', async (_event, id: number, settlementMinutes: string, settlementDate?: string): Promise<ExecutionFile> => {
    const db = dbService.getDb();
    const date = settlementDate || new Date().toISOString().split('T')[0];

    db.prepare(`
      UPDATE execution_files SET
        settlement_minutes = ?,
        settlement_date = ?,
        status = 'تم الصلح والتسوية',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(settlementMinutes.trim(), date, id);

    const updated = db.prepare('SELECT * FROM execution_files WHERE id = ?').get(id) as any;
    return {
      ...updated,
      total_claimed_amount: Number(updated.total_claimed_amount) || 0,
      collected_amount: Number(updated.collected_amount) || 0,
      remaining_amount: Math.max(0, (Number(updated.total_claimed_amount) || 0) - (Number(updated.collected_amount) || 0))
    };
  });

  // 7. Get Execution Actions
  ipcMain.handle('executions:getActions', async (_event, executionId: number): Promise<ExecutionAction[]> => {
    const db = dbService.getDb();
    return db.prepare(`
      SELECT * FROM execution_actions WHERE execution_id = ? ORDER BY action_date DESC, id DESC
    `).all(executionId) as ExecutionAction[];
  });

  // 8. Create Execution Action
  ipcMain.handle('executions:createAction', async (_event, input: CreateExecutionActionInput): Promise<ExecutionAction> => {
    const db = dbService.getDb();
    const stmt = db.prepare(`
      INSERT INTO execution_actions (
        execution_id, action_type, action_date, status,
        police_report_or_bailiff_number, dept_or_bailiff_office, bailiff_name,
        amount_collected, details, notes
      ) VALUES (
        @execution_id, @action_type, @action_date, @status,
        @police_report_or_bailiff_number, @dept_or_bailiff_office, @bailiff_name,
        @amount_collected, @details, @notes
      )
    `);

    const res = stmt.run({
      execution_id: input.execution_id,
      action_type: input.action_type,
      action_date: input.action_date,
      status: input.status || 'جاري',
      police_report_or_bailiff_number: input.police_report_or_bailiff_number?.trim() || null,
      dept_or_bailiff_office: input.dept_or_bailiff_office?.trim() || null,
      bailiff_name: input.bailiff_name?.trim() || null,
      amount_collected: Number(input.amount_collected) || 0,
      details: input.details?.trim() || null,
      notes: input.notes?.trim() || null
    });

    return db.prepare('SELECT * FROM execution_actions WHERE id = ?').get(res.lastInsertRowid) as ExecutionAction;
  });

  // 9. Update Execution Action
  ipcMain.handle('executions:updateAction', async (_event, id: number, updates: Partial<ExecutionAction>): Promise<ExecutionAction> => {
    const db = dbService.getDb();
    const existing = db.prepare('SELECT * FROM execution_actions WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new Error('إجراء التنفيذ غير موجود');
    }

    db.prepare(`
      UPDATE execution_actions SET
        action_type = @action_type,
        action_date = @action_date,
        status = @status,
        police_report_or_bailiff_number = @police_report_or_bailiff_number,
        dept_or_bailiff_office = @dept_or_bailiff_office,
        bailiff_name = @bailiff_name,
        amount_collected = @amount_collected,
        details = @details,
        notes = @notes,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id,
      action_type: updates.action_type !== undefined ? updates.action_type : existing.action_type,
      action_date: updates.action_date !== undefined ? updates.action_date : existing.action_date,
      status: updates.status !== undefined ? updates.status : existing.status,
      police_report_or_bailiff_number: updates.police_report_or_bailiff_number !== undefined ? updates.police_report_or_bailiff_number?.trim() : existing.police_report_or_bailiff_number,
      dept_or_bailiff_office: updates.dept_or_bailiff_office !== undefined ? updates.dept_or_bailiff_office?.trim() : existing.dept_or_bailiff_office,
      bailiff_name: updates.bailiff_name !== undefined ? updates.bailiff_name?.trim() : existing.bailiff_name,
      amount_collected: updates.amount_collected !== undefined ? Number(updates.amount_collected) : existing.amount_collected,
      details: updates.details !== undefined ? updates.details?.trim() : existing.details,
      notes: updates.notes !== undefined ? updates.notes?.trim() : existing.notes
    });

    return db.prepare('SELECT * FROM execution_actions WHERE id = ?').get(id) as ExecutionAction;
  });

  // 10. Delete Execution Action
  ipcMain.handle('executions:deleteAction', async (_event, id: number): Promise<{ success: boolean }> => {
    const db = dbService.getDb();
    db.prepare('DELETE FROM execution_actions WHERE id = ?').run(id);
    return { success: true };
  });

  // 11. Get Execution Hearings
  ipcMain.handle('executions:getHearings', async (_event, executionId: number): Promise<ExecutionHearing[]> => {
    const db = dbService.getDb();
    return db.prepare(`
      SELECT * FROM execution_hearings WHERE execution_id = ? ORDER BY hearing_date ASC, id ASC
    `).all(executionId) as ExecutionHearing[];
  });

  // 12. Create Execution Hearing
  ipcMain.handle('executions:createHearing', async (_event, input: CreateExecutionHearingInput): Promise<ExecutionHearing> => {
    const db = dbService.getDb();
    const res = db.prepare(`
      INSERT INTO execution_hearings (
        execution_id, case_id, hearing_date, hearing_time,
        court_name, court_circuit, roll_number, attended,
        attended_by, proceedings, court_decision, adjournment_reason,
        next_hearing_date, status
      ) VALUES (
        @execution_id, @case_id, @hearing_date, @hearing_time,
        @court_name, @court_circuit, @roll_number, @attended,
        @attended_by, @proceedings, @court_decision, @adjournment_reason,
        @next_hearing_date, @status
      )
    `).run({
      execution_id: input.execution_id,
      case_id: input.case_id || null,
      hearing_date: input.hearing_date,
      hearing_time: input.hearing_time?.trim() || null,
      court_name: input.court_name?.trim() || null,
      court_circuit: input.court_circuit?.trim() || null,
      roll_number: input.roll_number?.trim() || null,
      attended: input.attended || 0,
      attended_by: input.attended_by?.trim() || null,
      proceedings: input.proceedings?.trim() || null,
      court_decision: input.court_decision?.trim() || null,
      adjournment_reason: input.adjournment_reason?.trim() || null,
      next_hearing_date: input.next_hearing_date || null,
      status: input.status || 'محددة'
    });

    return db.prepare('SELECT * FROM execution_hearings WHERE id = ?').get(res.lastInsertRowid) as ExecutionHearing;
  });

  // 13. Update Execution Hearing
  ipcMain.handle('executions:updateHearing', async (_event, id: number, updates: Partial<ExecutionHearing>): Promise<ExecutionHearing> => {
    const db = dbService.getDb();
    const existing = db.prepare('SELECT * FROM execution_hearings WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new Error('جلسة التنفيذ غير موجودة');
    }

    db.prepare(`
      UPDATE execution_hearings SET
        hearing_date = @hearing_date,
        hearing_time = @hearing_time,
        court_name = @court_name,
        court_circuit = @court_circuit,
        roll_number = @roll_number,
        attended = @attended,
        attended_by = @attended_by,
        proceedings = @proceedings,
        court_decision = @court_decision,
        adjournment_reason = @adjournment_reason,
        next_hearing_date = @next_hearing_date,
        status = @status,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id,
      hearing_date: updates.hearing_date !== undefined ? updates.hearing_date : existing.hearing_date,
      hearing_time: updates.hearing_time !== undefined ? updates.hearing_time?.trim() : existing.hearing_time,
      court_name: updates.court_name !== undefined ? updates.court_name?.trim() : existing.court_name,
      court_circuit: updates.court_circuit !== undefined ? updates.court_circuit?.trim() : existing.court_circuit,
      roll_number: updates.roll_number !== undefined ? updates.roll_number?.trim() : existing.roll_number,
      attended: updates.attended !== undefined ? updates.attended : existing.attended,
      attended_by: updates.attended_by !== undefined ? updates.attended_by?.trim() : existing.attended_by,
      proceedings: updates.proceedings !== undefined ? updates.proceedings?.trim() : existing.proceedings,
      court_decision: updates.court_decision !== undefined ? updates.court_decision?.trim() : existing.court_decision,
      adjournment_reason: updates.adjournment_reason !== undefined ? updates.adjournment_reason?.trim() : existing.adjournment_reason,
      next_hearing_date: updates.next_hearing_date !== undefined ? updates.next_hearing_date : existing.next_hearing_date,
      status: updates.status !== undefined ? updates.status : existing.status
    });

    return db.prepare('SELECT * FROM execution_hearings WHERE id = ?').get(id) as ExecutionHearing;
  });

  // 14. Delete Execution Hearing
  ipcMain.handle('executions:deleteHearing', async (_event, id: number): Promise<{ success: boolean }> => {
    const db = dbService.getDb();
    db.prepare('DELETE FROM execution_hearings WHERE id = ?').run(id);
    return { success: true };
  });

  // 15. Record Execution Hearing Outcome (Atomic with next hearing generation)
  ipcMain.handle('executions:recordHearingOutcome', async (_event, hearingId: number, outcome: {
    attended: number;
    attended_by?: string;
    proceedings?: string;
    court_decision: string;
    adjournment_reason?: string;
    next_hearing_date?: string;
    status: ExecutionHearingStatus;
  }): Promise<{ currentHearing: ExecutionHearing; nextHearing?: ExecutionHearing }> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      const current = db.prepare('SELECT * FROM execution_hearings WHERE id = ?').get(hearingId) as ExecutionHearing | undefined;
      if (!current) {
        throw new Error('جلسة التنفيذ غير موجودة');
      }

      // Update current hearing
      db.prepare(`
        UPDATE execution_hearings SET
          attended = @attended,
          attended_by = @attended_by,
          proceedings = @proceedings,
          court_decision = @court_decision,
          adjournment_reason = @adjournment_reason,
          next_hearing_date = @next_hearing_date,
          status = @status,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        id: hearingId,
        attended: outcome.attended,
        attended_by: outcome.attended_by || null,
        proceedings: outcome.proceedings || null,
        court_decision: outcome.court_decision,
        adjournment_reason: outcome.adjournment_reason || null,
        next_hearing_date: outcome.next_hearing_date || null,
        status: outcome.status
      });

      let nextHearing: ExecutionHearing | undefined;

      // Auto-generate next hearing if next_hearing_date provided
      if (outcome.next_hearing_date && outcome.next_hearing_date.trim()) {
        const nextRes = db.prepare(`
          INSERT INTO execution_hearings (
            execution_id, case_id, hearing_date, court_name,
            court_circuit, status, proceedings
          ) VALUES (?, ?, ?, ?, ?, 'محددة', ?)
        `).run(
          current.execution_id,
          current.case_id || null,
          outcome.next_hearing_date.trim(),
          current.court_name,
          current.court_circuit,
          `مؤجلة من جلسة ${current.hearing_date} لـ: ${outcome.adjournment_reason || outcome.court_decision}`
        );

        nextHearing = db.prepare('SELECT * FROM execution_hearings WHERE id = ?').get(nextRes.lastInsertRowid) as ExecutionHearing;
      }

      const updatedCurrent = db.prepare('SELECT * FROM execution_hearings WHERE id = ?').get(hearingId) as ExecutionHearing;
      return { currentHearing: updatedCurrent, nextHearing };
    });

    return transaction();
  });

  // 16. Record Execution Payment / Expense (Integrated into unified financial_transactions)
  ipcMain.handle('executions:recordPayment', async (_event, params: {
    executionId: number;
    amount: number;
    direction: TransactionDirection;
    transactionType: string;
    paymentMethod: PaymentMethod;
    description: string;
    date?: string;
    notes?: string;
  }): Promise<FinancialTransaction> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      const file = db.prepare('SELECT * FROM execution_files WHERE id = ?').get(params.executionId) as any;
      if (!file) {
        throw new Error('ملف التنفيذ غير موجود');
      }

      const receiptNumber = generateNextReceiptNumber(db);
      const txDate = params.date || new Date().toISOString().split('T')[0];

      const res = db.prepare(`
        INSERT INTO financial_transactions (
          receipt_number, case_id, client_id, execution_id,
          transaction_date, category, transaction_type, direction,
          amount, payment_method, description, notes
        ) VALUES (
          @receipt_number, @case_id, @client_id, @execution_id,
          @transaction_date, 'تنفيذ', @transaction_type, @direction,
          @amount, @payment_method, @description, @notes
        )
      `).run({
        receipt_number: receiptNumber,
        case_id: file.case_id || null,
        client_id: file.client_id || null,
        execution_id: file.id,
        transaction_date: txDate,
        transaction_type: params.transactionType,
        direction: params.direction,
        amount: Number(params.amount),
        payment_method: params.paymentMethod,
        description: params.description,
        notes: params.notes || null
      });

      const txId = res.lastInsertRowid as number;

      // If inflow (وارد), update collected_amount on execution_files
      if (params.direction === 'وارد') {
        const sumRow = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM financial_transactions
          WHERE execution_id = ? AND direction = 'وارد' AND is_reversed = 0
        `).get(file.id) as { total: number };

        const newCollected = sumRow.total;
        let newStatus = file.status;

        if (file.total_claimed_amount > 0 && newCollected >= file.total_claimed_amount && file.status !== 'تم الصلح والتسوية') {
          newStatus = 'تم التنفيذ كلياً';
        }

        db.prepare(`
          UPDATE execution_files SET
            collected_amount = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newCollected, newStatus, file.id);
      }

      return db.prepare(`
        SELECT ft.*, c.case_number, c.case_year, cl.name as client_name
        FROM financial_transactions ft
        LEFT JOIN cases c ON c.id = ft.case_id
        LEFT JOIN clients cl ON cl.id = ft.client_id
        WHERE ft.id = ?
      `).get(txId) as FinancialTransaction;
    });

    return transaction();
  });
}
