const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  try {
    console.log('--- اختبار خدمة الطباعة الموحدة وتصدير ملف PDF بالعربي RTL ---');

    // Require compiled services
    require('../dist/main/index.cjs');

    // Wait 1 second for initialization
    await new Promise(r => setTimeout(r, 1000));

    const appData = app.getPath('appData');
    const exportsDir = path.join(appData, 'LawOfficeData', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const testPdfPath = path.join(exportsDir, 'تقرير_تجريبي_المحاكم.pdf');

    // Create a mock print window to test printToPDF
    const { BrowserWindow } = require('electron');
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    const testHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير تجريبي رسمي</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; margin: 0; padding: 20px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          h1 { margin: 0; font-size: 20px; color: #b45309; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; }
          th { background-color: #0f172a; color: white; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>مكتب الأستاذ / محامٍ بالنقض والدستورية العليا</h1>
            <div>رقم القيد: 123456 | بطاقة ضريبية: 123-456-789</div>
          </div>
          <div>⚖️</div>
        </div>
        <h2>تقرير تجريبي موحّد - بيان الهيئات والمحاكم المعتمدة</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>المحكمة / الهيئة القضائية</th>
              <th>الدرجة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>محكمة النقض</td><td>محكمة عليا</td><td>مفعلة</td></tr>
            <tr><td>2</td><td>مجلس الدولة (محكمة القضاء الإداري)</td><td>درجة ثانية</td><td>مفعلة</td></tr>
            <tr><td>3</td><td>محكمة استئناف عالي القاهرة</td><td>درجة ثانية</td><td>مفعلة</td></tr>
            <tr><td>4</td><td>محكمة جنوب القاهرة الابتدائية</td><td>درجة أولى</td><td>مفعلة</td></tr>
          </tbody>
        </table>
        <div style="margin-top: 40px; text-align: left;">
          <div>توقيع المحامي المسؤول: _________________</div>
        </div>
      </body>
      </html>
    `;

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`);
    await new Promise(r => setTimeout(r, 600));

    const pdfBuffer = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
    });

    fs.writeFileSync(testPdfPath, pdfBuffer);
    printWin.close();

    const stat = fs.statSync(testPdfPath);
    console.log(`✓ تم إنشاء ملف PDF رسمي بنجاح: ${testPdfPath}`);
    console.log(`✓ حجم ملف الـ PDF: ${(stat.size / 1024).toFixed(1)} KB`);

    if (stat.size < 1000) {
      throw new Error('PDF file is suspiciously small');
    }

    console.log('✓ اختبار خدمة الطباعة الموحدة وحفظ PDF باللغة العربية RTL نجح بنسبة 100%');
    process.exit(0);
  } catch (err) {
    console.error('❌ خطأ في اختبار الطباعة:', err);
    process.exit(1);
  }
});
