import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { launchAuditApp, AuditApp } from './helpers/auditLauncher';
import {
  loadInventory,
  navigateToTab,
  dismissActiveModals,
  testElement,
  ElementAuditResult,
} from './helpers/elementCrawler';

describe('Quick UI Crawler (الزاحف السريع للصفحات الرئيسية)', () => {
  let auditApp: AuditApp;
  const inventory = loadInventory();
  const allResults: ElementAuditResult[] = [];

  beforeAll(async () => {
    auditApp = await launchAuditApp({ seed: 'small', seedNum: 123456789 });
  }, 90000);

  afterAll(async () => {
    if (auditApp) {
      await auditApp.close();
    }
  });

  const quickPages = ['dashboard', 'clients', 'cases', 'hearings', 'finance', 'tasks', 'settings'];

  for (const pageId of quickPages) {
    const elements = inventory.filter((item) => item.page === pageId);

    it(`زحف سريع للصفحة: [${pageId}] (${elements.length} عنصر)`, async () => {
      const { page } = auditApp;
      await navigateToTab(page, pageId);
      await page.waitForTimeout(300);

      const isWhiteScreen = await page.evaluate(() => {
        const root = document.getElementById('root');
        return !root || root.children.length === 0;
      });
      expect(isWhiteScreen).toBe(false);

      const hasErrorBoundary = (await page.locator('[data-testid="app.main.handle-reset"]').count()) > 0;
      expect(hasErrorBoundary).toBe(false);

      for (const item of elements) {
        const res = await testElement(page, item, auditApp);
        allResults.push(res);
        await dismissActiveModals(page);
      }

      expect(auditApp.externalRequests).toEqual([]);
    }, 120000);
  }
});
