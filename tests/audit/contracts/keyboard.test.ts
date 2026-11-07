import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { launchAuditApp, AuditApp } from '../helpers/auditLauncher';
import { navigateToTab, dismissActiveModals } from '../helpers/elementCrawler';

describe('Contract Tests: Keyboard Shortcuts & Universal Search (عقود اختصارات الكيبورد والبحث الشامل)', () => {
  let auditApp: AuditApp;

  beforeAll(async () => {
    auditApp = await launchAuditApp({ seed: 'small', seedNum: 123456789 });
  }, 90000);

  afterAll(async () => {
    if (auditApp) {
      await auditApp.close();
    }
  });

  afterEach(async () => {
    if (auditApp) {
      await dismissActiveModals(auditApp.page);
      await auditApp.page.waitForTimeout(200);
    }
  });

  it('1. اختصار Ctrl+K يفتح نافذة البحث الشامل من أي شاشة ويعرض النتائج', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(300);

    // Press Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(400);

    // Verify Universal Search modal opened
    const searchInput = page.locator('[data-testid="search.main.set-query-2"]').first();
    expect(await searchInput.count()).toBeGreaterThan(0);

    // Type query: 'محكمة' or 'القاهرة'
    await searchInput.fill('محكمة');
    // Wait for 200ms debounce + IPC query execution
    await page.waitForTimeout(800);

    // Verify search items appear
    const searchItems = page.locator('[data-testid="search.main.handle-select-item"]');
    expect(await searchItems.count()).toBeGreaterThan(0);

    // Click close button
    const closeBtn = page.locator('[data-testid="search.main.on-close"]').first();
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    // Verify modal closed
    const isModalOpen = (await page.locator('[data-testid="search.main.set-query-2"]').count()) > 0;
    expect(isModalOpen).toBe(false);
  });

  it('2. النقر على أيقونة البحث في الشريط العلوي يفتح نافذة البحث الشامل أيضاً', async () => {
    const { page } = auditApp;
    const headerSearchBtn = page.locator('[data-testid="header.main.on-open-universal-search"]').first();
    expect(await headerSearchBtn.count()).toBeGreaterThan(0);

    await headerSearchBtn.click();
    await page.waitForTimeout(400);

    const searchInput = page.locator('[data-testid="search.main.set-query-2"]').first();
    expect(await searchInput.count()).toBeGreaterThan(0);

    // Close via close button
    const closeBtn = page.locator('[data-testid="search.main.on-close"]').first();
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    const isModalOpen = (await page.locator('[data-testid="search.main.set-query-2"]').count()) > 0;
    expect(isModalOpen).toBe(false);
  });
});
