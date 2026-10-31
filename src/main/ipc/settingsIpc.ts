import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { DatabaseService } from '../services/DatabaseService';
import { DataDirService } from '../services/DataDirService';
import { ConfigurableListItem, ConfigurableListType, OfficeSettings } from '../../shared/types';
import {
  DEFAULT_COURTS,
  DEFAULT_CASE_TYPES,
  DEFAULT_ADJOURNMENT_REASONS,
  DEFAULT_TASK_CATEGORIES,
  DEFAULT_TRANSACTION_TYPES,
  DEFAULT_OFFICE_SETTINGS
} from '../../shared/constants';

export function registerSettingsIpc(): void {
  const dbService = DatabaseService.getInstance();
  const dataDirService = DataDirService.getInstance();

  // Get Office Settings
  ipcMain.handle('settings:getOfficeSettings', async (): Promise<OfficeSettings> => {
    const db = dbService.getDb();
    const row = db.prepare('SELECT * FROM office_settings WHERE id = 1').get() as OfficeSettings | undefined;
    if (!row) {
      // Re-seed default
      db.prepare(`
        INSERT OR REPLACE INTO office_settings (
          id, office_name, lawyer_name, title, phone, phone2, email, address,
          bar_registration_number, tax_number, logo_path, notes,
          appeal_deadline_civil, appeal_deadline_misdemeanor, appeal_deadline_cassation,
          appeal_deadline_urgent, appeal_deadline_family, appeal_deadline_admin,
          date_format, alert_days_before
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        DEFAULT_OFFICE_SETTINGS.office_name,
        DEFAULT_OFFICE_SETTINGS.lawyer_name,
        DEFAULT_OFFICE_SETTINGS.title,
        DEFAULT_OFFICE_SETTINGS.phone,
        DEFAULT_OFFICE_SETTINGS.phone2,
        DEFAULT_OFFICE_SETTINGS.email,
        DEFAULT_OFFICE_SETTINGS.address,
        DEFAULT_OFFICE_SETTINGS.bar_registration_number,
        DEFAULT_OFFICE_SETTINGS.tax_number,
        DEFAULT_OFFICE_SETTINGS.logo_path,
        DEFAULT_OFFICE_SETTINGS.notes,
        DEFAULT_OFFICE_SETTINGS.appeal_deadline_civil,
        DEFAULT_OFFICE_SETTINGS.appeal_deadline_misdemeanor,
        DEFAULT_OFFICE_SETTINGS.appeal_deadline_cassation,
        DEFAULT_OFFICE_SETTINGS.appeal_deadline_urgent,
        DEFAULT_OFFICE_SETTINGS.appeal_deadline_family,
        DEFAULT_OFFICE_SETTINGS.appeal_deadline_admin,
        DEFAULT_OFFICE_SETTINGS.date_format,
        DEFAULT_OFFICE_SETTINGS.alert_days_before
      );
      return db.prepare('SELECT * FROM office_settings WHERE id = 1').get() as OfficeSettings;
    }
    return row;
  });

  // Update Office Settings
  ipcMain.handle('settings:updateOfficeSettings', async (_event, updates: Partial<OfficeSettings>): Promise<OfficeSettings> => {
    const db = dbService.getDb();
    const allowedKeys = [
      'office_name', 'lawyer_name', 'title', 'phone', 'phone2', 'email', 'address',
      'bar_registration_number', 'tax_number', 'logo_path', 'notes',
      'appeal_deadline_civil', 'appeal_deadline_misdemeanor', 'appeal_deadline_cassation',
      'appeal_deadline_urgent', 'appeal_deadline_family', 'appeal_deadline_admin',
      'date_format', 'alert_days_before'
    ];

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    for (const key of allowedKeys) {
      if (key in updates) {
        fieldsToUpdate.push(`${key} = ?`);
        values.push((updates as any)[key]);
      }
    }

    if (fieldsToUpdate.length > 0) {
      fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');
      const sql = `UPDATE office_settings SET ${fieldsToUpdate.join(', ')} WHERE id = 1`;
      db.prepare(sql).run(...values);
    }

    return db.prepare('SELECT * FROM office_settings WHERE id = 1').get() as OfficeSettings;
  });

  // Get items for a specific list type
  ipcMain.handle('settings:getListItems', async (_event, listType: ConfigurableListType): Promise<ConfigurableListItem[]> => {
    const db = dbService.getDb();
    return db.prepare(
      'SELECT * FROM configurable_lists WHERE list_type = ? ORDER BY sort_order ASC, id ASC'
    ).all(listType) as ConfigurableListItem[];
  });

  // Get all configurable lists items grouped
  ipcMain.handle('settings:getAllListItems', async (): Promise<Record<ConfigurableListType, ConfigurableListItem[]>> => {
    const db = dbService.getDb();
    const rows = db.prepare(
      'SELECT * FROM configurable_lists ORDER BY list_type ASC, sort_order ASC, id ASC'
    ).all() as ConfigurableListItem[];

    const result: Record<ConfigurableListType, ConfigurableListItem[]> = {
      courts: [],
      case_types: [],
      adjournment_reasons: [],
      task_categories: [],
      transaction_types: [],
    };

    for (const row of rows) {
      if (result[row.list_type]) {
        result[row.list_type].push(row);
      }
    }

    return result;
  });

  // Create list item
  ipcMain.handle('settings:createListItem', async (_event, item: Omit<ConfigurableListItem, 'id' | 'created_at' | 'updated_at'>): Promise<ConfigurableListItem> => {
    const db = dbService.getDb();
    
    // Determine sort_order if not provided
    let sortOrder = item.sort_order;
    if (sortOrder === undefined || sortOrder === null) {
      const maxRow = db.prepare('SELECT MAX(sort_order) as max_order FROM configurable_lists WHERE list_type = ?').get(item.list_type) as { max_order: number | null };
      sortOrder = (maxRow?.max_order ?? 0) + 1;
    }

    const info = db.prepare(`
      INSERT INTO configurable_lists (list_type, name, category, sort_order, is_active, is_default)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(
      item.list_type,
      item.name.trim(),
      item.category || null,
      sortOrder,
      item.is_active !== undefined ? item.is_active : 1
    );

    return db.prepare('SELECT * FROM configurable_lists WHERE id = ?').get(info.lastInsertRowid) as ConfigurableListItem;
  });

  // Update list item
  ipcMain.handle('settings:updateListItem', async (_event, id: number, updates: Partial<ConfigurableListItem>): Promise<ConfigurableListItem> => {
    const db = dbService.getDb();
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fieldsToUpdate.push('name = ?');
      values.push(updates.name.trim());
    }
    if (updates.category !== undefined) {
      fieldsToUpdate.push('category = ?');
      values.push(updates.category);
    }
    if (updates.sort_order !== undefined) {
      fieldsToUpdate.push('sort_order = ?');
      values.push(updates.sort_order);
    }
    if (updates.is_active !== undefined) {
      fieldsToUpdate.push('is_active = ?');
      values.push(updates.is_active);
    }

    if (fieldsToUpdate.length > 0) {
      fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      db.prepare(`UPDATE configurable_lists SET ${fieldsToUpdate.join(', ')} WHERE id = ?`).run(...values);
    }

    return db.prepare('SELECT * FROM configurable_lists WHERE id = ?').get(id) as ConfigurableListItem;
  });

  // Delete list item
  ipcMain.handle('settings:deleteListItem', async (_event, id: number): Promise<{ success: boolean; message?: string }> => {
    const db = dbService.getDb();
    const item = db.prepare('SELECT * FROM configurable_lists WHERE id = ?').get(id) as ConfigurableListItem | undefined;
    if (!item) {
      return { success: false, message: 'العنصر غير موجود' };
    }

    db.prepare('DELETE FROM configurable_lists WHERE id = ?').run(id);
    return { success: true };
  });

  // Reset a list to default items
  ipcMain.handle('settings:resetListToDefaults', async (_event, listType: ConfigurableListType): Promise<ConfigurableListItem[]> => {
    const db = dbService.getDb();
    let defaultItems: string[] = [];

    switch (listType) {
      case 'courts':
        defaultItems = DEFAULT_COURTS;
        break;
      case 'case_types':
        defaultItems = DEFAULT_CASE_TYPES;
        break;
      case 'adjournment_reasons':
        defaultItems = DEFAULT_ADJOURNMENT_REASONS;
        break;
      case 'task_categories':
        defaultItems = DEFAULT_TASK_CATEGORIES;
        break;
      case 'transaction_types':
        defaultItems = DEFAULT_TRANSACTION_TYPES;
        break;
    }

    dbService.transaction(() => {
      // Remove existing for this list
      db.prepare('DELETE FROM configurable_lists WHERE list_type = ?').run(listType);

      const insertStmt = db.prepare(`
        INSERT INTO configurable_lists (list_type, name, sort_order, is_active, is_default)
        VALUES (?, ?, ?, 1, 1)
      `);

      defaultItems.forEach((name, idx) => {
        insertStmt.run(listType, name, idx + 1);
      });
    });

    return db.prepare(
      'SELECT * FROM configurable_lists WHERE list_type = ? ORDER BY sort_order ASC, id ASC'
    ).all(listType) as ConfigurableListItem[];
  });

  // Select logo file
  ipcMain.handle('settings:selectLogoFile', async (): Promise<{ canceled: boolean; filePath?: string; fileDataUrl?: string }> => {
    const result = await dialog.showOpenDialog({
      title: 'اختر شعار المكتب',
      properties: ['openFile'],
      filters: [{ name: 'صور', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const selectedFile = result.filePaths[0];
    const ext = path.extname(selectedFile);
    const attachmentsDir = dataDirService.getAttachmentsPath();
    const destFileName = `logo_${Date.now()}${ext}`;
    const destPath = path.join(attachmentsDir, destFileName);

    fs.copyFileSync(selectedFile, destPath);

    // Read as data URL for immediate rendering
    const fileBuffer = fs.readFileSync(destPath);
    const mimeType = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'image/jpeg';
    const fileDataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    // Update in database
    dbService.getDb().prepare('UPDATE office_settings SET logo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(destFileName);

    return {
      canceled: false,
      filePath: destFileName,
      fileDataUrl,
    };
  });
}
