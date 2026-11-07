import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('Regression: Case Announcements Tab Modals & CRUD', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  }, 30000);

  it('اختبار فتح نافذة الإعلان بواسطة الزرارين والحفظ والتحديث والإغلاق بـ Esc وبزرار الإلغاء بدون أخطاء', async () => {
    // Launch with small seed
    appInstance = await launchTestApp({ seed: 'small' });
    const { page, consoleErrors } = appInstance;

    const caughtErrors: string[] = [];
    page.on('pageerror', (err) => {
      caughtErrors.push(`[pageerror] ${err.message}`);
      console.log(`[PAGE ERROR DETECTED]: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('DevTools') && !text.includes('downloadable font')) {
          caughtErrors.push(`[console.error] ${text}`);
          console.log(`[CONSOLE ERROR DETECTED]: ${text}`);
        }
      }
    });

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

    // 3. فتح تبويب 8. الإعلانات والمحضرين
    const announcementsTabBtn = page.locator('button').filter({ hasText: '8. الإعلانات والمحضرين' }).first();
    await announcementsTabBtn.waitFor({ state: 'attached', timeout: 5000 });
    await announcementsTabBtn.click();
    await page.waitForTimeout(500);

    // التحقق من عنوان التبويب
    const tabHeader = page.locator('text=سجل الإعلانات القضائية وأقلام المحضرين').first();
    await tabHeader.waitFor({ state: 'visible', timeout: 5000 });

    // =========================================================================
    // اختبار 1: زر "تسجيل أول إعلان" (من الحالة الفاضية)
    // =========================================================================
    console.log('--- اختبار الضغط على زرار تسجيل أول إعلان ---');
    const emptyStateBtn = page.locator('[data-testid="case.announcements.tab.handle-open-add-modal-2"], button:has-text("تسجيل أول إعلان")').first();
    await emptyStateBtn.waitFor({ state: 'visible', timeout: 5000 });
    await emptyStateBtn.click();
    await page.waitForTimeout(500);

    // التحقق من ظهور نافذة الإضافة
    const modalTitle = page.locator('text=إضافة إعلان قضائي جديد').first();
    const isModalVisibleAfterEmptyBtn = await modalTitle.isVisible();
    console.log(`حالة ظهور النافذة بعد الضغط على "تسجيل أول إعلان": ${isModalVisibleAfterEmptyBtn}`);

    // التأكد من عدم حدوث أخطاء runtime
    expect(caughtErrors, `أخطاء حدثت عند الضغط على تسجيل أول إعلان: ${caughtErrors.join(' | ')}`).toEqual([]);
    expect(isModalVisibleAfterEmptyBtn, 'يجب أن تظهر نافذة إضافة إعلان قضائي جديد بعد الضغط على زر تسجيل أول إعلان').toBe(true);

    // اختبار الإغلاق بمفتاح Escape
    console.log('--- اختبار الإغلاق بمفتاح Escape ---');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    expect(await modalTitle.isVisible(), 'يجب أن تُغلق النافذة عند الضغط على Esc').toBe(false);

    // =========================================================================
    // اختبار 2: زر "إضافة إعلان جديد" (أعلى اليسار)
    // =========================================================================
    console.log('--- اختبار الضغط على زرار إضافة إعلان جديد ---');
    const topAddBtn = page.locator('[data-testid="case.announcements.tab.handle-open-add-modal"], button:has-text("إضافة إعلان جديد")').first();
    await topAddBtn.waitFor({ state: 'visible', timeout: 5000 });
    await topAddBtn.click();
    await page.waitForTimeout(500);

    const isModalVisibleAfterTopBtn = await modalTitle.isVisible();
    console.log(`حالة ظهور النافذة بعد الضغط على "إضافة إعلان جديد": ${isModalVisibleAfterTopBtn}`);
    expect(caughtErrors, `أخطاء حدثت عند الضغط على إضافة إعلان جديد: ${caughtErrors.join(' | ')}`).toEqual([]);
    expect(isModalVisibleAfterTopBtn, 'يجب أن تظهر نافذة إضافة إعلان قضائي جديد بعد الضغط على زر إضافة إعلان جديد').toBe(true);

    // اختبار الإغلاق بزرار "إلغاء"
    console.log('--- اختبار الإغلاق بزر إلغاء ---');
    const cancelBtn = page.locator('[data-testid="case.announcements.tab.set-is-add-modal-open-2"], button:has-text("إلغاء")').first();
    await cancelBtn.click();
    await page.waitForTimeout(400);
    expect(await modalTitle.isVisible(), 'يجب أن تُغلق النافذة عند الضغط على زر إلغاء').toBe(false);

    // =========================================================================
    // اختبار 3: فتح النافذة، ملء البيانات المطلوبة والحفظ
    // =========================================================================
    console.log('--- اختبار فتح النافذة وملء البيانات وحفظ الإعلان ---');
    await topAddBtn.click();
    await page.waitForTimeout(400);

    // اختيار مطلوب إعلانه حر أو طرف
    const freeRadio = page.locator('[data-testid="case.announcements.tab.set-add-form-4"]').first();
    if ((await freeRadio.count()) > 0) {
      await freeRadio.click();
      await page.waitForTimeout(200);
      const recipientInput = page.locator('[data-testid="case.announcements.tab.set-add-form-5"]').first();
      await recipientInput.fill('السيد محمد أحمد إبراهيم');
    }

    // قلم المحضرين
    const bailiffInput = page.locator('[data-testid="case.announcements.tab.set-add-form-8"]').first();
    if ((await bailiffInput.count()) > 0) {
      await bailiffInput.fill('محضرين قسم قصر النيل');
    }

    // رقم الطلب
    const reqNumInput = page.locator('[data-testid="case.announcements.tab.set-add-form-9"]').first();
    if ((await reqNumInput.count()) > 0) {
      await reqNumInput.fill('REQ-778899');
    }

    // رسم الإعلان
    const feeInput = page.locator('[data-testid="case.announcements.tab.set-add-form-11"]').first();
    if ((await feeInput.count()) > 0) {
      await feeInput.fill('150');
    }

    // الضغط على حفظ
    const submitBtn = page.locator('button[type="submit"]:has-text("حفظ الإعلان")').first();
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // التحقق من اختفاء الحالة الفاضية وظهور الإعلان الجديد
    const emptyNotice = page.locator('text=لا توجد إعلانات مسجلة لهذه القضية حتى الآن');
    expect(await emptyNotice.count(), 'يجب أن تختفي رسالة الحالة الفاضية').toBe(0);

    const createdRecipient = page.locator('text=السيد محمد أحمد إبراهيم').first();
    expect(await createdRecipient.count(), 'يجب أن يظهر اسم المطلوب إعلانه في القائمة').toBeGreaterThan(0);

    // التحقق من عدم وجود أي خطأ console أو pageerror خلال كل العمليات
    expect(caughtErrors, `أخطاء console/pageerror أثناء العملية: ${caughtErrors.join(' | ')}`).toEqual([]);
  }, 60000);
});
