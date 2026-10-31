-- 007_documents_and_notes.sql: منظومة المستندات والمرفقات المحلية والملاحظات والسجل الزمني
-- يدعم تخزين المسار النسبي داخل مجلد LawOfficeData/attachments/ مع الحذف بسلة المحذوفات

-- جدول مستندات ومرفقات القضايا
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

-- جدول ملاحظات القضية وخطة العمل
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
