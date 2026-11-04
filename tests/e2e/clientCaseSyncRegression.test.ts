import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('E2E Regression: Client & Entity Synchronization Across Modals and Tabs (اختبار انحدار تزامن الموكلين)', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  }, 30000);

  it('دورة تزامن الموكلين الكاملة: إضافة ← حذف ← تعديل ← استرجاع من السلة ← إضافة سريعة من نافذة القضية', async () => {
    appInstance = await launchTestApp({ seed: 'small' });
    const { page } = appInstance;

    // قبول أي رسائل تأكيد في المتصفح
    page.on('dialog', (dialog) => dialog.accept());

    // انتظر تحميل الواجهة وظهور الشريط الجانبي
    const clientsNav = page.locator('aside button, aside a').filter({ hasText: 'الموكلين' }).first();
    await clientsNav.waitFor({ state: 'attached', timeout: 30000 });
    await clientsNav.click({ force: true });
    await page.waitForTimeout(600);

    // =========================================================================
    // الخطوة 1: إضافة موكل قديم (نسمة) وموكل جديد (أحمد فتحي)
    // =========================================================================
    const addClientBtn = page.locator('button').filter({ hasText: 'إضافة موكل جديد' }).first();
    await addClientBtn.waitFor({ state: 'attached', timeout: 10000 });
    await addClientBtn.click();
    await page.waitForTimeout(400);

    await page.locator('form input[placeholder*="اسم الموكل"], form input[type="text"]').first().fill('نسمة سليم ناصر سليم');
    await page.locator('input[placeholder*="01"], input[type="tel"]').first().fill('01011112222');
    await page.locator('button[type="submit"]').filter({ hasText: 'إضافة الموكل' }).first().click();
    await page.waitForTimeout(800);

    expect(await page.locator('text=نسمة سليم ناصر سليم').count()).toBeGreaterThan(0);

    // إضافة موكل جديد: أحمد فتحي عبد الغفار
    await addClientBtn.click();
    await page.waitForTimeout(400);
    await page.locator('form input[placeholder*="اسم الموكل"], form input[type="text"]').first().fill('أحمد فتحي عبد الغفار');
    await page.locator('input[placeholder*="01"], input[type="tel"]').first().fill('01033334444');
    await page.locator('button[type="submit"]').filter({ hasText: 'إضافة الموكل' }).first().click();
    await page.waitForTimeout(800);

    expect(await page.locator('text=أحمد فتحي عبد الغفار').count()).toBeGreaterThan(0);

    // =========================================================================
    // الخطوة 2: الانتقال إلى القضايا وفحص ظهور الموكل الجديد "أحمد فتحي"
    // =========================================================================
    const casesNav = page.locator('aside button, aside a').filter({ hasText: 'القضايا' }).first();
    await casesNav.click({ force: true });
    await page.waitForTimeout(500);

    const addCaseBtn = page.locator('button').filter({ hasText: 'إضافة ملف قضية جديد' }).first();
    await addCaseBtn.click();
    await page.waitForTimeout(500);

    const clientSelect = page.locator('div.fixed div:has(> label:has-text("اختر الموكل")) select').first();
    const selectText1 = await clientSelect.innerText();

    // يجب أن يحتوي الـ select على الموكل الجديد فوراً بدون إعادة تشغيل
    expect(selectText1).toContain('أحمد فتحي عبد الغفار');

    // إغلاق نافذة القضية
    const closeBtn1 = page.locator('div.fixed button:has(svg.lucide-x)').first();
    if (await closeBtn1.count() > 0) await closeBtn1.click();
    await page.waitForTimeout(300);

    // =========================================================================
    // الخطوة 3: حذف موكل "نسمة" والتأكد من اختفائه فوراً من نافذة القضية
    // =========================================================================
    await clientsNav.click({ force: true });
    await page.waitForTimeout(500);

    const nesmaRow = page.locator('tr').filter({ hasText: 'نسمة سليم ناصر سليم' }).first();
    const deleteBtn = nesmaRow.locator('button[title*="حذف"]').first();
    await deleteBtn.click();
    await page.waitForTimeout(800);

    expect(await page.locator('text=نسمة سليم ناصر سليم').count()).toBe(0);

    // نفتح نافذة القضية مجدداً
    await casesNav.click({ force: true });
    await page.waitForTimeout(500);
    await addCaseBtn.click();
    await page.waitForTimeout(500);

    const selectText2 = await clientSelect.innerText();
    // نسمة المحذوفة يجب ألا تكون موجودة إطلاقاً في القائمة
    expect(selectText2).not.toContain('نسمة سليم ناصر سليم');

    const closeBtn2 = page.locator('div.fixed button:has(svg.lucide-x)').first();
    if (await closeBtn2.count() > 0) await closeBtn2.click();
    await page.waitForTimeout(300);

    // =========================================================================
    // الخطوة 4: تعديل اسم موكل والتأكد من ظهور الاسم الجديد في نافذة القضية
    // =========================================================================
    await clientsNav.click({ force: true });
    await page.waitForTimeout(500);

    const ahmedRow = page.locator('tr').filter({ hasText: 'أحمد فتحي عبد الغفار' }).first();
    const editBtn = ahmedRow.locator('button[title*="تعديل"]').first();
    await editBtn.click();
    await page.waitForTimeout(400);

    await page.locator('form input[placeholder*="اسم الموكل"], form input[type="text"]').first().fill('أحمد فتحي عبد الغفار المعدل');
    await page.locator('button[type="submit"]').filter({ hasText: 'حفظ التعديلات' }).first().click();
    await page.waitForTimeout(800);

    // نفتح نافذة القضية
    await casesNav.click({ force: true });
    await page.waitForTimeout(500);
    await addCaseBtn.click();
    await page.waitForTimeout(500);

    const selectText3 = await clientSelect.innerText();
    expect(selectText3).toContain('أحمد فتحي عبد الغفار المعدل');

    const closeBtn3 = page.locator('div.fixed button:has(svg.lucide-x)').first();
    if (await closeBtn3.count() > 0) await closeBtn3.click();
    await page.waitForTimeout(300);

    // =========================================================================
    // الخطوة 5: أرشفة ثم استرجاع موكل من سلة المحذوفات والتحقق من عودته
    // =========================================================================
    await clientsNav.click({ force: true });
    await page.waitForTimeout(500);

    const ahmedModifiedRow = page.locator('tr').filter({ hasText: 'أحمد فتحي عبد الغفار المعدل' }).first();
    const archiveBtn = ahmedModifiedRow.locator('button[title*="أرشفة"]').first();
    await archiveBtn.click();
    await page.waitForTimeout(800);

    const trashNav = page.locator('aside button, aside a').filter({ hasText: 'سلة المحذوفات' }).first();
    await trashNav.click({ force: true });
    await page.waitForTimeout(500);

    const restoreBtn = page.locator('div').filter({ hasText: 'أحمد فتحي عبد الغفار المعدل' }).locator('button').filter({ hasText: 'استرجاع' }).first();
    await restoreBtn.waitFor({ state: 'attached', timeout: 10000 });
    await restoreBtn.click({ force: true });
    await page.waitForTimeout(800);

    // فتح نافذة القضية والتحقق من ظهوره بعد الاسترجاع
    await casesNav.click({ force: true });
    await page.waitForTimeout(500);
    await addCaseBtn.click();
    await page.waitForTimeout(500);

    const selectText4 = await clientSelect.innerText();
    expect(selectText4).toContain('أحمد فتحي عبد الغفار المعدل');

    // =========================================================================
    // الخطوة 6: إضافة موكل سريع من داخل نافذة القضية واختياره مباشرة
    // =========================================================================
    const quickAddClientBtn = page.locator('div.fixed button').filter({ hasText: 'إضافة موكل جديد' }).first();
    expect(await quickAddClientBtn.count()).toBeGreaterThan(0);
    await quickAddClientBtn.click();
    await page.waitForTimeout(400);

    await page.locator('div.fixed input[placeholder*="اسم الموكل"], div.fixed input[type="text"]').last().fill('خالد عبد الرحمن السويفي');
    await page.locator('div.fixed input[placeholder*="01"], div.fixed input[type="tel"]').last().fill('01099998888');
    await page.locator('div.fixed button[type="submit"]').last().click();
    await page.waitForTimeout(800);

    const selectText5 = await clientSelect.innerText();
    expect(selectText5).toContain('خالد عبد الرحمن السويفي');
  }, 90000);
});
