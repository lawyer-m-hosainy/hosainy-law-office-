-- 006_tasks.sql: نظام المهام والعمل الإداري، قوائم الفحص والقوالب الإجرائية التلقائية

-- 1. جدول المهام والمأموريات
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'مأمورية محكمة',
    priority TEXT NOT NULL DEFAULT 'عادية', -- 'عاجلة', 'مهمة', 'عادية'
    due_date TEXT NOT NULL, -- YYYY-MM-DD
    due_time TEXT, -- HH:MM
    recurrence TEXT NOT NULL DEFAULT 'لا يتكرر', -- 'لا يتكرر', 'يومي', 'أسبوعي', 'شهري', 'مخصص'
    recurrence_interval INTEGER,
    status TEXT NOT NULL DEFAULT 'جديدة', -- 'جديدة', 'جارية', 'مؤجلة', 'منتهية', 'ملغاة'
    completed_at DATETIME,
    assigned_to TEXT DEFAULT 'أنا',
    estimated_duration TEXT,
    result_notes TEXT,
    reminder_minutes_before INTEGER DEFAULT 60,
    reminder_shown INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_case ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- 2. جدول بنود الفحص الفرعية لكل مهمة (Checklist)
CREATE TABLE IF NOT EXISTS task_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON task_checklists(task_id);

-- 3. جدول قوالب المهام
CREATE TABLE IF NOT EXISTS task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول بنود قوالب المهام
CREATE TABLE IF NOT EXISTS task_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'عادية',
    days_offset INTEGER DEFAULT 0,
    estimated_duration TEXT,
    checklist_items TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_template_items_tmpl ON task_template_items(template_id);

-- 5. بذر القوالب الافتراضية المحددة في SPEC.md
INSERT OR IGNORE INTO task_templates (id, name, description, is_default)
VALUES 
  (1, 'قضية جديدة', 'توليد تلقائي للمهام الإجرائية التأسيسية لأي دعوى قضائية جديدة', 1),
  (2, 'حكم صدر في الدعوى', 'الإجراءات القانونية والمكتبية اللازمة فور صدور حكم في القضية ومواعيد الطعن', 1),
  (3, 'مباشرة إجراءات تنفيذ جبري', 'خطوات إعلان السند التنفيذي والتكليف بالوفاء وتوقيع الحجز التنفيذي', 1);

-- بنود قالب "قضية جديدة"
INSERT OR IGNORE INTO task_template_items (id, template_id, title, category, priority, days_offset, estimated_duration, checklist_items, sort_order)
VALUES
  (1, 1, 'استلام التوكيل ومطابقته', 'عمل توكيلات وتوثيق رسمي', 'عادية', 0, 'ساعة', 'استلام أصل التوكيل
تصوير 3 نسخ
التحقق من سريان التوكيل وصلاحياته', 1),
  (2, 1, 'فتح ملف القضية وتجهيز المستندات', 'إدارة مكتب وأعمال سكرتارية', 'عادية', 1, 'ساعة', 'ترقيم أوراق القضية
إعداد حافظة المستندات
تفريغ بيانات الخصوم', 2),
  (3, 1, 'تحرير صحيفة الدعوى ومراجعة الطلبات', 'تحرير وإيداع صحيفة دعوى / طعن', 'مهمة', 3, 'نصف يوم', 'صياغة الوقائع والطلبات الختامية
مراجعة السند القانوني وأحكام النقض
توقيع الصحيفة من المحامي المسؤول', 3),
  (4, 1, 'سداد رسوم القيد واستلام رقم الجدول', 'سداد رسوم وأمانات قضائية', 'مهمة', 4, 'ساعتين', 'تقدير الرسوم بخزينة المحكمة
سداد الرسوم والدمغات القضائية
إثبات رقم القضية والدائرة وتاريخ أول جلسة', 4),
  (5, 1, 'تسليم أصل الصحيفة لقلم المحضرين للإعلان', 'إعلان قلم المحضرين ومتابعته', 'مهمة', 5, 'ساعتين', 'تسليم الإعلان لقلم المحضرين المختص
تسجيل رقم المحضر وتاريخ التسليم', 5),
  (6, 1, 'استلام أصل الإعلان وضمه لملف القضية', 'استلام إعلان ومستندات قضائية', 'مهمة', 10, 'ساعتين', 'استلام الإعلان متصلاً بوقائع الإعلان
إيداع أصل الإعلان بملف الجلسة', 6);

-- بنود قالب "حكم صدر في الدعوى"
INSERT OR IGNORE INTO task_template_items (id, template_id, title, category, priority, days_offset, estimated_duration, checklist_items, sort_order)
VALUES
  (7, 2, 'استخراج صورة رسمية طبق الأصل من الحكم', 'استخراج صورة رسمية من الحكم أو المحضر', 'مهمة', 2, 'نصف يوم', 'سداد رسم الصورة الرسمية
استلام الحكم وختمه بالنسر
استخراج صورة من مسودة الحكم', 1),
  (8, 2, 'إخطار الموكل بنتيجة الحكم وتسليمه تقرير ملخص', 'تواصل مع موكل وتحديث موقفه', 'عادية', 3, 'ساعة', 'الاتصال التليفوني بالموكل
إرسال صورة الحكم عبر الواتساب
بيان الخيارات القانونية المتاحة', 2),
  (9, 2, 'حساب وتتبع ميعاد الطعن القضائي', 'مأمورية محكمة', 'عاجلة', 4, 'ساعة', 'تسجيل الحكم بحاسبة مواعيد الطعن
تحديد تاريخ بدء الميعاد (صدور أو إعلان)
تفعيل تنبيه قبل انتهاء الميعاد', 3);

-- بنود قالب "مباشرة إجراءات تنفيذ جبري"
INSERT OR IGNORE INTO task_template_items (id, template_id, title, category, priority, days_offset, estimated_duration, checklist_items, sort_order)
VALUES
  (10, 3, 'إعلان المنفذ ضده بالصيغة التنفيذية والتكليف بالوفاء', 'إعلان قلم المحضرين ومتابعته', 'مهمة', 2, 'ساعتين', 'وضع الصيغة التنفيذية على الحكم
تسليم الإعلان لقلم محضرين التنفيذ المختص
متابعة إتمام الإعلان قانوناً', 1),
  (11, 3, 'استلام أصل الإعلان والتأكد من انقضاء مهلة الوفاء', 'استلام إعلان ومستندات قضائية', 'مهمة', 10, 'ساعتين', 'التحقق من إعلان المدين لشخصه أو موطنه
حساب انقضاء مهلة التكليف بالوفاء (24 ساعة/8 أيام)', 2),
  (12, 3, 'تقديم طلب توقيع الحجز التنفيذي أو الاستعلام البنكي', 'متابعة إجراءات تنفيذ', 'مهمة', 14, 'نصف يوم', 'صياغة طلب الحجز لقاضي التنفيذ
تحديد مأمورية الانتقال مع معاون التنفيذ والقوة الأمنية', 3);
