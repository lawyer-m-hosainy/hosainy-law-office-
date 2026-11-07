import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('Interactive Verification: Case Hearings & Finance Tabs CRUD & Real-Time Sync', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  }, 30000);

  it('إضافة جلسة وتسجيل نتيجتها وتأجيلها، وإضافة حركة مالية والتحقق من التحديث الفوري', async () => {
    appInstance = await launchTestApp({ seed: 'small' });
    const { page } = appInstance;

    // Accept any alert/confirm dialogs
    page.on('dialog', (d) => d.accept());

    // 1. الانتقال إلى شاشة القضايا
    const casesNav = page.locator('aside button, aside a').filter({ hasText: 'القضايا' }).first();
    await casesNav.waitFor({ state: 'attached', timeout: 15000 });
    await casesNav.click({ force: true });
    await page.waitForTimeout(600);

    // 2. فتح أول قضية
    const firstCaseCard = page.locator('[data-testid="cases.main.on-open-case-details"]').first();
    await firstCaseCard.waitFor({ state: 'attached', timeout: 10000 });
    await firstCaseCard.click();
    await page.waitForTimeout(600);

    // =========================================================================
    // اختبار تبويب الجلسات والتأجيلات
    // =========================================================================
    const hearingsTabBtn = page.locator('button').filter({ hasText: '2. الجلسات والتأجيلات' }).first();
    await hearingsTabBtn.click();
    await page.waitForTimeout(500);

    // التأكد من عدم وجود ErrorBoundary
    expect(await page.locator('text=loadCaseData is not defined').count()).toBe(0);
    expect(await page.locator('text=حدث خطأ غير متوقع أثناء عرض هذه الصفحة').count()).toBe(0);

    // إضافة جلسة جديدة
    const addHearingBtn = page.locator('[data-testid="case.hearings.tab.set-show-add-modal"]').first();
    await addHearingBtn.waitFor({ state: 'attached', timeout: 5000 });
    await addHearingBtn.click();
    await page.waitForTimeout(300);

    const testHearingDate = '2026-12-15';
    const testNotes = 'جلسة اختبار مؤتمتة تحقق الانحدار';

    await page.locator('[data-testid="case.hearings.tab.set-add-form"]').fill(testHearingDate);
    const notesInput = page.locator('div.fixed form textarea, div.fixed form input[placeholder*="ملاحظات"]').first();
    if ((await notesInput.count()) > 0) {
      await notesInput.fill(testNotes);
    }
    const saveHearingBtn = page.locator('[data-testid="case.hearings.tab.add"]').first();
    await saveHearingBtn.click();
    await page.waitForTimeout(800);

    // التحقق من ظهور الجلسة فورًا في الجدول / القائمة
    const createdHearingEl = page.locator(`text=${testHearingDate}`).first();
    expect(await createdHearingEl.count()).toBeGreaterThan(0);

    // تسجيل نتيجة جلسة وتأجيلها
    const outcomeBtn = page.locator('[data-testid="case.hearings.tab.handle-open-outcome-modal"]').first();
    if ((await outcomeBtn.count()) > 0) {
      await outcomeBtn.click();
      await page.waitForTimeout(400);

      // ملء قرار المحكمة
      const decisionInput = page.locator('[data-testid="case.hearings.tab.set-outcome-form-6"]').first();
      await decisionInput.fill('التأجيل للإعلان والمستندات');

      // تحديد سبب التأجيل
      const reasonInput = page.locator('[data-testid="case.hearings.tab.set-outcome-form-7"]').first();
      if ((await reasonInput.count()) > 0) {
        await reasonInput.fill('للاطلاع وتقديم المستندات');
      }

      // تاريخ الجلسة القادمة
      const nextDateInput = page.locator('[data-testid="case.hearings.tab.set-outcome-form-11"]').first();
      if ((await nextDateInput.count()) > 0) {
        await nextDateInput.fill('2026-12-29');
      }

      // حفظ النتيجة
      const saveOutcomeBtn = page.locator('[data-testid="case.hearings.tab.save-2"]').first();
      await saveOutcomeBtn.click();
      await page.waitForTimeout(800);

      // التحقق من ظهور قرار التأجيل في الصفحة فورًا
      expect(await page.locator('text=التأجيل للإعلان والمستندات').count()).toBeGreaterThan(0);
    }

    // =========================================================================
    // اختبار تبويب المالية والحسابات
    // =========================================================================
    const financeTabBtn = page.locator('button').filter({ hasText: '3. المالية والحسابات' }).first();
    await financeTabBtn.click();
    await page.waitForTimeout(500);

    // التأكد من عدم وجود ErrorBoundary
    expect(await page.locator('text=loadCaseData is not defined').count()).toBe(0);
    expect(await page.locator('text=حدث خطأ غير متوقع أثناء عرض هذه الصفحة').count()).toBe(0);

    // إضافة حركة مالية جديدة
    const addTxBtn = page.locator('[data-testid="case.finance.tab.set-show-add-tx-modal"]').first();
    await addTxBtn.waitFor({ state: 'attached', timeout: 5000 });
    await addTxBtn.click();
    await page.waitForTimeout(300);

    const testTxAmount = '3750';
    const testTxDesc = 'دفعة أتعاب محاماة اختبار انحدار';

    // ملء المبلغ والوصف
    const amountInput = page.locator('[data-testid="case.finance.tab.set-tx-form-6"]').first();
    await amountInput.fill(testTxAmount);

    const descInput = page.locator('[data-testid="case.finance.tab.set-tx-form-12"]').first();
    await descInput.fill(testTxDesc);

    // Uncheck printImmediately checkbox to avoid print popup
    const printCheckbox = page.locator('div.fixed form input[type="checkbox"]').first();
    if ((await printCheckbox.count()) > 0 && (await printCheckbox.isChecked())) {
      await printCheckbox.uncheck();
    }

    const saveTxBtn = page.locator('[data-testid="case.finance.tab.save"]').first();
    await saveTxBtn.click();
    await page.waitForTimeout(800);

    // التحقق من ظهور الحركة المالية في الجدول فورًا
    const txEntry = page.locator(`text=${testTxDesc}`).first();
    expect(await txEntry.count()).toBeGreaterThan(0);
  }, 60000);
});
