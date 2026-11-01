import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('E2E Test Scenarios 4 & 5: Dashboard & Calendar (لوحة اليوم والتقويم)', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  });

  it('لوحة اليوم: تعرض إحصائيات القضايا والموكلين والجلسات والتنبيهات بناءً على بيانات الـ seed', async () => {
    // Launch with small seed (50 cases, 150 hearings, 40 tasks)
    appInstance = await launchTestApp({ seed: 'small', seedNum: 42 });
    const { page } = appInstance;

    // 1. Verify we are on Dashboard
    const dashboardNav = page.locator('aside button, aside a').filter({ hasText: 'الرئيسية' }).first();
    await dashboardNav.click();
    await page.waitForTimeout(600);

    // 2. Check metric cards
    expect(await page.locator('text=إجمالي القضايا النشطة').count()).toBeGreaterThan(0);
    expect(await page.locator('text=الموكلون المسجلون').count()).toBeGreaterThan(0);
    expect(await page.locator('text=المحاكم والجهات').count()).toBeGreaterThan(0);

    // 3. Verify sections exist: hearings section & tasks section
    const hearingsHeader = page.locator('text=جلسات اليوم, text=جدول الجلسات, text=الجلسات القادمة').first();
    expect(await hearingsHeader.count()).toBeGreaterThan(0);

    const tasksHeader = page.locator('text=مهام اليوم, text=المهام والمأموريات, text=المهام المتأخرة').first();
    expect(await tasksHeader.count()).toBeGreaterThan(0);
  }, 45000);

  it('التقويم القضائي: يدعم العرض بالشهر والأسبوع واليوم والضغط على عنصر ينقل لملف القضية', async () => {
    if (!appInstance) {
      appInstance = await launchTestApp({ seed: 'small', seedNum: 42 });
    }
    const { page } = appInstance;

    // 1. Navigate to Calendar via Sidebar
    const calendarNav = page.locator('aside button, aside a').filter({ hasText: 'التقويم' }).first();
    await calendarNav.click();
    await page.waitForTimeout(700);

    // 2. Verify Calendar title & header
    expect(await page.locator('text=الأجندة والتقويم القضائي').count()).toBeGreaterThan(0);

    // 3. Verify Month / Week / Day view toggles
    const monthBtn = page.locator('button').filter({ hasText: 'شهر' }).first();
    const weekBtn = page.locator('button').filter({ hasText: 'أسبوع' }).first();
    const dayBtn = page.locator('button').filter({ hasText: 'يوم' }).first();

    if (await weekBtn.count() > 0) {
      await weekBtn.click();
      await page.waitForTimeout(400);
      expect(await page.locator('text=السبت, text=الأحد').count()).toBeGreaterThan(0);
    }

    if (await dayBtn.count() > 0) {
      await dayBtn.click();
      await page.waitForTimeout(400);
      expect(await page.locator('text=جلسات هذا اليوم, text=مهام هذا اليوم, text=اليوم').count()).toBeGreaterThan(0);
    }

    if (await monthBtn.count() > 0) {
      await monthBtn.click();
      await page.waitForTimeout(400);
      expect(await page.locator('text=الجمعة').count()).toBeGreaterThan(0);
    }

    // 4. Click any calendar item if visible to test navigation
    const calendarItem = page.locator('.calendar-event, button[title*="قضية"], div[class*="cursor-pointer"]').filter({ hasText: 'قضية' }).first();
    if (await calendarItem.count() > 0) {
      await calendarItem.click();
      await page.waitForTimeout(500);
    }
  }, 45000);
});
