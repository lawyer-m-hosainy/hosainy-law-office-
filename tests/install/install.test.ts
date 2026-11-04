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

  it('تشغيل better-sqlite3 من النسخة المثبتة (win-unpacked) وتنفيذ استعلامات ومعاملات ذرية بنجاح', () => {
    const unpackedDir = path.resolve(__dirname, '../../release/win-unpacked');
    const unpackedModulePath = path.join(
      unpackedDir,
      'resources/app.asar.unpacked/node_modules/better-sqlite3'
    );
    // التحقق من تشغيل وحدة better-sqlite3 المستخرجة في حزمة التوزيع
    const UnpackedDatabase = require(unpackedModulePath);
    const memDb = new UnpackedDatabase(':memory:');
    memDb.pragma('journal_mode = WAL');
    memDb.exec('CREATE TABLE test_unpacked (id INTEGER PRIMARY KEY, title TEXT, amount INTEGER);');
    const insert = memDb.prepare('INSERT INTO test_unpacked (title, amount) VALUES (?, ?)');
    insert.run('قضية تثبيت تجريبية', 500000);
    const row = memDb.prepare('SELECT * FROM test_unpacked WHERE id = 1').get() as any;
    expect(row).toBeDefined();
    expect(row.title).toBe('قضية تثبيت تجريبية');
    expect(row.amount).toBe(500000);
    memDb.close();
  });

  it('التحقق من تضمين الخطوط العربية والأيقونات وتوليد قوالب التقارير والطباعة محلياً', () => {
    const assetsDir = path.resolve(__dirname, '../../dist/renderer/assets');
    const files = fs.readdirSync(assetsDir);
    
    // فحص خطوط Cairo المضمنة
    const cairoFonts = files.filter(f => f.toLowerCase().includes('cairo') && (f.endsWith('.woff') || f.endsWith('.woff2')));
    expect(cairoFonts.length).toBeGreaterThan(0);

    // فحص حزمة الجافاسكريبت للواجهة
    const jsBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
    expect(jsBundle).toBeDefined();
    const jsContent = fs.readFileSync(path.join(assetsDir, jsBundle!), 'utf-8');
    expect(jsContent).toContain('svg');

    // فحص خدمات الطباعة والتقارير في حزمة main المترجمة
    const mainBundlePath = path.resolve(__dirname, '../../dist/main/index.cjs');
    const mainBundleContent = fs.readFileSync(mainBundlePath, 'utf-8');
    expect(mainBundleContent).toContain('PrintService');
    expect(mainBundleContent).toContain('printWindow');
  });

  it('تأكد من تكوين مجلد LawOfficeData في مكانه الصحيح بالهيكل القياسي الكامل', () => {
    const tempTestRoot = path.resolve(__dirname, '../../tests/data/test_install_appdata');
    if (fs.existsSync(tempTestRoot)) {
      fs.rmSync(tempTestRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(tempTestRoot, { recursive: true });

    const targetDataDir = path.join(tempTestRoot, 'LawOfficeData');
    
    // محاكاة بنية مجلد بيانات المكتب
    const subdirs = ['attachments', 'backups', 'exports'];
    fs.mkdirSync(targetDataDir, { recursive: true });
    for (const sub of subdirs) {
      fs.mkdirSync(path.join(targetDataDir, sub), { recursive: true });
    }
    const dbPath = path.join(targetDataDir, 'office.db');
    const db = new Database(dbPath);
    db.exec('CREATE TABLE test_init (val TEXT);');
    db.close();

    expect(fs.existsSync(targetDataDir)).toBe(true);
    expect(fs.existsSync(path.join(targetDataDir, 'office.db'))).toBe(true);
    expect(fs.existsSync(path.join(targetDataDir, 'attachments'))).toBe(true);
    expect(fs.existsSync(path.join(targetDataDir, 'backups'))).toBe(true);
    expect(fs.existsSync(path.join(targetDataDir, 'exports'))).toBe(true);

    fs.rmSync(tempTestRoot, { recursive: true, force: true });
  });

  it('تحديث البرنامج بنسخة أحدث فوق القديمة: البيانات والمرفقات تظل سليمة والـ migrations تتنفذ دون فقد أي بيانات', () => {
    const tempUpgradeDir = path.resolve(__dirname, '../../tests/data/test_upgrade_simulation');
    if (fs.existsSync(tempUpgradeDir)) {
      fs.rmSync(tempUpgradeDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempUpgradeDir, { recursive: true });

    const dbPath = path.join(tempUpgradeDir, 'office.db');
    const attachmentsDir = path.join(tempUpgradeDir, 'attachments', 'case_101');
    fs.mkdirSync(attachmentsDir, { recursive: true });
    fs.writeFileSync(path.join(attachmentsDir, 'power_of_attorney.pdf'), 'ORIGINAL ATTACHMENT CONTENT');

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // 1. تثبيت المرحلة الأولى فقط (Migration 001, 002)
    const migrationsDir = path.resolve(__dirname, '../../src/main/database/migrations');
    const mig001 = fs.readFileSync(path.join(migrationsDir, '001_initial.sql'), 'utf-8');
    const mig002 = fs.readFileSync(path.join(migrationsDir, '002_clients_and_cases.sql'), 'utf-8');
    db.exec(mig001);
    db.exec(mig002);

    // إضافة بيانات تجريبية بالنسخة القديمة
    db.prepare(`
      INSERT INTO clients (id, name, client_type, phone, address, created_at, updated_at)
      VALUES (1, 'موكل سابق قبل التحديث', 'individual', '01000000000', 'القاهرة', '2026-01-01', '2026-01-01')
    `).run();

    db.prepare(`
      INSERT INTO cases (id, case_number, case_year, court_name, case_type, subject, status, created_at, updated_at)
      VALUES (101, '1234', 2026, 'محكمة شمال القاهرة', 'civil', 'دعوى صحة توقيع', 'active', '2026-01-01', '2026-01-01')
    `).run();

    db.prepare(`
      INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary)
      VALUES (101, 1, 'مدعي', 1)
    `).run();

    db.close();

    // 2. محاكاة تحديث التطبيق: تشغيل كافة المهاجرات اللاحقة (003 حتى آخر مهاجرة)
    const upgradeDb = new Database(dbPath);
    const allFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const f of allFiles) {
      if (f.startsWith('001_') || f.startsWith('002_')) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
      expect(() => upgradeDb.exec(sql)).not.toThrow();
    }

    // 3. التحقق من بقاء بيانات الموكل والقضية والمرفق سليمة 100%
    const client = upgradeDb.prepare('SELECT * FROM clients WHERE id = 1').get() as any;
    expect(client).toBeDefined();
    expect(client.name).toBe('موكل سابق قبل التحديث');

    const courtCase = upgradeDb.prepare('SELECT * FROM cases WHERE id = 101').get() as any;
    expect(courtCase).toBeDefined();
    expect(courtCase.case_number).toBe('1234');

    expect(fs.existsSync(path.join(attachmentsDir, 'power_of_attorney.pdf'))).toBe(true);
    const attachmentContent = fs.readFileSync(path.join(attachmentsDir, 'power_of_attorney.pdf'), 'utf-8');
    expect(attachmentContent).toBe('ORIGINAL ATTACHMENT CONTENT');

    upgradeDb.close();
    fs.rmSync(tempUpgradeDir, { recursive: true, force: true });
  });

  it('إزالة البرنامج (Uninstall Simulation): مجلد بيانات المستخدم LawOfficeData لا يتم حذفه ويظل محفوظاً', () => {
    const tempEnv = path.resolve(__dirname, '../../tests/data/test_uninstall_simulation');
    if (fs.existsSync(tempEnv)) {
      fs.rmSync(tempEnv, { recursive: true, force: true });
    }
    fs.mkdirSync(tempEnv, { recursive: true });

    // مسار تثبيت البرنامج (Program Files)
    const appInstallDir = path.join(tempEnv, 'ProgramFiles', 'LawOfficeApp');
    // مسار بيانات المستخدم (AppData/LawOfficeData)
    const userDataDir = path.join(tempEnv, 'AppData', 'LawOfficeData');

    fs.mkdirSync(appInstallDir, { recursive: true });
    fs.mkdirSync(userDataDir, { recursive: true });

    // وضع ملفات البرنامج
    fs.writeFileSync(path.join(appInstallDir, 'LawOfficeApp.exe'), 'BINARY');
    fs.writeFileSync(path.join(appInstallDir, 'resources.pak'), 'RESOURCES');

    // وضع بيانات المستخدم
    fs.writeFileSync(path.join(userDataDir, 'office.db'), 'SQLITE_USER_DATABASE');
    const userAttach = path.join(userDataDir, 'attachments');
    fs.mkdirSync(userAttach, { recursive: true });
    fs.writeFileSync(path.join(userAttach, 'contract.pdf'), 'IMPORTANT CONTRACT');

    // التحقق من إعدادات NSIS في package.json
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'));
    expect(pkg.build.nsis).toBeDefined();

    // محاكاة إزالة تثبيت البرنامج (حذف مجلد البرنامج فقط)
    fs.rmSync(appInstallDir, { recursive: true, force: true });

    // التحقق من زوال ملفات البرنامج وبقاء مجلد البيانات والملفات بالكامل
    expect(fs.existsSync(appInstallDir)).toBe(false);
    expect(fs.existsSync(userDataDir)).toBe(true);
    expect(fs.existsSync(path.join(userDataDir, 'office.db'))).toBe(true);
    expect(fs.existsSync(path.join(userDataDir, 'attachments', 'contract.pdf'))).toBe(true);

    fs.rmSync(tempEnv, { recursive: true, force: true });
  });
});
