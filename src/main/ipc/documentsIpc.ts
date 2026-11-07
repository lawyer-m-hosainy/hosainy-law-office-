import { ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../services/DatabaseService';
import { DataDirService } from '../services/DataDirService';
import {
  CaseDocument,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../../shared/types';

export function registerDocumentsIpc(): void {
  const db = DatabaseService.getInstance().getDatabase();
  const dataDirService = DataDirService.getInstance();

  // 1. Show Open File Dialog for picking attachments
  ipcMain.handle('documents:selectFiles', async () => {
    if (process.env.NODE_ENV === 'test' && process.env.TEST_ASSET_PDF) {
      return [process.env.TEST_ASSET_PDF];
    }
    const result = await dialog.showOpenDialog({
      title: 'اختر المستندات أو الملفات المراد إرفاقها بالقضية',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'كافة المستندات والصور', extensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt', 'xls', 'xlsx'] },
        { name: 'ملفات PDF', extensions: ['pdf'] },
        { name: 'مستندات Word', extensions: ['doc', 'docx'] },
        { name: 'الصور', extensions: ['jpg', 'jpeg', 'png'] },
        { name: 'جميع الملفات', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return [];
    }

    return result.filePaths;
  });

  // 2. Attach Document: copy to LawOfficeData/attachments/<case_id>/ and save relative path
  ipcMain.handle('documents:attach', async (_, input: CreateDocumentInput) => {
    if (!input.case_id || !input.sourceFilePath) {
      throw new Error('بيانات المستند غير مكتملة (مطلوب معرف القضية ومسار الملف)');
    }

    if (!fs.existsSync(input.sourceFilePath)) {
      throw new Error(`الملف المصدر غير موجود: ${input.sourceFilePath}`);
    }

    const dataDir = dataDirService.getDataDirectory();
    const caseAttachmentsDir = path.join(dataDir, 'attachments', String(input.case_id));

    // Ensure directory exists
    if (!fs.existsSync(caseAttachmentsDir)) {
      fs.mkdirSync(caseAttachmentsDir, { recursive: true });
    }

    const originalBasename = path.basename(input.sourceFilePath);
    const ext = path.extname(originalBasename).toLowerCase();
    const stat = fs.statSync(input.sourceFilePath);

    // Sanitize filename and prepend timestamp for uniqueness
    const safeName = originalBasename.replace(/[\\/:*?"<>|]/g, '_');
    const storedFileName = `${Date.now()}_${safeName}`;
    const destinationPath = path.join(caseAttachmentsDir, storedFileName);

    // Copy file locally
    fs.copyFileSync(input.sourceFilePath, destinationPath);

    // Relative path with forward slashes for cross-platform portability
    const relativePath = `attachments/${input.case_id}/${storedFileName}`;

    const stmt = db.prepare(`
      INSERT INTO case_documents (
        case_id, title, category, file_name, file_extension,
        relative_path, file_size_bytes, description, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const result = stmt.run(
      input.case_id,
      input.title || originalBasename,
      input.category || 'أخرى',
      originalBasename,
      ext,
      relativePath,
      stat.size,
      input.description || ''
    );

    const createdDoc = db.prepare('SELECT * FROM case_documents WHERE id = ?').get(result.lastInsertRowid) as CaseDocument;
    return createdDoc;
  });

  // 3. Get Documents for a Case (Active or Trash Bin)
  ipcMain.handle('documents:getByCase', async (_, caseId: number, includeDeleted: boolean = false) => {
    const isDeletedFlag = includeDeleted ? 1 : 0;
    const sql = includeDeleted
      ? 'SELECT * FROM case_documents WHERE case_id = ? AND is_deleted = ? ORDER BY deleted_at DESC'
      : 'SELECT * FROM case_documents WHERE case_id = ? AND is_deleted = ? ORDER BY created_at DESC';
    const stmt = db.prepare(sql);

    return stmt.all(caseId, isDeletedFlag) as CaseDocument[];
  });

  // 4. Open Document with Windows Default Program
  ipcMain.handle('documents:open', async (_, documentId: number) => {
    const doc = db.prepare('SELECT * FROM case_documents WHERE id = ?').get(documentId) as CaseDocument | undefined;
    if (!doc) {
      return { success: false, error: 'المستند غير موجود في قاعدة البيانات' };
    }

    const dataDir = dataDirService.getDataDirectory();
    // Normalize and verify path does not escape data directory (Path traversal prevention)
    const fullPath = path.resolve(dataDir, doc.relative_path);
    if (!fullPath.startsWith(path.resolve(dataDir))) {
      return { success: false, error: 'المسار المطلوب غير مصرح به خارج مجلد البيانات' };
    }

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: `الملف غير موجود بالمسار: ${fullPath}` };
    }

    if (process.env.NODE_ENV === 'test') {
      return { success: true };
    }

    const openError = await shell.openPath(fullPath);
    if (openError) {
      return { success: false, error: openError };
    }

    return { success: true };
  });

  // 5. Show Document in File Explorer
  ipcMain.handle('documents:showInFolder', async (_, documentId: number) => {
    const doc = db.prepare('SELECT * FROM case_documents WHERE id = ?').get(documentId) as CaseDocument | undefined;
    if (!doc) {
      return { success: false, error: 'المستند غير موجود' };
    }

    const dataDir = dataDirService.getDataDirectory();
    const fullPath = path.resolve(dataDir, doc.relative_path);
    if (!fullPath.startsWith(path.resolve(dataDir))) {
      return { success: false, error: 'المسار المطلوب غير مصرح به خارج مجلد البيانات' };
    }

    if (fs.existsSync(fullPath)) {
      shell.showItemInFolder(fullPath);
      return { success: true };
    } else {
      // If file doesn't exist, try opening the parent folder
      const parentDir = path.dirname(fullPath);
      if (fs.existsSync(parentDir)) {
        await shell.openPath(parentDir);
        return { success: true };
      }
      return { success: false, error: 'مجلد المستند غير موجود على القرص' };
    }
  });

  // 6. Update Document Metadata
  ipcMain.handle('documents:update', async (_, id: number, updates: UpdateDocumentInput) => {
    const doc = db.prepare('SELECT * FROM case_documents WHERE id = ?').get(id) as CaseDocument | undefined;
    if (!doc) {
      throw new Error('المستند غير موجود');
    }

    const title = updates.title !== undefined ? updates.title : doc.title;
    const category = updates.category !== undefined ? updates.category : doc.category;
    const description = updates.description !== undefined ? updates.description : doc.description;

    db.prepare(`
      UPDATE case_documents
      SET title = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, category, description, id);

    return db.prepare('SELECT * FROM case_documents WHERE id = ?').get(id) as CaseDocument;
  });

  // 7. Delete Document (Trash bin or Permanent)
  ipcMain.handle('documents:delete', async (_, id: number, permanent: boolean = false) => {
    const doc = db.prepare('SELECT * FROM case_documents WHERE id = ?').get(id) as CaseDocument | undefined;
    if (!doc) {
      return { success: false, error: 'المستند غير موجود' };
    }

    if (permanent) {
      // Permanent Delete: Remove from SQLite and remove physical file
      db.prepare('DELETE FROM case_documents WHERE id = ?').run(id);

      const dataDir = dataDirService.getDataDirectory();
      const fullPath = path.join(dataDir, doc.relative_path);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.warn(`Could not unlink file ${fullPath}:`, err);
      }

      return { success: true };
    } else {
      // Move to Trash Bin
      db.prepare(`
        UPDATE case_documents
        SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      return { success: true };
    }
  });

  // 8. Restore Document from Trash Bin
  ipcMain.handle('documents:restore', async (_, id: number) => {
    const doc = db.prepare('SELECT * FROM case_documents WHERE id = ?').get(id) as CaseDocument | undefined;
    if (!doc) {
      throw new Error('المستند غير موجود');
    }

    db.prepare(`
      UPDATE case_documents
      SET is_deleted = 0, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    return db.prepare('SELECT * FROM case_documents WHERE id = ?').get(id) as CaseDocument;
  });
}
