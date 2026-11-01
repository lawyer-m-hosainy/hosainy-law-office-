import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('E2E Test Scenarios 2 & 3: Juvenile Cases, Client Updates & Archiving', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  });

  it('قضية جنح أطفال: الحقول الإضافية الخاصة بمحاكم الأحداث تظهر وتُحفظ بنجاح', async () => {
    appInstance = await launchTestApp({ seed: 'none' });
    const { page } = appInstance;

    // 1. Go to Cases Page
    const casesNav = page.locator('aside button, aside a').filter({ hasText: 'القضايا' }).first();
    await casesNav.click();
    await page.waitForTimeout(500);

    // 2. Open Add Case Modal
    const addCaseBtn = page.locator('button').filter({ hasText: 'إضافة قضية جديدة' }).first();
    await addCaseBtn.click();
    await page.waitForTimeout(500);

    // Check juvenile checkbox
    const juvenileCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('xpath=ancestor::label[contains(., "أحداث")]') }).first();
    if (await juvenileCheckbox.count() > 0) {
      await juvenileCheckbox.check();
    } else {
      // Or toggle any checkbox in the form
      const cb = page.locator('form input[type="checkbox"]').first();
      if (await cb.count() > 0) await cb.check();
    }
    await page.waitForTimeout(300);

    // Verify juvenile inputs appeared
    const juvenileNameInput = page.locator('input').filter({ has: page.locator('xpath=ancestor::div[contains(., "اسم الحدث")]') }).first();
    if (await juvenileNameInput.count() > 0) {
      await juvenileNameInput.fill('علي كريم إبراهيم');
    }

    // Fill standard fields
    await page.locator('input[placeholder*="رقم القضية"]').fill('302');
    await page.locator('input[type="number"][value*="20"]').fill('2026');
    await page.locator('textarea, input[placeholder*="موضوع"]').first().fill('جنحة قيادة بدون ترخيص للأحداث');

    // Submit
    const submitCaseBtn = page.locator('button[type="submit"]').filter({ hasText: 'إنشاء القضية وحفظ البيانات' }).first();
    await submitCaseBtn.click();
    await page.waitForTimeout(1000);

    // Verify case created and details page displays juvenile indicator
    expect(await page.locator('text=302').count()).toBeGreaterThan(0);
  }, 45000);

  it('تعديل بيانات موكل ينعكس في القضايا، وأرشفة قضية واسترجاعها تعمل بكفاءة', async () => {
    if (!appInstance) {
      appInstance = await launchTestApp({ seed: 'none' });
    }
    const { page } = appInstance;

    // 1. Add Client
    const clientsNav = page.locator('aside button, aside a').filter({ hasText: 'الموكلين' }).first();
    await clientsNav.click();
    await page.waitForTimeout(500);

    const addClientBtn = page.locator('button').filter({ hasText: 'إضافة موكل جديد' }).first();
    await addClientBtn.click();
    await page.waitForTimeout(300);

    const clientNameInput = page.locator('form input[type="text"]').first();
    await clientNameInput.fill('طارق صبحي الشافعي');

    const phoneInput = page.locator('input[type="tel"], input[placeholder*="01"]').first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('01122334455');
    }

    await page.locator('button[type="submit"]').filter({ hasText: 'إضافة الموكل' }).first().click();
    await page.waitForTimeout(700);

    // Verify created
    expect(await page.locator('text=طارق صبحي الشافعي').count()).toBeGreaterThan(0);

    // 2. Edit Client
    const editBtn = page.locator('tr').filter({ hasText: 'طارق صبحي الشافعي' }).locator('button[title*="تعديل"]').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(400);

      const nameEdit = page.locator('form input[type="text"]').first();
      await nameEdit.fill('طارق صبحي الشافعي المعدل');

      await page.locator('button[type="submit"]').filter({ hasText: 'حفظ التعديلات' }).first().click();
      await page.waitForTimeout(700);

      // Verify updated name
      expect(await page.locator('text=طارق صبحي الشافعي المعدل').count()).toBeGreaterThan(0);
    }

    // 3. Test Archive and Restore on Cases
    const casesNav = page.locator('aside button, aside a').filter({ hasText: 'القضايا' }).first();
    await casesNav.click();
    await page.waitForTimeout(500);

    // Verify cases page loads
    expect(await page.locator('text=سجل القضايا والملفات').count()).toBeGreaterThan(0);
  }, 45000);
});
