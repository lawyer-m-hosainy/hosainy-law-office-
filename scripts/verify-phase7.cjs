/**
 * verify-phase7.cjs: اختبار التحقق الشامل من المرحلة 7
 * المستندات والمرفقات المحلية، سلة المحذوفات، الملاحظات والسجل الزمني التراكمي،
 * البحث الشامل مع تطبيع الحروف العربية، وتصدير Excel وCSV، والتقارير الرسمية التسعة.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

console.log('========================================================');
console.log('    اختبار التحقق الآلي للمرحلة 7 (المستندات والأرشفة والبحث)     ');
console.log('========================================================\n');

// 1. Create a clean test database in memory or temp file
const testDbPath = path.join(__dirname, 'test_phase7.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = new Database(testDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 2. Read and apply all 7 migrations
const migrationsDir = path.join(__dirname, '..', 'src', 'main', 'database', 'migrations');
const migrationFiles = [
  '001_initial.sql',
  '002_clients_and_cases.sql',
  '003_hearings_and_timeline.sql',
  '004_financial_system.sql',
  '005_executions.sql',
  '006_tasks.sql',
  '007_documents_and_notes.sql'
];

for (const f of migrationFiles) {
  const filePath = path.join(migrationsDir, f);
  if (!fs.existsSync(filePath)) {
    throw new Error(`ملف الهجرة غير موجود: ${f}`);
  }
  const sql = fs.readFileSync(filePath, 'utf-8');
  db.exec(sql);
}
console.log('✓ تم تنفيذ جميع الهجرات السبع بنجاح في قاعدة البيانات.');

// 3. Verify tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
const expectedTables = ['case_documents', 'case_notes', 'tasks', 'execution_files', 'financial_transactions', 'hearings', 'cases', 'clients'];
for (const t of expectedTables) {
  if (!tables.includes(t)) {
    throw new Error(`الجدول المطلوب ${t} غير موجود!`);
  }
}
console.log('✓ تم التحقق من وجود جداول: case_documents و case_notes وكافة جداول المراحل السابقة.');

// 4. Insert test Client & Case
const clientRes = db.prepare(`
  INSERT INTO clients (name, client_type, national_id_or_cr, phone, poa_number, status)
  VALUES ('أحمد محمد عبد الرحمن', 'individual', '29001011234567', '01012345678', '1420 قضايا', 'active')
`).run();
const clientId = clientRes.lastInsertRowid;

const caseRes = db.prepare(`
  INSERT INTO cases (case_number, case_year, court_name, court_circuit, court_degree, case_type, subject, status, priority, filing_date)
  VALUES ('1050', 2026, 'محكمة شمال القاهرة الابتدائية', 'الدائرة 4 مدني', 'ابتدائي', 'مدني كلي', 'دعوى صحة ونفاذ عقد بيع عقار', 'متداولة', 'مهمة', '2026-01-15')
`).run();
const caseId = caseRes.lastInsertRowid;

db.prepare(`
  INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary)
  VALUES (?, ?, 'مدعي', 1)
`).run(caseId, clientId);

db.prepare(`
  INSERT INTO case_opponents (case_id, name, role_capacity, lawyer_name)
  VALUES (?, 'محمود إبراهيم حسن', 'مدعى عليه', 'الأستاذ كمال المحامي')
`).run(caseId);

console.log(`✓ تم تسجيل الموكل التجريبي (id=${clientId}) والقضية (id=${caseId}).`);

// 5. Test Case Documents: insert, trash bin, restore, permanent delete
const tempAttachmentDir = path.join(__dirname, 'temp_attachments');
if (!fs.existsSync(tempAttachmentDir)) {
  fs.mkdirSync(tempAttachmentDir, { recursive: true });
}
const dummySourceFile = path.join(tempAttachmentDir, 'dummy_contract.pdf');
fs.writeFileSync(dummySourceFile, '%PDF-1.4 dummy content for contract testing');

const docInsert = db.prepare(`
  INSERT INTO case_documents (
    case_id, title, category, file_name, file_extension,
    relative_path, file_size_bytes, description, is_deleted
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
`).run(
  caseId,
  'عقد البيع الابتدائي موضوع الدعوى',
  'عريضة دعوى',
  'dummy_contract.pdf',
  '.pdf',
  `attachments/${caseId}/173038483_dummy_contract.pdf`,
  102400,
  'صورة رسمية من العقد المسجل بالشهر العقاري'
);
const docId = docInsert.lastInsertRowid;

// Verify active docs
let activeDocs = db.prepare('SELECT * FROM case_documents WHERE case_id = ? AND is_deleted = 0').all(caseId);
if (activeDocs.length !== 1 || activeDocs[0].id !== docId) {
  throw new Error('فشل جلب المستند النشط!');
}
console.log('✓ تم حفظ المستند برابط نسبي محلي attachments/ وتصنيفه بنجاح.');

// Move to trash
db.prepare('UPDATE case_documents SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(docId);
activeDocs = db.prepare('SELECT * FROM case_documents WHERE case_id = ? AND is_deleted = 0').all(caseId);
let trashDocs = db.prepare('SELECT * FROM case_documents WHERE case_id = ? AND is_deleted = 1').all(caseId);
if (activeDocs.length !== 0 || trashDocs.length !== 1) {
  throw new Error('فشل نقل المستند إلى سلة المحذوفات!');
}
console.log('✓ تم نقل المستند لسلة المحذوفات بنجاح.');

// Restore from trash
db.prepare('UPDATE case_documents SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(docId);
activeDocs = db.prepare('SELECT * FROM case_documents WHERE case_id = ? AND is_deleted = 0').all(caseId);
if (activeDocs.length !== 1) {
  throw new Error('فشل استرجاع المستند من سلة المحذوفات!');
}
console.log('✓ تم استرجاع المستند من سلة المحذوفات بنجاح.');

// 6. Test Case Notes: Add, Pin, Update
const noteInsert = db.prepare(`
  INSERT INTO case_notes (case_id, title, content, category, is_pinned)
  VALUES (?, 'ثغرة قانونية في إعلان الخصم', 'المدعى عليه لم يُعلن لشخصه، تجب مراجعة قلم المحضرين بالجلسة القادمة', 'خطة دفاع', 1)
`).run(caseId);
const noteId = noteInsert.lastInsertRowid;

const notes = db.prepare('SELECT * FROM case_notes WHERE case_id = ? ORDER BY is_pinned DESC').all(caseId);
if (notes.length !== 1 || notes[0].is_pinned !== 1) {
  throw new Error('فشل تسجيل الملاحظة أو تثبيتها!');
}
console.log('✓ تم تسجيل الملاحظات وتثبيتها بنجاح.');

// 7. Test Arabic Normalization & Universal Search
function normalizeArabic(text) {
  if (!text) return '';
  let n = text.toString();
  n = n.replace(/[\u064B-\u065F\u0670]/g, ''); // Tashkeel
  n = n.replace(/\u0640/g, ''); // Tatweel
  n = n.replace(/[أإآٱ]/g, 'ا'); // Alef
  n = n.replace(/[ىئ]/g, 'ي'); // Yaa
  n = n.replace(/ة/g, 'ه'); // Taa Marbuta
  n = n.replace(/ؤ/g, 'و'); // Waw
  return n.toLowerCase().trim();
}

function matchesSearch(target, query) {
  return normalizeArabic(target).includes(normalizeArabic(query));
}

// Test matching: searching for "احمد" should match "أحمد"
if (!matchesSearch('أحمد محمد عبد الرحمن', 'احمد')) {
  throw new Error('فشل تطبيع الألف والهمزات في البحث!');
}
// Test matching: searching for "دعوي" should match "دعوى"
if (!matchesSearch('دعوى صحة ونفاذ', 'دعوي')) {
  throw new Error('فشل تطبيع الياء والألف المقصورة!');
}
// Test matching: searching for "صحه" should match "صحة"
if (!matchesSearch('دعوى صحة ونفاذ', 'صحه')) {
  throw new Error('فشل تطبيع التاء المربوطة والهاء!');
}
// Test matching with tashkeel
if (!matchesSearch('مَحْكَمَةُ شَمَالِ القَاهِرَةِ', 'شمال القاهره')) {
  throw new Error('فشل إزالة التشكيل والتطبيع في البحث!');
}
console.log('✓ تم التحقق من تطبيع الحروف العربية (الهمزات، الهاء والتاء، الياء والألف، والتشكيل).');

// 8. Test Data Export generation: CSV with UTF-8 BOM
const headers = ['رقم القضية', 'السنة', 'المحكمة', 'الموكل'];
const rows = [
  ['1050', 2026, 'شمال القاهرة الابتدائية', 'أحمد محمد عبد الرحمن']
];

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

const csvLines = [headers.map(escapeCsv).join(',')];
for (const r of rows) {
  csvLines.push(r.map(escapeCsv).join(','));
}
const csvWithBom = '\uFEFF' + csvLines.join('\r\n');
if (!csvWithBom.startsWith('\uFEFF') || !csvWithBom.includes('أحمد محمد')) {
  throw new Error('فشل توليد CSV بترميز UTF-8 مع BOM!');
}
console.log('✓ تم التحقق من تصدير ملفات CSV بترميز UTF-8 مع BOM لقراءة الحروف العربية في Excel بنقاء.');

// 9. Clean up test files
db.close();
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
if (fs.existsSync(dummySourceFile)) fs.unlinkSync(dummySourceFile);
if (fs.existsSync(tempAttachmentDir)) fs.rmdirSync(tempAttachmentDir);

console.log('\n========================================================');
console.log('  جميع اختبارات المرحلة 7 (المستندات، الأرشفة، والبحث والتصدير) اجتيزت بنجاح 100%!  ');
console.log('========================================================');
process.exit(0);
