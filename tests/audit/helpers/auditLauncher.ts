import path from 'path';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { createTestEnvironment, TestEnv } from '../../e2e/helpers/seedTestDb';
import { createTestAssets, TestAssets } from './testAssets';

export interface AuditApp {
  app: ElectronApplication;
  page: Page;
  env: TestEnv;
  assets: TestAssets;
  externalRequests: string[];
  consoleErrors: string[];
  pageErrors: string[];
  getIpcCalls: () => Promise<Array<{ method: string; args: any[]; timestamp: number; success: boolean; error?: string }>>;
  getDomMutations: () => Promise<number>;
  getAlerts: () => Promise<string[]>;
  resetMetrics: () => Promise<void>;
  close: () => Promise<void>;
}

export interface LaunchAuditOptions {
  seed?: 'none' | 'small' | 'large';
  seedNum?: number;
}

export async function launchAuditApp(options: LaunchAuditOptions = {}): Promise<AuditApp> {
  const env = createTestEnvironment({
    seed: options.seed ?? 'small',
    seedNum: options.seedNum ?? 123456789,
  });

  const assets = createTestAssets(env.tempDir);

  const rootDir = path.resolve(__dirname, '../../../');
  const externalRequests: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const childEnv = { ...process.env };
  delete childEnv.ELECTRON_RUN_AS_NODE;

  console.log('[launchAuditApp] Launching electron with tempDir:', env.tempDir);
  const app = await electron.launch({
    args: [rootDir],
    env: {
      ...childEnv,
      TEST_DATA_DIR: env.tempDir,
      NODE_ENV: 'test',
      TEST_ASSET_PDF: assets.pdfPath,
      TEST_ASSET_PNG: assets.pngPath,
      TEST_ASSET_BACKUP: assets.backupPath,
    },
  });

  app.process().stdout?.on('data', (d) => console.log('[electron:stdout]', d.toString()));
  app.process().stderr?.on('data', (d) => console.error('[electron:stderr]', d.toString()));

  console.log('[launchAuditApp] Electron launched. Waiting for firstWindow...');
  const page = await app.firstWindow({ timeout: 60000 });
  console.log('[launchAuditApp] Got firstWindow. Setting up handlers...');

  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('DevTools') && !text.includes('downloadable font')) {
        consoleErrors.push(text);
      }
    }
  });

  // Track page errors
  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  // Network blocking / monitoring (Assert 0 external network requests)
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (
      url.startsWith('file:') ||
      url.startsWith('devtools:') ||
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('local-file:') ||
      url.startsWith('about:')
    ) {
      route.continue();
    } else {
      externalRequests.push(url);
      route.abort('blockedbyclient');
    }
  });

  // Wait for React to load
  await page.waitForLoadState('domcontentloaded');
  console.log('[launchAuditApp] Waiting for aside...');
  await page.waitForSelector('aside', { state: 'attached', timeout: 60000 });
  console.log('[launchAuditApp] Aside attached. Instrumenting window...');

  // Instrument window inside renderer for IPC tracking & DOM mutations
  await page.evaluate(() => {
    (window as any).__auditIpcCalls = [];
    (window as any).__auditDomMutations = 0;
    (window as any).__auditAlerts = [];

    // Setup MutationObserver
    const observer = new MutationObserver(() => {
      (window as any).__auditDomMutations++;
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Wrap electronAPI
    const api = (window as any).electronAPI;
    if (api) {
      for (const key of Object.keys(api)) {
        if (typeof api[key] === 'function') {
          const orig = api[key];
          api[key] = async function (...args: any[]) {
            const callRecord = {
              method: key,
              args,
              timestamp: Date.now(),
              success: true,
              error: null as any,
            };
            (window as any).__auditIpcCalls.push(callRecord);
            try {
              const res = await orig.apply(this, args);
              if (res && res.success === false) {
                callRecord.success = false;
                callRecord.error = res.error || 'IPC returned success: false';
              }
              return res;
            } catch (e: any) {
              callRecord.success = false;
              callRecord.error = e?.message || String(e);
              throw e;
            }
          };
        }
      }
    }

    // Intercept alert & confirm
    window.alert = (msg: string) => {
      (window as any).__auditAlerts.push(msg);
    };
    window.confirm = (msg: string) => {
      (window as any).__auditAlerts.push(msg);
      return true; // auto-confirm to let actions proceed
    };
  });
  console.log('[launchAuditApp] App initialization complete.');

  const getIpcCalls = async () => {
    return await page.evaluate(() => (window as any).__auditIpcCalls || []);
  };

  const getDomMutations = async () => {
    return await page.evaluate(() => (window as any).__auditDomMutations || 0);
  };

  const getAlerts = async () => {
    return await page.evaluate(() => (window as any).__auditAlerts || []);
  };

  const resetMetrics = async () => {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    externalRequests.length = 0;
    await page.evaluate(() => {
      (window as any).__auditIpcCalls = [];
      (window as any).__auditDomMutations = 0;
      (window as any).__auditAlerts = [];
    });
  };

  const close = async () => {
    try {
      await app.close();
    } catch {
      // ignore
    }
    assets.cleanup();
    env.cleanup();
  };

  return {
    app,
    page,
    env,
    assets,
    externalRequests,
    consoleErrors,
    pageErrors,
    getIpcCalls,
    getDomMutations,
    getAlerts,
    resetMetrics,
    close,
  };
}
