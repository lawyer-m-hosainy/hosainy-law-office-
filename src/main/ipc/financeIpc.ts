import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import {
  CaseFeeAgreement,
  CaseFinancialSummary,
  ChequeDetail,
  ChequeStatus,
  FeeInstallment,
  FinancialFilter,
  FinancialTransaction,
  GeneralFinancialStats
} from '../../shared/types';

export function registerFinanceIpc(): void {
  const dbService = DatabaseService.getInstance();

  // Helper: Get next sequential receipt number
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

  // 1. Get Fee Agreement for a Case
  ipcMain.handle('finance:getFeeAgreement', async (_event, caseId: number): Promise<CaseFeeAgreement | null> => {
    const db = dbService.getDb();
    const agreement = db.prepare('SELECT * FROM case_fee_agreements WHERE case_id = ?').get(caseId) as CaseFeeAgreement | undefined;
    if (!agreement) return null;

    const installments = db.prepare(`
      SELECT * FROM fee_installments WHERE agreement_id = ? ORDER BY id ASC
    `).all(agreement.id) as FeeInstallment[];

    return {
      ...agreement,
      installments
    };
  });

  // 2. Save Fee Agreement & Installments
  ipcMain.handle('finance:saveFeeAgreement', async (_event, data: {
    case_id: number;
    client_id?: number | null;
    agreement_type: any;
    total_amount: number;
    percentage?: number | null;
    amount_per_session?: number | null;
    monthly_amount?: number | null;
    terms_notes?: string | null;
    installments?: { title: string; amount: number; due_date?: string | null; notes?: string | null }[];
  }): Promise<CaseFeeAgreement> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      let agreement = db.prepare('SELECT * FROM case_fee_agreements WHERE case_id = ?').get(data.case_id) as CaseFeeAgreement | undefined;

      if (agreement) {
        // Update
        db.prepare(`
          UPDATE case_fee_agreements SET
            client_id = @client_id,
            agreement_type = @agreement_type,
            total_amount = @total_amount,
            percentage = @percentage,
            amount_per_session = @amount_per_session,
            monthly_amount = @monthly_amount,
            terms_notes = @terms_notes,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `).run({
          id: agreement.id,
          client_id: data.client_id || null,
          agreement_type: data.agreement_type,
          total_amount: data.total_amount || 0,
          percentage: data.percentage || null,
          amount_per_session: data.amount_per_session || null,
          monthly_amount: data.monthly_amount || null,
          terms_notes: data.terms_notes || null
        });
      } else {
        // Insert
        const insertRes = db.prepare(`
          INSERT INTO case_fee_agreements (
            case_id, client_id, agreement_type, total_amount, percentage,
            amount_per_session, monthly_amount, terms_notes
          ) VALUES (
            @case_id, @client_id, @agreement_type, @total_amount, @percentage,
            @amount_per_session, @monthly_amount, @terms_notes
          )
        `).run({
          case_id: data.case_id,
          client_id: data.client_id || null,
          agreement_type: data.agreement_type,
          total_amount: data.total_amount || 0,
          percentage: data.percentage || null,
          amount_per_session: data.amount_per_session || null,
          monthly_amount: data.monthly_amount || null,
          terms_notes: data.terms_notes || null
        });

        agreement = db.prepare('SELECT * FROM case_fee_agreements WHERE id = ?').get(insertRes.lastInsertRowid) as CaseFeeAgreement;
      }

      // If installments provided, replace them (preserving paid status if matching by title or recreate)
      if (data.installments && Array.isArray(data.installments)) {
        // Fetch existing installments to preserve payments
        const existing = db.prepare('SELECT * FROM fee_installments WHERE agreement_id = ?').all(agreement.id) as FeeInstallment[];
        const paidMap = new Map<string, number>();
        existing.forEach(inst => paidMap.set(inst.title, inst.paid_amount));

        db.prepare('DELETE FROM fee_installments WHERE agreement_id = ?').run(agreement.id);

        const insertInst = db.prepare(`
          INSERT INTO fee_installments (
            agreement_id, case_id, title, amount, due_date, status, paid_amount, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const inst of data.installments) {
          const paid = paidMap.get(inst.title) || 0;
          let status = 'غير مسددة';
          if (paid >= inst.amount && inst.amount > 0) status = 'مسددة بالكامل';
          else if (paid > 0) status = 'مسددة جزئياً';

          insertInst.run(
            agreement.id,
            data.case_id,
            inst.title,
            inst.amount,
            inst.due_date || null,
            status,
            paid,
            inst.notes || null
          );
        }
      }

      const updated = db.prepare('SELECT * FROM case_fee_agreements WHERE id = ?').get(agreement.id) as CaseFeeAgreement;
      const installments = db.prepare('SELECT * FROM fee_installments WHERE agreement_id = ? ORDER BY id ASC').all(agreement.id) as FeeInstallment[];

      return {
        ...updated,
        installments
      };
    });

    return transaction();
  });

  // 3. Get Next Receipt Number
  ipcMain.handle('finance:getNextReceiptNumber', async (): Promise<string> => {
    const db = dbService.getDb();
    return generateNextReceiptNumber(db);
  });

  // 4. Create Financial Transaction (with Cheque Details if paid by cheque)
  ipcMain.handle('finance:createTransaction', async (_event, tx: {
    case_id?: number | null;
    client_id?: number | null;
    hearing_id?: number | null;
    installment_id?: number | null;
    transaction_date: string;
    category: any;
    transaction_type: string;
    direction: any;
    amount: number;
    payment_method: any;
    description: string;
    notes?: string | null;
  }, cheque?: {
    cheque_number: string;
    bank_name: string;
    drawer_name?: string;
    due_date: string;
    notes?: string;
  }): Promise<FinancialTransaction> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      const receiptNumber = generateNextReceiptNumber(db);

      const stmt = db.prepare(`
        INSERT INTO financial_transactions (
          receipt_number, case_id, client_id, hearing_id, installment_id,
          transaction_date, category, transaction_type, direction,
          amount, payment_method, description, notes
        ) VALUES (
          @receipt_number, @case_id, @client_id, @hearing_id, @installment_id,
          @transaction_date, @category, @transaction_type, @direction,
          @amount, @payment_method, @description, @notes
        )
      `);

      const res = stmt.run({
        receipt_number: receiptNumber,
        case_id: tx.case_id || null,
        client_id: tx.client_id || null,
        hearing_id: tx.hearing_id || null,
        installment_id: tx.installment_id || null,
        transaction_date: tx.transaction_date,
        category: tx.category,
        transaction_type: tx.transaction_type,
        direction: tx.direction,
        amount: Number(tx.amount),
        payment_method: tx.payment_method || 'نقدي',
        description: tx.description,
        notes: tx.notes || null
      });

      const txId = res.lastInsertRowid as number;

      // If linked to an installment and is fee inflow, update installment payment status
      if (tx.installment_id && tx.category === 'أتعاب' && tx.direction === 'وارد') {
        const inst = db.prepare('SELECT * FROM fee_installments WHERE id = ?').get(tx.installment_id) as FeeInstallment | undefined;
        if (inst) {
          const newPaid = inst.paid_amount + Number(tx.amount);
          let newStatus = 'غير مسددة';
          if (newPaid >= inst.amount) newStatus = 'مسددة بالكامل';
          else if (newPaid > 0) newStatus = 'مسددة جزئياً';

          db.prepare('UPDATE fee_installments SET paid_amount = ?, status = ? WHERE id = ?').run(newPaid, newStatus, inst.id);
        }
      }

      // If paid by cheque, insert cheque details
      if (tx.payment_method === 'شيك' && cheque) {
        db.prepare(`
          INSERT INTO cheque_details (
            transaction_id, case_id, client_id, cheque_number,
            bank_name, drawer_name, amount, due_date, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'تحت التحصيل', ?)
        `).run(
          txId,
          tx.case_id || null,
          tx.client_id || null,
          cheque.cheque_number,
          cheque.bank_name,
          cheque.drawer_name || null,
          Number(tx.amount),
          cheque.due_date,
          cheque.notes || null
        );
      }

      return db.prepare(`
        SELECT ft.*, c.case_number, c.case_year, c.court_name, cl.name as client_name
        FROM financial_transactions ft
        LEFT JOIN cases c ON c.id = ft.case_id
        LEFT JOIN clients cl ON cl.id = ft.client_id
        WHERE ft.id = ?
      `).get(txId) as FinancialTransaction;
    });

    return transaction();
  });

  // 5. Reverse Financial Transaction (Strict Accounting Reversal - Rules & Spec compliant)
  ipcMain.handle('finance:reverseTransaction', async (_event, transactionId: number, reason: string): Promise<{
    original: FinancialTransaction;
    reversal: FinancialTransaction;
  }> => {
    const db = dbService.getDb();

    const transaction = db.transaction(() => {
      const original = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(transactionId) as FinancialTransaction | undefined;
      if (!original) {
        throw new Error('الحركة المالية غير موجودة');
      }
      if (original.is_reversed) {
        throw new Error('هذه الحركة تم إلغاؤها بقيد عكسي مسبقاً');
      }

      const reversalReceipt = generateNextReceiptNumber(db, 'REV');
      const reversalDirection = original.direction === 'وارد' ? 'صادر' : 'وارد';
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Create reversal transaction
      const reversalRes = db.prepare(`
        INSERT INTO financial_transactions (
          receipt_number, case_id, client_id, hearing_id, installment_id,
          transaction_date, category, transaction_type, direction,
          amount, payment_method, description, notes, reversal_of_id
        ) VALUES (
          @receipt_number, @case_id, @client_id, @hearing_id, @installment_id,
          @transaction_date, @category, @transaction_type, @direction,
          @amount, @payment_method, @description, @notes, @reversal_of_id
        )
      `).run({
        receipt_number: reversalReceipt,
        case_id: original.case_id,
        client_id: original.client_id,
        hearing_id: original.hearing_id,
        installment_id: original.installment_id,
        transaction_date: todayStr,
        category: original.category,
        transaction_type: `قيد عكسي - ${original.transaction_type}`,
        direction: reversalDirection,
        amount: original.amount,
        payment_method: original.payment_method,
        description: `قيد عكسي لإلغاء الإيصال رقم ${original.receipt_number} — السبب: ${reason}`,
        notes: `قيد تسوية عكسي لحركة الإيصال ${original.receipt_number}`,
        reversal_of_id: original.id
      });

      const reversalId = reversalRes.lastInsertRowid as number;

      // 2. Mark original transaction as reversed
      db.prepare(`
        UPDATE financial_transactions SET
          is_reversed = 1,
          reversed_at = CURRENT_TIMESTAMP,
          reversed_by_id = ?,
          reversal_reason = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reversalId, reason, original.id);

      // 3. If linked to installment, adjust installment paid amount
      if (original.installment_id && original.category === 'أتعاب' && original.direction === 'وارد') {
        const inst = db.prepare('SELECT * FROM fee_installments WHERE id = ?').get(original.installment_id) as FeeInstallment | undefined;
        if (inst) {
          const newPaid = Math.max(0, inst.paid_amount - original.amount);
          let newStatus = 'غير مسددة';
          if (newPaid >= inst.amount && inst.amount > 0) newStatus = 'مسددة بالكامل';
          else if (newPaid > 0) newStatus = 'مسددة جزئياً';

          db.prepare('UPDATE fee_installments SET paid_amount = ?, status = ? WHERE id = ?').run(newPaid, newStatus, inst.id);
        }
      }

      // 4. If linked to cheque, mark cheque as bounced or cancelled
      db.prepare(`
        UPDATE cheque_details SET
          status = 'مرتد',
          notes = CASE WHEN notes IS NULL THEN 'تم إلغاء الحركة بقيد عكسي' ELSE notes || ' (تم إلغاء الحركة بقيد عكسي)' END,
          updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = ?
      `).run(original.id);

      const updatedOriginal = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(original.id) as FinancialTransaction;
      const updatedReversal = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get(reversalId) as FinancialTransaction;

      return {
        original: updatedOriginal,
        reversal: updatedReversal
      };
    });

    return transaction();
  });

  // 6. Get Financial Transactions with Filters
  ipcMain.handle('finance:getTransactions', async (_event, filter?: FinancialFilter): Promise<FinancialTransaction[]> => {
    const db = dbService.getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.case_id) {
      conditions.push('ft.case_id = ?');
      params.push(filter.case_id);
    }

    if (filter?.client_id) {
      conditions.push('ft.client_id = ?');
      params.push(filter.client_id);
    }

    if (filter?.category && filter.category !== 'الكل') {
      conditions.push('ft.category = ?');
      params.push(filter.category);
    }

    if (filter?.direction && filter.direction !== 'الكل') {
      conditions.push('ft.direction = ?');
      params.push(filter.direction);
    }

    if (filter?.payment_method && filter.payment_method !== 'الكل') {
      conditions.push('ft.payment_method = ?');
      params.push(filter.payment_method);
    }

    if (filter?.startDate) {
      conditions.push('ft.transaction_date >= ?');
      params.push(filter.startDate);
    }

    if (filter?.endDate) {
      conditions.push('ft.transaction_date <= ?');
      params.push(filter.endDate);
    }

    if (!filter?.includeReversed) {
      conditions.push('ft.is_reversed = 0');
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.trim();
      conditions.push(`(
        ft.receipt_number LIKE '%' || ? || '%'
        OR normalize_arabic(ft.description) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(ft.transaction_type) LIKE '%' || normalize_arabic(?) || '%'
        OR normalize_arabic(cl.name) LIKE '%' || normalize_arabic(?) || '%'
        OR c.case_number LIKE '%' || ? || '%'
      )`);
      params.push(q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        ft.*,
        c.case_number, c.case_year, c.court_name,
        cl.name as client_name,
        cd.id as chq_id, cd.cheque_number, cd.bank_name, cd.drawer_name, cd.due_date as chq_due_date, cd.status as chq_status
      FROM financial_transactions ft
      LEFT JOIN cases c ON c.id = ft.case_id
      LEFT JOIN clients cl ON cl.id = ft.client_id
      LEFT JOIN cheque_details cd ON cd.transaction_id = ft.id
      ${whereClause}
      ORDER BY ft.transaction_date DESC, ft.id DESC
    `;

    const rows = db.prepare(sql).all(...params) as any[];

    return rows.map(r => ({
      ...r,
      cheque_details: r.chq_id ? {
        id: r.chq_id,
        transaction_id: r.id,
        cheque_number: r.cheque_number,
        bank_name: r.bank_name,
        drawer_name: r.drawer_name,
        amount: r.amount,
        due_date: r.chq_due_date,
        status: r.chq_status
      } : null
    }));
  });

  // 7. Get Case Financial Summary
  ipcMain.handle('finance:getCaseSummary', async (_event, caseId: number): Promise<CaseFinancialSummary> => {
    const db = dbService.getDb();

    // 1. Fee agreement
    const agreement = db.prepare('SELECT total_amount FROM case_fee_agreements WHERE case_id = ?').get(caseId) as { total_amount: number } | undefined;
    const totalAgreedFees = agreement?.total_amount || 0;

    // 2. Sums by category & direction (excluding reversed transactions)
    const sumsStmt = db.prepare(`
      SELECT 
        category,
        direction,
        SUM(amount) as total_amount
      FROM financial_transactions
      WHERE case_id = ? AND is_reversed = 0
      GROUP BY category, direction
    `);
    const rows = sumsStmt.all(caseId) as { category: string; direction: string; total_amount: number }[];

    let paidFees = 0;
    let totalCourtFeesInflow = 0;
    let totalCourtFeesOutflow = 0;
    let totalExpensesInflow = 0;
    let totalExpensesOutflow = 0;
    let totalExecutionInflow = 0;
    let totalExecutionOutflow = 0;
    let totalInflow = 0;
    let totalOutflow = 0;

    rows.forEach(r => {
      const amt = r.total_amount || 0;
      if (r.direction === 'وارد') {
        totalInflow += amt;
        if (r.category === 'أتعاب') paidFees += amt;
        else if (r.category === 'رسوم قضائية') totalCourtFeesInflow += amt;
        else if (r.category === 'مصاريف') totalExpensesInflow += amt;
        else if (r.category === 'تنفيذ') totalExecutionInflow += amt;
      } else if (r.direction === 'صادر') {
        totalOutflow += amt;
        if (r.category === 'رسوم قضائية') totalCourtFeesOutflow += amt;
        else if (r.category === 'مصاريف') totalExpensesOutflow += amt;
        else if (r.category === 'تنفيذ') totalExecutionOutflow += amt;
      }
    });

    const remainingFees = Math.max(0, totalAgreedFees - paidFees);

    // Net balance: Client deposits (inflows) MINUS actual office costs & agreed fees
    // If net balance > 0, client has positive credit (له). If negative, client owes money (عليه).
    const actualCostsSpent = totalCourtFeesOutflow + totalExpensesOutflow + totalExecutionOutflow;
    const totalDemanded = totalAgreedFees + actualCostsSpent;
    const netBalance = totalInflow - totalDemanded;

    return {
      total_agreed_fees: totalAgreedFees,
      paid_fees: paidFees,
      remaining_fees: remainingFees,
      total_court_fees_inflow: totalCourtFeesInflow,
      total_court_fees_outflow: totalCourtFeesOutflow,
      total_expenses_inflow: totalExpensesInflow,
      total_expenses_outflow: totalExpensesOutflow,
      total_execution_inflow: totalExecutionInflow,
      total_execution_outflow: totalExecutionOutflow,
      total_inflow: totalInflow,
      total_outflow: totalOutflow,
      net_balance: netBalance
    };
  });

  // 8. Get Client Overall Financial Summary
  ipcMain.handle('finance:getClientSummary', async (_event, clientId: number): Promise<{
    total_agreed_fees: number;
    paid_fees: number;
    remaining_fees: number;
    net_balance: number;
  }> => {
    const db = dbService.getDb();

    const agStmt = db.prepare(`
      SELECT SUM(total_amount) as total FROM case_fee_agreements WHERE client_id = ?
    `).get(clientId) as { total: number };
    const totalAgreed = agStmt?.total || 0;

    const txStmt = db.prepare(`
      SELECT direction, category, SUM(amount) as total
      FROM financial_transactions
      WHERE client_id = ? AND is_reversed = 0
      GROUP BY direction, category
    `).all(clientId) as { direction: string; category: string; total: number }[];

    let paidFees = 0;
    let totalInflow = 0;
    let totalOutflow = 0;

    txStmt.forEach(r => {
      const amt = r.total || 0;
      if (r.direction === 'وارد') {
        totalInflow += amt;
        if (r.category === 'أتعاب') paidFees += amt;
      } else {
        totalOutflow += amt;
      }
    });

    return {
      total_agreed_fees: totalAgreed,
      paid_fees: paidFees,
      remaining_fees: Math.max(0, totalAgreed - paidFees),
      net_balance: totalInflow - (totalAgreed + totalOutflow)
    };
  });

  // 9. Get Cheques (with countdown and filters)
  ipcMain.handle('finance:getCheques', async (_event, filter?: { status?: string; startDate?: string; endDate?: string }): Promise<ChequeDetail[]> => {
    const db = dbService.getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status && filter.status !== 'الكل') {
      conditions.push('cd.status = ?');
      params.push(filter.status);
    }

    if (filter?.startDate) {
      conditions.push('cd.due_date >= ?');
      params.push(filter.startDate);
    }

    if (filter?.endDate) {
      conditions.push('cd.due_date <= ?');
      params.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        cd.*,
        c.case_number, c.case_year,
        cl.name as client_name
      FROM cheque_details cd
      LEFT JOIN cases c ON c.id = cd.case_id
      LEFT JOIN clients cl ON cl.id = cd.client_id
      ${whereClause}
      ORDER BY 
        CASE cd.status 
          WHEN 'تحت التحصيل' THEN 1 
          WHEN 'مرتد' THEN 2 
          WHEN 'محصل' THEN 3 
          ELSE 4 
        END,
        cd.due_date ASC
    `;

    const rows = db.prepare(sql).all(...params) as ChequeDetail[];
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMs = new Date(todayStr).getTime();

    return rows.map(r => {
      const dueMs = new Date(r.due_date).getTime();
      const diffDays = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
      return {
        ...r,
        days_until_due: diffDays,
        is_overdue: diffDays < 0 && r.status === 'تحت التحصيل'
      };
    });
  });

  // 10. Update Cheque Status (Collected / Bounced)
  ipcMain.handle('finance:updateChequeStatus', async (_event, id: number, status: ChequeStatus, collectedDate?: string): Promise<ChequeDetail> => {
    const db = dbService.getDb();
    const dateToSet = status === 'محصل' ? (collectedDate || new Date().toISOString().split('T')[0]) : null;

    db.prepare(`
      UPDATE cheque_details SET
        status = ?,
        collected_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, dateToSet, id);

    return db.prepare('SELECT * FROM cheque_details WHERE id = ?').get(id) as ChequeDetail;
  });

  // 11. General Financial Stats (for Finance Page Dashboard)
  ipcMain.handle('finance:getGeneralStats', async (_event, period?: { startDate?: string; endDate?: string }): Promise<GeneralFinancialStats> => {
    const db = dbService.getDb();
    const conditions: string[] = ['is_reversed = 0'];
    const params: any[] = [];

    if (period?.startDate) {
      conditions.push('transaction_date >= ?');
      params.push(period.startDate);
    }
    if (period?.endDate) {
      conditions.push('transaction_date <= ?');
      params.push(period.endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Inflow vs Outflow
    const sums = db.prepare(`
      SELECT 
        direction,
        SUM(amount) as total
      FROM financial_transactions
      ${whereClause}
      GROUP BY direction
    `).all(...params) as { direction: string; total: number }[];

    let totalIncome = 0;
    let totalExpense = 0;

    sums.forEach(s => {
      if (s.direction === 'وارد') totalIncome = s.total || 0;
      else if (s.direction === 'صادر') totalExpense = s.total || 0;
    });

    // Outstanding fees
    const totalAgreedAll = (db.prepare('SELECT SUM(total_amount) as sum FROM case_fee_agreements').get() as { sum: number })?.sum || 0;
    const paidFeesAll = (db.prepare("SELECT SUM(amount) as sum FROM financial_transactions WHERE category = 'أتعاب' AND direction = 'وارد' AND is_reversed = 0").get() as { sum: number })?.sum || 0;
    const outstandingFees = Math.max(0, totalAgreedAll - paidFeesAll);

    // Pending Cheques
    const pendingChqs = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as sum
      FROM cheque_details
      WHERE status = 'تحت التحصيل'
    `).get() as { count: number; sum: number };

    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: totalIncome - totalExpense,
      outstanding_fees: outstandingFees,
      pending_cheques_count: pendingChqs?.count || 0,
      pending_cheques_amount: pendingChqs?.sum || 0
    };
  });
}
