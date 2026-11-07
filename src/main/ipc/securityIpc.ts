import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../services/DatabaseService';
import { AppSecuritySettings } from '../../shared/types';

export function registerSecurityIpc(): void {
  const db = DatabaseService.getInstance().getDatabase();

  // In-memory app lock state
  let isAppLocked = false;

  // Check if app has password enabled on startup
  try {
    const sec = db.prepare('SELECT is_password_enabled, password_hash FROM app_security WHERE id = 1').get() as any;
    if (sec && sec.is_password_enabled === 1 && sec.password_hash) {
      isAppLocked = true;
    }
  } catch (err) {
    console.warn('Could not read security settings on startup:', err);
  }

  // 1. Get Security Settings
  ipcMain.handle('security:getSettings', async (): Promise<AppSecuritySettings> => {
    const row = db.prepare('SELECT * FROM app_security WHERE id = 1').get() as any;
    if (!row) {
      return {
        is_password_enabled: 0,
        has_password: false,
        auto_lock_minutes: 15,
        auto_backup_enabled: 1,
        auto_backup_frequency: 'daily',
        backup_custom_path: '',
        encrypt_backups: 0,
        last_backup_date: null,
      };
    }

    return {
      is_password_enabled: row.is_password_enabled,
      has_password: Boolean(row.password_hash && row.password_hash.length > 0),
      auto_lock_minutes: row.auto_lock_minutes,
      auto_backup_enabled: row.auto_backup_enabled,
      auto_backup_frequency: row.auto_backup_frequency,
      backup_custom_path: row.backup_custom_path || '',
      encrypt_backups: row.encrypt_backups,
      last_backup_date: row.last_backup_date,
    };
  });

  // 2. Update Security Settings
  ipcMain.handle('security:updateSettings', async (_, updates: Partial<AppSecuritySettings>): Promise<AppSecuritySettings> => {
    const current = db.prepare('SELECT * FROM app_security WHERE id = 1').get() as any;

    const auto_lock_minutes = updates.auto_lock_minutes !== undefined ? updates.auto_lock_minutes : current.auto_lock_minutes;
    const auto_backup_enabled = updates.auto_backup_enabled !== undefined ? updates.auto_backup_enabled : current.auto_backup_enabled;
    const auto_backup_frequency = updates.auto_backup_frequency !== undefined ? updates.auto_backup_frequency : current.auto_backup_frequency;
    const backup_custom_path = updates.backup_custom_path !== undefined ? updates.backup_custom_path : current.backup_custom_path;
    const encrypt_backups = updates.encrypt_backups !== undefined ? updates.encrypt_backups : current.encrypt_backups;

    db.prepare(`
      UPDATE app_security
      SET auto_lock_minutes = ?, auto_backup_enabled = ?, auto_backup_frequency = ?,
          backup_custom_path = ?, encrypt_backups = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(auto_lock_minutes, auto_backup_enabled, auto_backup_frequency, backup_custom_path, encrypt_backups);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
      VALUES ('security', 'system', 'تحديث إعدادات الأمان', ?)
    `).run(`تحديث إعدادات الأمان والنسخ التلقائي (${auto_backup_frequency})`);

    const updated = db.prepare('SELECT * FROM app_security WHERE id = 1').get() as any;
    return {
      is_password_enabled: updated.is_password_enabled,
      has_password: Boolean(updated.password_hash && updated.password_hash.length > 0),
      auto_lock_minutes: updated.auto_lock_minutes,
      auto_backup_enabled: updated.auto_backup_enabled,
      auto_backup_frequency: updated.auto_backup_frequency,
      backup_custom_path: updated.backup_custom_path || '',
      encrypt_backups: updated.encrypt_backups,
      last_backup_date: updated.last_backup_date,
    };
  });

  // 3. Set or Change Password
  ipcMain.handle('security:setPassword', async (_, newPassword: string, currentPassword?: string) => {
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'كلمة المرور يجب أن لا تقل عن 4 أحرف أو أرقام' };
    }

    const current = db.prepare('SELECT * FROM app_security WHERE id = 1').get() as any;
    if (current && current.password_hash) {
      if (!currentPassword) {
        return { success: false, error: 'يرجى إدخال كلمة المرور الحالية لتغييرها' };
      }
      const match = bcrypt.compareSync(currentPassword, current.password_hash);
      if (!match) {
        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
      }
    }

    // Hash password with bcryptjs
    const hash = bcrypt.hashSync(newPassword, 10);

    db.prepare(`
      UPDATE app_security
      SET is_password_enabled = 1, password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(hash);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
      VALUES ('security', 'system', 'تعيين كلمة مرور', 'تم تعيين/تغيير كلمة المرور وتفعيل قفل البرنامج بنجاح')
    `).run();

    return { success: true };
  });

  // 4. Remove Password
  ipcMain.handle('security:removePassword', async (event, currentPassword: string) => {
    const current = db.prepare('SELECT * FROM app_security WHERE id = 1').get() as any;
    if (!current || !current.password_hash) {
      return { success: true };
    }

    const match = bcrypt.compareSync(currentPassword, current.password_hash);
    if (!match) {
      return { success: false, error: 'كلمة المرور غير صحيحة' };
    }

    db.prepare(`
      UPDATE app_security
      SET is_password_enabled = 0, password_hash = '', updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run();

    isAppLocked = false;
    event.sender.send('security:lockStatusChanged', false);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
      VALUES ('security', 'system', 'إلغاء قفل كلمة المرور', 'تم إيقاف قفل البرنامج وإزالة كلمة المرور')
    `).run();

    return { success: true };
  });

  // 5. Verify Password (Unlock App)
  ipcMain.handle('security:verifyPassword', async (event, password: string) => {
    const current = db.prepare('SELECT * FROM app_security WHERE id = 1').get() as any;
    if (!current || !current.password_hash || current.is_password_enabled === 0) {
      isAppLocked = false;
      event.sender.send('security:lockStatusChanged', false);
      return { success: true };
    }

    const match = bcrypt.compareSync(password, current.password_hash);
    if (match) {
      isAppLocked = false;
      event.sender.send('security:lockStatusChanged', false);

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
        VALUES ('unlock', 'system', 'فك قفل البرنامج', 'تم فك قفل البرنامج والدخول بنجاح')
      `).run();

      return { success: true };
    }

    return { success: false, error: 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى' };
  });

  // 6. Check If App is Locked
  ipcMain.handle('security:checkIsLocked', async (): Promise<boolean> => {
    const current = db.prepare('SELECT is_password_enabled, password_hash FROM app_security WHERE id = 1').get() as any;
    if (!current || current.is_password_enabled === 0 || !current.password_hash) {
      return false;
    }
    return isAppLocked;
  });

  // 7. Lock / Unlock App Instantly
  ipcMain.handle('security:setAppLocked', async (event, locked: boolean): Promise<boolean> => {
    const current = db.prepare('SELECT is_password_enabled, password_hash FROM app_security WHERE id = 1').get() as any;
    if (!current || current.is_password_enabled === 0 || !current.password_hash) {
      isAppLocked = false;
      event.sender.send('security:lockStatusChanged', false);
      return false;
    }

    isAppLocked = Boolean(locked);
    if (isAppLocked) {
      db.prepare(`
        INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
        VALUES ('lock', 'system', 'قفل البرنامج', 'تم قفل شاشة البرنامج يدوياً أو بعد مدة خمول')
      `).run();
    }
    event.sender.send('security:lockStatusChanged', isAppLocked);
    return isAppLocked;
  });
}
