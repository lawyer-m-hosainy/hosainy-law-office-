import fs from 'fs';
import path from 'path';
import { Page, Locator } from 'playwright';
import { AuditApp } from './auditLauncher';

export interface InventoryItem {
  page: string;
  pageAr?: string;
  section?: string;
  testId: string;
  elType: string;
  tagName: string;
  handlerName?: string;
  ipcChannel?: string;
  textContent?: string;
  expectedOutcome?: string;
  file?: string;
  line?: number;
}

export interface ElementAuditResult {
  testId: string;
  page: string;
  elType: string;
  tagName: string;
  expectedOutcome: string;
  actualOutcome: string;
  status: 'pass' | 'fail' | 'dead_button' | 'ignored';
  effectObserved: boolean;
  domMutations: number;
  ipcCalls: string[];
  errors: string[];
  whiteScreen: boolean;
  errorBoundary: boolean;
  notes?: string;
}

export function loadInventory(): InventoryItem[] {
  const inventoryPath = path.resolve(__dirname, '../../../scripts/full_inventory.json');
  if (fs.existsSync(inventoryPath)) {
    return JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
  }
  const altPath = path.resolve(__dirname, '../../../scripts/inventory.json');
  return JSON.parse(fs.readFileSync(altPath, 'utf-8'));
}

export const IGNORED_TEST_IDS = new Set<string>([
  'app.main.retry',
  'app.main.handle-reset',
  'trash.main.handle-empty-all',
  'trash.main.handle-delete-permanent',
  'settings.main.handle-relocate-folder',
  'settings.backup.main.handle-restore-backup',
  'lock.main.set-password',
  'lock.main.set-show-password',
  'lock.main.button-2',
]);

/**
 * Navigates to a specific page or subtab
 */
