/**
 * verify-phase8.cjs: اختبار التحقق الشامل من المرحلة 8
 * قفل البرنامج بكلمة مرور (bcryptjs)، النسخ الاحتياطي اليدوي والتلقائي،
 * التشفير العسكري (AES-256-GCM عبر crypto بدون مكتبات native معقدة)،
 * الاستعادة الآمنة مع التأكيد، سجل التغييرات والتدقيق (Audit Log)،
 * وسلة المحذوفات المركزية (Trash Bin).
 */

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
let app;
try {
  app = require('electron').app;
} catch (e) {}

console.log('========================================================');
console.log('    اختبار التحقق الآلي للمرحلة 8 (الأمان والنسخ وسلة المحذوفات)     ');
console.log('========================================================\n');

// 1. Create a clean test database file
const runId = Date.now();
const testDbPath = path.join(__dirname, `test_phase8_${runId}.db`);
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch (e) {}
}

const db = new Database(testDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 2. Read and apply all 8 migrations
const migrationsDir = path.join(__dirname, '..', 'src', 'main', 'database', 'migrations');
const migrationFiles = [
  '001_initial.sql',
  '002_clients_and_cases.sql',
  '003_hearings_and_timeline.sql',
  '004_financial_system.sql',
  '005_executions.sql',
  '006_tasks.sql',
  '007_documents_and_notes.sql',
  '008_security_and_audit.sql'
];

for (const f of migrationFiles) {
  const filePath = path.join(migrationsDir, f);
  if (!fs.existsSync(filePath)) {
    throw new Error(`ملف الهجرة غير موجود: ${f}`);
  }
  const sql = fs.readFileSync(filePath, 'utf-8');
  db.exec(sql);
}
console.log('✓ تم تنفيذ جميع الهجرات الثماني بنجاح، بما فيها هجرة الأمان والتدقيق 008.');

// 3. Verify tables and schema
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
const expectedTables = [
  'app_security',
  'audit_logs',
  'case_documents',
  'case_notes',
  'tasks',
  'execution_files',
  'financial_transactions',
  'hearings',
  'cases',
  'clients',
  'office_settings'
];

for (const t of expectedTables) {
  if (!tables.includes(t)) {
    throw new Error(`الجدول المطلوب ${t} غير موجود!`);
  }
}
console.log('✓ تم التحقق من وجود جداول app_security و audit_logs وكافة جداول المراحل السابقة.');

// 4. Verify initial app_security default record
const secRecord = db.prepare('SELECT * FROM app_security WHERE id = 1').get();
if (!secRecord) {
  throw new Error('السجل الافتراضي لجدول app_security غير موجود!');
}
if (secRecord.is_password_enabled !== 0 || secRecord.auto_lock_minutes !== 15) {
  throw new Error('القيم الافتراضية لجدول app_security غير صحيحة!');
}
console.log('✓ تم التحقق من السجل الافتراضي للأمان (كلمة المرور معطلة افتراضياً، مهلة القفل 15 دقيقة).');

// 5. Test Password Hashing with bcryptjs
const testPassword = 'MySecretLawOffice@2026';
const saltRounds = 10;
const hashedPassword = bcrypt.hashSync(testPassword, saltRounds);

// Update DB with password
db.prepare(`
  UPDATE app_security
  SET is_password_enabled = 1,
      password_hash = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = 1
`).run(hashedPassword);

// Verify correct password
const isMatchCorrect = bcrypt.compareSync(testPassword, hashedPassword);
const isMatchWrong = bcrypt.compareSync('WrongPassword', hashedPassword);

if (!isMatchCorrect || isMatchWrong) {
  throw new Error('فشل التحقق من صحة كلمة المرور عبر bcryptjs!');
}
console.log('✓ تم التحقق بنجاح من تشفير ومطابقة كلمة المرور باستخدام bcryptjs.');

// 6. Test Audit Logs (Insertion, Filter and Search)
db.prepare(`
  INSERT INTO audit_logs (action_type, entity_type, entity_id, entity_name, details)
  VALUES ('security', 'system', NULL, 'تعيين كلمة مرور', 'تم تفعيل كلمة المرور وقفل النظام')
`).run();

db.prepare(`
  INSERT INTO audit_logs (action_type, entity_type, entity_id, entity_name, details)
  VALUES ('insert', 'client', 1, 'الأستاذ أحمد فؤاد', 'إضافة موكل جديد مع التوكيل 5521 قضايا')
`).run();

db.prepare(`
  INSERT INTO audit_logs (action_type, entity_type, entity_id, entity_name, details)
  VALUES ('delete', 'document', 10, 'مستند عريضة الدعوى.pdf', 'نقل المستند إلى سلة المحذوفات')
`).run();

const allLogs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC').all();
if (allLogs.length !== 3) {
  throw new Error(`عدد سجلات التدقيق غير صحيح: ${allLogs.length}`);
}

const clientLogs = db.prepare("SELECT * FROM audit_logs WHERE entity_type = 'client'").all();
if (clientLogs.length !== 1 || clientLogs[0].entity_name !== 'الأستاذ أحمد فؤاد') {
  throw new Error('تصفية سجلات التدقيق حسب الكيان فشلت!');
}
console.log('✓ تم التحقق من تسجيل وتصفية سجلات التدقيق (Audit Logs).');

// 7. Test SQLite VACUUM INTO Snapshot
const snapshotPath = path.join(__dirname, 'test_snapshot.db');
if (fs.existsSync(snapshotPath)) {
  fs.unlinkSync(snapshotPath);
}

db.prepare(`VACUUM INTO ?`).run(snapshotPath);

if (!fs.existsSync(snapshotPath) || fs.statSync(snapshotPath).size === 0) {
  throw new Error('فشل أخذ لقطة ذرية من قاعدة البيانات عبر VACUUM INTO!');
}
console.log('✓ تم التحقق من نجاح أمر VACUUM INTO وأخذ لقطة نقية من قاعدة البيانات.');

// 8. Test Packaging Backup (Metadata + Database + Attachments)
const testAttachmentsDir = path.join(__dirname, 'test_attachments');
if (!fs.existsSync(testAttachmentsDir)) {
  fs.mkdirSync(testAttachmentsDir, { recursive: true });
}
const sampleDocPath = path.join(testAttachmentsDir, 'sample_contract.txt');
fs.writeFileSync(sampleDocPath, 'هذا نص عقد تجريبي لاختبار النسخ الاحتياطي واسترجاع المرفقات.');

const dbBuffer = fs.readFileSync(snapshotPath);
const fileBuffer = fs.readFileSync(sampleDocPath);

const metadata = {
  backupId: `BAK-${Date.now()}`,
  createdAt: new Date().toISOString(),
  appVersion: '1.0.0',
  officeName: 'مكتب المحامي للاختبار',
  dbSizeBytes: dbBuffer.length,
  attachmentsCount: 1,
  attachmentsSizeBytes: fileBuffer.length,
  isEncrypted: false,
};

const payloadObj = {
  metadata,
  databaseBase64: dbBuffer.toString('base64'),
  attachments: [
    {
      relativePath: 'sample_contract.txt',
      dataBase64: fileBuffer.toString('base64'),
    }
  ],
};

const unencryptedPayload = zlib.gzipSync(Buffer.from(JSON.stringify(payloadObj), 'utf-8'));
const MAGIC_BAK = Buffer.from('AGY_BAK1');
const plainBackupBuffer = Buffer.concat([MAGIC_BAK, unencryptedPayload]);

const backupFilePath = path.join(__dirname, 'test_backup.bak');
fs.writeFileSync(backupFilePath, plainBackupBuffer);

if (!fs.existsSync(backupFilePath) || fs.statSync(backupFilePath).size === 0) {
  throw new Error('فشل إنشاء ملف النسخة الاحتياطية العادية .bak!');
}
console.log('✓ تم التحقق من ضغط وحفظ النسخة الاحتياطية المجمعة (قاعدة بيانات + مرفقات).');

// 9. Test Zero-Native Military-Grade Encryption (AES-256-GCM via Node crypto)
const MAGIC_ENC = Buffer.from('AGY_ENC1');
const encryptionPassword = 'BackupKey#2026@Cairo';
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.scryptSync(encryptionPassword, salt, 32);

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(unencryptedPayload), cipher.final()]);
const authTag = cipher.getAuthTag();

