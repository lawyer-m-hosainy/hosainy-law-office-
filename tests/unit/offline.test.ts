import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Offline & Privacy Verification Tests (التحقق من الأوفلاين والخصوصية التامة)', () => {
  const srcDir = path.resolve(__dirname, '../../src');

  function scanFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        scanFiles(full, fileList);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.html')) {
        fileList.push(full);
      }
    }
    return fileList;
  }

  it('لا يحتوي الكود المصدري على أي روابط خارجية لـ CDN أو خدمات تتبع سحابية', () => {
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

  it('يتأكد من تضمين الخطوط المحلية (Cairo / Tajawal) في الحزم المحلية فقط', () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(pkg.dependencies['@fontsource/cairo']).toBeDefined();
    expect(pkg.dependencies['@fontsource/tajawal']).toBeDefined();
  });

  it('فحص آلي صارم: لا توجد أي استدعاءات شبكة خارجية (fetch, axios, http, xhr, websocket) في الكود المصدري', () => {
    const allFiles = scanFiles(srcDir);
    // نفحص استدعاءات الشبكة الفعلية (مع استثناء تعامل البروتوكول المحلي local-file المسجل في Electron)
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
        // تجاهل التعليقات
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

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

  it('فحص ملف index.html: خلو تام من أي وسوم script أو link لروابط خارجية وتطبيق سياسة أمان صارمة CSP', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // لا توجد أي روابط خارجية http أو https في وسوم السكربت أو الروابط
    expect(indexContent).not.toMatch(/<script[^>]+src=['"]https?:\/\//i);
    expect(indexContent).not.toMatch(/<link[^>]+href=['"]https?:\/\//i);

    // التحقق من وجود CSP محلي صارم
    expect(indexContent).toContain("Content-Security-Policy");
    expect(indexContent).toContain("default-src 'self'");
  });

  it('فحص الاعتماديات في package.json: خلو تام من أي مكتبات تتبع أو ذكاء اصطناعي أو شبكات خارجية', () => {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    const forbiddenPackages = [
      'axios',
      'node-fetch',
      'got',
      'request',
      'superagent',
      'socket.io',
      'socket.io-client',
      'openai',
      '@google/genai',
      '@google/generative-ai',
      'langchain',
      'posthog',
      'mixpanel',
      '@sentry/node',
      '@sentry/react',
      '@sentry/electron',
    ];

    const detectedForbidden = forbiddenPackages.filter((p) => p in allDeps);
    expect(detectedForbidden).toEqual([]);
  });
});
