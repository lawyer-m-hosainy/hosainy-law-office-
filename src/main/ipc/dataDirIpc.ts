import { ipcMain, dialog } from 'electron';
import { DataDirService } from '../services/DataDirService';
import { DatabaseService } from '../services/DatabaseService';
import { DataDirInfo } from '../../shared/types';

export function registerDataDirIpc(): void {
  const dataDirService = DataDirService.getInstance();
  const dbService = DatabaseService.getInstance();

  ipcMain.handle('dataDir:getInfo', async (): Promise<DataDirInfo> => {
    return dataDirService.getInfo();
  });

  ipcMain.handle('dataDir:open', async (): Promise<{ success: boolean; error?: string }> => {
    return dataDirService.openFolder();
  });

  ipcMain.handle('dataDir:selectNew', async (): Promise<{ canceled: boolean; selectedPath?: string }> => {
    const result = await dialog.showOpenDialog({
      title: 'اختر موقع تخزين جديد لبرنامج المكتب',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    return {
      canceled: false,
      selectedPath: result.filePaths[0],
    };
  });

  ipcMain.handle('dataDir:relocate', async (_event, newBaseLocation: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Safely close database connection
      dbService.close();

      // 2. Relocate files and update config
      const relocateRes = dataDirService.relocateDirectory(newBaseLocation);
      if (!relocateRes.success) {
        // Attempt to reopen db at old location
        dbService.init();
        return relocateRes;
      }

      // 3. Re-initialize database at new location
      dbService.init();

      return { success: true };
    } catch (err: any) {
      console.error('Failed to relocate data directory:', err);
      return { success: false, error: err?.message || 'فشل في نقل مجلد البيانات' };
    }
  });
}
