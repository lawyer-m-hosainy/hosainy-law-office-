import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { launchTestApp } from '../e2e/helpers/launchApp';

describe('Enhanced Offline & Privacy Verification Tests (فحص الأوفلاين الشامل: ثابت وتشغيلي)', () => {
  const srcDir = path.resolve(__dirname, '../../src');

  function scanFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        scanFiles(full, fileList);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.html') || file.endsWith('.css')) {
        fileList.push(full);
      }
    }
    return fileList;
  }

  // 1. Static Scan: CDN and Tracking
  it('فحص ثابت: لا يحتوي الكود المصدري على أي روابط خارجية لـ CDN أو خدمات تتبع سحابية', () => {
    const allFiles = scanFiles(srcDir);
    const forbiddenPatterns = [
      'cdn.jsdelivr.net',
      'unpkg.com',
      'cdnjs.cloudflare.com',
      'fonts.googleapis.com',
      'google-analytics.com',
      'telemetry',
      'sentry.io',
      'mixpanel',
      'amplitude',
      'posthog',
      'segment.io',
    ];

    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        for (const pattern of forbiddenPatterns) {
          if (line.toLowerCase().includes(pattern.toLowerCase())) {
            violations.push({
              file: path.relative(srcDir, filePath),
              line: idx + 1,
              match: pattern,
            });
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  // 2. Static Scan: Local Fonts bundled
  it('فحص ثابت: يتأكد من تضمين الخطوط المحلية (Cairo / Tajawal) محلياً بدون أي استدعاء خارجي', () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(pkg.dependencies['@fontsource/cairo']).toBeDefined();
    expect(pkg.dependencies['@fontsource/tajawal']).toBeDefined();
  });

  // 3. Static Scan: Network APIs check
  it('فحص ثابت: خلو تام من دوال الشبكة (fetch, axios, XMLHttpRequest, WebSocket, sendBeacon)', () => {
    const allFiles = scanFiles(srcDir);
    const networkKeywords = [
      /fetch\s*\(\s*['"`]https?:\/\//i,
      /axios\s*\.\s*(get|post|put|delete|patch|request)\s*\(/i,
      /http\s*\.\s*(get|request)\s*\(/i,
      /https\s*\.\s*(get|request)\s*\(/i,
      /new\s+XMLHttpRequest\s*\(/i,
      /new\s+WebSocket\s*\(/i,
      /navigator\s*\.\s*sendBeacon\s*\(/i,
      /io\s*\(\s*['"`]https?:\/\//i,
    ];

    const networkViolations: { file: string; line: number; code: string }[] = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

        for (const regex of networkKeywords) {
          if (regex.test(line)) {
            networkViolations.push({
              file: path.relative(srcDir, filePath),
              line: idx + 1,
              code: trimmed,
            });
          }
        }
      });
    }

    expect(networkViolations).toEqual([]);
  });

  // 4. Static Scan: Comprehensive URL scan with strict allowlist
  it('فحص ثابت شامل: مسح كامل لكافة روابط http:// و https:// في الكود واستبعاد التراخيص فقط', () => {
    const allFiles = scanFiles(srcDir);
    const allowedUrls = [
      'http://www.w3.org/2000/svg',
      'http://www.w3.org/1999/xlink',
      'http://www.w3.org/TR/REC-html40',
      'https://www.w3.org/2000/svg',
      'https://www.w3.org/1999/xlink',
      'https://opensource.org/licenses/MIT',
      'https://github.com',
    ];

    const urlRegex = /https?:\/\/[^\s'")`]+/gi;
    const violations: { file: string; line: number; url: string }[] = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

        let match;
        while ((match = urlRegex.exec(line)) !== null) {
          const foundUrl = match[0];
          const isAllowed = allowedUrls.some(allowed => foundUrl.startsWith(allowed));
          if (!isAllowed) {
            violations.push({
              file: path.relative(srcDir, filePath),
              line: idx + 1,
              url: foundUrl,
            });
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  // 5. Static Scan: index.html CSP check
  it('فحص ملف index.html: خلو تام من أي وسوم script أو link خارجية وتطبيق سياسة أمان صارمة CSP', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    expect(indexContent).not.toMatch(/<script[^>]+src=['"]https?:\/\//i);
    expect(indexContent).not.toMatch(/<link[^>]+href=['"]https?:\/\//i);

    expect(indexContent).toContain('Content-Security-Policy');
    expect(indexContent).toContain("default-src 'self'");
  });

  // 6. Operational Runtime Test: Network blocked, visit all screens, assert zero external requests & zero console errors
  it('فحص تشغيلي (Runtime Scan): تشغيل البرنامج مع حجب الشبكة وزيارة كافة الشاشات والتأكد من صفر طلبات وصفر أخطاء', async () => {
    const appInstance = await launchTestApp({
      seed: 'small',
      seedNum: 888,
      blockNetwork: true
    });

    const { page, externalRequests, consoleErrors, close } = appInstance;

    try {
      const tabsToVisit = [
        'dashboard',
        'clients',
        'cases',
        'hearings',
        'calendar',
        'finance',
        'reports',
        'executions',
        'tasks',
        'settings',
        'trash'
      ];

      for (const tabId of tabsToVisit) {
        const navBtn = page.locator('aside button, aside a').filter({
          hasText: new RegExp(tabId === 'dashboard' ? 'الرئيسية' :
                              tabId === 'clients' ? 'الموكلين' :
                              tabId === 'cases' ? 'القضايا' :
                              tabId === 'hearings' ? 'الجلسات' :
                              tabId === 'calendar' ? 'التقويم' :
                              tabId === 'finance' ? 'المالية' :
                              tabId === 'reports' ? 'التقارير' :
                              tabId === 'executions' ? 'التنفيذ' :
                              tabId === 'tasks' ? 'المهام' :
                              tabId === 'settings' ? 'الإعدادات' : 'المحذوفات')
        }).first();

        if (await navBtn.count() > 0) {
          await navBtn.click();
          await page.waitForTimeout(300);
        }
      }

      expect(externalRequests).toEqual([]);

      const criticalErrors = consoleErrors.filter(err =>
        !err.includes('DevTools') &&
        !err.includes('warning') &&
        !err.includes('downloadable font')
      );
      expect(criticalErrors).toEqual([]);
    } finally {
      await close();
    }
  }, 45000);
});
