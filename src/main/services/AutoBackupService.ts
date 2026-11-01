import fs from 'fs';
import path from 'path';
import { DatabaseService } from './DatabaseService';
import { DataDirService } from './DataDirService';

export class AutoBackupService {
  private static instance: AutoBackupService;

  private constructor() {}

  public static getInstance(): AutoBackupService {
    if (!AutoBackupService.instance) {
      AutoBackupService.instance = new AutoBackupService();
    }
    return AutoBackupService.instance;
  }

  /**
   * Determine whether an auto-backup is due based on last_backup_date and frequency
   */
  public isBackupDue(lastBackupDate: string | null | undefined, frequency: string): boolean {
    if (!lastBackupDate) return true;
    const last = new Date(lastBackupDate).getTime();
    if (isNaN(last)) return true;
    const now = Date.now();
    const diffHours = (now - last) / (1000 * 60 * 60);

    switch (frequency) {
      case 'daily':
        return diffHours >= 24;
      case 'weekly':
        return diffHours >= 24 * 7;
      case 'monthly':
        return diffHours >= 24 * 30;
      case 'on_close':
        return true;
      default:
        return diffHours >= 24;
    }
  }

  /**
   * Cleanup old backup files in the directory to respect retention policy
   * Default maxRetained: 10 copies
   */
  public enforceRetention(backupsDir: string, maxRetained: number = 10): number {
    if (!fs.existsSync(backupsDir)) return 0;

    try {
      const files = fs.readdirSync(backupsDir);
      const backupFiles: { name: string; fullPath: string; mtime: number }[] = [];

      for (const file of files) {
        if (file.endsWith('.bak') || file.endsWith('.enc')) {
          const fullPath = path.join(backupsDir, file);
          try {
            const stat = fs.statSync(fullPath);
            backupFiles.push({ name: file, fullPath, mtime: stat.mtimeMs });
          } catch (e) {}
        }
      }

      if (backupFiles.length <= maxRetained) {
        return 0;
      }

      // Sort oldest first
      backupFiles.sort((a, b) => a.mtime - b.mtime);
      const filesToDelete = backupFiles.slice(0, backupFiles.length - maxRetained);

      let deletedCount = 0;
      for (const f of filesToDelete) {
        try {
          fs.unlinkSync(f.fullPath);
          deletedCount++;
        } catch (e) {}
      }

      return deletedCount;
    } catch (err) {
      console.warn('Failed to enforce backup retention policy:', err);
      return 0;
    }
  }
}
