import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { launchAuditApp, AuditApp } from '../helpers/auditLauncher';
import { navigateToTab, dismissActiveModals } from '../helpers/elementCrawler';

describe('Contract Tests: Case Details 7 Tabs (عقود تبويبات صفحة القضية المركزية)', () => {
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

  it('1. فتح صفحة القضية وعرض البيانات الأساسية (Basic Info Tab)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'case');
    await page.waitForTimeout(500);

    // Verify CaseDetailsPage elements exist
    const backBtn = page.locator('[data-testid="case.main.on-back"], [data-testid="case.main.on-back-2"]').first();
    expect(await backBtn.count()).toBeGreaterThan(0);

    // Verify Print Case Sheet button
    const printBtn = page.locator('[data-testid="case.main.handle-print-case-sheet"]').first();
    expect(await printBtn.count()).toBeGreaterThan(0);

    // Verify Edit Case modal opens
    const editBtn = page.locator('[data-testid="case.main.handle-open-edit-modal"]').first();
    if ((await editBtn.count()) > 0) {
      await editBtn.click();
      await page.waitForTimeout(300);

      // Verify edit modal is open
      const editSubmit = page.locator('[data-testid="case.main.button-14"]').first();
      expect(await editSubmit.count()).toBeGreaterThan(0);

      // Dismiss edit modal
      await dismissActiveModals(page);
    }
  });

  it('2. تبويب الجلسات والتأجيلات (Hearings Tab)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'case.hearings');
    await page.waitForTimeout(400);

    // Verify hearings elements or timeline cards exist
    const hearingsSection = page.locator('text=/الجلسات|تأجيل|الرول/');
    expect(await hearingsSection.count()).toBeGreaterThan(0);
  });

  it('3. تبويب المنظومة المالية للقضية (Finance Tab)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'case.finance');
    await page.waitForTimeout(400);

    // Verify financial summaries (الأتعاب، المدفوع، المتبقي)
    const financeSummary = page.locator('text=/الأتعاب|المدفوع|المتبقي|الرصيد/');
    expect(await financeSummary.count()).toBeGreaterThan(0);
  });

  it('4. تبويب التنفيذات القضائية (Executions Tab)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'case.executions');
    await page.waitForTimeout(400);

    const execHeader = page.locator('text=/ملفات التنفيذ|السند التنفيذي|إجراء/');
    expect(await execHeader.count()).toBeGreaterThan(0);
  });

  it('5. تبويب المستندات والمرفقات (Documents Tab)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'case.documents');
    await page.waitForTimeout(400);

    const docBtn = page.locator('[data-testid="case.documents.tab.set-is-attach-modal-open"]').first();
    expect(await docBtn.count()).toBeGreaterThan(0);
  });

  it('6. تبويب المهام المرتبطة (Tasks Tab)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'case.tasks');
    await page.waitForTimeout(400);

    const tasksHeader = page.locator('text=/مهام القضية|قوالب|إضافة مهمة/');
    expect(await tasksHeader.count()).toBeGreaterThan(0);
  });

  it('7. تبويب السجل الزمني التراكمي (Timeline Tab)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'case.timeline');
    await page.waitForTimeout(400);

    const timelineContainer = page.locator('text=/السجل الزمني|قيد الدعوى|أحداث القضية/');
    expect(await timelineContainer.count()).toBeGreaterThan(0);
  });

  it('8. تبويب الإعلانات والمحضرين (Announcements Tab)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'case.announcements');
    await page.waitForTimeout(400);

    const annHeader = page.locator('text=/إعلانات القضية|قلم المحضرين|محضر/');
    expect(await annHeader.count()).toBeGreaterThan(0);
  });
});
