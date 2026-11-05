import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../services/DatabaseService';
import { DataDirService } from '../services/DataDirService';
import { TrashBinItem } from '../../shared/types';

export function registerTrashBinIpc(): void {
  const db = DatabaseService.getInstance().getDatabase();
  const dataDirService = DataDirService.getInstance();

  // 1. Get All Trash Items across the system
  ipcMain.handle('trash:getItems', async (): Promise<TrashBinItem[]> => {
    const items: TrashBinItem[] = [];

    // A. Deleted Documents
    const docs = db.prepare(`
      SELECT d.*, c.case_number, c.case_year
      FROM case_documents d
      LEFT JOIN cases c ON d.case_id = c.id
      WHERE d.is_deleted = 1
      ORDER BY d.deleted_at DESC
    `).all() as any[];

    for (const d of docs) {
      items.push({
        id: `doc-${d.id}`,
        entityType: 'document',
        entityId: d.id,
        title: d.title || d.file_name,
        details: `مستند (${d.category}) • قضية رقم ${d.case_number || '-'}/${d.case_year || '-'} • الحجم: ${(d.file_size_bytes / 1024).toFixed(1)} ك.ب`,
        deletedAt: d.deleted_at || d.updated_at || new Date().toISOString(),
      });
    }

    // B. Archived Cases
    const cases = db.prepare(`
      SELECT * FROM cases
      WHERE status = 'مؤرشفة'
      ORDER BY updated_at DESC
    `).all() as any[];

    for (const c of cases) {
      items.push({
        id: `case-${c.id}`,
        entityType: 'case',
        entityId: c.id,
        title: `ملف قضية رقم ${c.case_number} لسنة ${c.case_year}`,
        details: `محكمة: ${c.court_name} • النوع: ${c.case_type} • موضوع الدعوى: ${c.subject}`,
        deletedAt: c.updated_at || c.created_at || new Date().toISOString(),
      });
    }

    // C. Archived Clients
    const clients = db.prepare(`
      SELECT * FROM clients
      WHERE status = 'archived'
      ORDER BY updated_at DESC
    `).all() as any[];

    for (const cl of clients) {
      items.push({
        id: `client-${cl.id}`,
        entityType: 'client',
        entityId: cl.id,
        title: `الموكل: ${cl.name}`,
        details: `الهاتف: ${cl.phone || '-'} • التوكيل: ${cl.poa_number || 'بدون توكيل'} • النوع: ${cl.client_type === 'company' ? 'شركة' : 'فرد'}`,
        deletedAt: cl.updated_at || cl.created_at || new Date().toISOString(),
      });
    }

    // D. Canceled Tasks
    const tasks = db.prepare(`
      SELECT * FROM tasks
      WHERE status = 'ملغاة'
      ORDER BY updated_at DESC
    `).all() as any[];

    for (const t of tasks) {
      items.push({
        id: `task-${t.id}`,
        entityType: 'task',
        entityId: t.id,
        title: `مهمة: ${t.title}`,
        details: `التصنيف: ${t.category} • الأولوية: ${t.priority} • المكلف: ${t.assigned_to || 'أنا'}`,
        deletedAt: t.updated_at || t.created_at || new Date().toISOString(),
      });
    }

    // Sort newest deleted first
    items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    return items;
  });

  // 2. Restore Item from Trash
  ipcMain.handle('trash:restore', async (_, entityType: string, entityId: number) => {
    let title = '';

    if (entityType === 'document') {
      const doc = db.prepare('SELECT title FROM case_documents WHERE id = ?').get(entityId) as any;
      title = doc?.title || 'مستند';
      db.prepare(`
        UPDATE case_documents
        SET is_deleted = 0, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(entityId);
    } else if (entityType === 'case') {
      const c = db.prepare('SELECT case_number, case_year FROM cases WHERE id = ?').get(entityId) as any;
      title = `قضية ${c?.case_number}/${c?.case_year}`;
      db.prepare(`
        UPDATE cases
        SET status = 'متداولة', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(entityId);
    } else if (entityType === 'client') {
      const cl = db.prepare('SELECT name FROM clients WHERE id = ?').get(entityId) as any;
      title = `موكل ${cl?.name}`;
      db.prepare(`
        UPDATE clients
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(entityId);
    } else if (entityType === 'task') {
      const t = db.prepare('SELECT title FROM tasks WHERE id = ?').get(entityId) as any;
      title = `مهمة ${t?.title}`;
      db.prepare(`
        UPDATE tasks
        SET status = 'جديدة', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(entityId);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action_type, entity_type, entity_id, entity_name, details)
      VALUES ('update', ?, ?, ?, 'تم استرجاع العنصر من سلة المحذوفات بنجاح')
    `).run(entityType, entityId, title);

    return { success: true };
  });

  // 3. Permanent Delete Item with Disk Cleanup
  ipcMain.handle('trash:deletePermanent', async (_, entityType: string, entityId: number) => {
    let title = '';

    if (entityType === 'document') {
      const doc = db.prepare('SELECT title, relative_path FROM case_documents WHERE id = ?').get(entityId) as any;
      title = doc?.title || 'مستند';

      if (doc?.relative_path) {
        const dataDir = dataDirService.getDataDirectory();
        const fullPath = path.join(dataDir, doc.relative_path);
        try {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (e) {
          console.warn('Could not unlink physical file:', e);
        }
      }

      db.prepare('DELETE FROM case_documents WHERE id = ?').run(entityId);
    } else if (entityType === 'case') {
      const c = db.prepare('SELECT case_number, case_year FROM cases WHERE id = ?').get(entityId) as any;
      title = `قضية ${c?.case_number}/${c?.case_year}`;
      db.prepare('DELETE FROM cases WHERE id = ?').run(entityId);
    } else if (entityType === 'client') {
      const cl = db.prepare('SELECT name FROM clients WHERE id = ?').get(entityId) as any;
      title = `موكل ${cl?.name}`;
      db.prepare('DELETE FROM clients WHERE id = ?').run(entityId);
    } else if (entityType === 'task') {
      const t = db.prepare('SELECT title FROM tasks WHERE id = ?').get(entityId) as any;
      title = `مهمة ${t?.title}`;
      db.prepare('DELETE FROM tasks WHERE id = ?').run(entityId);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action_type, entity_type, entity_id, entity_name, details)
      VALUES ('delete', ?, ?, ?, 'تم الحذف النهائي للعنصر نهائياً من النظام')
    `).run(entityType, entityId, title);

    return { success: true };
  });

  // 4. Empty Whole Trash Bin
  ipcMain.handle('trash:empty', async () => {
    // 1. Unlink physical files of deleted documents
    const deletedDocs = db.prepare('SELECT relative_path FROM case_documents WHERE is_deleted = 1').all() as any[];
    const dataDir = dataDirService.getDataDirectory();

    for (const d of deletedDocs) {
      if (d.relative_path) {
        const fullPath = path.join(dataDir, d.relative_path);
        try {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (e) {
          console.error('Failed to unlink deleted document file:', fullPath, e);
        }
      }
    }

    const docCount = db.prepare('DELETE FROM case_documents WHERE is_deleted = 1').run().changes;
    const taskCount = db.prepare("DELETE FROM tasks WHERE status = 'ملغاة'").run().changes;

    const totalCleared = docCount + taskCount;

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
      VALUES ('delete', 'system', 'تفريغ سلة المحذوفات', ?)
    `).run(`تم إفراغ سلة المحذوفات وحذف ${totalCleared} عنصر نهائياً من النظام`);

    return { success: true, count: totalCleared };
  });
}
