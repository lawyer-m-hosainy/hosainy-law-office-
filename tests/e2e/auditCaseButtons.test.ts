import { describe, it, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('Audit: Case Details 8 Tabs Button Responsiveness', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  }, 30000);

  it('فحص الأزرار الظاهرة في التبويبات الثمانية وتسجيل استجابتها', async () => {
    appInstance = await launchTestApp({ seed: 'small' });
    const { page } = appInstance;

    // Suppress native dialogs like confirm/alert
    page.on('dialog', (d) => d.dismiss());

    const caughtErrors: { button: string; error: string }[] = [];
    page.on('pageerror', (err) => {
      caughtErrors.push({ button: 'pageerror', error: err.message });
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('DevTools') && !msg.text().includes('downloadable font')) {
        caughtErrors.push({ button: 'console.error', error: msg.text() });
      }
    });

    // 1. الذهاب إلى صفحة القضية
    const casesNav = page.locator('aside button, aside a').filter({ hasText: 'القضايا' }).first();
    await casesNav.waitFor({ state: 'attached', timeout: 15000 });
    await casesNav.click({ force: true });
    await page.waitForTimeout(600);

    const firstCaseCard = page.locator('[data-testid="cases.main.on-open-case-details"]').first();
    await firstCaseCard.waitFor({ state: 'attached', timeout: 10000 });
    await firstCaseCard.click();
    await page.waitForTimeout(600);

    const tabs = [
      { id: 'basic', name: '1. البيانات الأساسية' },
      { id: 'hearings', name: '2. الجلسات والتأجيلات' },
      { id: 'finance', name: '3. المالية والحسابات' },
      { id: 'executions', name: '4. التنفيذات' },
      { id: 'documents', name: '5. المستندات والمرفقات' },
      { id: 'tasks', name: '6. المهام المرتبطة' },
      { id: 'timeline', name: '7. السجل الزمني والملاحظات' },
      { id: 'announcements', name: '8. الإعلانات والمحضرين' },
    ];

    const results: { tab: string; buttonText: string; testId: string; result: string }[] = [];

    for (const tab of tabs) {
      console.log(`\n=== فحص تبويب: ${tab.name} ===`);
      const tabBtn = page.locator('button').filter({ hasText: tab.name }).first();
      await tabBtn.waitFor({ state: 'attached', timeout: 5000 });
      await tabBtn.click();
      await page.waitForTimeout(400);

      // We inspect buttons inside the tab content area (excluding the tabs bar itself and global sidebar)
      // The tabs bar buttons are excluded by matching against tab names or top header
      const buttonsLocator = page.locator('div.max-w-7xl > div:not(.border-b) button:visible, div.max-w-7xl > div:not(.bg-white) button:visible');
      const count = await buttonsLocator.count();

      for (let i = 0; i < count; i++) {
        // Re-locate because DOM might have changed
        const btn = buttonsLocator.nth(i);
        if (!(await btn.isVisible())) continue;

        const text = (await btn.innerText()).trim().replace(/\n+/g, ' ') || (await btn.getAttribute('title')) || (await btn.getAttribute('aria-label')) || 'زر بدون نص';
        const testId = (await btn.getAttribute('data-testid')) || '';

        // Skip the tab navigation buttons themselves
        if (tabs.some(t => text.includes(t.name))) continue;
        if (text === 'العودة لكل القضايا' || text === 'العودة لقائمة القضايا') continue;

        const errorCountBefore = caughtErrors.length;
        const bodyHtmlBefore = await page.evaluate(() => document.body.innerHTML.length);
        const modalCountBefore = await page.locator('div.fixed, [role="dialog"]').count();

        let outcome = 'لا شيء (ميت)';

        try {
          await btn.click({ timeout: 2000 });
          await page.waitForTimeout(400);

          const errorCountAfter = caughtErrors.length;
          const bodyHtmlAfter = await page.evaluate(() => document.body.innerHTML.length);
          const modalCountAfter = await page.locator('div.fixed, [role="dialog"]').count();

          if (errorCountAfter > errorCountBefore) {
            const newErr = caughtErrors[caughtErrors.length - 1].error;
            outcome = `خطأ برمجي (${newErr.slice(0, 50)}...)`;
          } else if (modalCountAfter > modalCountBefore) {
            outcome = 'فتح نافذة منبثقة (Modal)';
            // Dismiss modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
            const stillOpen = await page.locator('div.fixed, [role="dialog"]').count();
            if (stillOpen > modalCountBefore) {
              const closeBtn = page.locator('div.fixed button:has-text("إلغاء"), div.fixed button:has-text("✕")').first();
              if ((await closeBtn.count()) > 0) {
                await closeBtn.click().catch(() => {});
              }
            }
          } else if (Math.abs(bodyHtmlAfter - bodyHtmlBefore) > 20) {
            outcome = 'تغيير في الواجهة / عرض بيانات';
          } else {
            outcome = 'لا شيء (ميت)';
          }
        } catch (e: any) {
          outcome = `استثناء عند الضغط (${e.message.slice(0, 50)})`;
        }

        results.push({
          tab: tab.name,
          buttonText: text,
          testId,
          result: outcome,
        });

        console.log(`[${tab.name}] ${text} (${testId}) => ${outcome}`);
      }
    }

    console.log('\n================ جدول نتائج فحص الأزرار ================');
    console.log('| التبويب | نص الزرار | data-testid | النتيجة |');
    console.log('|---|---|---|---|');
    for (const r of results) {
      console.log(`| ${r.tab} | ${r.buttonText} | \`${r.testId}\` | ${r.result} |`);
    }
  }, 120000);
});
