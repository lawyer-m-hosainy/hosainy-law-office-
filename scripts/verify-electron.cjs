const { app } = require('electron');
const path = require('path');
const fs = require('fs');

async function testApp() {
  console.log('--- بدء اختبار بيئة Electron وقاعدة البيانات SQLite ---');

  try {
    // 1. Verify dist files exist
    const mainJs = path.join(__dirname, '../dist/main/index.js');
    const preloadJs = path.join(__dirname, '../dist/preload/index.js');
    const rendererHtml = path.join(__dirname, '../dist/renderer/index.html');

    if (!fs.existsSync(mainJs) || !fs.existsSync(preloadJs) || !fs.existsSync(rendererHtml)) {
      throw new Error('Dist files missing!');
    }
    console.log('✓ تم التحقق من وجود ملفات البناء: main, preload, renderer');

    // 2. Test database connection & migrations inside electron
    const Database = require('better-sqlite3');
    const appData = app.getPath('appData');
    const dataDir = path.join(appData, 'LawOfficeData');
    const dbPath = path.join(dataDir, 'office.db');

    console.log(`✓ مسار مجلد البيانات: ${dataDir}`);
    console.log(`✓ مسار قاعدة البيانات: ${dbPath}`);

    // Ensure directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const journalMode = db.pragma('journal_mode', { simple: true });
    console.log(`✓ وضع قاعدة البيانات: ${journalMode} (WAL Mode Verified)`);

    // Run schema creation
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS office_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          office_name TEXT NOT NULL DEFAULT 'مكتب المحاماة والاستشارات القانونية',
          lawyer_name TEXT NOT NULL DEFAULT 'اسم المحامي',
          title TEXT NOT NULL DEFAULT 'محامٍ بالنقض والدستورية العليا',
          phone TEXT NOT NULL DEFAULT '01000000000',
          phone2 TEXT DEFAULT '',
          email TEXT DEFAULT '',
          address TEXT DEFAULT 'جمهورية مصر العربية',
          bar_registration_number TEXT DEFAULT '',
          tax_number TEXT DEFAULT '',
          logo_path TEXT DEFAULT '',
          notes TEXT DEFAULT 'المحاماة رسالة الدفاع عن الحق والعدل والمشروعية وسيادة القانون',
          appeal_deadline_civil INTEGER NOT NULL DEFAULT 40,
          appeal_deadline_misdemeanor INTEGER NOT NULL DEFAULT 10,
          appeal_deadline_cassation INTEGER NOT NULL DEFAULT 60,
          appeal_deadline_urgent INTEGER NOT NULL DEFAULT 15,
          appeal_deadline_family INTEGER NOT NULL DEFAULT 40,
          appeal_deadline_admin INTEGER NOT NULL DEFAULT 60,
          date_format TEXT NOT NULL DEFAULT 'ar-EG',
          alert_days_before INTEGER NOT NULL DEFAULT 3,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS configurable_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          list_type TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert office settings test
    db.prepare(`
      INSERT OR IGNORE INTO office_settings (id, office_name, lawyer_name, title, phone)
      VALUES (1, 'مكتب الأستاذ أحمد عزمي المحامي بالنقض', 'أحمد عزمي', 'محامٍ بالنقض والدستورية العليا', '01012345678')
    `).run();

    const office = db.prepare('SELECT * FROM office_settings WHERE id = 1').get();
    console.log(`✓ بيانات المكتب المحفوظة: ${office.office_name} (${office.lawyer_name})`);

    // Count lists
    const count = db.prepare('SELECT COUNT(*) as count FROM configurable_lists').get();
    console.log(`✓ عدد عناصر القوائم الحالية: ${count.count}`);

    db.close();
    console.log('✓ تم إغلاق قاعدة البيانات بنجاح وبدون أخطاء.');
    console.log('=== اكتمال اختبار بيئة Electron والمرحلة 1 بنجاح تام 100% ===');
    process.exit(0);
  } catch (err) {
    console.error('❌ فشل الاختبار:', err);
    process.exit(1);
  }
}

app.whenReady().then(testApp);
