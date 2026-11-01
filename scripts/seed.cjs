/**
 * seed.cjs: مولّد البيانات التجريبية المصرية الواقعية
 * يلتزم بقواعد RULES.md و TESTING_RULES.md:
 * - يدعم حجمين: صغير (--size=small: 50 قضية)، وكبير (--size=large: 10,000 قضية، 100,000 جلسة، 50,000 حركة مالية).
 * - يستخدم خوارزمية PRNG حتمية (Mulberry32) بنفس البذرة لإخراج نفس البيانات في كل تشغيل.
 * - بيانات مصرية واقعية: أسماء، محاكم، دوائر، أرقام قضايا وسنوات، جلسات وتأجيلات بأسبابها، حركات مالية، تنفيذات، مهام.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// 1. مولد الأرقام العشوائية الحتمي (Mulberry32)
function createPrng(seed = 123456789) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2. قواميس البيانات المصرية الواقعية
const FIRST_NAMES = [
  'أحمد', 'محمد', 'محمود', 'علي', 'إبراهيم', 'حسن', 'حسين', 'خالد', 'عمر', 'يوسف',
  'مصطفى', 'طارق', 'عمرو', 'سامح', 'شريف', 'كريم', 'فاطمة', 'مريم', 'سارة', 'نور',
  'منى', 'هدى', 'رشا', 'آية', 'ياسمين', 'زينب', 'جمال', 'عادل', 'سامي', 'نبيل'
];

const LAST_NAMES = [
  'عبد الرحمن', 'الشناوي', 'البحيري', 'المنشاوي', 'السيد', 'عثمان', 'عبد الله', 'الشافعي',
  'الصاوي', 'الحداد', 'النجار', 'غانم', 'منصور', 'إسماعيل', 'حجازي', 'عوض', 'متولي',
  'الجوهري', 'سلامة', 'المصري', 'القاضي', 'سليمان', 'فهمي', 'بدوي', 'الخطيب'
];

const COMPANIES = [
  'شركة النيل للمقاولات العامة والتوريدات',
  'الشركة الهندسية للتجارة والتوزيع ش.م.م',
  'شركة الأهرام للصناعات الغذائية الحديثة',
  'مجموعة الفراعنة للتطوير والاستثمار العقاري',
  'شركة الدلتا للنقل البري والخدمات اللوجستية',
  'شركة مصر لصناعة وتجارة مواد البناء',
  'الشركة الدولية للاستيراد والتصدير والتخليص الجمركي'
];

const COURTS = [
  'محكمة شمال القاهرة الابتدائية',
  'محكمة جنوب القاهرة الابتدائية',
  'محكمة استئناف القاهرة',
  'محكمة شمال الجيزة الابتدائية',
  'محكمة جنوب الجيزة الابتدائية',
  'محكمة استئناف طنطا',
  'محكمة المنصورة الابتدائية',
  'محكمة الإسكندرية الابتدائية',
  'محكمة الأسرة بالمعادي',
  'مجلس الدولة - محكمة القضاء الإداري'
];

const CIRCUITS = [
  'الدائرة 4 مدني كلي',
  'الدائرة 12 جنح مستأنف',
  'الدائرة 3 تجاري',
  'الدائرة 7 عمال',
  'الدائرة 9 إيجارات',
  'الدائرة 1 تعويضات',
  'الدائرة 5 أسرة نفوس',
  'الدائرة 2 عقود وإلغاءات'
];

const CASE_TYPES = [
  'مدني كلي',
  'جنح مستأنفة',
  'استئناف مدني',
  'عمالي كلي',
  'صحة ونفاذ تعاقد',
  'تعويضات مدنية',
  'إيجارات موضوعي',
  'تجاري شركات',
  'أسرة - نفقة وصغار',
  'دعوى حساب وريع'
];

const SUBJECTS = [
  'دعوى صحة ونفاذ عقد بيع وحدة سكنية بالعقار الكائن بمصر الجديدة',
  'جنحة شيك مصرفي بدون رصيد قائم وقابل للسحب',
  'دعوى مطالبة بمستحقات عمالية وفروق بدلات ومكافأة نهاية خدمة',
  'دعوى فسخ عقد إيجار وإخلاء للتأجير من الباطن بدون إذن كتابي',
  'دعوى تعويض عن حادث سير وأضرار مادية وأدبية ومطالبة شركة التأمين',
  'طعن بالاستئناف على حكم صادر بإلزام المستأنف بأداء مبلغ مالي',
  'دعوى إثبات علاقة إيجارية وتسليم العين الخالية من الشواغل',
  'دعوى فرز وتجنيب وبطلان قسمة وتصفية تركة شائعة',
  'دعوى نفقة زوجية بأنواعها ومصروفات علاج وتعليم للصغار',
  'أمر أداء بمبلغ تجاري ناجم عن توريدات بضائع بفواتير مؤيدة'
];

const ADJOURNMENT_REASONS = [
  'للمذكرات ومستندات الختام مع التصريح بتبادلها',
  'لإعادة الإعلان وعرض الصلح القانوني بين الخصوم',
  'لورود تقرير مكتب خبراء وزارة العدل والاطلاع عليه',
  'لحضور الأصيل للاستجواب وتوجيه اليمين الحاسمة',
  'لضم المفردات وأوراق الجناية من النيابة العامة',
  'للاطلاع والرد على المذكرة المقدمة بجلسة اليوم',
  'لتنفيذ قرار المحكمة السابق بتقديم أصل المحرر العرفي',
  'لإعلان الورثة بالتدخل الانضمامي في الدعوى'
];

const DECISIONS = [
  'تأجيل نظر الدعوى لجلسة قادمة مع استمرار قيدها',
  'حجز الدعوى للحكم مع التصريح بمذكرات ختامية في أسبوعين',
  'إحالة الدعوى لمكتب خبراء وزارة العدل لندب خبير هندسي',
  'تغريم المتسبب في التأخير وإلزامه بتقديم المستند المطلوب',
  'انتداب قسم أبحاث التزييف والتزوير للطعن بالجهالة والإنكار'
];

const TASK_TITLES = [
  'استخراج شهادة بيانات من جدول المحكمة المقيد به الدعوى',
  'سداد أمانة الخبير بخزينة المحكمة وتقديم إيصال السداد',
  'متابعة إحالة ملف القضية إلى مكتب الخبراء المختص',
  'إعلان صحيفة الدعوى وإعادة إعلان الخصوم قلم المحضرين',
  'استلام الصورة التنفيذية المزيلة بالصيغة التنفيذية الرسمية',
  'استخراج صورة رسمية طبق الأصل من محضر الجلسة السابقة',
  'قيد صحيفة الاستئناف بسكرتارية قلم كتاب المحكمة',
  'استخراج شهادة بعدم حصول استئناف أو نقض في الحكم'
];

// دالة توليد تاريخ عشوائي بين 2023 و 2026
function randomDate(prng, startYear = 2024, endYear = 2026) {
  const y = Math.floor(prng() * (endYear - startYear + 1)) + startYear;
  const m = Math.floor(prng() * 12) + 1;
  const maxD = m === 2 ? 28 : [4, 6, 9, 11].includes(m) ? 30 : 31;
  const d = Math.floor(prng() * maxD) + 1;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function pick(prng, arr) {
  return arr[Math.floor(prng() * arr.length)];
}

/**
 * الوظيفة الرئيسية لتوليد البيانات (Seed)
 */
