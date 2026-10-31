import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import { normalizeArabicText, matchesArabicSearch } from '../../shared/arabicUtils';
import {
  UniversalSearchResults,
  SearchResultItem,
} from '../../shared/types';

export function registerSearchIpc(): void {
  const db = DatabaseService.getInstance().getDatabase();

  ipcMain.handle('search:universal', async (_, query: string): Promise<UniversalSearchResults> => {
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 2) {
      return { query: trimmed, totalCount: 0, items: [] };
    }

    const items: SearchResultItem[] = [];

    // 1. Search Cases
    const cases = db.prepare(`
      SELECT c.*, cl.name as primary_client_name
      FROM cases c
      LEFT JOIN case_clients cc ON c.id = cc.case_id AND cc.is_primary = 1
      LEFT JOIN clients cl ON cc.client_id = cl.id
    `).all() as any[];

    for (const c of cases) {
      const match =
        matchesArabicSearch(c.case_number, trimmed) ||
        matchesArabicSearch(String(c.case_year), trimmed) ||
        matchesArabicSearch(c.court_name, trimmed) ||
        matchesArabicSearch(c.court_circuit, trimmed) ||
        matchesArabicSearch(c.subject, trimmed) ||
        matchesArabicSearch(c.claims, trimmed) ||
        matchesArabicSearch(c.table_number, trimmed) ||
        matchesArabicSearch(c.police_report_number, trimmed) ||
        matchesArabicSearch(c.case_type, trimmed) ||
        matchesArabicSearch(c.primary_client_name, trimmed) ||
        matchesArabicSearch(c.description, trimmed);

      if (match) {
        items.push({
          id: c.id,
          entityType: 'case',
          title: `قضية رقم ${c.case_number} لسنة ${c.case_year} (${c.court_name})`,
          subtitle: `الموكل: ${c.primary_client_name || 'غير محدد'} • النوع: ${c.case_type} • الدائرة: ${c.court_circuit || '-'}`,
          description: c.subject,
          caseId: c.id,
          date: c.filing_date,
          badge: c.status,
        });
      }
    }

    // 2. Search Clients
    const clients = db.prepare('SELECT * FROM clients').all() as any[];
    for (const cl of clients) {
      const match =
        matchesArabicSearch(cl.name, trimmed) ||
        matchesArabicSearch(cl.phone, trimmed) ||
        matchesArabicSearch(cl.phone2, trimmed) ||
        matchesArabicSearch(cl.whatsapp, trimmed) ||
        matchesArabicSearch(cl.national_id_or_cr, trimmed) ||
        matchesArabicSearch(cl.poa_number, trimmed) ||
        matchesArabicSearch(cl.notes, trimmed);

      if (match) {
        items.push({
          id: cl.id,
          entityType: 'client',
          title: `الموكل: ${cl.name}`,
          subtitle: `الهاتف: ${cl.phone || '-'} • الرقم القومي/السجل: ${cl.national_id_or_cr || '-'}`,
          description: cl.poa_number ? `توكيل رقم: ${cl.poa_number} (${cl.poa_type || ''})` : cl.notes || '',
          badge: cl.client_type === 'company' ? 'شركة' : 'فرد',
        });
      }
    }

    // 3. Search Opponents
    const opponents = db.prepare('SELECT * FROM case_opponents').all() as any[];
    for (const op of opponents) {
      const match =
        matchesArabicSearch(op.name, trimmed) ||
        matchesArabicSearch(op.address, trimmed) ||
        matchesArabicSearch(op.lawyer_name, trimmed) ||
        matchesArabicSearch(op.lawyer_phone, trimmed);

      if (match) {
        items.push({
          id: op.id,
          entityType: 'case',
          caseId: op.case_id,
          title: `الخصم: ${op.name} (${op.role_capacity})`,
          subtitle: op.lawyer_name ? `المحامي المقابل: ${op.lawyer_name}` : 'خصم في دعوى',
          description: `مرتبط بالقضية رقم ${op.case_id}`,
          badge: 'خصم قضائي',
        });
      }
    }

    // 4. Search Hearings
    const hearings = db.prepare(`
      SELECT h.*, c.case_number, c.case_year, c.court_name
      FROM hearings h
      JOIN cases c ON h.case_id = c.id
    `).all() as any[];

    for (const h of hearings) {
      const match =
        matchesArabicSearch(h.court_decision, trimmed) ||
        matchesArabicSearch(h.adjournment_reason, trimmed) ||
        matchesArabicSearch(h.proceedings, trimmed) ||
        matchesArabicSearch(h.claims_made, trimmed) ||
        matchesArabicSearch(h.documents_submitted, trimmed);

      if (match) {
        items.push({
          id: h.id,
          entityType: 'hearing',
          title: `جلسة ${h.hearing_date} - قضية ${h.case_number}/${h.case_year}`,
          subtitle: h.court_decision ? `القرار: ${h.court_decision}` : `سبب التأجيل: ${h.adjournment_reason || 'جلسة مرافعة'}`,
          description: h.proceedings,
          caseId: h.case_id,
          date: h.hearing_date,
          badge: h.adjournment_reason ? 'تأجيل' : 'جلسة',
        });
      }
    }

    // 5. Search Executions
    const executions = db.prepare(`
      SELECT ef.*, c.case_number, c.case_year
      FROM execution_files ef
      LEFT JOIN cases c ON ef.case_id = c.id
    `).all() as any[];

    for (const ef of executions) {
      const match =
        matchesArabicSearch(ef.file_number, trimmed) ||
        matchesArabicSearch(ef.deed_type, trimmed) ||
        matchesArabicSearch(ef.debtor_name, trimmed) ||
        matchesArabicSearch(ef.creditor_name, trimmed) ||
        matchesArabicSearch(ef.bailiff_court, trimmed) ||
        matchesArabicSearch(ef.execution_judge, trimmed);

      if (match) {
        items.push({
          id: ef.id,
          entityType: 'execution',
          title: `ملف تنفيذ رقم ${ef.file_number || ef.id} (${ef.deed_type})`,
          subtitle: `ضد: ${ef.debtor_name} • لصالح: ${ef.creditor_name} • المبلغ: ${ef.required_amount} ج.م`,
          description: `محكمة: ${ef.bailiff_court || '-'} • القاضي: ${ef.execution_judge || '-'}`,
          caseId: ef.case_id,
          badge: ef.status,
        });
      }
    }

    // 6. Search Tasks
    const tasks = db.prepare(`
      SELECT t.*, c.case_number, c.case_year
      FROM tasks t
      LEFT JOIN cases c ON t.case_id = c.id
    `).all() as any[];

    for (const t of tasks) {
      const match =
        matchesArabicSearch(t.title, trimmed) ||
        matchesArabicSearch(t.description, trimmed) ||
        matchesArabicSearch(t.assigned_to, trimmed) ||
        matchesArabicSearch(t.category, trimmed) ||
        matchesArabicSearch(t.result_notes, trimmed);

      if (match) {
        items.push({
          id: t.id,
          entityType: 'task',
          title: `مهمة: ${t.title} (${t.priority})`,
          subtitle: `المكلف: ${t.assigned_to || 'أنا'} • التصنيف: ${t.category} ${t.case_number ? `• قضية: ${t.case_number}/${t.case_year}` : ''}`,
          description: t.description || t.result_notes,
          caseId: t.case_id,
          date: t.due_date,
          badge: t.status,
        });
      }
    }

    // 7. Search Documents
    const docs = db.prepare(`
      SELECT d.*, c.case_number, c.case_year
      FROM case_documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.is_deleted = 0
    `).all() as any[];

    for (const d of docs) {
      const match =
        matchesArabicSearch(d.title, trimmed) ||
        matchesArabicSearch(d.category, trimmed) ||
        matchesArabicSearch(d.file_name, trimmed) ||
        matchesArabicSearch(d.description, trimmed);

      if (match) {
        items.push({
          id: d.id,
          entityType: 'document',
          title: `مستند: ${d.title}`,
          subtitle: `التصنيف: ${d.category} • ملف قضية: ${d.case_number}/${d.case_year}`,
          description: `${d.file_name} (${(d.file_size_bytes / 1024).toFixed(1)} ك.ب) ${d.description || ''}`,
          caseId: d.case_id,
          date: d.created_at ? d.created_at.slice(0, 10) : undefined,
          badge: d.category,
        });
      }
    }

    // 8. Search Financial Transactions
    const finTxs = db.prepare(`
      SELECT ft.*, c.case_number, c.case_year
      FROM financial_transactions ft
      LEFT JOIN cases c ON ft.case_id = c.id
    `).all() as any[];

    for (const ft of finTxs) {
      const match =
        matchesArabicSearch(ft.receipt_number, trimmed) ||
        matchesArabicSearch(ft.description, trimmed) ||
        matchesArabicSearch(ft.notes, trimmed) ||
        matchesArabicSearch(ft.category, trimmed) ||
        matchesArabicSearch(ft.transaction_type, trimmed);

      if (match) {
        items.push({
          id: ft.id,
          entityType: 'finance',
          title: `حركة مالية [إيصال ${ft.receipt_number}]: ${ft.amount} ج.م`,
          subtitle: `${ft.direction === 'inflow' ? 'وارد' : 'صادر'} (${ft.category} - ${ft.transaction_type}) ${ft.case_number ? `• قضية: ${ft.case_number}/${ft.case_year}` : ''}`,
          description: ft.description || ft.notes,
          caseId: ft.case_id,
          date: ft.transaction_date,
          badge: ft.direction === 'inflow' ? 'وارد' : 'صادر',
        });
      }
    }

    return {
      query: trimmed,
      totalCount: items.length,
      items,
    };
  });
}
