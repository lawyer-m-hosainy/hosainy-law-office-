import { ipcMain, app } from 'electron';
import { registerSettingsIpc } from './settingsIpc';
import { registerDataDirIpc } from './dataDirIpc';
import { registerPrintIpc } from './printIpc';
import { registerClientsIpc } from './clientsIpc';
import { registerCasesIpc } from './casesIpc';

export function registerAllIpcHandlers(): void {
  registerSettingsIpc();
  registerDataDirIpc();
  registerPrintIpc();
  registerClientsIpc();
  registerCasesIpc();

  ipcMain.handle('system:getAppVersion', async (): Promise<string> => {
    return app.getVersion();
  });
}
