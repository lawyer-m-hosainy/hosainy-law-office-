import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('Clean Installation & Migration Bootstrap Tests (اختبارات التثبيت النظيف والتهيئة)', () => {
  const tempInstallDb = path.resolve(__dirname, '../../tests/data/clean_install.db');

  it('يقوم بتثبيت المخطط النظيف وتهيئة الإعدادات الافتراضية بنجاح من الصفر', () => {
    if (fs.existsSync(tempInstallDb)) {
      try { fs.unlinkSync(tempInstallDb); } catch (e) {}
    }

    const db = new Database(tempInstallDb);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const migrationsDir = path.resolve(__dirname, '../../src/main/database/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      expect(() => db.exec(sql)).not.toThrow();
    }

    // التحقق من الإعدادات الافتراضية
    const settings = db.prepare('SELECT * FROM office_settings WHERE id = 1').get() as any;
    expect(settings).toBeDefined();
    expect(settings.office_name).toBeDefined();

    // التحقق من إعدادات الأمان
    const sec = db.prepare('SELECT * FROM app_security WHERE id = 1').get() as any;
    expect(sec).toBeDefined();
    expect(sec.is_password_enabled).toBe(0);

    db.close();
    try { fs.unlinkSync(tempInstallDb); } catch (e) {}
  });

  it('التحقق من حزم البناء للإنتاج (Production Build Artifacts) وملفات الـ dist المترجمة', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const mainBundle = path.join(rootDir, 'dist/main/index.cjs');
    const preloadBundle = path.join(rootDir, 'dist/preload/index.cjs');
    const rendererHtml = path.join(rootDir, 'dist/renderer/index.html');
    const assetsDir = path.join(rootDir, 'dist/renderer/assets');

    expect(fs.existsSync(mainBundle)).toBe(true);
    expect(fs.existsSync(preloadBundle)).toBe(true);
    expect(fs.existsSync(rendererHtml)).toBe(true);
    expect(fs.existsSync(assetsDir)).toBe(true);

    // التحقق من تضمين خطوط Cairo المحلية في أصول التوزيع
    const assetFiles = fs.readdirSync(assetsDir);
    const fontFiles = assetFiles.filter(f => f.includes('cairo') && (f.endsWith('.woff') || f.endsWith('.woff2')));
    expect(fontFiles.length).toBeGreaterThan(0);
  });

  it('التحقق من إعدادات بناء ملف التثبيت electron-builder في package.json', () => {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.build).toBeDefined();
    expect(pkg.build.appId).toBe('com.lawoffice.app');
    expect(pkg.build.win.target[0].target).toBe('nsis');
    expect(pkg.build.win.target[0].arch).toContain('x64');
    expect(pkg.build.asar).toBe(true);
    // التحقق من فك حزمة better-sqlite3 من داخل asar لدعم الـ native bindings
    expect(pkg.build.asarUnpack).toContain('**/node_modules/better-sqlite3/**');
  });

  it('التحقق من أن ملف توزيع الواجهة المترجم (dist/renderer/index.html) لا يحتوي على أي روابط خارجية', () => {
    const rendererHtml = path.resolve(__dirname, '../../dist/renderer/index.html');
    if (fs.existsSync(rendererHtml)) {
      const content = fs.readFileSync(rendererHtml, 'utf-8');
      expect(content).not.toMatch(/<script[^>]+src=['"]https?:\/\//i);
      expect(content).not.toMatch(/<link[^>]+href=['"]https?:\/\//i);
      expect(content).toContain("default-src 'self'");
    }
  });

  it('التحقق من توليد ملف التثبيت النهائي (Setup.exe) بنجاح وبحجم متكامل', () => {
    const releaseDir = path.resolve(__dirname, '../../release');
    expect(fs.existsSync(releaseDir)).toBe(true);

    const files = fs.readdirSync(releaseDir);
    const installerFile = files.find(f => f.endsWith('.exe') && f.includes('Setup'));
    expect(installerFile).toBeDefined();

    const stat = fs.statSync(path.join(releaseDir, installerFile!));
    // التأكد من أن الحجم أكبر من 50 ميجابايت (يحتوي المحرك والمكتبات المترجمة بالكامل)
    expect(stat.size).toBeGreaterThan(50 * 1024 * 1024);
  });

  it('التحقق من المجلد المثبت المستخرج (win-unpacked) واحتوائه على better_sqlite3.node مفكوكاً أوفلاين', () => {
    const unpackedDir = path.resolve(__dirname, '../../release/win-unpacked');
    expect(fs.existsSync(unpackedDir)).toBe(true);

    const unpackedNodeModule = path.join(
      unpackedDir,
      'resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
    );
    expect(fs.existsSync(unpackedNodeModule)).toBe(true);

    const asarFile = path.join(unpackedDir, 'resources/app.asar');
    expect(fs.existsSync(asarFile)).toBe(true);
  });
});
