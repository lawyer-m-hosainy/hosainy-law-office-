import fs from 'fs';
import path from 'path';

/**
 * Creates dummy/test asset files for deterministic testing:
 * - Minimal valid PDF file
 * - Minimal valid PNG file (1x1 pixel)
 * - Dummy backup file
 */
export interface TestAssets {
  pdfPath: string;
  pngPath: string;
  backupPath: string;
  cleanup: () => void;
}

export function createTestAssets(targetDir: string): TestAssets {
  const assetsDir = path.join(targetDir, 'test-assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const pdfPath = path.join(assetsDir, 'test-document.pdf');
  const pngPath = path.join(assetsDir, 'test-logo.png');
  const backupPath = path.join(assetsDir, 'test-backup.bak');

  // Minimal valid PDF (PDF-1.4 format with 1 blank page)
  const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
211
%%EOF`;
  fs.writeFileSync(pdfPath, minimalPdf, 'utf-8');

  // Minimal valid 1x1 transparent PNG buffer
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(pngPath, minimalPng);

  // Dummy valid backup file header (AGY_BAK1)
  const backupHeader = Buffer.from('AGY_BAK1', 'utf-8');
  fs.writeFileSync(backupPath, Buffer.concat([backupHeader, Buffer.alloc(32)]));

  const cleanup = () => {
    try {
      if (fs.existsSync(assetsDir)) {
        fs.rmSync(assetsDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  };

  return {
    pdfPath,
    pngPath,
    backupPath,
    cleanup,
  };
}
