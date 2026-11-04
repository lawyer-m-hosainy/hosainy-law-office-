-- 010_announcements.sql: نظام الإعلانات القضائية وأقلام المحضرين وربطها بالجلسات وسجل المحاولات

CREATE TABLE IF NOT EXISTS case_announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    hearing_id INTEGER REFERENCES hearings(id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    recipient_capacity TEXT DEFAULT 'المطلوب إعلانه',
    recipient_address TEXT,
    announcement_type TEXT NOT NULL,
    bailiff_office TEXT,
    request_number TEXT,
    bailiff_name TEXT,
    delivery_date TEXT, -- YYYY-MM-DD
    return_date TEXT,   -- YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'قيد الانتظار', -- 'قيد الانتظار', 'أُعلن', 'لم يُعلن', 'جهة إدارة', 'مخاطبة مع شخص آخر', 'ورد', 'ورد بدون نتيجة'
    failure_reason TEXT,
    notes TEXT,
    fee_amount INTEGER NOT NULL DEFAULT 0, -- in piasters
    transaction_id INTEGER REFERENCES financial_transactions(id) ON DELETE SET NULL,
    parent_id INTEGER REFERENCES case_announcements(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_case ON case_announcements(case_id);
CREATE INDEX IF NOT EXISTS idx_announcements_hearing ON case_announcements(hearing_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON case_announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_parent ON case_announcements(parent_id);
CREATE INDEX IF NOT EXISTS idx_announcements_bailiff ON case_announcements(bailiff_office);
CREATE INDEX IF NOT EXISTS idx_announcements_return_date ON case_announcements(return_date);
