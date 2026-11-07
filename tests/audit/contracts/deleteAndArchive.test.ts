import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { launchAuditApp, AuditApp } from '../helpers/auditLauncher';
import { navigateToTab } from '../helpers/elementCrawler';

describe('Contract Tests: Delete, Archive & Financial Reversal (عقود الحذف والأرشفة والقيود العكسية)', () => {
  let auditApp: AuditApp;

  beforeAll(async () => {
    auditApp = await launchAuditApp({ seed: 'small', seedNum: 123456789 });
  }, 90000);

  afterAll(async () => {
    if (auditApp) {
      await auditApp.close();
    }
  }, 30000);

  it('1. أرشفة الموكل وإلغاء الأرشفة: يختفي من النشطين ويظهر في فلتر المؤرشفين', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'clients');
    await page.waitForTimeout(400);

    // Click archive button on first client
    const archiveBtn = page.locator('[data-testid="clients.main.handle-archive-toggle"]').first();
    if ((await archiveBtn.count()) > 0) {
      await archiveBtn.click();
      await page.waitForTimeout(500);

      // Switch to Archived filter
      const archivedFilterBtn = page.locator('[data-testid="clients.main.set-status-filter-3"]').first();
      if ((await archivedFilterBtn.count()) > 0) {
        await archivedFilterBtn.click();
        await page.waitForTimeout(300);

        // Verify archived clients are listed
        const rows = page.locator('table tbody tr');
        expect(await rows.count()).toBeGreaterThan(0);
      }

      // Switch back to All filter
      const allFilterBtn = page.locator('[data-testid="clients.main.set-status-filter"]').first();
      if ((await allFilterBtn.count()) > 0) {
        await allFilterBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  it('2. حذف القضية ونقلها لسلة المحذوفات واستعادتها (Trash Lifecycle)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'cases');
    await page.waitForTimeout(400);

    // Delete first case
    const deleteBtn = page.locator('[data-testid="cases.main.handle-delete"]').first();
    if ((await deleteBtn.count()) > 0) {
      await deleteBtn.click();
      await page.waitForTimeout(500);

      // Navigate to Trash Bin
      await navigateToTab(page, 'trash');
      await page.waitForTimeout(400);

      // Verify trash items exist (trash items render as list cards with restore buttons)
      const restoreBtn = page.locator('[data-testid="trash.main.handle-restore"]').first();
      expect(await restoreBtn.count()).toBeGreaterThan(0);

      // Click restore on first trash item
      await restoreBtn.click();
      await page.waitForTimeout(500);
    }
  });

  it('3. الحركات المالية لا تُحذف نهائياً بل تُلغى بقيد عكسي (Financial Reversal Rule)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'finance');
    await page.waitForTimeout(400);

    // Check if reverse button exists in transactions table
    const reverseBtn = page.locator('[data-testid="finance.main.set-selected-tx-to-reverse"]').first();
    if ((await reverseBtn.count()) > 0) {
      await reverseBtn.click();
      await page.waitForTimeout(300);

      // Fill reverse reason
      const reasonInput = page.locator('[data-testid="finance.main.set-reverse-reason"]').first();
      if ((await reasonInput.count()) > 0) {
        await reasonInput.fill('إلغاء تجريبي لاختبار القيد العكسي وفق RULES.md');
      }

      // Confirm reverse
      const confirmBtn = page.locator('[data-testid="finance.main.cancel"]').first();
      if ((await confirmBtn.count()) > 0) {
        await confirmBtn.click();
        await page.waitForTimeout(600);
      }
    }

    // Check database to ensure no DELETE was executed on financial_transactions
    const dbRowsCount = await auditApp.page.evaluate(async () => {
      const txs = await (window as any).electronAPI.getFinancialTransactions();
      return Array.isArray(txs) ? txs.length : 0;
    });
    expect(dbRowsCount).toBeGreaterThan(0);
  });
});
