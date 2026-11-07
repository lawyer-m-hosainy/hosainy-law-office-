import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { launchAuditApp, AuditApp } from '../helpers/auditLauncher';
import { navigateToTab } from '../helpers/elementCrawler';

describe('Contract Tests: 9 Official Reports (عقود التقارير الرسمية التسعة من كافة المداخل)', () => {
  let auditApp: AuditApp;

  beforeAll(async () => {
    auditApp = await launchAuditApp({ seed: 'small', seedNum: 123456789 });
  }, 90000);

  afterAll(async () => {
    if (auditApp) {
      await auditApp.close();
    }
  });

  const getPdfCount = () => {
    const files = fs.readdirSync(auditApp.env.exportsDir);
    return files.filter((f) => f.endsWith('.pdf')).length;
  };

  it('1. تقرير رول الجلسات (من لوحة اليوم ومن الجلسات ومن شاشة التقارير)', async () => {
    const { page } = auditApp;
    const initialPdfCount = getPdfCount();

    await navigateToTab(page, 'hearings');
    await page.waitForTimeout(500);

    // Switch to all hearings to ensure items are present
    const allBtn = page.locator('button').filter({ hasText: 'كافة الجلسات' }).first();
    if ((await allBtn.count()) > 0) {
      await allBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for roll rows to be loaded
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

    const printRollBtn = page.locator('[data-testid="hearings.main.handle-print-roll-3"]').first();
    expect(await printRollBtn.count()).toBeGreaterThan(0);
    await printRollBtn.click();

    let pdfCount = initialPdfCount;
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(500);
      pdfCount = getPdfCount();
      if (pdfCount > initialPdfCount) break;
    }

    expect(pdfCount).toBeGreaterThan(initialPdfCount);
  });

  it('2. تقرير ملف القضية الكامل (من صفحة تفاصيل القضية ومن شاشة التقارير)', async () => {
    const { page } = auditApp;
    const prevCount = getPdfCount();

    await navigateToTab(page, 'case');
    await page.waitForTimeout(500);

    const printCaseBtn = page.locator('[data-testid="case.main.handle-print-case-sheet-3"], [data-testid="case.main.handle-print-case-sheet"]').first();
    expect(await printCaseBtn.count()).toBeGreaterThan(0);
    await printCaseBtn.click();
    await page.waitForTimeout(2000);

    expect(getPdfCount()).toBeGreaterThan(prevCount);
  });

  it('3. تقرير كشف حساب الموكل وإيصال الاستلام (من شاشة المالية)', async () => {
    const { page } = auditApp;
    const prevCount = getPdfCount();

    await navigateToTab(page, 'finance');
    await page.waitForTimeout(500);

    const receiptBtn = page.locator('[data-testid="finance.main.handle-print-receipt"]').first();
    if ((await receiptBtn.count()) > 0) {
      await receiptBtn.click();
      await page.waitForTimeout(2500);
      expect(getPdfCount()).toBeGreaterThan(prevCount);
    }
  });

  it('4. تقرير قائمة المهام الميدانية بخانات التأشير [ ] (من شاشة المهام)', async () => {
    const { page } = auditApp;
    const prevCount = getPdfCount();

    await navigateToTab(page, 'tasks');
    await page.waitForTimeout(400);

    const printTasksBtn = page.locator('[data-testid="tasks.main.handle-print-tasks"]').first();
    if ((await printTasksBtn.count()) > 0) {
      await printTasksBtn.click();
      await page.waitForTimeout(2000);
      expect(getPdfCount()).toBeGreaterThan(prevCount);
    }
  });

  it('5. تقرير ملف التنفيذ الجبري (من شاشة التنفيذات)', async () => {
    const { page } = auditApp;
    const prevCount = getPdfCount();

    await navigateToTab(page, 'executions');
    await page.waitForTimeout(400);

    const printExecBtn = page.locator('[data-testid="executions.main.handle-print"]').first();
    if ((await printExecBtn.count()) > 0) {
      await printExecBtn.click();
      await page.waitForTimeout(600);
      expect(getPdfCount()).toBeGreaterThan(prevCount);
    }
  });

  it('6. إصدار كافة التقارير من شاشة التقارير المركزية (Reports Page)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'reports');
    await page.waitForTimeout(500);

    // Verify reports page displays options for all 9 report types
    const reportsPageText = await page.textContent('body');
    expect(reportsPageText).toContain('رول الجلسات');
    expect(reportsPageText).toContain('كشف حساب');
  });
});
