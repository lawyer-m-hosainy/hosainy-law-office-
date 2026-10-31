import { ipcMain, app } from 'electron';
import { registerSettingsIpc } from './settingsIpc';
import { registerDataDirIpc } from './dataDirIpc';
import { registerPrintIpc } from './printIpc';
import { registerClientsIpc } from './clientsIpc';
import { registerCasesIpc } from './casesIpc';
import { registerHearingsIpc } from './hearingsIpc';
import { registerAppealsIpc } from './appealsIpc';
import { registerFinanceIpc } from './financeIpc';
import { registerExecutionsIpc } from './executionsIpc';
import { registerTasksIpc } from './tasksIpc';
import { registerDocumentsIpc } from './documentsIpc';
import { registerNotesAndTimelineIpc } from './notesAndTimelineIpc';
import { registerSearchIpc } from './searchIpc';
import { registerExportIpc } from './exportIpc';
import { registerSecurityIpc } from './securityIpc';
import { registerBackupIpc } from './backupIpc';
import { registerAuditLogsIpc } from './auditLogsIpc';
import { registerTrashBinIpc } from './trashBinIpc';

export function registerAllIpcHandlers(): void {
  registerSettingsIpc();
  registerDataDirIpc();
  registerPrintIpc();
  registerClientsIpc();
  registerCasesIpc();
  registerHearingsIpc();
  registerAppealsIpc();
  registerFinanceIpc();
  registerExecutionsIpc();
  registerTasksIpc();
  registerDocumentsIpc();
  registerNotesAndTimelineIpc();
  registerSearchIpc();
  registerExportIpc();
  registerSecurityIpc();
  registerBackupIpc();
  registerAuditLogsIpc();
  registerTrashBinIpc();

  ipcMain.handle('system:getAppVersion', async (): Promise<string> => {
    return app.getVersion();
  });
}