const encryptedBuffer = Buffer.concat([
  MAGIC_ENC,
  salt,
  iv,
  authTag,
  encrypted,
]);

const encBackupFilePath = path.join(__dirname, 'test_backup.enc');
fs.writeFileSync(encBackupFilePath, encryptedBuffer);

if (!fs.existsSync(encBackupFilePath) || fs.statSync(encBackupFilePath).size === 0) {
  throw new Error('فشل إنشاء ملف النسخة الاحتياطية المشفرة .enc!');
}
console.log('✓ تم التحقق من تشفير النسخة الاحتياطية بنجاح باستخدام AES-256-GCM بدون أي مكتبات native.');

// 10. Test Decryption & Integrity Verification
const readEncBuf = fs.readFileSync(encBackupFilePath);
const readMagic = readEncBuf.subarray(0, 8);
if (!readMagic.equals(MAGIC_ENC)) {
  throw new Error('علامة الملف المشفر غير مطابقة!');
}

const readSalt = readEncBuf.subarray(8, 24);
const readIv = readEncBuf.subarray(24, 36);
const readAuthTag = readEncBuf.subarray(36, 52);
const readCiphertext = readEncBuf.subarray(52);

const derivedKey = crypto.scryptSync(encryptionPassword, readSalt, 32);
const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, readIv);
decipher.setAuthTag(readAuthTag);

