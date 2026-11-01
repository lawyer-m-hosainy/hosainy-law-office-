import path from 'path';
import fs from 'fs';
import os from 'os';
const { seedDatabase } = require('../../../scripts/seed.cjs');

export interface TestEnv {
  tempDir: string;
  dbPath: string;
  attachmentsDir: string;
  backupsDir: string;
  exportsDir: string;
  cleanup: () => void;
}

export function createTestEnvironment(options: { seed?: 'none' | 'small' | 'large' | 'empty'; seedNum?: number } = {}): TestEnv {
  const seedMode = options.seed === 'none' ? 'empty' : (options.seed || 'small');
  const prefix = `law_test_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const tempDir = path.join(os.tmpdir(), prefix);

  fs.mkdirSync(tempDir, { recursive: true });
  const attachmentsDir = path.join(tempDir, 'attachments');
  const backupsDir = path.join(tempDir, 'backups');
  const exportsDir = path.join(tempDir, 'exports');
  fs.mkdirSync(attachmentsDir, { recursive: true });
  fs.mkdirSync(backupsDir, { recursive: true });
  fs.mkdirSync(exportsDir, { recursive: true });

  const dbPath = path.join(tempDir, 'office.db');

  seedDatabase({
    size: seedMode,
    dbPath: dbPath,
    seed: options.seedNum || 123456789
  });

  const cleanup = () => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup error on Windows file locks
    }
  };

  return {
    tempDir,
    dbPath,
    attachmentsDir,
    backupsDir,
    exportsDir,
    cleanup
  };
}
