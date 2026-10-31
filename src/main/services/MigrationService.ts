import Database from 'better-sqlite3';
import {
  DEFAULT_COURTS,
  DEFAULT_CASE_TYPES,
  DEFAULT_ADJOURNMENT_REASONS,
  DEFAULT_TASK_CATEGORIES,
  DEFAULT_TRANSACTION_TYPES
} from '../../shared/constants';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial',
    sql: `
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

      CREATE INDEX IF NOT EXISTS idx_configurable_lists_type ON configurable_lists(list_type, is_active, sort_order);

      INSERT OR IGNORE INTO office_settings (
          id, office_name, lawyer_name, title, phone, phone2, email, address,
          bar_registration_number, tax_number, logo_path, notes,
          appeal_deadline_civil, appeal_deadline_misdemeanor, appeal_deadline_cassation,
          appeal_deadline_urgent, appeal_deadline_family, appeal_deadline_admin,
          date_format, alert_days_before
      ) VALUES (
          1,
          'مكتب الأستاذ / محامٍ بالنقض والدستورية العليا',
          'اسم المحامي المسؤول',
          'محامٍ بالنقض ومجلس الدولة',
          '01000000000',
          '01100000000',
          'lawyer@example.com',
          'جمهورية مصر العربية - القاهرة',
          '123456',
          '123-456-789',
          '',
          'المحاماة رسالة الدفاع عن الحق والعدل والمشروعية وسيادة القانون',
          40, 10, 60, 15, 40, 60,
          'ar-EG', 3
      );
    `
  },
  {
    version: 2,
    name: '002_clients_and_cases',
    sql: `
      CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          client_type TEXT NOT NULL DEFAULT 'individual',
          national_id_or_cr TEXT,
          phone TEXT NOT NULL,
          phone2 TEXT,
          whatsapp TEXT,
          address TEXT,
          email TEXT,
          poa_number TEXT,
          poa_type TEXT,
          poa_date TEXT,
          poa_issuing_office TEXT,
          poa_expiry_date TEXT,
          representation_type TEXT,
          represented_name TEXT,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
      CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
      CREATE INDEX IF NOT EXISTS idx_clients_poa_expiry ON clients(poa_expiry_date);

      CREATE TABLE IF NOT EXISTS cases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_number TEXT NOT NULL,
          case_year INTEGER NOT NULL,
          court_name TEXT NOT NULL,
          court_circuit TEXT,
          court_degree TEXT NOT NULL DEFAULT 'أول درجة',
          case_type TEXT NOT NULL,
          table_number TEXT,
          police_report_number TEXT,
          filing_date TEXT,
          subject TEXT NOT NULL,
          claims TEXT,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'متداولة',
          priority TEXT NOT NULL DEFAULT 'عادية',
          assigned_lawyer TEXT,
          colleague_lawyers TEXT,
          parent_case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
          is_juvenile INTEGER DEFAULT 0,
          juvenile_name TEXT,
          juvenile_age INTEGER,
          juvenile_charge TEXT,
          guardian_name TEXT,
          guardian_relation TEXT,
          probation_officer TEXT,
          care_facility TEXT,
          imposed_measures TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_cases_number_year ON cases(case_number, case_year);
      CREATE INDEX IF NOT EXISTS idx_cases_court ON cases(court_name);
      CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
      CREATE INDEX IF NOT EXISTS idx_cases_type ON cases(case_type);

      CREATE TABLE IF NOT EXISTS case_clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
          role_capacity TEXT NOT NULL DEFAULT 'مدعي',
          is_primary INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(case_id, client_id)
      );

      CREATE INDEX IF NOT EXISTS idx_case_clients_case ON case_clients(case_id);
      CREATE INDEX IF NOT EXISTS idx_case_clients_client ON case_clients(client_id);

      CREATE TABLE IF NOT EXISTS case_opponents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          role_capacity TEXT NOT NULL DEFAULT 'مدعى عليه',
          national_id TEXT,
          phone TEXT,
          address TEXT,
          lawyer_name TEXT,
          lawyer_phone TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_case_opponents_case ON case_opponents(case_id);
    `
  },
  {
    version: 3,
    name: '003_hearings_and_timeline',
    sql: `
      CREATE TABLE IF NOT EXISTS hearings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          hearing_date TEXT NOT NULL,
          hearing_time TEXT,
          court_name TEXT NOT NULL,
          court_circuit TEXT,
          court_hall TEXT,
          roll_number INTEGER,
          attended INTEGER DEFAULT 0,
          attended_by TEXT,
          proceedings TEXT,
          court_decision TEXT,
          adjournment_reason TEXT,
          adjournment_notes TEXT,
          next_hearing_date TEXT,
          requests TEXT,
          submitted_documents TEXT,
          notes TEXT,
          is_judgment_hearing INTEGER DEFAULT 0,
          judgment_date TEXT,
          judgment_text TEXT,
          status TEXT NOT NULL DEFAULT 'محددة',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);
      CREATE INDEX IF NOT EXISTS idx_hearings_case ON hearings(case_id);
      CREATE INDEX IF NOT EXISTS idx_hearings_court ON hearings(court_name);
      CREATE INDEX IF NOT EXISTS idx_hearings_status ON hearings(status);
      CREATE INDEX IF NOT EXISTS idx_hearings_judgment ON hearings(is_judgment_hearing, judgment_date);

      CREATE TABLE IF NOT EXISTS case_appeal_deadlines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          judgment_date TEXT NOT NULL,
          announcement_date TEXT,
          appeal_type TEXT NOT NULL,
          days_allowed INTEGER NOT NULL,
          deadline_date TEXT NOT NULL,
          is_appeal_filed INTEGER DEFAULT 0,
          appeal_case_number TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_appeals_case ON case_appeal_deadlines(case_id);
      CREATE INDEX IF NOT EXISTS idx_appeals_deadline ON case_appeal_deadlines(deadline_date);
    `
  },
  {
    version: 4,
    name: '004_financial_system',
    sql: `
      CREATE TABLE IF NOT EXISTS case_fee_agreements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          agreement_type TEXT NOT NULL DEFAULT 'مبلغ مقطوع',
          total_amount REAL NOT NULL DEFAULT 0,
          percentage REAL,
          amount_per_session REAL,
          monthly_amount REAL,
          terms_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(case_id)
      );

      CREATE INDEX IF NOT EXISTS idx_fee_agreements_case ON case_fee_agreements(case_id);

      CREATE TABLE IF NOT EXISTS fee_installments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agreement_id INTEGER NOT NULL REFERENCES case_fee_agreements(id) ON DELETE CASCADE,
          case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          amount REAL NOT NULL,
          due_date TEXT,
          status TEXT NOT NULL DEFAULT 'غير مسددة',
          paid_amount REAL NOT NULL DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_installments_agreement ON fee_installments(agreement_id);
      CREATE INDEX IF NOT EXISTS idx_installments_case ON fee_installments(case_id);

      CREATE TABLE IF NOT EXISTS financial_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receipt_number TEXT UNIQUE NOT NULL,
          case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          hearing_id INTEGER REFERENCES hearings(id) ON DELETE SET NULL,
          installment_id INTEGER REFERENCES fee_installments(id) ON DELETE SET NULL,
          transaction_date TEXT NOT NULL,
          category TEXT NOT NULL,
          transaction_type TEXT NOT NULL,
          direction TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_method TEXT NOT NULL DEFAULT 'نقدي',
          description TEXT NOT NULL,
          notes TEXT,
          is_reversed INTEGER DEFAULT 0,
          reversed_at DATETIME,
          reversed_by_id INTEGER REFERENCES financial_transactions(id),
          reversal_of_id INTEGER REFERENCES financial_transactions(id),
          reversal_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_fin_tx_case ON financial_transactions(case_id);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_client ON financial_transactions(client_id);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_date ON financial_transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_category ON financial_transactions(category);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_direction ON financial_transactions(direction);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_receipt ON financial_transactions(receipt_number);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_reversed ON financial_transactions(is_reversed);

      CREATE TABLE IF NOT EXISTS cheque_details (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
          case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          cheque_number TEXT NOT NULL,
          bank_name TEXT NOT NULL,
          drawer_name TEXT,
          amount REAL NOT NULL,
          due_date TEXT NOT NULL,
          collected_date TEXT,
          status TEXT NOT NULL DEFAULT 'تحت التحصيل',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_cheques_status ON cheque_details(status);
      CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON cheque_details(due_date);
      CREATE INDEX IF NOT EXISTS idx_cheques_tx ON cheque_details(transaction_id);
    `
  },
  {
    version: 5,
    name: '005_executions',
    sql: `
      CREATE TABLE IF NOT EXISTS execution_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_number TEXT NOT NULL,
          year INTEGER,
          case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          deed_type TEXT NOT NULL DEFAULT 'حكم',
          deed_number TEXT,
          court TEXT NOT NULL,
          execution_judge TEXT,
          execution_dept TEXT,
          applicant_name TEXT NOT NULL,
          applicant_capacity TEXT DEFAULT 'طالب التنفيذ',
          enforced_against TEXT NOT NULL,
          enforced_against_capacity TEXT DEFAULT 'المنفذ ضده',
          enforced_against_address TEXT,
          enforced_against_phone TEXT,
          total_claimed_amount REAL NOT NULL DEFAULT 0,
          collected_amount REAL NOT NULL DEFAULT 0,
          announcement_date TEXT,
          status TEXT NOT NULL DEFAULT 'جاري',
          settlement_minutes TEXT,
          settlement_date TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_exec_case ON execution_files(case_id);
      CREATE INDEX IF NOT EXISTS idx_exec_client ON execution_files(client_id);
      CREATE INDEX IF NOT EXISTS idx_exec_status ON execution_files(status);
      CREATE INDEX IF NOT EXISTS idx_exec_deed_type ON execution_files(deed_type);
      CREATE INDEX IF NOT EXISTS idx_exec_file_num ON execution_files(file_number);

      CREATE TABLE IF NOT EXISTS execution_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          execution_id INTEGER NOT NULL REFERENCES execution_files(id) ON DELETE CASCADE,
          action_type TEXT NOT NULL,
          action_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'جاري',
          police_report_or_bailiff_number TEXT,
          dept_or_bailiff_office TEXT,
          bailiff_name TEXT,
          amount_collected REAL DEFAULT 0,
          details TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_exec_actions_exec ON execution_actions(execution_id);
      CREATE INDEX IF NOT EXISTS idx_exec_actions_date ON execution_actions(action_date);
      CREATE INDEX IF NOT EXISTS idx_exec_actions_status ON execution_actions(status);

      CREATE TABLE IF NOT EXISTS execution_hearings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          execution_id INTEGER NOT NULL REFERENCES execution_files(id) ON DELETE CASCADE,
          case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
          hearing_date TEXT NOT NULL,
          hearing_time TEXT,
          court_name TEXT,
          court_circuit TEXT,
          roll_number TEXT,
          attended INTEGER DEFAULT 0,
          attended_by TEXT,
          proceedings TEXT,
          court_decision TEXT,
          adjournment_reason TEXT,
          next_hearing_date TEXT,
          status TEXT DEFAULT 'محددة',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_exec_hearings_exec ON execution_hearings(execution_id);
      CREATE INDEX IF NOT EXISTS idx_exec_hearings_date ON execution_hearings(hearing_date);
    `
  },
  {
    version: 6,
    name: '006_tasks',
    sql: `
      CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
          client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
          category TEXT NOT NULL DEFAULT 'مأمورية محكمة',
          priority TEXT NOT NULL DEFAULT 'عادية',
          due_date TEXT NOT NULL,
          due_time TEXT,
          recurrence TEXT NOT NULL DEFAULT 'لا يتكرر',
          recurrence_interval INTEGER,
          status TEXT NOT NULL DEFAULT 'جديدة',
          completed_at DATETIME,
          assigned_to TEXT DEFAULT 'أنا',
          estimated_duration TEXT,
          result_notes TEXT,
          reminder_minutes_before INTEGER DEFAULT 60,
          reminder_shown INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_case ON tasks(case_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

      CREATE TABLE IF NOT EXISTS task_checklists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          is_completed INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON task_checklists(task_id);

      CREATE TABLE IF NOT EXISTS task_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_template_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'عادية',
          days_offset INTEGER DEFAULT 0,
          estimated_duration TEXT,
          checklist_items TEXT,
          sort_order INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_template_items_tmpl ON task_template_items(template_id);

      INSERT OR IGNORE INTO task_templates (id, name, description, is_default)
      VALUES 
        (1, 'قضية جديدة', 'توليد تلقائي للمهام الإجرائية التأسيسية لأي دعوى قضائية جديدة', 1),
        (2, 'حكم صدر في الدعوى', 'الإجراءات القانونية والمكتبية اللازمة فور صدور حكم في القضية ومواعيد الطعن', 1),
        (3, 'مباشرة إجراءات تنفيذ جبري', 'خطوات إعلان السند التنفيذي والتكليف بالوفاء وتوقيع الحجز التنفيذي', 1);

      INSERT OR IGNORE INTO task_template_items (id, template_id, title, category, priority, days_offset, estimated_duration, checklist_items, sort_order)
      VALUES
        (1, 1, 'استلام التوكيل ومطابقته', 'عمل توكيلات وتوثيق رسمي', 'عادية', 0, 'ساعة', 'استلام أصل التوكيل\nتصوير 3 نسخ\nالتحقق من سريان التوكيل وصلاحياته', 1),
        (2, 1, 'فتح ملف القضية وتجهيز المستندات', 'إدارة مكتب وأعمال سكرتارية', 'عادية', 1, 'ساعة', 'ترقيم أوراق القضية\nإعداد حافظة المستندات\nتفريغ بيانات الخصوم', 2),
        (3, 1, 'تحرير صحيفة الدعوى ومراجعة الطلبات', 'تحرير وإيداع صحيفة دعوى / طعن', 'مهمة', 3, 'نصف يوم', 'صياغة الوقائع والطلبات الختامية\nمراجعة السند القانوني وأحكام النقض\nتوقيع الصحيفة من المحامي المسؤول', 3),
        (4, 1, 'سداد رسوم القيد واستلام رقم الجدول', 'سداد رسوم وأمانات قضائية', 'مهمة', 4, 'ساعتين', 'تقدير الرسوم بخزينة المحكمة\nسداد الرسوم والدمغات القضائية\nإثبات رقم القضية والدائرة وتاريخ أول جلسة', 4),
        (5, 1, 'تسليم أصل الصحيفة لقلم المحضرين للإعلان', 'إعلان قلم المحضرين ومتابعته', 'مهمة', 5, 'ساعتين', 'تسليم الإعلان لقلم المحضرين المختص\nتسجيل رقم المحضر وتاريخ التسليم', 5),
        (6, 1, 'استلام أصل الإعلان وضمه لملف القضية', 'استلام إعلان ومستندات قضائية', 'مهمة', 10, 'ساعتين', 'استلام الإعلان متصلاً بوقائع الإعلان\nإيداع أصل الإعلان بملف الجلسة', 6),
        (7, 2, 'استخراج صورة رسمية طبق الأصل من الحكم', 'استخراج صورة رسمية من الحكم أو المحضر', 'مهمة', 2, 'نصف يوم', 'سداد رسم الصورة الرسمية\nاستلام الحكم وختمه بالنسر\nاستخراج صورة من مسودة الحكم', 1),
        (8, 2, 'إخطار الموكل بنتيجة الحكم وتسليمه تقرير ملخص', 'تواصل مع موكل وتحديث موقفه', 'عادية', 3, 'ساعة', 'الاتصال التليفوني بالموكل\nإرسال صورة الحكم عبر الواتساب\nبيان الخيارات القانونية المتاحة', 2),
        (9, 2, 'حساب وتتبع ميعاد الطعن القضائي', 'مأمورية محكمة', 'عاجلة', 4, 'ساعة', 'تسجيل الحكم بحاسبة مواعيد الطعن\nتحديد تاريخ بدء الميعاد (صدور أو إعلان)\nتفعيل تنبيه قبل انتهاء الميعاد', 3),
        (10, 3, 'إعلان المنفذ ضده بالصيغة التنفيذية والتكليف بالوفاء', 'إعلان قلم المحضرين ومتابعته', 'مهمة', 2, 'ساعتين', 'وضع الصيغة التنفيذية على الحكم\nتسليم الإعلان لقلم محضرين التنفيذ المختص\nمتابعة إتمام الإعلان قانوناً', 1),
        (11, 3, 'استلام أصل الإعلان والتأكد من انقضاء مهلة الوفاء', 'استلام إعلان ومستندات قضائية', 'مهمة', 10, 'ساعتين', 'التحقق من إعلان المدين لشخصه أو موطنه\nحساب انقضاء مهلة التكليف بالوفاء (24 ساعة/8 أيام)', 2),
        (12, 3, 'تقديم طلب توقيع الحجز التنفيذي أو الاستعلام البنكي', 'متابعة إجراءات تنفيذ', 'مهمة', 14, 'نصف يوم', 'صياغة طلب الحجز لقاضي التنفيذ\nتحديد مأمورية الانتقال مع معاون التنفيذ والقوة الأمنية', 3);
    `
  },
  {
    version: 7,
    name: '007_documents_and_notes',
    sql: `
      CREATE TABLE IF NOT EXISTS case_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'أخرى',
          file_name TEXT NOT NULL,
          file_extension TEXT NOT NULL,
          relative_path TEXT NOT NULL,
          file_size_bytes INTEGER NOT NULL DEFAULT 0,
          mime_type TEXT DEFAULT '',
          description TEXT DEFAULT '',
          is_deleted INTEGER NOT NULL DEFAULT 0,
          deleted_at DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_case_documents_case ON case_documents(case_id, is_deleted);
      CREATE INDEX IF NOT EXISTS idx_case_documents_category ON case_documents(category);

      CREATE TABLE IF NOT EXISTS case_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'عامة',
          is_pinned INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_case_notes_case ON case_notes(case_id, is_pinned, created_at DESC);
    `
  },
  {
    version: 8,
    name: '008_security_and_audit',
    sql: `
      CREATE TABLE IF NOT EXISTS app_security (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          is_password_enabled INTEGER NOT NULL DEFAULT 0,
          password_hash TEXT DEFAULT '',
          auto_lock_minutes INTEGER NOT NULL DEFAULT 15,
          auto_backup_enabled INTEGER NOT NULL DEFAULT 1,
          auto_backup_frequency TEXT NOT NULL DEFAULT 'daily',
          backup_custom_path TEXT DEFAULT '',
          encrypt_backups INTEGER NOT NULL DEFAULT 0,
          last_backup_date DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO app_security (
          id, is_password_enabled, password_hash, auto_lock_minutes,
          auto_backup_enabled, auto_backup_frequency, backup_custom_path, encrypt_backups
      ) VALUES (
          1, 0, '', 15, 1, 'daily', '', 0
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER DEFAULT NULL,
          entity_name TEXT NOT NULL,
          details TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, action_type);
    `
  },
  {
    version: 9,
    name: '009_performance_indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_cases_year_number ON cases(case_year DESC, case_number DESC);
      CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
      CREATE INDEX IF NOT EXISTS idx_cases_degree ON cases(court_degree);
      CREATE INDEX IF NOT EXISTS idx_cases_court_status ON cases(court_name, status);
      CREATE INDEX IF NOT EXISTS idx_case_clients_case_primary ON case_clients(case_id, is_primary);
      CREATE INDEX IF NOT EXISTS idx_case_opponents_case_id ON case_opponents(case_id, id);
      CREATE INDEX IF NOT EXISTS idx_hearings_date_court ON hearings(hearing_date, court_name);
      CREATE INDEX IF NOT EXISTS idx_hearings_case_date ON hearings(case_id, hearing_date);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_case_date ON financial_transactions(case_id, transaction_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status);
    `
  }
];

export class MigrationService {
  constructor(private db: Database.Database) {}

  public runMigrations(): void {
    // 1. Ensure migrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch applied migrations
    const rows = this.db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[];
    const appliedVersions = new Set<number>(rows.map(r => r.version));

    // 3. Execute pending migrations in a transaction
    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`Applying migration ${migration.version}: ${migration.name}...`);
        
        const applyTx = this.db.transaction(() => {
          this.db.exec(migration.sql);

          if (migration.version === 5) {
            const finCols = this.db.pragma('table_info(financial_transactions)') as { name: string }[];
            if (!finCols.some(c => c.name === 'execution_id')) {
              this.db.exec('ALTER TABLE financial_transactions ADD COLUMN execution_id INTEGER REFERENCES execution_files(id) ON DELETE SET NULL;');
              this.db.exec('CREATE INDEX IF NOT EXISTS idx_fin_tx_execution ON financial_transactions(execution_id);');
            }
          }

          this.db.prepare(
            'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
          ).run(migration.version, migration.name);
        });

        applyTx();
        console.log(`✓ Migration ${migration.version} applied successfully`);
      }
    }

    // 4. Seed default lists if table is empty
    this.seedDefaultListsIfEmpty();
  }

  private seedDefaultListsIfEmpty(): void {
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM configurable_lists').get() as { count: number };
    if (countRow.count > 0) {
      return;
    }

    console.log('Seeding default configurable lists from SPEC.md...');

    const insertStmt = this.db.prepare(`
      INSERT INTO configurable_lists (list_type, name, sort_order, is_active, is_default)
      VALUES (?, ?, ?, 1, 1)
    `);

    const seedTx = this.db.transaction(() => {
      // Courts
      DEFAULT_COURTS.forEach((name, idx) => {
        insertStmt.run('courts', name, idx + 1);
      });

      // Case Types
      DEFAULT_CASE_TYPES.forEach((name, idx) => {
        insertStmt.run('case_types', name, idx + 1);
      });

      // Adjournment Reasons
      DEFAULT_ADJOURNMENT_REASONS.forEach((name, idx) => {
        insertStmt.run('adjournment_reasons', name, idx + 1);
      });

      // Task Categories
      DEFAULT_TASK_CATEGORIES.forEach((name, idx) => {
        insertStmt.run('task_categories', name, idx + 1);
      });

      // Transaction Types
      DEFAULT_TRANSACTION_TYPES.forEach((name, idx) => {
        insertStmt.run('transaction_types', name, idx + 1);
      });
    });

    seedTx();
    console.log('✓ Default configurable lists seeded successfully');
  }
}
