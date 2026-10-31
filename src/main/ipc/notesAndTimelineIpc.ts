import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import {
  CaseNote,
  CreateCaseNoteInput,
  UpdateCaseNoteInput,
  CaseTimelineItem,
} from '../../shared/types';

export function registerNotesAndTimelineIpc(): void {
  const db = DatabaseService.getInstance().getDatabase();

  // ==========================================
  // 1. Case Notes CRUD
  // ==========================================

  // Get notes for a case
  ipcMain.handle('caseNotes:getByCase', async (_, caseId: number) => {
    const stmt = db.prepare(`
      SELECT * FROM case_notes
      WHERE case_id = ?
      ORDER BY is_pinned DESC, created_at DESC
    `);
    return stmt.all(caseId) as CaseNote[];
  });

  // Create note
  ipcMain.handle('caseNotes:create', async (_, input: CreateCaseNoteInput) => {
    if (!input.case_id || !input.title) {
      throw new Error('بيانات الملاحظة غير مكتملة (مطلوب العنوان ومعرف القضية)');
    }

    const stmt = db.prepare(`
      INSERT INTO case_notes (case_id, title, content, category, is_pinned)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.case_id,
      input.title,
      input.content || '',
      input.category || 'عامة',
      input.is_pinned ? 1 : 0
    );

    return db.prepare('SELECT * FROM case_notes WHERE id = ?').get(result.lastInsertRowid) as CaseNote;
  });

  // Update note
  ipcMain.handle('caseNotes:update', async (_, id: number, updates: UpdateCaseNoteInput) => {
    const note = db.prepare('SELECT * FROM case_notes WHERE id = ?').get(id) as CaseNote | undefined;
    if (!note) {
      throw new Error('الملاحظة غير موجودة');
    }

    const title = updates.title !== undefined ? updates.title : note.title;
    const content = updates.content !== undefined ? updates.content : note.content;
    const category = updates.category !== undefined ? updates.category : note.category;
    const is_pinned = updates.is_pinned !== undefined ? updates.is_pinned : note.is_pinned;

    db.prepare(`
      UPDATE case_notes
      SET title = ?, content = ?, category = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, category, is_pinned, id);

    return db.prepare('SELECT * FROM case_notes WHERE id = ?').get(id) as CaseNote;
  });

  // Delete note
  ipcMain.handle('caseNotes:delete', async (_, id: number) => {
    db.prepare('DELETE FROM case_notes WHERE id = ?').run(id);
    return { success: true };
  });

  // ==========================================
  // 2. Unified Case Timeline & Statistics
  // ==========================================

  ipcMain.handle('caseTimeline:get', async (_, caseId: number) => {
    const items: CaseTimelineItem[] = [];

    // 1. Case Filing Date
    const caseRow = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as any;
    if (caseRow && caseRow.filing_date) {
      items.push({
        id: `filing-${caseRow.id}`,
        date: caseRow.filing_date,
        type: 'filing',
        title: `قيد الدعوى رسمياً بالمحكمة (${caseRow.case_number} لسنة ${caseRow.case_year})`,
        description: `تم قيد الدعوى أمام ${caseRow.court_name} - ${caseRow.court_circuit || 'الدائرة'}. موضوع الدعوى: ${caseRow.subject}`,
        statusBadge: 'قيد الدعوى',
        badgeColor: 'blue',
      });
    }

    // 2. Hearings
    const hearings = db.prepare('SELECT * FROM hearings WHERE case_id = ? ORDER BY hearing_date ASC').all(caseId) as any[];
    for (const h of hearings) {
      let desc = '';
      if (h.court_decision) desc += `القرار: ${h.court_decision}. `;
      if (h.proceedings) desc += `ما تم بالجلسة: ${h.proceedings}. `;
      if (h.adjournment_reason) desc += `سبب التأجيل: ${h.adjournment_reason}. `;
      if (h.next_hearing_date) desc += `الجلسة القادمة: ${h.next_hearing_date}.`;

      const isJudgment = h.is_judgment_hearing === 1 || (h.judgment_text && h.judgment_text.length > 0);

      items.push({
        id: `hearing-${h.id}`,
        date: h.hearing_date,
        type: 'hearing',
        title: isJudgment ? `جلسة النطق بالحكم` : `جلسة مرافعة ${h.court_circuit ? `(${h.court_circuit})` : ''}`,
        description: desc.trim() || 'لا توجد تفاصيل إضافية مسجلة للجلسة.',
        statusBadge: isJudgment ? 'حكم قضائي' : (h.adjournment_reason ? `تأجيل: ${h.adjournment_reason}` : (h.attended ? 'تم الحضور' : 'جلسة')),
        badgeColor: isJudgment ? 'emerald' : (h.adjournment_reason ? 'amber' : 'slate'),
        extraInfo: { hearingId: h.id, attended: h.attended, decision: h.court_decision },
      });
    }

    // 3. Financial Transactions
    const finTxs = db.prepare('SELECT * FROM financial_transactions WHERE case_id = ? ORDER BY transaction_date ASC').all(caseId) as any[];
    for (const tx of finTxs) {
      const isReversal = tx.is_reversed === 1 || tx.is_reversal === 1;
      items.push({
        id: `finance-${tx.id}`,
        date: tx.transaction_date,
        type: 'finance',
        title: `${tx.direction === 'inflow' ? 'سند قبض وارد' : 'سند صرف صادر'} (${tx.category}) - ${tx.amount.toLocaleString('ar-EG')} ج.م`,
        description: `${tx.description || tx.transaction_type} [إيصال: ${tx.receipt_number}] ${isReversal ? '⚠️ قيد ملغى/عكسي' : ''}`,
        statusBadge: tx.direction === 'inflow' ? 'تحصيل وارد' : 'مصروف صادر',
        badgeColor: isReversal ? 'rose' : (tx.direction === 'inflow' ? 'emerald' : 'orange'),
        extraInfo: { amount: tx.amount, receiptNumber: tx.receipt_number },
      });
    }

    // 4. Executions & Actions
    const execFiles = db.prepare('SELECT * FROM execution_files WHERE case_id = ?').all(caseId) as any[];
    for (const ef of execFiles) {
      items.push({
        id: `exec-file-${ef.id}`,
        date: ef.created_at ? ef.created_at.slice(0, 10) : (ef.announcement_date || new Date().toISOString().slice(0, 10)),
        type: 'execution',
        title: `فتح ملف تنفيذ جبري رقم ${ef.file_number || ef.id}`,
        description: `سند التنفيذ: ${ef.deed_type} ضد ${ef.debtor_name}. المبلغ المطلوب: ${ef.required_amount.toLocaleString('ar-EG')} ج.م`,
        statusBadge: ef.status,
        badgeColor: 'purple',
      });

      // Actions of this execution file
      const actions = db.prepare('SELECT * FROM execution_actions WHERE execution_id = ? ORDER BY action_date ASC').all(ef.id) as any[];
      for (const act of actions) {
        items.push({
          id: `exec-act-${act.id}`,
          date: act.action_date,
          type: 'execution',
          title: `إجراء تنفيذي: ${act.action_type}`,
          description: `${act.details || ''} ${act.report_number ? `[محضر رقم: ${act.report_number}]` : ''}`.trim(),
          statusBadge: act.status,
          badgeColor: 'violet',
        });
      }
    }

    // 5. Case Documents
    const docs = db.prepare('SELECT * FROM case_documents WHERE case_id = ? AND is_deleted = 0 ORDER BY created_at ASC').all(caseId) as any[];
    for (const doc of docs) {
      items.push({
        id: `doc-${doc.id}`,
        date: doc.created_at ? doc.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        type: 'document',
        title: `إرفاق مستند: ${doc.title}`,
        description: `التصنيف: ${doc.category} • اسم الملف: ${doc.file_name} (${(doc.file_size_bytes / 1024).toFixed(1)} ك.ب)`,
        statusBadge: doc.category,
        badgeColor: 'sky',
      });
    }

    // 6. Tasks
    const tasks = db.prepare('SELECT * FROM tasks WHERE case_id = ? ORDER BY due_date ASC').all(caseId) as any[];
    for (const t of tasks) {
      items.push({
        id: `task-${t.id}`,
        date: t.due_date || (t.created_at ? t.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        type: 'task',
        title: `مهمة إدارية: ${t.title}`,
        description: `${t.description || ''} ${t.result_notes ? `[النتيجة: ${t.result_notes}]` : ''}`.trim(),
        statusBadge: t.status,
        badgeColor: t.status === 'منتهية' ? 'emerald' : (t.priority === 'عاجلة' ? 'red' : 'amber'),
      });
    }

    // 7. Case Notes
    const notes = db.prepare('SELECT * FROM case_notes WHERE case_id = ? ORDER BY created_at ASC').all(caseId) as any[];
    for (const n of notes) {
      items.push({
        id: `note-${n.id}`,
        date: n.created_at ? n.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        type: 'note',
        title: `ملاحظة: ${n.title}`,
        description: n.content,
        statusBadge: n.category,
        badgeColor: 'indigo',
      });
    }

    // Sort all timeline items descending by date (newest first)
    items.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });

    // ==========================================
    // Calculate Adjournment & Hearing Stats
    // ==========================================
    const totalHearings = hearings.length;
    const adjournedHearings = hearings.filter(h => h.adjournment_reason && h.adjournment_reason.trim().length > 0);
    const adjournmentsCount = adjournedHearings.length;

    // Top adjournment reason
    const reasonCounts: Record<string, number> = {};
    for (const h of adjournedHearings) {
      const r = h.adjournment_reason.trim();
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }

    let topAdjournmentReason = 'لا يوجد تأجيلات';
    let maxCount = 0;
    for (const [r, count] of Object.entries(reasonCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topAdjournmentReason = `${r} (${count} مرات)`;
      }
    }

    // Average days between hearings
    let avgDaysBetweenHearings = 0;
    if (totalHearings >= 2) {
      const sortedDates = hearings
        .map(h => new Date(h.hearing_date).getTime())
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);

      if (sortedDates.length >= 2) {
        const spanMs = sortedDates[sortedDates.length - 1] - sortedDates[0];
        const spanDays = Math.round(spanMs / (1000 * 60 * 60 * 24));
        avgDaysBetweenHearings = Math.round(spanDays / (sortedDates.length - 1));
      }
    }

    return {
      items,
      stats: {
        totalHearings,
        adjournmentsCount,
        topAdjournmentReason,
        avgDaysBetweenHearings,
      },
    };
  });
}
