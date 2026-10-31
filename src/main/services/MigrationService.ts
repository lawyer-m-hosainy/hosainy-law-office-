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
