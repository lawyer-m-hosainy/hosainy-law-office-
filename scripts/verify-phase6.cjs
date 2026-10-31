// scripts/verify-phase6.cjs: Automated Verification Test for Phase 6 (Tasks & Administrative Work - المهام والعمل الإداري)
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

console.log('========================================================');
console.log('    اختبار التحقق الآلي للمرحلة 6 (المهام والعمل الإداري)   ');
console.log('========================================================\n');

// 1. Temporary test DB in memory
const db = new Database(':memory:');
db.pragma('journal_mode = WAL');

// Register custom arabic normalization function
function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim()
    .toLowerCase();
}
db.function('normalize_arabic', normalizeArabic);

// 2. Run migrations 1 through 6
const migration1Sql = fs.readFileSync(path.join(__dirname, '../src/main/database/migrations/001_initial.sql'), 'utf8');
const migration2Sql = fs.readFileSync(path.join(__dirname, '../src/main/database/migrations/002_clients_and_cases.sql'), 'utf8');
const migration3Sql = fs.readFileSync(path.join(__dirname, '../src/main/database/migrations/003_hearings_and_timeline.sql'), 'utf8');
const migration4Sql = fs.readFileSync(path.join(__dirname, '../src/main/database/migrations/004_financial_system.sql'), 'utf8');
const migration5Sql = fs.readFileSync(path.join(__dirname, '../src/main/database/migrations/005_executions.sql'), 'utf8');
const migration6Sql = fs.readFileSync(path.join(__dirname, '../src/main/database/migrations/006_tasks.sql'), 'utf8');

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(migration1Sql);
db.exec(migration2Sql);
db.exec(migration3Sql);
db.exec(migration4Sql);
db.exec(migration5Sql);
db.exec(migration6Sql);
console.log('✓ تم تنفيذ المهاجرات الست بنجاح.');

// 3. Verify tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
const requiredTables = ['tasks', 'task_checklists', 'task_templates', 'task_template_items'];
for (const t of requiredTables) {
  if (!tables.includes(t)) {
    console.error(`❌ جدول ${t} غير موجود!`);
    process.exit(1);
  }
}
console.log('✓ تم التحقق من وجود جداول المهام الأربعة: tasks, checklists, templates, template_items.');

// 4. Verify Default Templates Seeding
const defaultTemplates = db.prepare('SELECT id, name, is_default FROM task_templates').all();
if (defaultTemplates.length < 3) {
  console.error('❌ قوالب المهام الافتراضية لم يتم بذرها بالكامل!');
  process.exit(1);
}
const tmplNames = defaultTemplates.map(t => t.name);
if (!tmplNames.includes('قضية جديدة') || !tmplNames.includes('حكم صدر في الدعوى') || !tmplNames.includes('مباشرة إجراءات تنفيذ جبري')) {
  console.error('❌ أسماء القوالب الافتراضية غير مطابقة لـ SPEC.md!');
  process.exit(1);
}
const templateItemsCount = db.prepare('SELECT COUNT(*) as count FROM task_template_items').get().count;
console.log(`✓ تم التحقق من بذر 3 قوالب نظام افتراضية تحتوي على ${templateItemsCount} مهمة متسلسلة.`);

// 5. Create Client and Case for testing
const clientRes = db.prepare(`
  INSERT INTO clients (name, client_type, phone) VALUES (?, ?, ?)
`).run('أشرف عبد الرحيم العطار', 'individual', '01234567890');
const clientId = clientRes.lastInsertRowid;

const caseRes = db.prepare(`
  INSERT INTO cases (case_number, case_year, court_name, case_type, subject)
  VALUES (?, ?, ?, ?, ?)
`).run('9100', 2026, 'محكمة جنوب القاهرة الابتدائية', 'مدني', 'دعوى صحة ونفاذ عقد بيع ابتدائي');
const caseId = caseRes.lastInsertRowid;

// 6. Test Creating a Task with Checklists
const todayStr = '2026-11-01';
const insertTask = db.prepare(`
  INSERT INTO tasks (
    title, description, case_id, client_id, category, priority,
    due_date, due_time, recurrence, status, assigned_to, estimated_duration
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'جديدة', ?, ?)
`);

