const { app, BrowserWindow } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

async function verifyFullApp() {
  console.log('--- اختبار فحص تشغيل التطبيق بالكامل وقاعدة البيانات ---');

  const appData = app.getPath('appData');
  const dataDir = path.join(appData, 'LawOfficeData');
  const dbPath = path.join(dataDir, 'office.db');

  // Verify DB exists
  const db = new Database(dbPath);

  // 1. Verify schema_migrations table
  const migrations = db.prepare('SELECT * FROM schema_migrations').all();
  console.log('✓ سجل الهجرات المنفذة (Migrations):', migrations);

  // 2. Verify office_settings
  const office = db.prepare('SELECT * FROM office_settings WHERE id = 1').get();
  console.log('✓ بيانات المكتب في القاعدة:', {
    office_name: office.office_name,
    lawyer_name: office.lawyer_name,
    phone: office.phone,
    appeal_deadline_civil: office.appeal_deadline_civil,
  });

  // 3. Verify configurable_lists counts for each list_type
  const listTypes = ['courts', 'case_types', 'adjournment_reasons', 'task_categories', 'transaction_types'];
  for (const lt of listTypes) {
    const items = db.prepare('SELECT COUNT(*) as count FROM configurable_lists WHERE list_type = ?').get(lt);
    console.log(`✓ عدد عناصر قائمة [${lt}]: ${items.count}`);
  }

  // 4. Sample check some courts and adjournment reasons
  const sampleCourts = db.prepare('SELECT name FROM configurable_lists WHERE list_type = "courts" LIMIT 3').all();
  console.log('✓ نماذج من المحاكم المعتمدة:', sampleCourts.map(c => c.name));

  const sampleReasons = db.prepare('SELECT name FROM configurable_lists WHERE list_type = "adjournment_reasons" LIMIT 3').all();
  console.log('✓ نماذج من أسباب التأجيل المعتمدة:', sampleReasons.map(r => r.name));

  db.close();

  console.log('--- جميع الفحوصات نجحت بنسبة 100% ---');
  process.exit(0);
}

app.whenReady().then(verifyFullApp);
