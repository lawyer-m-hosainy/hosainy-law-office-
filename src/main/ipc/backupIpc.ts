import { ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import { DatabaseService } from '../services/DatabaseService';
import { DataDirService } from '../services/DataDirService';
import { AutoBackupService } from '../services/AutoBackupService';
import { BackupFileInfo, BackupMetadata } from '../../shared/types';

const MAGIC_BAK = Buffer.from('AGY_BAK1'); // 8 bytes unencrypted
const MAGIC_ENC = Buffer.from('AGY_ENC1'); // 8 bytes encrypted AES-256-GCM

export function registerBackupIpc(): void {
  const db = DatabaseService.getInstance().getDatabase();
  const dataDirService = DataDirService.getInstance();

  // 1. Select Backup Destination Folder
  ipcMain.handle('backup:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'اختر مجلد حفظ النسخ الاحتياطية (فلاشة / درايف خارجي / مجلد مخصص)',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // 2. Select Backup File to Restore
  ipcMain.handle('backup:selectRestoreFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'اختر ملف النسخة الاحتياطية لاستعادتها (.bak أو .enc)',
      properties: ['openFile'],
      filters: [
        { name: 'ملفات النسخ الاحتياطي لبرنامج المحاماة', extensions: ['bak', 'enc', 'zip'] },
        { name: 'جميع الملفات', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // 3. Create Backup
  ipcMain.handle('backup:create', async (_, options?: { destinationDir?: string; encrypt?: boolean; password?: string }) => {
    try {
      const dataDir = dataDirService.getDataDirectory();
      const defaultBackupsDir = dataDirService.getBackupsPath();

      // Read security & settings
      const sec = db.prepare('SELECT * FROM app_security WHERE id = 1').get() as any;
      const office = db.prepare('SELECT office_name FROM office_settings WHERE id = 1').get() as any;
      const officeName = office?.office_name || 'LawOffice';

      // Determine target destination
      let targetDir = options?.destinationDir || sec?.backup_custom_path || defaultBackupsDir;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const shouldEncrypt = Boolean(options?.encrypt || (sec && sec.encrypt_backups === 1));
      const password = options?.password || '';

      if (shouldEncrypt && !password) {
        return { success: false, error: 'مطلوب إدخال كلمة مرور لتشفير النسخة الاحتياطية' };
      }

      // 1. Create a safe, clean snapshot of SQLite DB via VACUUM INTO
      const tempSnapshotPath = path.join(dataDir, `temp_snapshot_${Date.now()}.db`);
      if (fs.existsSync(tempSnapshotPath)) {
        fs.unlinkSync(tempSnapshotPath);
      }
      db.prepare(`VACUUM INTO ?`).run(tempSnapshotPath);

      const dbBuffer = fs.readFileSync(tempSnapshotPath);
      fs.unlinkSync(tempSnapshotPath);

      // 2. Collect attachments
      const attachmentsDir = dataDirService.getAttachmentsPath();
      const attachmentsList: { relativePath: string; dataBase64: string }[] = [];
      let totalAttachmentsSize = 0;

      if (fs.existsSync(attachmentsDir)) {
        function collectFiles(dir: string, baseDir: string) {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
              collectFiles(full, baseDir);
            } else if (ent.isFile()) {
              const rel = path.relative(baseDir, full).replace(/\\/g, '/');
              const fileBuf = fs.readFileSync(full);
              totalAttachmentsSize += fileBuf.length;
              attachmentsList.push({
                relativePath: rel,
                dataBase64: fileBuf.toString('base64'),
              });
            }
          }
        }
        collectFiles(attachmentsDir, attachmentsDir);
      }

      // 3. Assemble Metadata
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `BAK-${Date.now()}`;
      const metadata: BackupMetadata = {
        backupId,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        officeName,
        dbSizeBytes: dbBuffer.length,
        attachmentsCount: attachmentsList.length,
        attachmentsSizeBytes: totalAttachmentsSize,
        isEncrypted: shouldEncrypt,
      };

      // 4. Create Archive Payload (JSON + GZIP)
      const payloadObj = {
        metadata,
        databaseBase64: dbBuffer.toString('base64'),
        attachments: attachmentsList,
      };

      const jsonStr = JSON.stringify(payloadObj);
      const compressedData = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'));

      // 5. Encrypt if requested or write plain archive
      let finalBuffer: Buffer;
      let fileExt = 'bak';

      if (shouldEncrypt) {
        fileExt = 'enc';
        // AES-256-GCM encryption with scrypt key derivation (Node built-in crypto)
        const salt = crypto.randomBytes(16);
        const iv = crypto.randomBytes(12);
        const key = crypto.scryptSync(password, salt, 32);

        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(compressedData), cipher.final()]);
        const authTag = cipher.getAuthTag(); // 16 bytes

        // Header format: [8 bytes MAGIC_ENC] + [16 bytes salt] + [12 bytes iv] + [16 bytes authTag] + [encryptedData]
        finalBuffer = Buffer.concat([
          MAGIC_ENC,
          salt,
          iv,
          authTag,
          encrypted,
        ]);
      } else {
        // Unencrypted format: [8 bytes MAGIC_BAK] + [compressedData]
        finalBuffer = Buffer.concat([
          MAGIC_BAK,
          compressedData,
        ]);
      }

      const safeOfficeName = officeName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
      const outputFileName = `نسخة_احتياطية_${safeOfficeName}_${timestamp}.${fileExt}`;
      const finalOutputPath = path.join(targetDir, outputFileName);

      fs.writeFileSync(finalOutputPath, finalBuffer);

      // Enforce retention policy (keep maximum 10 most recent backups)
      AutoBackupService.getInstance().enforceRetention(targetDir, 10);

      // 6. Update last_backup_date in security table
      db.prepare(`
        UPDATE app_security
        SET last_backup_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run();

      // 7. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
        VALUES ('backup', 'system', 'إنشاء نسخة احتياطية', ?)
      `).run(`تم إنشاء نسخة كاملة (${outputFileName}) بحجم ${(finalBuffer.length / (1024 * 1024)).toFixed(2)} م.ب ${shouldEncrypt ? '[مشفرة AES-256]' : ''}`);

      return {
        success: true,
        backupPath: finalOutputPath,
      };
    } catch (err: any) {
      console.error('Backup creation error:', err);
      return {
        success: false,
        error: `خطأ أثناء إنشاء النسخة الاحتياطية: ${err?.message}`,
      };
    }
  });

  // 4. Get Backups List
  ipcMain.handle('backup:getList', async (): Promise<BackupFileInfo[]> => {
    const list: BackupFileInfo[] = [];
    const defaultBackupsDir = dataDirService.getBackupsPath();

    const sec = db.prepare('SELECT backup_custom_path FROM app_security WHERE id = 1').get() as any;
    const dirsToCheck = [defaultBackupsDir];
    if (sec?.backup_custom_path && fs.existsSync(sec.backup_custom_path) && sec.backup_custom_path !== defaultBackupsDir) {
      dirsToCheck.push(sec.backup_custom_path);
    }

    for (const d of dirsToCheck) {
      if (!fs.existsSync(d)) continue;
      try {
        const files = fs.readdirSync(d);
        for (const file of files) {
          if (file.endsWith('.bak') || file.endsWith('.enc')) {
            const fullPath = path.join(d, file);
            try {
              const stat = fs.statSync(fullPath);
              const fd = fs.openSync(fullPath, 'r');
              const magicBuf = Buffer.alloc(8);
              fs.readSync(fd, magicBuf, 0, 8, 0);
              fs.closeSync(fd);

              const isEncrypted = magicBuf.equals(MAGIC_ENC);

              list.push({
                fileName: file,
                filePath: fullPath,
                sizeBytes: stat.size,
                createdAt: stat.mtime.toISOString(),
                isEncrypted,
              });
            } catch (e) {
              console.warn(`Could not read backup file ${fullPath}:`, e);
            }
          }
        }
      } catch (e) {
        console.warn(`Could not scan dir ${d}:`, e);
      }
    }

    // Sort newest first
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  });

  // 5. Restore Backup
  ipcMain.handle('backup:restore', async (_, backupFilePath: string, password?: string) => {
    try {
      if (!fs.existsSync(backupFilePath)) {
        return { success: false, error: 'ملف النسخة الاحتياطية غير موجود' };
      }

      const fileBuffer = fs.readFileSync(backupFilePath);
      if (fileBuffer.length < 8) {
        return { success: false, error: 'الملف تالف أو غير صالح للنسخ الاحتياطي' };
      }

      const magic = fileBuffer.subarray(0, 8);
      let compressedData: Buffer;

      if (magic.equals(MAGIC_ENC)) {
        // Encrypted Backup
        if (!password) {
          return { success: false, error: 'هذه النسخة الاحتياطية مشفرة بكلمة مرور. يرجى إدخال كلمة المرور لفك التشفير واستعادتها.' };
        }

        if (fileBuffer.length < 8 + 16 + 12 + 16) {
          return { success: false, error: 'الملف المشفر تالف أو غير مكتمل' };
        }

        const salt = fileBuffer.subarray(8, 24);
        const iv = fileBuffer.subarray(24, 36);
        const authTag = fileBuffer.subarray(36, 52);
        const cipherText = fileBuffer.subarray(52);

        try {
          const key = crypto.scryptSync(password, salt, 32);
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher.setAuthTag(authTag);
          compressedData = Buffer.concat([decipher.update(cipherText), decipher.final()]);
        } catch (decryptErr) {
          return { success: false, error: 'كلمة مرور فك التشفير غير صحيحة، أو ملف النسخة تالف.' };
        }
      } else if (magic.equals(MAGIC_BAK)) {
        // Plain Unencrypted Backup
        compressedData = fileBuffer.subarray(8);
      } else {
        return { success: false, error: 'صيغة الملف غير معروفة أو ليست نسخة احتياطية صادرة من البرنامج.' };
      }

      // Decompress payload
      let jsonPayload: any;
      try {
        const decompressed = zlib.gunzipSync(compressedData);
        jsonPayload = JSON.parse(decompressed.toString('utf-8'));
      } catch (e) {
        return { success: false, error: 'فشل فك ضغط النسخة الاحتياطية: الملف تالف' };
      }

      if (!jsonPayload.databaseBase64) {
        return { success: false, error: 'النسخة الاحتياطية لا تحتوي على قاعدة بيانات صالحة' };
      }

      const restoredDbBuf = Buffer.from(jsonPayload.databaseBase64, 'base64');
      // Verify SQLite header (first 16 bytes: "SQLite format 3\0")
      if (!restoredDbBuf.subarray(0, 15).toString().startsWith('SQLite format 3')) {
        return { success: false, error: 'قاعدة البيانات المستخرجة من النسخة ليست ملف SQLite صالحاً' };
      }

      // 1. Close active Database connection
      DatabaseService.getInstance().close();

      const currentDbPath = dataDirService.getDatabasePath();
      const currentAttachmentsDir = dataDirService.getAttachmentsPath();

      // 2. Make pre-restore emergency rollback copy of current DB
      if (fs.existsSync(currentDbPath)) {
        const emergencyBak = `${currentDbPath}.pre_restore_${Date.now()}`;
        try {
          fs.copyFileSync(currentDbPath, emergencyBak);
        } catch (e) {}
      }

      // 3. Write restored database file
      fs.writeFileSync(currentDbPath, restoredDbBuf);

      // Clean WAL and SHM files of old DB if any
      const walPath = `${currentDbPath}-wal`;
      const shmPath = `${currentDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

      // 4. Restore Attachments
      if (jsonPayload.attachments && Array.isArray(jsonPayload.attachments)) {
        for (const item of jsonPayload.attachments) {
          if (item.relativePath && item.dataBase64) {
            const destPath = path.join(currentAttachmentsDir, item.relativePath);
            const dir = path.dirname(destPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(destPath, Buffer.from(item.dataBase64, 'base64'));
          }
        }
      }

      // 5. Re-initialize Database
      const newDb = DatabaseService.getInstance().init();

      // 6. Record Audit Log in restored DB
      newDb.prepare(`
        INSERT INTO audit_logs (action_type, entity_type, entity_name, details)
        VALUES ('restore', 'system', 'استعادة نسخة احتياطية', ?)
      `).run(`تمت استعادة النسخة بنجاح من الملف: ${path.basename(backupFilePath)}`);

      return {
        success: true,
        message: 'تمت استعادة قاعدة البيانات والمرفقات بنجاح كامل!',
      };
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      // Attempt to reopen database if closed
      try {
        DatabaseService.getInstance().init();
      } catch (e) {}
      return {
        success: false,
        error: `فشلت عملية الاستعادة: ${err?.message}`,
      };
    }
  });
}