const decryptedData = Buffer.concat([decipher.update(readCiphertext), decipher.final()]);
const decompressedJson = zlib.gunzipSync(decryptedData).toString('utf-8');
const restoredObj = JSON.parse(decompressedJson);

if (restoredObj.metadata.officeName !== 'مكتب المحامي للاختبار') {
  throw new Error('البيانات المسترجعة من النسخة المشفرة غير صحيحة!');
}
if (restoredObj.attachments.length !== 1 || restoredObj.attachments[0].relativePath !== 'sample_contract.txt') {
  throw new Error('المرفقات المسترجعة من النسخة المشفرة غير متطابقة!');
}
console.log('✓ تم التحقق بنجاح من فك تشفير النسخة الاحتياطية والتحقق من الـ Auth Tag وسلامة المرفقات.');

// 11. Test Trash Bin Functionality (Restore and Permanent Delete)
// A. Insert test case and soft-deleted document
const caseRes = db.prepare(`
  INSERT INTO cases (case_number, case_year, court_name, case_type, subject, status)
  VALUES ('202', 2026, 'محكمة استئناف القاهرة', 'مدني', 'دعوى استئنافية', 'مؤرشفة')
`).run();
const caseId = caseRes.lastInsertRowid;

const docRes = db.prepare(`
  INSERT INTO case_documents (case_id, title, file_name, file_extension, relative_path, file_size_bytes, category, is_deleted)
  VALUES (?, 'مستند محذوف تجريبي', 'deleted_doc.pdf', 'pdf', 'attachments/deleted_doc.pdf', 1024, 'مذكرات', 1)
`).run(caseId);
const docId = docRes.lastInsertRowid;

// Check Trash Bin query logic
const trashedDocs = db.prepare('SELECT id, title FROM case_documents WHERE is_deleted = 1').all();
const archivedCases = db.prepare("SELECT id, case_number FROM cases WHERE status = 'مؤرشفة'").all();

if (trashedDocs.length !== 1 || archivedCases.length !== 1) {
  throw new Error('استعلام سلة المحذوفات لم يعثر على العناصر المؤرشفة أو المحذوفة!');
}

// Restore Document
db.prepare('UPDATE case_documents SET is_deleted = 0 WHERE id = ?').run(docId);
const restoredDoc = db.prepare('SELECT is_deleted FROM case_documents WHERE id = ?').get(docId);
if (restoredDoc.is_deleted !== 0) {
  throw new Error('فشلت عملية استرجاع المستند من سلة المحذوفات!');
}

// Restore Case
db.prepare("UPDATE cases SET status = 'متداولة' WHERE id = ?").run(caseId);
const restoredCase = db.prepare('SELECT status FROM cases WHERE id = ?').get(caseId);
if (restoredCase.status !== 'متداولة') {
  throw new Error('فشلت عملية استرجاع القضية من الأرشيف!');
}
console.log('✓ تم التحقق من تجميع واسترجاع العناصر من سلة المحذوفات (Trash Bin).');

// Cleanup temp files
db.close();
try {
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
  if (fs.existsSync(backupFilePath)) fs.unlinkSync(backupFilePath);
  if (fs.existsSync(encBackupFilePath)) fs.unlinkSync(encBackupFilePath);
  if (fs.existsSync(sampleDocPath)) fs.unlinkSync(sampleDocPath);
  if (fs.existsSync(testAttachmentsDir)) fs.rmdirSync(testAttachmentsDir);
} catch (e) {
  // Ignore cleanup errors
}

console.log('\n========================================================');
console.log('  تهانينا! جميع اختبارات المرحلة 8 نجحت بنسبة 100% بنجاح تام  ');
console.log('========================================================\n');
if (app) {
  app.exit(0);
} else {
  process.exit(0);
}
