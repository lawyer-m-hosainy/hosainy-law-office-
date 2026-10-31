-- 008_security_and_audit.sql: الأمان وقفل البرنامج بكلمة مرور وسجل التدقيق والنسخ الاحتياطي

-- جدول إعدادات الأمان وقفل البرنامج والنسخ الاحتياطي
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

-- إدخال الإعداد الأولي الافتراضي
INSERT OR IGNORE INTO app_security (
    id, is_password_enabled, password_hash, auto_lock_minutes,
    auto_backup_enabled, auto_backup_frequency, backup_custom_path, encrypt_backups
) VALUES (
    1, 0, '', 15, 1, 'daily', '', 0
);

-- جدول سجل التدقيق والتغييرات (Audit Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'reverse', 'backup', 'restore', 'lock', 'unlock', 'security'
    entity_type TEXT NOT NULL, -- 'case', 'client', 'hearing', 'finance', 'execution', 'task', 'document', 'system'
    entity_id INTEGER DEFAULT NULL,
    entity_name TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, action_type);
