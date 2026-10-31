import { ipcMain, app } from 'electron';
import { registerSettingsIpc } from './settingsIpc';
import { registerDataDirIpc } from './dataDirIpc';
import { registerPrintIpc } from './printIpc';

export function registerAllIpcHandlers(): void {
  registerSettingsIpc();
  registerDataDirIpc();
  registerPrintIpc();

  ipcMain.handle('system:getAppVersion', async (): Promise<string> => {
    return app.getVersion();
  });
}