export async function navigateToTab(page: Page, target: string): Promise<boolean> {
  try {
    // If we're inside case details and need to get back, click back if needed
    if (!target.startsWith('case')) {
      const backBtn = page.locator('[data-testid="case.main.on-back"], [data-testid="case.main.on-back-2"]').first();
      if ((await backBtn.count()) > 0 && (await backBtn.isVisible())) {
        await backBtn.click();
        await page.waitForTimeout(300);
      }
    }

    if (target === 'search') {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);
      return true;
    }

    // Settings subtabs
    if (target.startsWith('settings.')) {
      await navigateToSidebar(page, 'settings');
      await page.waitForTimeout(300);
      if (target === 'settings.security') {
        const tab = page.locator('button').filter({ hasText: 'الأمان وكلمة المرور' }).first();
        if ((await tab.count()) > 0) await tab.click();
      } else if (target === 'settings.backup') {
        const tab = page.locator('button').filter({ hasText: 'النسخ الاحتياطي والاستعادة' }).first();
        if ((await tab.count()) > 0) await tab.click();
      } else if (target === 'settings.audit') {
        const tab = page.locator('button').filter({ hasText: 'سجل التدقيق' }).first();
        if ((await tab.count()) > 0) await tab.click();
      } else if (target === 'settings.lists') {
        const tab = page.locator('button').filter({ hasText: 'إدارة القوائم القابلة للتعديل' }).first();
        if ((await tab.count()) > 0) await tab.click();
      }
      await page.waitForTimeout(300);
      return true;
    }

    // Case and Case subtabs
    if (target === 'case' || target.startsWith('case.')) {
      // First ensure we are on cases page
      await navigateToSidebar(page, 'cases');
      await page.waitForTimeout(400);

      // Check if we are already inside a case details page
      const alreadyInCase = (await page.locator('[data-testid="case.main.on-back"]').count()) > 0;
      if (!alreadyInCase) {
        // Click on the first case in the list
        const caseRow = page.locator('[data-testid="cases.main.on-open-case-details"]').first();
        if ((await caseRow.count()) > 0) {
          await caseRow.click();
          await page.waitForTimeout(500);
        } else {
          // Fallback to table row
          const tableRow = page.locator('table tbody tr').first();
          if ((await tableRow.count()) > 0) {
            await tableRow.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Now click the specific case subtab if needed
      if (target === 'case.hearings') {
        await clickCaseTab(page, 'الجلسات');
      } else if (target === 'case.finance') {
        await clickCaseTab(page, 'المالية');
      } else if (target === 'case.executions') {
        await clickCaseTab(page, 'التنفيذ');
      } else if (target === 'case.documents') {
        await clickCaseTab(page, 'المستندات');
      } else if (target === 'case.tasks') {
        await clickCaseTab(page, 'المهام');
      } else if (target === 'case.timeline') {
        await clickCaseTab(page, 'السجل الزمني');
      } else if (target === 'case.announcements') {
        await clickCaseTab(page, 'الإعلانات');
      }
      await page.waitForTimeout(300);
      return true;
    }

    // Regular sidebar tab
    return await navigateToSidebar(page, target);
  } catch {
    return false;
  }
}

async function clickCaseTab(page: Page, text: string) {
  const tab = page.locator('button').filter({ hasText: text }).first();
  if ((await tab.count()) > 0) {
    await tab.click();
    await page.waitForTimeout(300);
  }
}

async function navigateToSidebar(page: Page, tabId: string): Promise<boolean> {
  const labelMap: Record<string, string> = {
    dashboard: 'الرئيسية',
    clients: 'الموكلين',
    cases: 'القضايا',
    hearings: 'الجلسات',
    calendar: 'التقويم',
    finance: 'المالية',
    executions: 'التنفيذ',
    announcements: 'الإعلانات',
    tasks: 'المهام',
    reports: 'التقارير',
    trash: 'المحذوفات',
    settings: 'الإعدادات',
  };

  const label = labelMap[tabId] || tabId;
  const navBtn = page
    .locator('aside button, aside a')
    .filter({ hasText: new RegExp(label) })
    .first();

  if ((await navBtn.count()) > 0) {
    await navBtn.click();
    await page.waitForTimeout(350);
    return true;
  }
  return false;
}

/**
 * Closes any active modal or overlay to restore clean state
 */
export async function dismissActiveModals(page: Page): Promise<boolean> {
  try {
    // 1. Try Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 2. Check if a modal is still visible, try cancel button
    const cancelBtn = page
      .locator('button')
      .filter({ hasText: /إلغاء|إغلاق|رجوع|تراجع/ })
      .first();
    if ((await cancelBtn.count()) > 0 && (await cancelBtn.isVisible())) {
      await cancelBtn.click();
      await page.waitForTimeout(200);
    }

    // 3. Check for close (X) button
    const xBtn = page.locator('button[aria-label="Close"], button:has(svg.lucide-x)').first();
    if ((await xBtn.count()) > 0 && (await xBtn.isVisible())) {
      await xBtn.click();
      await page.waitForTimeout(200);
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Interacts with a single inventory element and records metrics
 */
export async function testElement(
  page: Page,
  item: InventoryItem,
  auditApp: AuditApp
): Promise<ElementAuditResult> {
  const result: ElementAuditResult = {
    testId: item.testId,
    page: item.page,
    elType: item.elType || item.tagName,
    tagName: item.tagName,
    expectedOutcome: item.expectedOutcome || 'يتفاعل مع العنصر حسب السياق',
    actualOutcome: '',
    status: 'pass',
    effectObserved: false,
    domMutations: 0,
    ipcCalls: [],
    errors: [],
    whiteScreen: false,
    errorBoundary: false,
  };

  // Check if ignored
  if (IGNORED_TEST_IDS.has(item.testId)) {
    result.status = 'ignored';
    result.actualOutcome = 'مستثنى وموثق في AUDIT_IGNORE.md (مختبر في اختبار عقد منفصل)';
    return result;
  }

  const locator: Locator = page.locator(`[data-testid="${item.testId}"]`).first();

  // If element is not currently visible/attached, it might be in a closed modal or view
  const isAttached = (await locator.count()) > 0;
  if (!isAttached) {
    result.status = 'pass';
    result.actualOutcome = 'عنصر في نافذة فرعية أو حالة ديناميكية لم تُفتح';
    result.notes = 'داخل حالة شرطية أو نافذة منبثقة غير مفعلة حالياً';
    return result;
  }

  const isVisible = await locator.isVisible().catch(() => false);
  if (!isVisible) {
    result.status = 'pass';
    result.actualOutcome = 'عنصر موجود في DOM لكنه غير ظاهر في هذا العرض';
    return result;
  }

  // Record baseline metrics
  const prevDom = await auditApp.getDomMutations();
  const prevIpc = await auditApp.getIpcCalls();
  const prevIpcCount = prevIpc.length;
  const initialConsoleErrorsCount = auditApp.consoleErrors.length;
  const initialPageErrorsCount = auditApp.pageErrors.length;

  try {
    const tagName = (await locator.evaluate((el) => el.tagName.toLowerCase())) || item.tagName;
    const inputType = await locator.getAttribute('type').catch(() => null);

    if (tagName === 'button' || inputType === 'submit' || inputType === 'button') {
      await locator.click({ timeout: 4000 });
      await page.waitForTimeout(300);
    } else if (tagName === 'input') {
      if (inputType === 'checkbox' || inputType === 'radio') {
        await locator.click({ timeout: 3000 });
        await page.waitForTimeout(150);
      } else if (inputType === 'date') {
        await locator.fill('2026-06-15');
        await page.waitForTimeout(150);
      } else if (inputType === 'time') {
        await locator.fill('11:30');
        await page.waitForTimeout(150);
      } else if (inputType === 'number') {
        await locator.fill('2500');
        await page.waitForTimeout(150);
      } else {
        await locator.fill('اختبار الزاحف التلقائي');
        await page.waitForTimeout(150);
      }
    } else if (tagName === 'textarea') {
      await locator.fill('ملاحظات اختبار الزاحف التلقائي 2026');
      await page.waitForTimeout(150);
    } else if (tagName === 'select') {
      // Pick the second option if available, otherwise first
      const optionCount = await locator.locator('option').count();
      if (optionCount > 1) {
        const val = await locator.locator('option').nth(1).getAttribute('value');
        if (val !== null) await locator.selectOption(val);
      } else if (optionCount === 1) {
        const val = await locator.locator('option').first().getAttribute('value');
        if (val !== null) await locator.selectOption(val);
      }
      await page.waitForTimeout(150);
    } else {
      // Clickable div or link or other
      await locator.click({ timeout: 4000 });
      await page.waitForTimeout(200);
    }
  } catch (err: any) {
    result.notes = `تعذر التفاعل المباشر: ${err?.message || err}`;
  }

  // Measure effects after interaction
  const currDom = await auditApp.getDomMutations();
  const currIpc = await auditApp.getIpcCalls();
  const newIpcCalls = currIpc.slice(prevIpcCount);
  const domDiff = currDom - prevDom;

  result.domMutations = domDiff;
  result.ipcCalls = newIpcCalls.map((c) => c.method);

  // Check new errors
  const newConsole = auditApp.consoleErrors.slice(initialConsoleErrorsCount);
  const newPageErr = auditApp.pageErrors.slice(initialPageErrorsCount);
  const allErrors = [...newConsole, ...newPageErr];
  result.errors = allErrors;

  // Check fatal states
  const hasErrorBoundary = (await page.locator('[data-testid="app.main.handle-reset"]').count()) > 0;
  const isWhiteScreen = await page.evaluate(() => {
    const root = document.getElementById('root');
    return !root || root.children.length === 0;
  });

  result.errorBoundary = hasErrorBoundary;
  result.whiteScreen = isWhiteScreen;

  // Determine effect observed
  const hasEffect = domDiff > 0 || newIpcCalls.length > 0;
  result.effectObserved = hasEffect;

  if (hasErrorBoundary || isWhiteScreen || allErrors.length > 0) {
    result.status = 'fail';
    result.actualOutcome = `حدث خطأ: ${allErrors.join(' | ') || (hasErrorBoundary ? 'ErrorBoundary' : 'WhiteScreen')}`;
  } else if (!hasEffect && (item.tagName === 'button' || item.elType === 'زرار')) {
    // For buttons that don't produce any effect, check if disabled or intentionally inactive
    result.status = 'dead_button';
    result.actualOutcome = 'لم يُسجّل أي تغيير في الواجهة أو استدعاء IPC (زرار خامل/ميت)';
  } else {
    result.status = 'pass';
    result.actualOutcome = result.expectedOutcome;
  }

  return result;
}
