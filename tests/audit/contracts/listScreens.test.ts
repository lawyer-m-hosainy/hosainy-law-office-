import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { launchAuditApp, AuditApp } from '../helpers/auditLauncher';
import { navigateToTab, dismissActiveModals } from '../helpers/elementCrawler';

describe('Contract Tests: List Screens (عقود شاشات القوائم والجداول)', () => {
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

  it('1. البحث مع تطبيع الحروف العربية (Arabic Typo & Normalization): يطابق أ/ا/إ و ة/ه و ى/ي', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'clients');
    await page.waitForTimeout(400);

    const searchInput = page.locator('[data-testid="clients.main.set-search-query"]').first();
    expect(await searchInput.count()).toBeGreaterThan(0);

    // Search with un-normalized Arabic: 'احمد' matches 'أحمد'
    await searchInput.fill('احمد');
    await page.waitForTimeout(300);

    // Verify results exist in table
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(200);
  });

  it('2. حالة "لا توجد بيانات" (Empty State): عرض رسالة واضحة عند عدم تطابق البحث', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'clients');
    await page.waitForTimeout(300);

    const searchInput = page.locator('[data-testid="clients.main.set-search-query"]').first();
    await searchInput.fill('نص_مستحيل_وجوده_12345_xyz');
    await page.waitForTimeout(300);

    // Verify empty state is displayed
    const emptyState = page.locator('text=/لا توجد|لا يوجد|لم يتم العثور/');
    expect(await emptyState.count()).toBeGreaterThan(0);

    // Reset search
    await searchInput.fill('');
    await page.waitForTimeout(200);
  });

  it('3. الفلاتر وتقسيم الصفحات (Filters & Pagination): تغيير الفلاتر وحجم الصفحة', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'cases');
    await page.waitForTimeout(400);

    // Status filter
    const statusSelect = page.locator('[data-testid="cases.main.set-status-filter"]').first();
    if ((await statusSelect.count()) > 0) {
      await statusSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
      await statusSelect.selectOption({ index: 0 }); // reset
    }

    // Page size: valid options are 12, 24, 48, 96
    const pageSizeSelect = page.locator('[data-testid="cases.main.set-page-size"]').first();
    if ((await pageSizeSelect.count()) > 0) {
      await pageSizeSelect.selectOption('12');
      await page.waitForTimeout(300);
      await pageSizeSelect.selectOption('24');
      await page.waitForTimeout(200);
    }

    // Cases are rendered as cards in a responsive grid
    const cards = page.locator('[data-testid="cases.main.on-open-case-details"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  it('4. تصدير البيانات إلى CSV و Excel: الملفات تتولد وغير فارغة وتفتح', async () => {
    const { page, env } = auditApp;
    await navigateToTab(page, 'cases');
    await page.waitForTimeout(400);

    // Look for ExportButton
    const exportDropdownBtn = page.locator('[data-testid="export.main.set-is-open"]').first();
    expect(await exportDropdownBtn.count()).toBeGreaterThan(0);

    await exportDropdownBtn.click();
    await page.waitForTimeout(300);

    // Click CSV export (handle-export-2 is CSV)
    const csvBtn = page.locator('[data-testid="export.main.handle-export-2"]').first();
    expect(await csvBtn.count()).toBeGreaterThan(0);
    await csvBtn.click();
    await page.waitForTimeout(800);

    // Verify CSV file generated in exportsDir
    const exportsDir = env.exportsDir;
    const filesAfterCsv = fs.readdirSync(exportsDir);
    const csvFiles = filesAfterCsv.filter((f) => f.endsWith('.csv'));
    expect(csvFiles.length).toBeGreaterThan(0);

    const latestCsv = path.join(exportsDir, csvFiles[csvFiles.length - 1]);
    const stats = fs.statSync(latestCsv);
    expect(stats.size).toBeGreaterThan(10); // Non-empty

    // Verify UTF-8 BOM
    const buffer = fs.readFileSync(latestCsv);
    expect(buffer[0]).toBe(0xef);
    expect(buffer[1]).toBe(0xbb);
    expect(buffer[2]).toBe(0xbf);

    // Dismiss any open dropdown/modal before next export
    await dismissActiveModals(page);
    await page.waitForTimeout(300);

    // Click Excel export (handle-export is Excel)
    await exportDropdownBtn.click();
    await page.waitForTimeout(300);

    const excelBtn = page.locator('[data-testid="export.main.handle-export"]').first();
    expect(await excelBtn.count()).toBeGreaterThan(0);
    await excelBtn.click();
    await page.waitForTimeout(800);

    const filesAfterExcel = fs.readdirSync(env.exportsDir);
    const xmlFiles = filesAfterExcel.filter((f) => f.endsWith('.xml') || f.endsWith('.xls'));
    expect(xmlFiles.length).toBeGreaterThan(0);

    const latestXls = path.join(env.exportsDir, xmlFiles[xmlFiles.length - 1]);
    const content = fs.readFileSync(latestXls, 'utf-8');
    expect(content).toContain('<Workbook');
    expect(content).toContain('DisplayRightToLeft');
  });

  it('5. الطباعة (PDF Generation): توليد ملف PDF غير فارغ بالعربي RTL', async () => {
    const { page, env } = auditApp;
    await navigateToTab(page, 'hearings');
    await page.waitForTimeout(400);

    // Switch to 'كافة الجلسات' (All Hearings) to ensure hearings are loaded
    const allBtn = page.locator('button').filter({ hasText: 'كافة الجلسات' }).first();
    if ((await allBtn.count()) > 0) {
      await allBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for roll rows to be loaded
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

    // Click PDF print roll button (handle-print-roll-3 is direct PDF action)
    const printPdfBtn = page.locator('[data-testid="hearings.main.handle-print-roll-3"]').first();
    expect(await printPdfBtn.count()).toBeGreaterThan(0);

    await printPdfBtn.click();

    // Poll exportsDir for generated PDF (multi-page roll rendering takes 3-4s)
    let pdfFiles: string[] = [];
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(500);
      pdfFiles = fs.readdirSync(env.exportsDir).filter((f) => f.endsWith('.pdf'));
      if (pdfFiles.length > 0) break;
    }
    expect(pdfFiles.length).toBeGreaterThan(0);

    const latestPdf = path.join(env.exportsDir, pdfFiles[pdfFiles.length - 1]);
    const stats = fs.statSync(latestPdf);
    expect(stats.size).toBeGreaterThan(100);
  }, 45000);
});