function seedDatabase(options = {}) {
  const size = options.size || 'small';
  const seedNum = options.seed || 123456789;
  const prng = createPrng(seedNum);

  let targetDbPath = options.dbPath;
  if (!targetDbPath) {
    targetDbPath = path.join(__dirname, `seed_${size}.db`);
  }

  if (fs.existsSync(targetDbPath) && !options.preserveExisting) {
    try { fs.unlinkSync(targetDbPath); } catch (e) {}
  }

  const db = new Database(targetDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = OFF'); // تسريع أقصى لعمليات الـ bulk insert

  // تطبيق المهاجرات الـ 8
  const migrationsDir = path.join(__dirname, '..', 'src', 'main', 'database', 'migrations');
  const migrationFiles = [
    '001_initial.sql',
    '002_clients_and_cases.sql',
    '003_hearings_and_timeline.sql',
    '004_financial_system.sql',
    '005_executions.sql',
    '006_tasks.sql',
    '007_documents_and_notes.sql',
    '008_security_and_audit.sql',
    '009_performance_indexes.sql'
  ];

  for (const f of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    db.exec(sql);
  }

  // تحديد أعداد البيانات حسب الحجم
  const isEmpty = size === 'empty';
  const isLarge = size === 'large';
  const counts = {
    clients: isEmpty ? 0 : (isLarge ? 2000 : 25),
    cases: isEmpty ? 0 : (isLarge ? 10000 : 50),
    hearings: isEmpty ? 0 : (isLarge ? 100000 : 150),
    transactions: isEmpty ? 0 : (isLarge ? 50000 : 100),
    executions: isEmpty ? 0 : (isLarge ? 2000 : 15),
    tasks: isEmpty ? 0 : (isLarge ? 5000 : 40),
  };

  console.log(`[Seed] بدء توليد البيانات بالحجم: ${size} (بذرة: ${seedNum}) إلى ${targetDbPath}...`);
  const startTime = Date.now();

  const insertAll = db.transaction(() => {
    // 1. توليد الموكلين
    const insertClient = db.prepare(`
      INSERT INTO clients (name, client_type, national_id_or_cr, phone, poa_number, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `);

    for (let i = 1; i <= counts.clients; i++) {
      const isCompany = prng() < 0.2;
      const name = isCompany
        ? `${pick(prng, COMPANIES)} فرع ${i}`
        : `${pick(prng, FIRST_NAMES)} ${pick(prng, FIRST_NAMES)} ${pick(prng, LAST_NAMES)}`;
      const type = isCompany ? 'company' : 'individual';
      const idOrCr = isCompany ? `CR-${100000 + i}` : `29${String(i).padStart(12, '0')}`;
      const phone = `010${String(10000000 + i).slice(-8)}`;
      const poa = `${1000 + i} توثيق قضايا`;

      insertClient.run(name, type, idOrCr, phone, poa);
    }

    // 2. توليد القضايا
    const insertCase = db.prepare(`
      INSERT INTO cases (case_number, case_year, court_name, court_circuit, court_degree, case_type, subject, status, priority, filing_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCaseClient = db.prepare(`
      INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary)
      VALUES (?, ?, 'مدعي', 1)
    `);

    const insertAgreement = db.prepare(`
      INSERT INTO case_fee_agreements (case_id, client_id, agreement_type, total_amount)
      VALUES (?, ?, 'مبلغ إجمالي ثابت', ?)
    `);

    const caseIds = [];
    const statuses = ['متداولة', 'متداولة', 'متداولة', 'محجوزة للحكم', 'محكوم فيها', 'مؤرشفة'];
    const priorities = ['عادية', 'مهمة', 'عاجلة'];

    for (let i = 1; i <= counts.cases; i++) {
      const caseNum = String(1000 + (i % 8000));
      const caseYear = 2023 + (i % 4);
      const court = pick(prng, COURTS);
      const circuit = pick(prng, CIRCUITS);
      const cType = pick(prng, CASE_TYPES);
      const subject = pick(prng, SUBJECTS);
      const status = pick(prng, statuses);
      const priority = pick(prng, priorities);
      const filingDate = randomDate(prng, 2023, 2025);

      const res = insertCase.run(
        caseNum,
        caseYear,
        court,
        circuit,
        'ابتدائي',
        cType,
        subject,
        status,
        priority,
        filingDate
      );
      const caseId = res.lastInsertRowid;
      caseIds.push(caseId);

      // ربط بالموكل
      const clientId = (i % counts.clients) + 1;
      insertCaseClient.run(caseId, clientId);

      // اتفاقية أتعاب لكل قضية (بين 5000 و 50000 جنيه)
      const agreedFees = (Math.floor(prng() * 45) + 5) * 1000;
      insertAgreement.run(caseId, clientId, agreedFees);
    }

    // 3. توليد الجلسات
    const insertHearing = db.prepare(`
      INSERT INTO hearings (case_id, hearing_date, court_name, court_circuit, court_hall, status, court_decision, adjournment_reason, attended)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const hearingStatuses = ['تمت', 'مؤجلة', 'مؤجلة', 'محددة', 'محجوزة للحكم', 'صدر حكم'];

    for (let i = 1; i <= counts.hearings; i++) {
      const cId = caseIds[i % caseIds.length];
      const hDate = randomDate(prng, 2024, 2026);
      const court = pick(prng, COURTS);
      const circuit = pick(prng, CIRCUITS);
      const hall = `قاعة ${Math.floor(prng() * 10) + 1}`;
      const status = pick(prng, hearingStatuses);
      const decision = pick(prng, DECISIONS);
      const reason = status === 'مؤجلة' ? pick(prng, ADJOURNMENT_REASONS) : null;
      const attended = prng() > 0.3 ? 1 : 0;

      insertHearing.run(cId, hDate, court, circuit, hall, status, decision, reason, attended);
    }

    // 4. توليد الحركات المالية
    const insertTx = db.prepare(`
      INSERT INTO financial_transactions (
        receipt_number, case_id, client_id, transaction_date, category,
        transaction_type, direction, amount, payment_method, description, is_reversed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'نقدي', ?, 0)
    `);

    const categories = ['أتعاب', 'رسوم قضائية', 'مصاريف', 'تنفيذ'];

    for (let i = 1; i <= counts.transactions; i++) {
      const cId = caseIds[i % caseIds.length];
      const clId = (i % counts.clients) + 1;
      const date = randomDate(prng, 2024, 2026);
      const cat = pick(prng, categories);
      const direction = cat === 'أتعاب' ? 'وارد' : prng() > 0.5 ? 'وارد' : 'صادر';
      const amount = (Math.floor(prng() * 40) + 1) * 250; // مضاعفات 250 جنيه
      const receiptNo = `REC-2026-${String(i).padStart(5, '0')}`;
      const desc = `${cat} - سداد دفعة إيصال رقم ${i}`;

      insertTx.run(receiptNo, cId, clId, date, cat, `سداد ${cat}`, direction, amount, desc);
    }

    // 5. توليد ملفات التنفيذ
    const insertExec = db.prepare(`
      INSERT INTO execution_files (
        file_number, year, case_id, client_id, deed_type, court,
        applicant_name, enforced_against, total_claimed_amount, collected_amount, status
      ) VALUES (?, 2026, ?, ?, 'حكم', ?, 'طالب التنفيذ', 'المنفذ ضده', ?, ?, 'جاري')
    `);

    for (let i = 1; i <= counts.executions; i++) {
      const cId = caseIds[i % caseIds.length];
      const clId = (i % counts.clients) + 1;
      const fileNum = String(2000 + i);
      const court = pick(prng, COURTS);
      const claimed = (Math.floor(prng() * 80) + 20) * 1000;
      const collected = Math.floor(prng() * claimed);

      insertExec.run(fileNum, cId, clId, court, claimed, collected);
    }

    // 6. توليد المهام
    const insertTask = db.prepare(`
      INSERT INTO tasks (title, case_id, client_id, category, priority, due_date, status, assigned_to)
      VALUES (?, ?, ?, 'مأمورية محكمة', 'عادية', ?, 'جديدة', 'أنا')
    `);

    for (let i = 1; i <= counts.tasks; i++) {
      const cId = caseIds[i % caseIds.length];
      const clId = (i % counts.clients) + 1;
      const title = pick(prng, TASK_TITLES);
      const dueDate = randomDate(prng, 2025, 2026);

      insertTask.run(title, cId, clId, dueDate);
    }
  });

  insertAll();
  db.pragma('synchronous = NORMAL');
  db.close();

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✓ [Seed] تم توليد ${counts.cases} قضية، ${counts.hearings} جلسة، ${counts.transactions} حركة بنجاح في ${durationSec} ثانية.`);

  return { targetDbPath, counts, durationSec };
}

// تشغيل مباشر من سطر الأوامر (CLI)
if (require.main === module) {
  const args = process.argv.slice(2);
  let size = 'small';
  let dbPath = null;
  let seed = 123456789;

  for (const arg of args) {
    if (arg.startsWith('--size=')) {
      size = arg.split('=')[1];
    } else if (arg.startsWith('--db=')) {
      dbPath = arg.split('=')[1];
    } else if (arg.startsWith('--seed=')) {
      seed = parseInt(arg.split('=')[1], 10);
    }
  }

  seedDatabase({ size, dbPath, seed });
}

module.exports = { seedDatabase };
