import { app, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { DataDirInfo } from '../../shared/types';

export class DataDirService {
  private static instance: DataDirService;
  private currentDataDir: string;
  private configFilePath: string;

  private constructor() {
    this.configFilePath = path.join(app.getPath('userData'), 'office_config.json');
    this.currentDataDir = this.resolveDataDirectory();
    this.ensureStructure();
  }

  public static getInstance(): DataDirService {
    if (!DataDirService.instance) {
      DataDirService.instance = new DataDirService();
    }
    return DataDirService.instance;
  }

  private resolveDataDirectory(): string {
    if (process.env.TEST_DATA_DIR) {
      return process.env.TEST_DATA_DIR;
    }

    try {
      if (fs.existsSync(this.configFilePath)) {
        const configData = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
        if (configData.dataDirectory && fs.existsSync(configData.dataDirectory)) {
          return configData.dataDirectory;
        }
      }
    } catch (err) {
      console.warn('Could not read custom data directory from config, falling back to default:', err);
    }

    // Default: LawOfficeData inside user's Roaming AppData (Windows)
    const appData = app.getPath('appData');
    return path.join(appData, 'LawOfficeData');
  }

  public ensureStructure(): void {
    if (!fs.existsSync(this.currentDataDir)) {
      fs.mkdirSync(this.currentDataDir, { recursive: true });
    }

    const subdirs = ['attachments', 'backups', 'exports'];
    for (const subdir of subdirs) {
      const p = path.join(this.currentDataDir, subdir);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
    }
  }

  public getDataDirectory(): string {
    return this.currentDataDir;
  }

  public getDatabasePath(): string {
    return path.join(this.currentDataDir, 'office.db');
  }

  public getAttachmentsPath(): string {
    return path.join(this.currentDataDir, 'attachments');
  }

  public getBackupsPath(): string {
    return path.join(this.currentDataDir, 'backups');
  }

  public getExportsPath(): string {
    return path.join(this.currentDataDir, 'exports');
  }

  public getInfo(): DataDirInfo {
    const dbPath = this.getDatabasePath();
    let dbSizeBytes = 0;
    if (fs.existsSync(dbPath)) {
      try {
        const stat = fs.statSync(dbPath);
        dbSizeBytes = stat.size;
      } catch (e) {
        console.warn('Failed to stat database file:', e);
      }
    }

    return {
      currentPath: this.currentDataDir,
      dbPath: dbPath,
      attachmentsPath: this.getAttachmentsPath(),
      backupsPath: this.getBackupsPath(),
      exportsPath: this.getExportsPath(),
      dbSizeBytes,
    };
  }

  public async openFolder(): Promise<{ success: boolean; error?: string }> {
    try {
      const err = await shell.openPath(this.currentDataDir);
      if (err) {
        return { success: false, error: err };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'تعذر فتح المجلد' };
    }
  }

  public copyDirectoryRecursive(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  public relocateDirectory(newBaseLocation: string): { success: boolean; error?: string } {
    try {
      const targetDir = path.join(newBaseLocation, 'LawOfficeData');
      if (targetDir === this.currentDataDir) {
        return { success: false, error: 'المجلد المختار هو نفس المجلد الحالي' };
      }

      // Copy all contents from old to target
      this.copyDirectoryRecursive(this.currentDataDir, targetDir);

      // Save new directory to config
      fs.writeFileSync(
        this.configFilePath,
        JSON.stringify({ dataDirectory: targetDir }, null, 2),
        'utf-8'
      );

      this.currentDataDir = targetDir;
      this.ensureStructure();

      return { success: true };
    } catch (e: any) {
      console.error('Relocation failed:', e);
      return { success: false, error: e?.message || 'فشل في نقل مجلد البيانات' };
    }
  }
}
