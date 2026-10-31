-- 002_clients_and_cases.sql: جداول الموكلين والقضايا والأطراف والخصوم

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client_type TEXT NOT NULL DEFAULT 'individual', -- individual, company, entity
    national_id_or_cr TEXT, -- الرقم القومي أو السجل التجاري
    phone TEXT NOT NULL,
    phone2 TEXT,
    whatsapp TEXT,
    address TEXT,
    email TEXT,
    poa_number TEXT, -- رقم التوكيل
    poa_type TEXT, -- عام قضايا / خاص / توثيق
    poa_date TEXT, -- YYYY-MM-DD
    poa_issuing_office TEXT, -- مكتب الشهر العقاري / التوثيق
    poa_expiry_date TEXT, -- YYYY-MM-DD تاريخ انتهاء التوكيل
    representation_type TEXT, -- أصيل / ولي طبيعي / وصي / قيّم / وكيل عن شركة
    represented_name TEXT, -- اسم الموكّل عنه
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- active, archived
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
