-- 005_executions.sql: نظام التنفيذ الجبري، السندات التنفيذية، إجراءات الحجز، جلسات التنفيذ ومحاضر الصلح

-- 1. جدول ملفات التنفيذ (مرتبطة بقضية أو مستقلة)
CREATE TABLE IF NOT EXISTS execution_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_number TEXT NOT NULL,
    year INTEGER,
    case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    deed_type TEXT NOT NULL DEFAULT 'حكم', -- 'حكم', 'أمر أداء', 'شيك', 'كمبيالة', 'عقد موثق', 'محضر صلح', 'أخرى'
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
    announcement_date TEXT, -- YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'جاري', -- 'جديد', 'جاري', 'تم الصلح والتسوية', 'تم التنفيذ كلياً', 'موقوف', 'مرفوض', 'معلق'
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

-- 2. جدول إجراءات التنفيذ المتسلسلة (حجز، بيع بالمزاد، إخلاء، إلخ)
CREATE TABLE IF NOT EXISTS execution_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id INTEGER NOT NULL REFERENCES execution_files(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_date TEXT NOT NULL, -- YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'جاري', -- 'تم', 'مرفوض', 'مؤجل', 'جاري', 'ملغى'
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

-- 3. جدول جلسات التنفيذ وإشكالات التنفيذ ومنازعاته
CREATE TABLE IF NOT EXISTS execution_hearings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id INTEGER NOT NULL REFERENCES execution_files(id) ON DELETE CASCADE,
    case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
    hearing_date TEXT NOT NULL, -- YYYY-MM-DD
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
    status TEXT DEFAULT 'محددة', -- 'محددة', 'تمت', 'مؤجلة', 'محكوم فيها'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exec_hearings_exec ON execution_hearings(execution_id);
CREATE INDEX IF NOT EXISTS idx_exec_hearings_date ON execution_hearings(hearing_date);

-- 4. ربط حركات المالية بملفات التنفيذ
ALTER TABLE financial_transactions ADD COLUMN execution_id INTEGER REFERENCES execution_files(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_fin_tx_execution ON financial_transactions(execution_id);
