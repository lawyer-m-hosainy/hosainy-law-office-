import { useState, useCallback, useEffect } from 'react';
import { AppSecuritySettings, BackupFileInfo } from '../../shared/types';

export function useSecurityAndBackup() {
  const [securitySettings, setSecuritySettings] = useState<AppSecuritySettings | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [backupsList, setBackupsList] = useState<BackupFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSecuritySettings = useCallback(async () => {
    try {
      const sec = await window.electronAPI.getSecuritySettings();
      setSecuritySettings(sec);
      const locked = await window.electronAPI.checkIsLocked();
      setIsLocked(locked);
    } catch (err: any) {
      console.warn('Failed to load security settings:', err);
    }
  }, []);

  const loadBackupsList = useCallback(async () => {
    try {
      const list = await window.electronAPI.getBackupsList();
      setBackupsList(list || []);
    } catch (err: any) {
      console.warn('Failed to load backups list:', err);
    }
  }, []);

  useEffect(() => {
    loadSecuritySettings();
    loadBackupsList();
  }, [loadSecuritySettings, loadBackupsList]);

  // Set or change password
  const setPassword = async (newPass: string, currPass?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await window.electronAPI.setPassword(newPass, currPass);
      if (res.success) {
        await loadSecuritySettings();
        return { success: true };
      } else {
        setError(res.error || 'تعذر تعيين كلمة المرور');
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      setError(err?.message || 'خطأ في النظام');
      return { success: false, error: err?.message };
    } finally {
      setLoading(false);
    }
  };

  // Remove password
  const removePassword = async (currPass: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await window.electronAPI.removePassword(currPass);
      if (res.success) {
        await loadSecuritySettings();
        return { success: true };
      } else {
        setError(res.error || 'تعذر إزالة كلمة المرور');
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      setError(err?.message || 'خطأ في النظام');
      return { success: false, error: err?.message };
    } finally {
      setLoading(false);
    }
  };

  // Unlock app
  const unlockApp = async (password: string) => {
    try {
      const res = await window.electronAPI.verifyPassword(password);
      if (res.success) {
        setIsLocked(false);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  };

  // Lock app immediately
  const lockApp = async () => {
    try {
      const locked = await window.electronAPI.setAppLocked(true);
      setIsLocked(locked);
    } catch (err: any) {
      console.warn('Failed to lock app:', err);
    }
  };

  // Update security & auto backup preferences
  const updateSettings = async (updates: Partial<AppSecuritySettings>) => {
    try {
      setLoading(true);
      const res = await window.electronAPI.updateSecuritySettings(updates);
      setSecuritySettings(res);
      return true;
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث إعدادات الأمان');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Create Backup
  const createBackup = async (options?: { destinationDir?: string; encrypt?: boolean; password?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await window.electronAPI.createBackup(options);
      if (res.success) {
        await loadBackupsList();
        await loadSecuritySettings();
        return { success: true, backupPath: res.backupPath };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message };
    } finally {
      setLoading(false);
    }
  };

  // Select Backup Folder
  const selectBackupDir = async () => {
    try {
      const selected = await window.electronAPI.selectBackupDirectory();
      if (selected) {
        await updateSettings({ backup_custom_path: selected });
      }
      return selected;
    } catch (err: any) {
      return null;
    }
  };

  // Restore Backup
  const restoreBackup = async (filePath: string, password?: string) => {
    try {
      setLoading(true);
      const res = await window.electronAPI.restoreBackup(filePath, password);
      if (res.success) {
        await loadSecuritySettings();
        await loadBackupsList();
        return { success: true, message: res.message };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    securitySettings,
    isLocked,
    backupsList,
    loading,
    error,
    loadSecuritySettings,
    loadBackupsList,
    setPassword,
    removePassword,
    unlockApp,
    lockApp,
    updateSettings,
    createBackup,
    selectBackupDir,
    restoreBackup,
  };
}
