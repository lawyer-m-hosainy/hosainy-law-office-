-- 009_performance_indexes.sql: فهارس تسريع الأداء لـ 10 آلاف قضية والاستعلامات الكبيرة

-- فهارس جدول القضايا للترتيب والتصفية السريعة
CREATE INDEX IF NOT EXISTS idx_cases_year_number ON cases(case_year DESC, case_number DESC);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_degree ON cases(court_degree);
CREATE INDEX IF NOT EXISTS idx_cases_court_status ON cases(court_name, status);

-- فهارس تسريع الربط لجلب الموكل والخصم الأساسي في القائمة المصفحة
CREATE INDEX IF NOT EXISTS idx_case_clients_case_primary ON case_clients(case_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_case_opponents_case_id ON case_opponents(case_id, id);

-- فهارس تسريع الجلسات والمالية والمهام
CREATE INDEX IF NOT EXISTS idx_hearings_date_court ON hearings(hearing_date, court_name);
CREATE INDEX IF NOT EXISTS idx_hearings_case_date ON hearings(case_id, hearing_date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_case_date ON financial_transactions(case_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status);
