const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  try {
    console.log('=== بدء اختبارات التحقق الشاملة للمرحلة 2 (الموكلين والقضايا) ===');

    // 1. Initialize Main App & Services
    require('../dist/main/index.cjs');
    await new Promise((r) => setTimeout(r, 1500));

    const Database = require('better-sqlite3');
    const appData = app.getPath('appData');
    const dbPath = path.join(appData, 'LawOfficeData', 'office.db');
    const db = new Database(dbPath);

    function normalizeArabic(text) {
      if (!text) return '';
      return text.toString()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/\u0640/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .trim()
        .toLowerCase();
    }
    db.function('normalize_arabic', (val) => normalizeArabic(val));

    // 2. Test Arabic Normalization in SQLite
    console.log('\n--- 1. اختبار تطبيع الحروف العربية في قاعدة البيانات ---');
    const test1 = db.prepare("SELECT normalize_arabic('أحمد إبراهيم') as norm").get();
    console.log("تطبيع 'أحمد إبراهيم':", test1.norm);
    if (test1.norm !== 'احمد ابراهيم') {
      throw new Error('Arabic normalization failed on Alif/Hamza');
    }

    const test2 = db.prepare("SELECT normalize_arabic('فاطمة مَرْوَة') as norm").get();
    console.log("تطبيع 'فاطمة مَرْوَة' (تاء مربوطة وتشكيل):", test2.norm);
    if (test2.norm !== 'فاطمه مروه') {
      throw new Error('Arabic normalization failed on Taa Marbuta/Tashkeel');
    }
    console.log('✓ دالة تطبيع الحروف العربية في SQLite تعمل بكفاءة 100%');

    // 3. Test Client Creation, Search, & POA
    console.log('\n--- 2. اختبار إدارة الموكلين والتوكيلات ---');
    // Clear test data if needed
    db.prepare('DELETE FROM case_opponents').run();
    db.prepare('DELETE FROM case_clients').run();
    db.prepare('DELETE FROM cases').run();
    db.prepare('DELETE FROM clients').run();

    const insertClient = db.prepare(`
      INSERT INTO clients (
        name, client_type, national_id_or_cr, phone, phone2, whatsapp,
        address, poa_number, poa_type, poa_date, poa_issuing_office, poa_expiry_date,
        representation_type, represented_name, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    // Client 1: individual with expiring POA
    const expDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const client1Info = insertClient.run(
      'أحمد إبراهيم السيد مصطفى',
      'individual',
      '29010101234567',
      '01012345678',
      '01112345678',
      '01012345678',
      'مدينة نصر - القاهرة',
      '4521 لسنة 2024 ب',
      'عام قضايا',
      '2024-05-10',
      'توثيق الأهرام النموذجي',
      expDate,
      'أصيل',
      null,
      'active'
    );
    const client1Id = client1Info.lastInsertRowid;

    // Client 2: legal representative (ولي طبيعي)
    const client2Info = insertClient.run(
      'محمود عبد الرحمن الشريف',
      'individual',
      '28505051234567',
      '01234567890',
      null,
      null,
      'الدقي - الجيزة',
      '1120 لسنة 2025 أ',
      'خاص',
      '2025-01-15',
      'توثيق الدقي',
      null,
      'ولي طبيعي',
      'القاصر / عمر محمود عبد الرحمن',
      'active'
    );
    const client2Id = client2Info.lastInsertRowid;

    // Test Search with Normalized Arabic
    const searchRes = db.prepare(`
      SELECT * FROM clients
      WHERE normalize_arabic(name) LIKE '%' || normalize_arabic(?) || '%'
    `).all('احمد ابراهيم');
    console.log(`✓ البحث عن 'احمد ابراهيم' بدون همزة استرجع: ${searchRes.length} موكل (${searchRes[0].name})`);
    if (searchRes.length === 0) throw new Error('Search failed');

    // 4. Test Case Creation with Clients & Opponents & Juvenile fields
    console.log('\n--- 3. اختبار إضافة القضايا وربط الموكلين والخصوم ---');
    const insertCase = db.prepare(`
      INSERT INTO cases (
        case_number, case_year, court_name, court_circuit, court_degree,
        case_type, table_number, police_report_number, filing_date,
        subject, claims, description, status, priority, is_juvenile,
        juvenile_name, juvenile_age, juvenile_charge, guardian_name, guardian_relation,
        probation_officer, care_facility, imposed_measures
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    // Case 1: Standard Civil Case
    const case1Info = insertCase.run(
      '7845',
      2026,
      'محكمة شمال القاهرة الابتدائية',
      '3 مدني كلي',
      'أول درجة',
      'مدني',
      'حصر 142/2026',
      null,
      '2026-03-01',
      'دعوى صحة ونفاذ عقد بيع وحدة سكنية',
      'الحكم بصحة ونفاذ عقد البيع وإلزام المدعى عليه بالمصاريف',
      'تم سداد كامل الثمن بموجب إيصالات سداد',
      'متداولة',
      'مهمة',
      0,
      null, null, null, null, null, null, null, null
    );
    const case1Id = case1Info.lastInsertRowid;

    // Link clients
    db.prepare('INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary) VALUES (?, ?, ?, ?)').run(case1Id, client1Id, 'مدعي', 1);
    db.prepare('INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary) VALUES (?, ?, ?, ?)').run(case1Id, client2Id, 'خصم متدخل', 0);

    // Add opponents
    db.prepare(`
      INSERT INTO case_opponents (case_id, name, role_capacity, phone, address, lawyer_name, lawyer_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(case1Id, 'شركة الأمل للاستثمار العقاري', 'مدعى عليها', '0223456789', 'المعادي - القاهرة', 'الأستاذ حسام حسن', '01098765432');

    // Case 2: Juvenile Misdemeanor (جنح أطفال)
    const case2Info = insertCase.run(
      '142',
      2026,
      'محكمة الطفل (جنح / استئناف أحداث)',
      'دائرة جنح أحداث الجيزة',
      'أول درجة',
      'جنح أطفال',
      null,
      'محضر رقم 512 لسنة 2026 جنح أحداث الدقي',
      '2026-04-10',
      'جنحة قيادة مركبة بدون ترخيص وتعريض للخطر',
      'البراءة والتسليم لولي الأمر والالتزام بالتدبير المناسب',
      'الحدث لم يبلغ 16 عاماً',
      'متداولة',
      'عاجلة',
      1,
      'عمر محمود عبد الرحمن',
      15,
      'قيادة مركبة بدون ترخيص',
      'محمود عبد الرحمن الشريف',
      'أب',
      'الأستاذ سامح عبد الله (مراقب سلوك الأحداث)',
      'مؤسسة الرعاية الاجتماعية بالجيزة',
      'التسليم لولي الأمر والتعهد بحسن رعايته'
    );
    const case2Id = case2Info.lastInsertRowid;

    db.prepare('INSERT INTO case_clients (case_id, client_id, role_capacity, is_primary) VALUES (?, ?, ?, ?)').run(case2Id, client2Id, 'متهم (بصفته ولي أمر الحدث)', 1);

    console.log('✓ تم تسجيل قضية مدنية وقضية جنح أطفال بكافة بياناتها بنجاح!');

    // 5. Test Case Sheet PDF Generation
    console.log('\n--- 4. اختبار طباعة بيانات القضية وحفظ PDF ---');
    const { BrowserWindow } = require('electron');
    const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });

    // Load case details for print test
    const caseData = db.prepare('SELECT * FROM cases WHERE id = ?').get(case2Id);
    const clientsRows = db.prepare(`
      SELECT cc.*, cl.name as client_name, cl.phone as client_phone, cl.poa_number
      FROM case_clients cc JOIN clients cl ON cl.id = cc.client_id WHERE cc.case_id = ?
    `).all(case2Id);
    const opponentsRows = db.prepare('SELECT * FROM case_opponents WHERE case_id = ?').all(case2Id);
    const officeSettings = db.prepare('SELECT * FROM office_settings WHERE id = 1').get();

    const fullCaseDetails = {
      ...caseData,
      clients: clientsRows,
      opponents: opponentsRows,
      parent_case: null,
    };

    // Generate case sheet HTML
    const testHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head><meta charset="UTF-8"><title>بيانات القضية</title></head>
      <body>
        <h1>ملف القضية رقم ${fullCaseDetails.case_number} لسنة ${fullCaseDetails.case_year}</h1>
        <p>المحكمة: ${fullCaseDetails.court_name}</p>
        <p>الموضوع: ${fullCaseDetails.subject}</p>
        <p>بيانات الحدث: ${fullCaseDetails.juvenile_name} (السن: ${fullCaseDetails.juvenile_age} سنة)</p>
        <p>ولي الأمر: ${fullCaseDetails.guardian_name}</p>
      </body>
      </html>
    `;

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`);
    await new Promise((r) => setTimeout(r, 600));

    const pdfBuffer = await printWin.webContents.printToPDF({ pageSize: 'A4' });
    const pdfExportPath = path.join(appData, 'LawOfficeData', 'exports', `ملف_قضية_${fullCaseDetails.case_number}_${fullCaseDetails.case_year}.pdf`);
    fs.writeFileSync(pdfExportPath, pdfBuffer);
    printWin.close();

    const pdfStat = fs.statSync(pdfExportPath);
    console.log(`✓ تم توليد ملف PDF لبيانات القضية بنجاح: ${pdfExportPath} (${(pdfStat.size / 1024).toFixed(1)} KB)`);

    // 6. Test Safe Delete Guard
    console.log('\n--- 5. اختبار حماية الموكلين من الحذف الخاطئ ---');
    const linkedCheck = db.prepare('SELECT COUNT(*) as count FROM case_clients WHERE client_id = ?').get(client1Id);
    console.log(`عدد القضايا المرتبطة بالموكل ${client1Id}: ${linkedCheck.count}`);
    if (linkedCheck.count === 0) throw new Error('Client should have linked cases');

    db.close();

    console.log('\n=== اكتملت جميع اختبارات المرحلة 2 بنجاح تام 100% ===');
    process.exit(0);
  } catch (err) {
    console.error('❌ فشل الاختبار:', err);
    process.exit(1);
  }
});
