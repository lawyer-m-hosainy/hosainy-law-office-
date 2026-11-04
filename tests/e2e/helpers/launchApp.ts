import path from 'path';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { createTestEnvironment, TestEnv } from './seedTestDb';

export interface LaunchedApp {
  app: ElectronApplication;
  page: Page;
  env: TestEnv;
  externalRequests: string[];
  consoleErrors: string[];
  close: () => Promise<void>;
}

export interface LaunchOptions {
  seed?: 'none' | 'small' | 'large';
  seedNum?: number;
  blockNetwork?: boolean;
}

export async function launchTestApp(options: LaunchOptions = {}): Promise<LaunchedApp> {
  const env = createTestEnvironment({
    seed: options.seed ?? 'small',
    seedNum: options.seedNum ?? 123456789
  });

  const rootDir = path.resolve(__dirname, '../../../');
  const externalRequests: string[] = [];
  const consoleErrors: string[] = [];

  const childEnv = { ...process.env };
  delete childEnv.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    args: [rootDir],
    env: {
      ...childEnv,
      TEST_DATA_DIR: env.tempDir,
      NODE_ENV: 'test'
    }
  });

  const page = await app.firstWindow();

  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Track page errors (uncaught exceptions)
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  // Network blocking / monitoring if requested
  if (options.blockNetwork) {
    await page.route('**/*', (route) => {
      const url = route.request().url();
      // Allow local file://, devtools, data:, blob:
      if (
        url.startsWith('file:') ||
        url.startsWith('devtools:') ||
        url.startsWith('data:') ||
        url.startsWith('blob:')
      ) {
        route.continue();
      } else {
        externalRequests.push(url);
        route.abort('blockedbyclient');
      }
    });
  }

  // Wait for React app to initialize (spinner disappears and main content appears)
  await page.waitForLoadState('domcontentloaded');
  // Wait up to 30s for the app to finish loading
  await page.waitForSelector('aside', { state: 'attached', timeout: 30000 });

  const close = async () => {
    try {
      await app.close();
    } catch (e) {
      // Ignore close errors
    }
    env.cleanup();
  };

  return {
    app,
    page,
    env,
    externalRequests,
    consoleErrors,
    close
  };
}
