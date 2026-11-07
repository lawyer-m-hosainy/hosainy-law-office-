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
    const landscape = options.landscape ?? (htmlContent.includes('landscape') || false);
    let action = options.action || rawOptions.mode || 'preview';
    if (process.env.NODE_ENV === 'test' && action === 'print') {
      action = 'pdf';
    }
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
      },
      autoHideMenuBar: true,
    });

    try {
      // Load in-memory via about:blank and document.write to handle large reports without URL length limits
      await printWindow.loadURL('about:blank');
      await printWindow.webContents.executeJavaScript(`
        document.open();
        document.write(${JSON.stringify(htmlContent)});
        document.close();
      `);

      // Wait a moment for fonts and images to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (process.env.NODE_ENV === 'test' || action === 'pdf') {
        const pdfData = await printWindow.webContents.printToPDF({
          printBackground: true,
          landscape: landscape,
          pageSize: 'A4',
          preferCSSPageSize: true,
        });

        printWindow.close();

        // Ask user where to save, default in exports/ directory
        const dataDirService = DataDirService.getInstance();
        const exportsDir = dataDirService.getExportsPath();
        if (!fs.existsSync(exportsDir)) {
          fs.mkdirSync(exportsDir, { recursive: true });
        }
        const safeTitle = (title || 'report').replace(/[\/\\:*?"<>|\r\n]/g, '_');
        const defaultName = suggestedFileName || `${safeTitle}_${Date.now()}.pdf`;
        const defaultFilePath = path.join(exportsDir, defaultName);

        let targetFilePath = defaultFilePath;
        if (process.env.NODE_ENV !== 'test') {
          const saveDialogResult = await dialog.showSaveDialog(parentWindow || undefined, {
            title: 'حفظ التقرير كملف PDF',
            defaultPath: defaultFilePath,
            filters: [{ name: 'ملفات PDF', extensions: ['pdf'] }],
          });

          if (saveDialogResult.canceled || !saveDialogResult.filePath) {
            return { success: false, error: 'تم إلغاء الحفظ' };
          }
          targetFilePath = saveDialogResult.filePath;
        }

        fs.writeFileSync(targetFilePath, pdfData);

        return {
          success: true,
          pdfPath: targetFilePath,
        };
      }

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
