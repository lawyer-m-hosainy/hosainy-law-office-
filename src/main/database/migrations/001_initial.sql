-- 001_initial.sql: الهيكل الأساسي لقاعدة بيانات برنامج إدارة مكتب المحاماة

-- جدول تتبع الهجرات (Migrations)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول إعدادات وبيانات المكتب
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

-- جدول القوائم القابلة للتعديل
CREATE TABLE IF NOT EXISTS configurable_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_type TEXT NOT NULL, -- 'courts', 'case_types', 'adjournment_reasons', 'task_categories', 'transaction_types'
    name TEXT NOT NULL,
    category TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_configurable_lists_type ON configurable_lists(list_type, is_active, sort_order);

-- إدخال إعدادات المكتب الافتراضية إذا لم تكن موجودة
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
