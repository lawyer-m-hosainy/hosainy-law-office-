import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import { launchAuditApp, AuditApp } from '../helpers/auditLauncher';
import { navigateToTab } from '../helpers/elementCrawler';

describe('Contract Tests: Settings, Lists, Backup & Lock (عقود الإعدادات والقوائم والنسخ والقفل)', () => {
  let auditApp: AuditApp;

  beforeAll(async () => {
    auditApp = await launchAuditApp({ seed: 'small', seedNum: 123456789 });
  }, 90000);

  afterAll(async () => {
    if (auditApp) {
      await auditApp.close();
    }
  });

  it('1. حفظ بيانات المكتب الأساسية (Office Settings Form)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'settings');
    await page.waitForTimeout(500);

    const officeNameInput = page.locator('[data-testid="settings.main.set-office-form"]').first();
    expect(await officeNameInput.count()).toBeGreaterThan(0);
    await officeNameInput.fill('مكتب المستشار القانوني الحديث');

    const saveBtn = page.locator('[data-testid="settings.main.save"]').first();
    await saveBtn.click();
    await page.waitForTimeout(600);

    // Verify sidebar updates with new office name
    const sidebarTitle = await page.locator('aside h1').textContent();
    expect(sidebarTitle).toContain('مكتب المستشار القانوني الحديث');
  });

  it('2. إضافة وتعديل القوائم القابلة للتعديل (Configurable Lists)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'settings.lists');
    await page.waitForTimeout(500);

    const newItemInput = page.locator('[data-testid="settings.main.set-new-item-name"]').first();
    expect(await newItemInput.count()).toBeGreaterThan(0);

    const uniqueItemName = `محكمة تجريبية ${Date.now().toString().slice(-4)}`;
    await newItemInput.fill(uniqueItemName);

    const addBtn = page.locator('[data-testid="settings.main.add"]').first();
    await addBtn.click();
    await page.waitForTimeout(600);

    // Verify newly added item appears in the list table
    const pageText = await page.textContent('body');
    expect(pageText).toContain(uniqueItemName);
  });

  it('3. إنشاء نسخة احتياطية محلية (Local Backup Creation)', async () => {
    const { page } = auditApp;
    await navigateToTab(page, 'settings');
    await page.waitForTimeout(400);

    // Create backup via IPC
    const res = await page.evaluate(async () => {
      return await (window as any).electronAPI.createBackup({ encrypt: false });
    });

    expect(res.success).toBe(true);
    expect(res.backupPath).toBeDefined();

    // Verify backup file physically exists on disk
    expect(fs.existsSync(res.backupPath)).toBe(true);
    const stat = fs.statSync(res.backupPath);
    expect(stat.size).toBeGreaterThan(100);
  });

  it('4. قفل البرنامج والتحقق من شاشة القفل وإلغاء القفل (Lock Screen)', async () => {
    const { page } = auditApp;

    // Set a password and lock the app
    await page.evaluate(async () => {
      await (window as any).electronAPI.setPassword('secret123');
      await (window as any).electronAPI.setAppLocked(true);
    });

    await page.waitForTimeout(600);

    // Verify lock modal is displayed
    const passwordInput = page.locator('[data-testid="lock.main.set-password"]').first();
    expect(await passwordInput.count()).toBeGreaterThan(0);

    // Enter correct password to unlock
    await passwordInput.fill('secret123');
    const unlockBtn = page.locator('[data-testid="lock.main.button-2"]').first();
    await unlockBtn.click();
    await page.waitForTimeout(600);

    // Verify app unlocked and lock screen gone
    const isLockedModalOpen = (await page.locator('[data-testid="lock.main.set-password"]').count()) > 0;
    expect(isLockedModalOpen).toBe(false);

    // Remove password to keep clean state
    await page.evaluate(async () => {
      await (window as any).electronAPI.removePassword('secret123');
      await (window as any).electronAPI.setAppLocked(false);
    });
  });
});
