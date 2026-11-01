import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('E2E Test Scenario 1: Basic Workflow (السيناريو الأساسي الكامل)', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  });

  it('تنفيذ دورة العمل القانونية الكاملة: موكل ← قضية ← تبويبات ← جلسة وتأجيل ← مالية ← تنفيذ ← مهام ← مستندات', async () => {
    // Start with empty clean DB
    appInstance = await launchTestApp({ seed: 'none' });
    const { page, consoleErrors } = appInstance;

    // 1. Navigate to Clients page via Sidebar
    const clientsNav = page.locator('aside button, aside a').filter({ hasText: 'الموكلين' }).first();
    await clientsNav.click();
    await page.waitForTimeout(500);

    // 2. Add New Client
    const addClientBtn = page.locator('button').filter({ hasText: 'إضافة موكل جديد' }).first();
    await expect(addClientBtn).toBeVisible({ timeout: 5000 });
    await addClientBtn.click();

    // Fill Client modal form
    const clientNameInput = page.locator('input[placeholder*="الاسم"], input').filter({ has: page.locator('xpath=ancestor::div[contains(., "الاسم بالكامل")]') }).first();
    if (await clientNameInput.count() > 0) {
      await clientNameInput.fill('محمود شاكر المنشاوي');
    } else {
      await page.locator('form input[type="text"]').first().fill('محمود شاكر المنشاوي');
    }

    // Phone input
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="01"]').first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('01099887766');
    }

    // Submit Client
    const submitClientBtn = page.locator('button[type="submit"]').filter({ hasText: 'إضافة الموكل' }).first();
    await submitClientBtn.click();
    await page.waitForTimeout(700);

    // Verify client appears in clients table
    expect(await page.locator('text=محمود شاكر المنشاوي').count()).toBeGreaterThan(0);

    // 3. Navigate to Cases page via Sidebar
    const casesNav = page.locator('aside button, aside a').filter({ hasText: 'القضايا' }).first();
    await casesNav.click();
    await page.waitForTimeout(500);

    // 4. Open Add Case Modal
    const addCaseBtn = page.locator('button').filter({ hasText: 'إضافة قضية جديدة' }).first();
    await expect(addCaseBtn).toBeVisible({ timeout: 5000 });
    await addCaseBtn.click();
    await page.waitForTimeout(500);

    // Fill Case Form
    await page.locator('input[placeholder*="رقم القضية"]').fill('105');
    await page.locator('input[type="number"][value*="20"]').fill('2026');

    // Case Subject
    const subjectInput = page.locator('textarea, input[placeholder*="موضوع"]').first();
    await subjectInput.fill('دعوى صحة ونفاذ عقد بيع شقة سكنية');

    // Submit Case
    const submitCaseBtn = page.locator('button[type="submit"]').filter({ hasText: 'إنشاء القضية وحفظ البيانات' }).first();
    await submitCaseBtn.click();
    await page.waitForTimeout(1000);

    // 5. Verify we are in Case Details page (Check Case Number heading)
    expect(await page.locator('text=105').count()).toBeGreaterThan(0);

    // 6. Test all 7 Case Tabs
    const tabs = [
      { id: 'hearings', label: 'الجلسات والتأجيلات' },
      { id: 'finance', label: 'المالية والحسابات' },
      { id: 'executions', label: 'التنفيذات' },
      { id: 'documents', label: 'المستندات والمرفقات' },
      { id: 'tasks', label: 'المهام المرتبطة' },
      { id: 'timeline', label: 'السجل الزمني والملاحظات' },
      { id: 'basic', label: 'البيانات الأساسية والأطراف' }
    ];

    for (const tab of tabs) {
      const tabBtn = page.locator('button').filter({ hasText: tab.label }).first();
      if (await tabBtn.count() > 0) {
        await tabBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 7. Test Hearings Tab: Add hearing & adjournment
    const hearingsTabBtn = page.locator('button').filter({ hasText: 'الجلسات والتأجيلات' }).first();
    await hearingsTabBtn.click();
    await page.waitForTimeout(500);

    // Look for add hearing button
    const addHearingBtn = page.locator('button').filter({ hasText: 'تسجيل جلسة' }).first();
    if (await addHearingBtn.count() > 0) {
      await addHearingBtn.click();
      await page.waitForTimeout(500);

      // Fill hearing decision / adjournment
      const decisionInput = page.locator('input[placeholder*="القرار"], textarea[placeholder*="القرار"]').first();
      if (await decisionInput.count() > 0) {
        await decisionInput.fill('تأجيل للإعلان بأصل صحيفة الدعوى');
      }

      // Fill next hearing date
      const nextDateInput = page.locator('input[type="date"]').last();
      if (await nextDateInput.count() > 0) {
        await nextDateInput.fill('2026-05-20');
      }

      // Submit hearing
      const saveHearingBtn = page.locator('form button[type="submit"]').first();
      if (await saveHearingBtn.count() > 0) {
        await saveHearingBtn.click();
        await page.waitForTimeout(800);
      }
    }

    // 8. Test Finance Tab
    const financeTabBtn = page.locator('button').filter({ hasText: 'المالية والحسابات' }).first();
    await financeTabBtn.click();
    await page.waitForTimeout(500);

    // Verify Financial Summary cards are rendered
    expect(await page.locator('text=الأتعاب المتفق عليها').count()).toBeGreaterThan(0);
    expect(await page.locator('text=المدفوع من الأتعاب').count()).toBeGreaterThan(0);
    expect(await page.locator('text=متبقي الأتعاب').count()).toBeGreaterThan(0);

    // 9. Verify Executions Tab
    const executionsTabBtn = page.locator('button').filter({ hasText: 'التنفيذات' }).first();
    await executionsTabBtn.click();
    await page.waitForTimeout(400);
    expect(await page.locator('button').filter({ hasText: 'ملف تنفيذ' }).count()).toBeGreaterThan(0);

    // 10. Verify Tasks Tab
    const tasksTabBtn = page.locator('button').filter({ hasText: 'المهام المرتبطة' }).first();
    await tasksTabBtn.click();
    await page.waitForTimeout(400);
    expect(await page.locator('button').filter({ hasText: 'مهمة' }).count()).toBeGreaterThan(0);

    // 11. Verify Documents Tab
    const docsTabBtn = page.locator('button').filter({ hasText: 'المستندات والمرفقات' }).first();
    await docsTabBtn.click();
    await page.waitForTimeout(400);
    expect(await page.locator('button').filter({ hasText: 'مستند' }).count()).toBeGreaterThan(0);

    // Assert zero uncaught console crashes
    const criticalErrors = consoleErrors.filter(e => !e.includes('DevTools') && !e.includes('warning'));
    expect(criticalErrors).toEqual([]);
  }, 60000);
});
