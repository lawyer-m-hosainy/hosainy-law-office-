import { spawn } from 'child_process';
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let electronProcess = null;

async function start() {
  // 1. Build main and preload first
  console.log('Building main & preload...');
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/main/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(rootDir, 'dist/main/index.cjs'),
    external: ['electron', 'better-sqlite3'],
    sourcemap: true,
  });

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/preload/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(rootDir, 'dist/preload/index.cjs'),
    external: ['electron'],
    sourcemap: true,
  });

  // 2. Start Vite dev server
  console.log('Starting Vite dev server...');
  const viteProcess = spawn('npx', ['vite'], {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  // 3. Wait for Vite server to be ready
  console.log('Waiting for Vite server on http://localhost:5173 ...');
  try {
    await waitOn({
      resources: ['http-get://127.0.0.1:5173'],
      timeout: 30000,
    });
  } catch (e) {
    console.error('Vite dev server failed to start within timeout:', e);
    viteProcess.kill();
    process.exit(1);
  }

  // 4. Start Electron
  console.log('Launching Electron...');
  electronProcess = spawn('npx', ['electron', '.'], {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173'
    }
  });

  electronProcess.on('close', (code) => {
    viteProcess.kill();
    process.exit(code || 0);
  });

  process.on('SIGINT', () => {
    if (electronProcess) electronProcess.kill();
    viteProcess.kill();
    process.exit(0);
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