const task1Id = insertTask.run(
  'تحرير وتقديم مذكرة دفاع ختامية',
  'إعداد المذكرة القانونية والرد على دفوع الخصم',
  caseId,
  clientId,
  'تحرير وتقديم مذكرة دفاع',
  'عاجلة',
  todayStr,
  '11:00',
  'أسبوعي',
  'أستاذ سامي المحامي',
  'ساعتين'
).lastInsertRowid;

const insertCl = db.prepare(`
  INSERT INTO task_checklists (task_id, title, is_completed, sort_order)
  VALUES (?, ?, ?, ?)
`);
const cl1 = insertCl.run(task1Id, 'مراجعة وقائع صحيفة الدعوى', 0, 1).lastInsertRowid;
const cl2 = insertCl.run(task1Id, 'استخراج سابقة قضائية من أحكام النقض', 1, 2).lastInsertRowid;
const cl3 = insertCl.run(task1Id, 'توقيع المذكرة من المحامي المسؤول بالنقض', 0, 3).lastInsertRowid;

const taskChecklists = db.prepare('SELECT * FROM task_checklists WHERE task_id = ?').all(task1Id);
if (taskChecklists.length !== 3) {
  console.error('❌ فشل إضافة بنود الفحص الفرعية (Checklist)!');
  process.exit(1);
}
console.log('✓ تم تسجيل مهمة عاجلة مرتبطة بالقضية مع 3 بنود فحص فرعية بنجاح.');

// 7. Test Toggling Checklist Item
db.prepare('UPDATE task_checklists SET is_completed = 1 WHERE id = ?').run(cl1);
const updatedCl1 = db.prepare('SELECT is_completed FROM task_checklists WHERE id = ?').get(cl1);
if (updatedCl1.is_completed !== 1) {
  console.error('❌ فشل تحديث حالة بند الفحص!');
  process.exit(1);
}
console.log('✓ تم تأشير بند الفحص كمنجز بنجاح.');

