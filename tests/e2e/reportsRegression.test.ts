import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('Regression: 9 Official Reports in Reports & Printing Screen', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  }, 30000);

  it('1. اختبار توليد التقارير التسعة في شاشة التقارير والطباعة واكتشاف الأخطاء الحرفية', async () => {
    appInstance = await launchTestApp({ seed: 'small' });
    const { page } = appInstance;

    // 1. الانتقال إلى شاشة التقارير والطباعة
    const reportsNav = page.locator('aside button, aside a').filter({ hasText: 'التقارير والطباعة' }).first();
    await reportsNav.waitFor({ state: 'attached', timeout: 15000 });
    await reportsNav.click({ force: true });
    await page.waitForTimeout(800);

    const reportButtons = [
      { id: 'hearing_roll', name: '1. رول الجلسات اليومي والفترة' },
      { id: 'client_statement', name: '2. كشف حساب الموكل الشامل' },
      { id: 'receipt', name: '3. إيصال استلام نقدية مرقم' },
      { id: 'case_file', name: '4. ملف القضية الكامل' },
      { id: 'adjournments', name: '5. تقرير أسباب التأجيلات' },
      { id: 'tasks_pen', name: '6. قائمة المهام للنزول الميداني' },
      { id: 'execution_file', name: '7. ملف إجراءات التنفيذ الجبري' },
      { id: 'financial_general', name: '8. التقرير المالي العام للمكتب' },
      { id: 'generic_table', name: '9. طباعة وتصدير أي جدول عام' },
    ];

    const reportErrors: { id: string; name: string; error: string }[] = [];

    for (const rep of reportButtons) {
      console.log(`\n--- اختبار تقرير: ${rep.name} ---`);
      const btn = page.locator('button').filter({ hasText: rep.name }).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      await page.waitForTimeout(1000);

      // إذا كان التقرير كشف حساب الموكل، نحدد قضية 1320 إذا كانت متوفرة أو أول قضية
      if (rep.id === 'client_statement') {
        const caseSelect = page.locator('[data-testid="reports.main.set-selected-case-id"]').first();
        if ((await caseSelect.count()) > 0) {
          const opt1320 = page.locator('option').filter({ hasText: '1320' });
          if ((await opt1320.count()) > 0) {
            const val = await opt1320.getAttribute('value');
            if (val) await caseSelect.selectOption(val);
          }
          await page.waitForTimeout(800);
        }
      }

      // إذا كان تقرير أسباب التأجيلات، نحدد "جلسات اليوم" و"كل المحاكم"
      if (rep.id === 'adjournments') {
        const dateSelect = page.locator('[data-testid="reports.main.set-date-range-type"]').first();
        if ((await dateSelect.count()) > 0) {
          await dateSelect.selectOption('today');
        }
        const courtSelect = page.locator('[data-testid="reports.main.set-selected-court"]').first();
        if ((await courtSelect.count()) > 0) {
          await courtSelect.selectOption('الكل');
        }
        await page.waitForTimeout(800);
      }

      // فحص محتوى الـ iframe
      const iframe = page.frameLocator('iframe[title="معاينة التقرير"]');
      const bodyHtml = await iframe.locator('body').innerHTML().catch(() => '');

      console.log(`طول محتوى المعاينة (${rep.name}): ${bodyHtml.length} حرف`);

      // التحقق هل توجد رسالة خطأ حمراء داخل المعاينة
      if (bodyHtml.includes('خطأ أثناء توليد التقرير') || bodyHtml.includes('not iterable') || bodyHtml.includes('Cannot read properties')) {
        const errText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(`[فشل التقرير ${rep.name}]: ${errText}`);
        reportErrors.push({ id: rep.id, name: rep.name, error: errText });
      }
    }

    console.log('\n================ ملخص أخطاء التقارير التسعة ================');
    for (const e of reportErrors) {
      console.log(`- ${e.name}: ${e.error}`);
    }

    expect(reportErrors, `تقارير فاشلة أثناء التوليد: ${reportErrors.map(e => `${e.name} (${e.error})`).join(' | ')}`).toEqual([]);
  }, 90000);

  it('2. اختبار أزرار العمليات (معاينة قبل الطباعة، طباعة مباشرة، حفظ PDF) لثلاثة تقارير والتأكد أنها ليست ميتة', async () => {
    if (!appInstance) return;
    const { page } = appInstance;

    const testReports = [
      { name: '2. كشف حساب الموكل الشامل' },
      { name: '5. تقرير أسباب التأجيلات' },
      { name: '8. التقرير المالي العام للمكتب' },
    ];

    for (const rep of testReports) {
      console.log(`\n--- اختبار أزرار التقرير: ${rep.name} ---`);
      const repBtn = page.locator('button').filter({ hasText: rep.name }).first();
      await repBtn.click();
      await page.waitForTimeout(800);

      // زر معاينة قبل الطباعة
      const previewBtn = page.locator('[data-testid="reports.main.handle-action"]').first();
      expect(await previewBtn.isVisible()).toBe(true);
      await previewBtn.click();
      await page.waitForTimeout(600);
      const status1 = await page.locator('.whitespace-pre-line').innerText().catch(() => '');
      console.log(`[زر معاينة - ${rep.name}]: ${status1}`);
      expect(status1).toBeTruthy();

      // زر طباعة مباشرة
      const printBtn = page.locator('[data-testid="reports.main.handle-action-2"]').first();
      expect(await printBtn.isVisible()).toBe(true);
      await printBtn.click();
      await page.waitForTimeout(600);
      const status2 = await page.locator('.whitespace-pre-line').innerText().catch(() => '');
      console.log(`[زر طباعة مباشرة - ${rep.name}]: ${status2}`);
      expect(status2).toBeTruthy();

      // زر حفظ PDF
      const pdfBtn = page.locator('[data-testid="reports.main.handle-action-3"]').first();
      expect(await pdfBtn.isVisible()).toBe(true);
      await pdfBtn.click();
      await page.waitForTimeout(600);
      const status3 = await page.locator('.whitespace-pre-line').innerText().catch(() => '');
      console.log(`[زر حفظ PDF - ${rep.name}]: ${status3}`);
      expect(status3).toBeTruthy();
    }
  }, 60000);
});
