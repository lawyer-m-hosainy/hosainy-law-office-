import { ipcMain, BrowserWindow } from 'electron';
import { PrintService } from '../services/PrintService';
import { PrintOptions, PrintResult } from '../../shared/types';

export function registerPrintIpc(): void {
  const printService = PrintService.getInstance();

  ipcMain.handle('print:execute', async (event, options: PrintOptions): Promise<PrintResult> => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    return printService.execute(options, parentWindow);
  });
}
