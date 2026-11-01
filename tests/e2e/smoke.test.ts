import { describe, it, expect, afterAll } from 'vitest';
import { launchTestApp, LaunchedApp } from './helpers/launchApp';

describe('E2E Smoke Test', () => {
  let appInstance: LaunchedApp | null = null;

  afterAll(async () => {
    if (appInstance) {
      await appInstance.close();
    }
  });

  it('يبدأ تشغيل التطبيق بنجاح ويعرض العنوان والقوائم الأساسية', async () => {
    appInstance = await launchTestApp({ seed: 'small' });
    const { page } = appInstance;

    const title = await page.title();
    expect(title).toContain('نظام إدارة مكتب المحاماة');

    // Verify sidebar exists
    const sidebar = await page.waitForSelector('aside');
    expect(sidebar).toBeTruthy();
  }, 45000);
});
