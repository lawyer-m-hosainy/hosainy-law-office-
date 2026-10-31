-- 004_financial_system.sql: النظام المالي الموحد، اتفاقات الأتعاب، الحركات المالية، القيود العكسية وتتبع الشيكات

-- 1. اتفاق الأتعاب لكل قضية
CREATE TABLE IF NOT EXISTS case_fee_agreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    agreement_type TEXT NOT NULL DEFAULT 'مبلغ مقطوع', -- 'مبلغ مقطوع', 'على مراحل', 'نسبة من المحكوم به', 'بالجلسة', 'شهري'
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

-- 2. دفعات / أقساط الأتعاب المتفق عليها
CREATE TABLE IF NOT EXISTS fee_installments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id INTEGER NOT NULL REFERENCES case_fee_agreements(id) ON DELETE CASCADE,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date TEXT, -- YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'غير مسددة', -- 'غير مسددة', 'مسددة جزئياً', 'مسددة بالكامل'
    paid_amount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_installments_agreement ON fee_installments(agreement_id);
CREATE INDEX IF NOT EXISTS idx_installments_case ON fee_installments(case_id);

-- 3. سجل الحركات المالية الموحد (البيانات لا تحذف وتلغى بقيد عكسي)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT UNIQUE NOT NULL, -- e.g. REC-2026-0001
    case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    hearing_id INTEGER REFERENCES hearings(id) ON DELETE SET NULL,
    installment_id INTEGER REFERENCES fee_installments(id) ON DELETE SET NULL,
    transaction_date TEXT NOT NULL, -- YYYY-MM-DD
    category TEXT NOT NULL, -- 'أتعاب', 'رسوم قضائية', 'مصاريف', 'تنفيذ'
    transaction_type TEXT NOT NULL, -- نوع الحركة الفرعي
    direction TEXT NOT NULL, -- 'وارد' (من الموكل), 'صادر' (مصروف من المكتب)
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'نقدي', -- 'نقدي', 'تحويل بنكي', 'شيك', 'فودافون كاش', 'إنستاباي'
    description TEXT NOT NULL,
    notes TEXT,
    is_reversed INTEGER DEFAULT 0, -- 1 إذا ألغيت بقيد عكسي
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

-- 4. تفاصيل الشيكات وتتبع الشيكات المؤجلة
CREATE TABLE IF NOT EXISTS cheque_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    cheque_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    drawer_name TEXT,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL, -- YYYY-MM-DD
    collected_date TEXT, -- YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'تحت التحصيل', -- 'تحت التحصيل', 'محصل', 'مرتد'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cheques_status ON cheque_details(status);
CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON cheque_details(due_date);
CREATE INDEX IF NOT EXISTS idx_cheques_tx ON cheque_details(transaction_id);
