import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function build() {
  try {
    // Build main process
    await esbuild.build({
      entryPoints: [path.join(rootDir, 'src/main/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      outfile: path.join(rootDir, 'dist/main/index.cjs'),
      external: ['electron', 'better-sqlite3'],
      sourcemap: true,
      logLevel: 'info',
    });

    // Build preload script
    await esbuild.build({
      entryPoints: [path.join(rootDir, 'src/preload/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      outfile: path.join(rootDir, 'dist/preload/index.cjs'),
      external: ['electron'],
      sourcemap: true,
      logLevel: 'info',
    });

    console.log('✓ Main and Preload built successfully');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
