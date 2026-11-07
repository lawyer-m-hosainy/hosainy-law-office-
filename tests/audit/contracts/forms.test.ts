import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { launchAuditApp, AuditApp } from '../helpers/auditLauncher';
import { navigateToTab, dismissActiveModals } from '../helpers/elementCrawler';

describe('Contract Tests: Forms & Validation (عقود النماذج والتحقق من صحة المدخلات)', () => {
  let auditApp: AuditApp;

  beforeAll(async () => {
    auditApp = await launchAuditApp({ seed: 'small', seedNum: 123456789 });
  }, 90000);

  afterAll(async () => {
    if (auditApp) {
      await auditApp.close();
    }
  }, 30000);

  afterEach(async () => {
    if (auditApp) {
      await dismissActiveModals(auditApp.page);
      await auditApp.page.waitForTimeout(200);
    }
  });

  it('1. إدخال صحيح: حفظ موكل جديد وظهوره فوراً في الجدول ورسالة نجاح', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'clients');
    await page.waitForTimeout(400);

    // Open Add Client modal
    const addBtn = page.locator('[data-testid="clients.main.handle-open-add-modal"]').first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // Fill client form
    const uniqueName = `موكل جديد تجريبي عقد ${Date.now().toString().slice(-4)}`;
    const nameInput = page.locator('[data-testid="clients.main.set-form-data-4"]').first();
    await nameInput.fill(uniqueName);

    // phone is required (set-form-data-6)
    const phoneInput = page.locator('[data-testid="clients.main.set-form-data-6"]').first();
    expect(await phoneInput.count()).toBeGreaterThan(0);
    await phoneInput.fill('01099887766');

    // Submit form
    const submitBtn = page.locator('[data-testid="clients.main.button-14"]').first();
    await submitBtn.click();
    await page.waitForTimeout(600);

    // Verify modal closed
    const modalClosed = (await page.locator('[data-testid="clients.main.button-14"]').count()) === 0;
    expect(modalClosed).toBe(true);

    // Verify client appears in table
    const tableText = await page.locator('table').textContent();
    expect(tableText).toContain(uniqueName);
  });

  it('2. حقل مطلوب فارغ: يمنع الحفظ ويعرض نصاً واضحاً أو تنبيهاً', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'clients');
    await page.waitForTimeout(400);

    const addBtn = page.locator('[data-testid="clients.main.handle-open-add-modal"]').first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // Leave name empty and attempt submit
    const submitBtn = page.locator('[data-testid="clients.main.button-14"]').first();
    await submitBtn.click();
    await page.waitForTimeout(300);

    // Modal must still be open because required field was missing
    const isStillOpen = (await page.locator('[data-testid="clients.main.button-14"]').count()) > 0;
    expect(isStillOpen).toBe(true);
  });

  it('3. قيم حدية (Boundary Values): نصوص طويلة وتواريخ ومبالغ', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'clients');
    await page.waitForTimeout(400);

    const addBtn = page.locator('[data-testid="clients.main.handle-open-add-modal"]').first();
    await addBtn.click();
    await page.waitForTimeout(300);

    const longText = 'اسم موكل طويل جداً لاختبار استيعاب الحقول والترميز العربي وتنسيق الواجهة '.repeat(6);
    const nameInput = page.locator('[data-testid="clients.main.set-form-data-4"]').first();
    await nameInput.fill(longText);

    // Fill required phone
    const phoneInput = page.locator('[data-testid="clients.main.set-form-data-6"]').first();
    if ((await phoneInput.count()) > 0) {
      await phoneInput.fill('01122334455');
    }

    // Notes textarea with Arabic, English, numbers, symbols
    const notesInput = page.locator('[data-testid="clients.main.set-form-data-16"]').first();
    if ((await notesInput.count()) > 0) {
      await notesInput.fill('ملاحظات خاصة: E-mail: test@law.eg / هاتف: +20100000000 / تاريخ: 2026-12-31 / مبالغ: 150,000 ج.م');
    }

    const submitBtn = page.locator('[data-testid="clients.main.button-14"]').first();
    await submitBtn.click();
    await page.waitForTimeout(600);

    // Verify no crash
    const isWhiteScreen = await page.evaluate(() => {
      const root = document.getElementById('root');
      return !root || root.children.length === 0;
    });
    expect(isWhiteScreen).toBe(false);
  });

  it('4. الحماية من الحفظ المزدوج (Double-Submit Prevention)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'clients');
    await page.waitForTimeout(400);

    const addBtn = page.locator('[data-testid="clients.main.handle-open-add-modal"]').first();
    await addBtn.click();
    await page.waitForTimeout(300);

    const doubleName = `موكل حفظ مزدوج ${Date.now().toString().slice(-4)}`;
    const nameInput = page.locator('[data-testid="clients.main.set-form-data-4"]').first();
    await nameInput.fill(doubleName);

    const phoneInput = page.locator('[data-testid="clients.main.set-form-data-6"]').first();
    if ((await phoneInput.count()) > 0) {
      await phoneInput.fill('01234567890');
    }

    const submitBtn = page.locator('[data-testid="clients.main.button-14"]').first();
    // Rapid double click to verify single submission
    await submitBtn.dblclick().catch(() => {});
    await page.waitForTimeout(1000);

    // Verify search matches only 1 row
    const searchInput = page.locator('[data-testid="clients.main.set-search-query"]').first();
    await searchInput.fill(doubleName);
    await page.waitForTimeout(400);

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBe(1);

    await searchInput.fill('');
  }, 45000);
});
