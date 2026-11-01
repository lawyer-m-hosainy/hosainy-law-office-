import { BrowserWindow, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { PrintOptions, PrintResult } from '../../shared/types';
import { DataDirService } from './DataDirService';

export class PrintService {
  private static instance: PrintService;

  private constructor() {}

  public static getInstance(): PrintService {
    if (!PrintService.instance) {
      PrintService.instance = new PrintService();
    }
    return PrintService.instance;
  }

  public async execute(options: PrintOptions, parentWindow?: BrowserWindow | null): Promise<PrintResult> {
    const rawOptions = options as any;
    const htmlContent = options.htmlContent || rawOptions.html || '';
    const title = options.title || 'تقرير';
    const landscape = options.landscape || false;
    const action = options.action || rawOptions.mode || 'preview';
    const suggestedFileName = options.suggestedFileName || rawOptions.pdfSuggestedFilename;

    // Create a hidden window for rendering the report
    const printWindow = new BrowserWindow({
      show: action === 'preview', // Show if action is preview
      title: `${title} - معاينة الطباعة`,
      width: landscape ? 1150 : 850,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
      autoHideMenuBar: true,
    });

    try {
      // Load the HTML content as a data URL
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // Wait a moment for fonts and images to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (action === 'preview') {
        // Window is already visible; add print shortcut or controls
        printWindow.setMenuBarVisibility(false);
        return { success: true };
      }

      if (action === 'print') {
        return new Promise<PrintResult>((resolve) => {
          printWindow.webContents.print(
            {
              silent: false,
              printBackground: true,
              landscape: landscape,
              pageSize: 'A4',
              margins: {
                marginType: 'none',
              },
            },
            (success, failureReason) => {
              printWindow.close();
              if (!success) {
                resolve({ success: false, error: failureReason || 'تم إلغاء الطباعة أو حدث خطأ' });
              } else {
                resolve({ success: true });
              }
            }
          );
        });
      }

      if (action === 'pdf') {
        const pdfData = await printWindow.webContents.printToPDF({
          printBackground: true,
          landscape: landscape,
          pageSize: 'A4',
          preferCSSPageSize: true,
          margins: {
            marginType: 'none',
          },
        });

        printWindow.close();

        // Ask user where to save, default in exports/ directory
        const dataDirService = DataDirService.getInstance();
        const exportsDir = dataDirService.getExportsPath();
        const dateStr = new Date().toISOString().slice(0, 10);
        const defaultName = suggestedFileName || `${title.replace(/[\/\\:*?"<>|]/g, '_')}_${dateStr}.pdf`;
        const defaultFilePath = path.join(exportsDir, defaultName);

        const saveDialogResult = await dialog.showSaveDialog(parentWindow || undefined, {
          title: 'حفظ التقرير كملف PDF',
          defaultPath: defaultFilePath,
          filters: [{ name: 'ملفات PDF', extensions: ['pdf'] }],
        });

        if (saveDialogResult.canceled || !saveDialogResult.filePath) {
          return { success: false, error: 'تم إلغاء الحفظ' };
        }

        fs.writeFileSync(saveDialogResult.filePath, pdfData);

        return {
          success: true,
          pdfPath: saveDialogResult.filePath,
        };
      }

      printWindow.close();
      return { success: false, error: 'نوع الإجراء غير معروف' };
    } catch (err: any) {
      if (!printWindow.isDestroyed()) {
        printWindow.close();
      }
      console.error('Print service execution failed:', err);
      return { success: false, error: err?.message || 'حدث خطأ أثناء معالجة الطباعة' };
    }
  }
}
