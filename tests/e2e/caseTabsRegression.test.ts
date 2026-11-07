import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('Regression Test: Case Details 8 Tabs Navigation & Error-Free Rendering', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  }, 30000);

  it('يفتح قضية تحتوي على جلسات وحركات مالية ويتنقل بين جميع التبويبات الثمانية بدون أي خطأ', async () => {
    appInstance = await launchTestApp({ seed: 'small' });
    const { page, consoleErrors } = appInstance;

    // Track page errors and console errors specifically
    const caughtErrors: string[] = [];
    page.on('pageerror', (err) => {
      caughtErrors.push(`[pageerror] ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('DevTools') && !text.includes('downloadable font')) {
          caughtErrors.push(`[console.error] ${text}`);
        }
      }
    });

    // 1. الانتقال إلى شاشة القضايا
    const casesNav = page.locator('aside button, aside a').filter({ hasText: 'القضايا' }).first();
    await casesNav.waitFor({ state: 'attached', timeout: 15000 });
    await casesNav.click({ force: true });
    await page.waitForTimeout(500);

    // 2. فتح أول قضية من القائمة (تحتوي على جلسات وحركات مالية بحكم الـ seed)
    const firstCaseCard = page.locator('[data-testid="cases.main.on-open-case-details"]').first();
    await firstCaseCard.waitFor({ state: 'attached', timeout: 10000 });
    await firstCaseCard.click();
    await page.waitForTimeout(500);

    // 3. التحقق من فتح صفحة تفاصيل القضية
    const backBtn = page.locator('[data-testid="case.main.on-back"], [data-testid="case.main.on-back-2"]').first();
    await backBtn.waitFor({ state: 'attached', timeout: 10000 });

    const tabsToTest = [
      {
        name: '1. البيانات الأساسية',
        expectedSelector: 'text=بيانات القيد والمحكمة',
      },
      {
        name: '2. الجلسات والتأجيلات',
        expectedSelector: 'text=الجلسات والتأجيلات',
      },
      {
        name: '3. المالية والحسابات',
        expectedSelector: 'text=المالية والحسابات',
      },
      {
        name: '4. التنفيذات',
        expectedSelector: 'text=التنفيذات',
      },
      {
        name: '5. المستندات والمرفقات',
        expectedSelector: 'text=المستندات والمرفقات',
      },
      {
        name: '6. المهام المرتبطة',
        expectedSelector: 'text=المهام المرتبطة',
      },
      {
        name: '7. السجل الزمني والملاحظات',
        expectedSelector: 'text=السجل الزمني والملاحظات',
      },
      {
        name: '8. الإعلانات والمحضرين',
        expectedSelector: 'text=الإعلانات والمحضرين',
      },
    ];

    for (const tab of tabsToTest) {
      console.log(`اختبار التبويب: ${tab.name}`);
      const initialErrorCount = caughtErrors.length;

      // اضغط على التبويب
      const tabButton = page.locator('button').filter({ hasText: tab.name }).first();
      await tabButton.waitFor({ state: 'attached', timeout: 5000 });
      await tabButton.click();
      await page.waitForTimeout(400);

      // التأكد من عدم ظهور شاشة الخطأ
      const errorBoundaryTitle = page.locator('text=حدث خطأ غير متوقع أثناء عرض هذه الصفحة');
      const isErrorBoundaryVisible = (await errorBoundaryTitle.count()) > 0;
      if (isErrorBoundaryVisible) {
        const errorBox = page.locator('div.border-red-200 div.font-mono');
        const errorMsg = (await errorBox.count()) > 0 ? await errorBox.innerText() : (await page.locator('.text-red-700').innerText().catch(() => 'unknown error'));
        console.log(`ErrorBoundary Error text: ${errorMsg}`);
        console.log('Caught errors:', caughtErrors);
        throw new Error(`فشل التبويب "${tab.name}": ظهرت شاشة الخطأ ErrorBoundary بالرسالة: ${errorMsg}`);
      }

      // التأكد من عدم وجود console errors أو page errors أثناء الانتقال لهذا التبويب
      const newErrors = caughtErrors.slice(initialErrorCount);
      const criticalErrors = newErrors.filter((e) => !e.includes('ErrorBoundary'));
      expect(criticalErrors, `أخطاء console/pageerror في تبويب ${tab.name}`).toEqual([]);

      // التأكد من ظهور محتوى التبويب
      const expectedContent = page.locator(tab.expectedSelector).first();
      await expectedContent.waitFor({ state: 'visible', timeout: 5000 });
      expect(await expectedContent.count()).toBeGreaterThan(0);
    }
  }, 60000);
});