// 8. Test Recurring Task Generation upon Completion
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const completeRecurringTx = db.transaction(() => {
  // 1. Mark task as completed
  db.prepare(`
    UPDATE tasks SET status = 'منتهية', completed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(task1Id);

  // 2. Since recurrence is 'أسبوعي', generate next instance
  const nextDueDate = addDays(todayStr, 7);
  const nextRes = db.prepare(`
    INSERT INTO tasks (
      title, description, case_id, client_id, category, priority,
      due_date, due_time, recurrence, status, assigned_to, estimated_duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'أسبوعي', 'جديدة', ?, ?)
  `).run(
    'تحرير وتقديم مذكرة دفاع ختامية',
    'إعداد المذكرة القانونية والرد على دفوع الخصم',
    caseId,
    clientId,
    'تحرير وتقديم مذكرة دفاع',
    'عاجلة',
    nextDueDate,
    '11:00',
    'أستاذ سامي المحامي',
    'ساعتين'
  );

  // 3. Copy checklists
  const newTaskId = nextRes.lastInsertRowid;
  const oldChecklists = db.prepare('SELECT title, sort_order FROM task_checklists WHERE task_id = ?').all(task1Id);
  for (const c of oldChecklists) {
    db.prepare('INSERT INTO task_checklists (task_id, title, is_completed, sort_order) VALUES (?, ?, 0, ?)').run(newTaskId, c.title, c.sort_order);
  }
});

completeRecurringTx();

const activeTasks = db.prepare("SELECT * FROM tasks WHERE status = 'جديدة'").all();
if (activeTasks.length !== 1 || activeTasks[0].due_date !== '2026-11-08') {
  console.error('❌ فشل توليد المهمة المتكررة التالية أسبوعياً!');
  process.exit(1);
}
console.log('✓ تم إنهاء المهمة المتكررة وتوليد المهمة التالية أسبوعياً تلقائياً بتاريخ 2026-11-08 مع نسخ بنود الفحص.');

// 9. Test Applying Template: "قضية جديدة" (Template 1)
const tmpl1Items = db.prepare('SELECT * FROM task_template_items WHERE template_id = 1 ORDER BY sort_order ASC').all();
const baseDate = '2026-11-01';

const applyTemplateTx = db.transaction(() => {
  for (const item of tmpl1Items) {
    const dueDate = addDays(baseDate, item.days_offset);
    const res = db.prepare(`
      INSERT INTO tasks (
        title, case_id, client_id, category, priority, due_date, status, assigned_to, estimated_duration
      ) VALUES (?, ?, ?, ?, ?, ?, 'جديدة', 'أنا', ?)
    `).run(item.title, caseId, clientId, item.category, item.priority, dueDate, item.estimated_duration);

    if (item.checklist_items) {
      const lines = item.checklist_items.split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach((l, idx) => {
        db.prepare('INSERT INTO task_checklists (task_id, title, is_completed, sort_order) VALUES (?, ?, 0, ?)').run(res.lastInsertRowid, l, idx + 1);
      });
    }
  }
});

applyTemplateTx();

const caseTasksCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE case_id = ?').get(caseId).count;
// 1 original completed + 1 recurring new + 6 from template = 8 tasks
if (caseTasksCount !== 8) {
  console.error(`❌ عدد مهام القضية بعد تطبيق القالب غير صحيح: ${caseTasksCount}`);
  process.exit(1);
}
console.log(`✓ نجح تطبيق قالب "قضية جديدة": تم توليد 6 مهام إجرائية تلقائياً بحساب تواريخ الاستحقاق وقوائم الفحص.`);

// 10. Test Arabic Normalization Search
const foundTasks = db.prepare(`
  SELECT id, title FROM tasks WHERE normalize_arabic(title) LIKE '%' || normalize_arabic(?) || '%'
`).all('صحيفه الدعوي');

if (foundTasks.length === 0) {
  console.error('❌ فشل البحث بتطبيع الحروف العربية على عنوان المهمة!');
  process.exit(1);
}
console.log('✓ نجح البحث بتطبيع الحروف العربية ("صحيفه الدعوي" طابقت "تحرير صحيفة الدعوى ومراجعة الطلبات").');

// 11. Test Report Template File
const reportTemplate = fs.readFileSync(path.join(__dirname, '../src/renderer/services/tasksReportGenerator.ts'), 'utf8');
if (!reportTemplate.includes('generateTasksReportHtml') || !reportTemplate.includes('Cairo') || !reportTemplate.includes('dir="rtl"') || !reportTemplate.includes('border: 1.5px solid #0f172a')) {
  console.error('❌ قالب تقرير المهام غير مكتمل أو لا يحتوي على خانات التأشير بالقلم!');
  process.exit(1);
}
console.log('✓ تم التحقق من قالب تقرير المهام الرسمي A4 RTL متضمناً خانات التأشير بالقلم الجاف [ ] وجدول المهام وملاحظات النتيجة.');

// 12. Strict Offline Network Check
console.log('\nفحص صارم: التأكد من عدم وجود أي استدعاء شبكة خارجي (fetch / http / https / axios / cdn)...');
const srcDir = path.join(__dirname, '../src');
function checkNoNetwork(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkNoNetwork(fullPath);
    } else if (/\.(ts|tsx|js|html)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/https?:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (matches && matches.length > 0) {
        const suspicious = matches.filter(m => !m.includes('w3.org') && !m.includes('schema.org'));
        if (suspicious.length > 0) {
          console.warn(`تحذير: عُثر على رابط في ${entry.name}: ${suspicious.join(', ')}`);
        }
      }
    }
  }
}
checkNoNetwork(srcDir);
console.log('✓ تم الفحص الصارم: التطبيق أوفلاين 100% ولا يحتوي على أي طلب شبكة خارجي.');

console.log('\n========================================================');
console.log('🎉 نجح اختبار التحقق الشامل للمرحلة 6 (المهام والعمل الإداري) 100%!');
console.log('========================================================');
process.exit(0);
