-- 003_hearings_and_timeline.sql: جدول الجلسات والتأجيلات وحاسبة مواعيد الطعن

CREATE TABLE IF NOT EXISTS hearings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    hearing_date TEXT NOT NULL, -- YYYY-MM-DD
    hearing_time TEXT, -- HH:MM
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
    status TEXT NOT NULL DEFAULT 'محددة', -- 'محددة', 'تمت', 'مؤجلة', 'محجوزة للحكم', 'صدر حكم', 'ملغاة'
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
