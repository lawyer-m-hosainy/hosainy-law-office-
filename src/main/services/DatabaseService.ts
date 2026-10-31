import Database from 'better-sqlite3';
import { DataDirService } from './DataDirService';
import { MigrationService } from './MigrationService';
import { normalizeArabic } from '../../shared/arabicUtils';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public init(): Database.Database {
    if (this.db) {
      return this.db;
    }

    const dataDirService = DataDirService.getInstance();
    const dbPath = dataDirService.getDatabasePath();

    this.db = new Database(dbPath);

    // Enforce WAL mode and foreign keys as per RULES.md
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');

    // Register custom SQLite function for Arabic normalized text searching
    this.db.function('normalize_arabic', (val: any) => {
      if (val === null || val === undefined) return '';
      return normalizeArabic(String(val));
    });

    console.log(`✓ Connected to SQLite database at: ${dbPath}`);

    // Run migrations
    const migrationService = new MigrationService(this.db);
    migrationService.runMigrations();

    return this.db;
  }

  public getDb(): Database.Database {
    if (!this.db) {
      return this.init();
    }
    return this.db;
  }

  public transaction<T>(fn: () => T): T {
    const db = this.getDb();
    const execute = db.transaction(fn);
    return execute();
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch (err) {
        console.warn('Error while closing database:', err);
      }
      this.db = null;
    }
  }
}
