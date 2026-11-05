import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';

const project = new Project({ tsConfigFilePath: 'tsconfig.json', skipAddingFilesFromTsConfig: true });
project.addSourceFilesAtPaths('src/renderer/**/*.tsx');

const INTERACTIVE_TAGS = new Set(['button', 'select', 'textarea', 'input', 'a']);

const pageNameMap = {
  'App.tsx': 'app', 'ErrorBoundary.tsx': 'app', 'ExportButton.tsx': 'export',
  'Header.tsx': 'header', 'Sidebar.tsx': 'sidebar', 'UniversalSearchModal.tsx': 'search',
  'LockScreenModal.tsx': 'lock', 'AnnouncementsPage.tsx': 'announcements',
  'CalendarExportModal.tsx': 'calendar-export', 'CalendarPage.tsx': 'calendar',
  'CaseDetailsPage.tsx': 'case', 'CasesPage.tsx': 'cases',
  'ClientsPage.tsx': 'clients', 'DashboardPage.tsx': 'dashboard',
  'ExecutionsPage.tsx': 'executions', 'FinancePage.tsx': 'finance',
  'HearingsPage.tsx': 'hearings', 'ReportsPage.tsx': 'reports',
  'SettingsPage.tsx': 'settings', 'TasksPage.tsx': 'tasks', 'TrashBinPage.tsx': 'trash',
  'CaseAnnouncementsTab.tsx': 'case.announcements', 'CaseDocumentsTab.tsx': 'case.documents',
  'CaseExecutionsTab.tsx': 'case.executions', 'CaseFinanceTab.tsx': 'case.finance',
  'CaseHearingsTab.tsx': 'case.hearings', 'CaseTasksTab.tsx': 'case.tasks',
  'CaseTimelineTab.tsx': 'case.timeline', 'AuditLogsTab.tsx': 'settings.audit',
  'BackupSettingsTab.tsx': 'settings.backup', 'SecuritySettingsTab.tsx': 'settings.security',
};

const pageLabelsAr = {
  'app': 'التطبيق', 'export': 'التصدير', 'header': 'الشريط العلوي',
  'sidebar': 'القائمة الجانبية', 'search': 'البحث الشامل', 'lock': 'شاشة القفل',
  'announcements': 'الإعلانات والمحضرين', 'calendar-export': 'تصدير التقويم',
  'calendar': 'التقويم', 'case': 'تفاصيل القضية', 'cases': 'قائمة القضايا',
  'clients': 'الموكلين', 'dashboard': 'لوحة اليوم', 'executions': 'التنفيذات',
  'finance': 'المالية', 'hearings': 'الجلسات', 'reports': 'التقارير',
  'settings': 'الإعدادات', 'tasks': 'المهام', 'trash': 'سلة المحذوفات',
  'case.announcements': 'تبويب إعلانات القضية', 'case.documents': 'تبويب مستندات القضية',
  'case.executions': 'تبويب تنفيذات القضية', 'case.finance': 'تبويب مالية القضية',
  'case.hearings': 'تبويب جلسات القضية', 'case.tasks': 'تبويب مهام القضية',
  'case.timeline': 'تبويب الخط الزمني', 'settings.audit': 'تبويب سجل التدقيق',
  'settings.backup': 'تبويب النسخ الاحتياطي', 'settings.security': 'تبويب الأمان',
};

const elementTypeAr = {
  'button': 'زرار', 'select': 'قائمة اختيار', 'input': 'حقل إدخال',
  'textarea': 'حقل نص', 'a': 'رابط',
};

const inventory = [];

for (const sf of project.getSourceFiles()) {
  const baseName = sf.getBaseName();
  const pageName = pageNameMap[baseName] || 'unknown';
  const rel = path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g, '/');

  const elements = [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  for (const el of elements) {
    const tagName = el.getTagNameNode().getText();
    const onClickAttr = el.getAttribute('onClick');
    const onChangeAttr = el.getAttribute('onChange');
    const isInteractive = INTERACTIVE_TAGS.has(tagName) || Boolean(onClickAttr);
    if (!isInteractive) continue;

    const testIdAttr = el.getAttribute('data-testid');
    let testId = '-';
    if (testIdAttr && testIdAttr.getInitializer()) {
      testId = testIdAttr.getInitializer().getText().replace(/['"]/g, '');
    }

    // Handler
    const handler = onClickAttr || onChangeAttr;
    let handlerName = '-';
    let handlerText = '';
    if (handler && handler.getInitializer()) {
      handlerText = handler.getInitializer().getText();
      // Extract meaningful function ref
      const fnMatch = handlerText.match(/(?:handle|set|on|toggle|open|close|delete|create|save|submit|cancel|load|fetch|navigate|lock|unlock|apply|export|print|reload|refresh|recover|empty)\w*/i);
      if (fnMatch) handlerName = fnMatch[0];
      else {
        const arrowMatch = handlerText.match(/=>\s*(\w+)\(/);
        if (arrowMatch) handlerName = arrowMatch[1];
      }
    }

    // IPC channel
    let ipcChannel = '-';
    const ipcMatch = handlerText.match(/electronAPI\.(\w+)/);
    if (ipcMatch) ipcChannel = ipcMatch[1];

    // Element type
    let elType = elementTypeAr[tagName] || 'عنصر تفاعلي';
    if (tagName === 'input') {
      const typeAttr = el.getAttribute('type');
      if (typeAttr && typeAttr.getInitializer()) {
        const t = typeAttr.getInitializer().getText().replace(/['"]/g, '');
        if (t === 'checkbox') elType = 'خانة اختيار';
        else if (t === 'file') elType = 'حقل ملف';
        else if (t === 'date') elType = 'حقل تاريخ';
        else if (t === 'time') elType = 'حقل وقت';
        else if (t === 'number') elType = 'حقل رقمي';
        else if (t === 'password') elType = 'حقل كلمة مرور';
        else if (t === 'submit') elType = 'زرار إرسال';
      }
    }
    if (tagName === 'button' && !onClickAttr) {
      const typeAttr = el.getAttribute('type');
      if (typeAttr && typeAttr.getInitializer()) {
        const t = typeAttr.getInitializer().getText().replace(/['"]/g, '');
        if (t === 'submit') elType = 'زرار إرسال';
      }
    }
    // If div/span with onClick, it's a clickable element
    if (!INTERACTIVE_TAGS.has(tagName) && onClickAttr) {
      elType = `${tagName} قابل للضغط`;
    }

    // Text content for context
    let textContent = '';
    const parent = el.getParent();
    if (parent && parent.getKind() === SyntaxKind.JsxElement) {
      try {
        const children = parent.getJsxChildren();
        for (const child of children) {
          if (child.getKind() === SyntaxKind.JsxText) {
            const t = child.getText().trim();
            if (t.length > 0 && t.length < 80) { textContent = t; break; }
          }
          if (child.getKind() === SyntaxKind.JsxElement) {
            try {
              for (const ic of child.getJsxChildren()) {
                if (ic.getKind() === SyntaxKind.JsxText) {
                  const t = ic.getText().trim();
                  if (t.length > 0 && t.length < 80) { textContent = t; break; }
                }
              }
            } catch(e) {}
            if (textContent) break;
          }
        }
      } catch(e) {}
    }

    inventory.push({
      page: pageName,
      pageAr: pageLabelsAr[pageName] || pageName,
      testId,
      elType,
      tagName,
      handlerName,
      ipcChannel,
      textContent: textContent.slice(0, 50),
      file: rel,
      line: el.getStartLineNumber(),
    });
  }
}

// Write full inventory
fs.writeFileSync('scripts/full_inventory.json', JSON.stringify(inventory, null, 2));
console.log(`Full inventory: ${inventory.length} elements`);

// Page summary
const pageSummary = {};
for (const item of inventory) {
  if (!pageSummary[item.page]) pageSummary[item.page] = { ar: item.pageAr, count: 0 };
  pageSummary[item.page].count++;
}

// Generate FEATURES_INVENTORY.md
let md = `# FEATURES_INVENTORY.md — جرد الوظائف الكامل\n\n`;
md += `> تم التوليد تلقائياً بواسطة تحليل AST (ts-morph) بتاريخ ${new Date().toISOString().slice(0,10)}\n\n`;
md += `## ملخص عام\n\n`;
md += `| المقياس | القيمة |\n|---|---|\n`;
md += `| إجمالي العناصر التفاعلية | **${inventory.length}** |\n`;
md += `| الصفحات / التبويبات | **${Object.keys(pageSummary).length}** |\n`;
md += `| عناصر بها data-testid | **${inventory.filter(i => i.testId !== '-').length}** |\n`;
md += `| عناصر بدون data-testid | **${inventory.filter(i => i.testId === '-').length}** |\n\n`;

md += `## عدد العناصر لكل صفحة\n\n`;
md += `| الصفحة (Page) | الاسم بالعربي | العدد |\n|---|---|---|\n`;
for (const [page, info] of Object.entries(pageSummary).sort((a,b) => b[1].count - a[1].count)) {
  md += `| ${page} | ${info.ar} | ${info.count} |\n`;
}

// Generate per-page tables
md += `\n---\n\n## الجدول التفصيلي لكل صفحة\n\n`;

const groupedByPage = {};
for (const item of inventory) {
  if (!groupedByPage[item.page]) groupedByPage[item.page] = [];
  groupedByPage[item.page].push(item);
}

for (const [page, items] of Object.entries(groupedByPage)) {
  const pageAr = pageLabelsAr[page] || page;
  md += `### ${pageAr} (\`${page}\`) — ${items.length} عنصر\n\n`;
  md += `| # | data-testid | نوع العنصر | اسم الـ handler | قناة IPC | النتيجة المتوقعة |\n`;
  md += `|---|---|---|---|---|---|\n`;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const expected = deriveExpectedOutcome(item);
    md += `| ${idx+1} | \`${item.testId}\` | ${item.elType} | \`${item.handlerName}\` | \`${item.ipcChannel}\` | ${expected} |\n`;
  }
  md += `\n`;
}

fs.writeFileSync('FEATURES_INVENTORY.md', md);
console.log('FEATURES_INVENTORY.md written successfully.');

// Expected outcome derivation
function deriveExpectedOutcome(item) {
  const h = item.handlerName.toLowerCase();
  const t = item.testId.toLowerCase();
  const txt = item.textContent;

  // Navigation
  if (h.includes('navigate') || h.includes('settab') || h.includes('setactivetab') || h.includes('ontabchange')) {
    if (t.includes('nav-')) return 'ينتقل إلى الصفحة المقابلة';
    return 'يغيّر التبويب أو الصفحة المعروضة';
  }
  
  // Search
  if (t.includes('search') || h.includes('search')) return 'يبحث ويعرض النتائج المطابقة';
  if (t.includes('universal-search')) return 'يفتح نافذة البحث الشامل (Ctrl+K)';

  // Add / Create
  if (h.includes('create') || h.includes('add') || t.includes('add')) {
    if (t.includes('client')) return 'يفتح نافذة إضافة موكل جديد';
    if (t.includes('case')) return 'يفتح نافذة إضافة قضية جديدة';
    if (t.includes('hearing')) return 'يفتح نافذة إضافة جلسة جديدة';
    if (t.includes('transaction') || t.includes('finance')) return 'يفتح نافذة إضافة حركة مالية';
    if (t.includes('task')) return 'يفتح نافذة إضافة مهمة جديدة';
    if (t.includes('document')) return 'يفتح نافذة رفع مستند';
    if (t.includes('execution')) return 'يفتح نافذة إضافة ملف تنفيذ';
    if (t.includes('announcement')) return 'يفتح نافذة إضافة إعلان جديد';
    if (t.includes('note')) return 'يضيف ملاحظة جديدة';
    if (t.includes('action')) return 'يضيف إجراء تنفيذ جديد';
    if (t.includes('template')) return 'يفتح نافذة إنشاء قالب مهام';
    if (t.includes('checklist')) return 'يضيف بند فرعي للمهمة';
    return 'يفتح نافذة إضافة عنصر جديد';
  }

  // Save / Submit
  if (h.includes('save') || h.includes('submit') || t.includes('save')) {
    if (t.includes('client')) return 'يحفظ بيانات الموكل ويحدّث القائمة ورسالة نجاح';
    if (t.includes('case')) return 'يحفظ بيانات القضية ويحدّث القائمة ورسالة نجاح';
    if (t.includes('hearing')) return 'يحفظ بيانات الجلسة ويولّد الجلسة القادمة تلقائياً';
    if (t.includes('setting')) return 'يحفظ الإعدادات المعدّلة';
    if (t.includes('password')) return 'يحفظ كلمة المرور الجديدة مشفرة بـ bcrypt';
    return 'يحفظ البيانات ويُظهر رسالة نجاح';
  }

  // Delete
  if (h.includes('delete') || t.includes('delete')) {
    if (t.includes('finance') || t.includes('transaction')) return 'يلغي الحركة بقيد عكسي (لا حذف نهائي)';
    return 'ينقل العنصر لسلة المحذوفات بعد تأكيد';
  }

  // Edit / Update
  if (h.includes('edit') || h.includes('update') || t.includes('edit')) return 'يفتح نافذة تعديل العنصر';

  // Print
  if (h.includes('print') || t.includes('print')) {
    if (t.includes('roll')) return 'يولّد رول الجلسات PDF للطباعة';
    if (t.includes('receipt')) return 'يولّد إيصال استلام نقدية مرقم PDF';
    if (t.includes('statement')) return 'يولّد كشف حساب موكل PDF';
    if (t.includes('case-file')) return 'يولّد ملف القضية الكامل PDF';
    return 'يولّد تقرير PDF قابل للطباعة';
  }

  // Export
  if (h.includes('export') || t.includes('export')) {
    if (t.includes('excel') || t.includes('csv')) return 'يصدّر البيانات كملف Excel/CSV';
    if (t.includes('pdf')) return 'يصدّر كملف PDF';
    if (t.includes('ics') || t.includes('calendar')) return 'يصدّر التقويم كملف ICS';
    return 'يصدّر البيانات بالصيغة المطلوبة';
  }

  // Backup / Restore
  if (t.includes('backup') || h.includes('backup')) return 'ينشئ نسخة احتياطية كاملة';
  if (t.includes('restore') || h.includes('restore')) return 'يستعيد قاعدة البيانات من نسخة احتياطية';

  // Lock / Unlock
  if (t.includes('lock') || h.includes('lock')) return 'يقفل البرنامج بكلمة المرور';
  if (t.includes('unlock') || h.includes('unlock')) return 'يفتح قفل البرنامج';

  // Close / Cancel
  if (h.includes('close') || h.includes('cancel') || t.includes('cancel') || t.includes('close')) return 'يغلق النافذة بدون حفظ';

  // Toggle
  if (h.includes('toggle')) return 'يبدّل الحالة (تفعيل/تعطيل)';

  // Filter
  if (t.includes('filter') || t.includes('select')) return 'يفلتر البيانات المعروضة';

  // Open
  if (h.includes('open') || t.includes('open')) {
    if (t.includes('data-dir')) return 'يفتح مجلد بيانات البرنامج في المستكشف';
    if (t.includes('file')) return 'يفتح الملف المحدد';
    return 'يفتح النافذة أو العنصر';
  }

  // Recover / Trash
  if (t.includes('recover') || h.includes('recover')) return 'يسترجع العنصر من سلة المحذوفات';
  if (t.includes('empty') || h.includes('empty')) return 'يفرّغ سلة المحذوفات نهائياً بعد تأكيد';

  // Apply template
  if (t.includes('template') || h.includes('template')) return 'يطبّق قالب المهام على القضية';

  // Retry
  if (t.includes('retry') || h.includes('retry') || h.includes('reload')) return 'يعيد المحاولة / يحدّث البيانات';

  // Input fields
  if (item.elType.includes('حقل') || item.elType.includes('قائمة')) {
    if (t.includes('input-date')) return 'يختار تاريخ';
    if (t.includes('input-number')) return 'يدخل قيمة رقمية';
    if (t.includes('input-checkbox')) return 'يحدد / يلغي تحديد الخيار';
    if (t.includes('input-file')) return 'يختار ملف لرفعه';
    if (t.includes('input-password')) return 'يدخل كلمة المرور';
    return 'يدخل / يعدّل قيمة الحقل';
  }

  // Collect / Bounce cheque
  if (t.includes('collect') || h.includes('collect')) return 'يحصّل الشيك ويحدّث الحالة';
  if (t.includes('bounce') || h.includes('bounce')) return 'يسجّل ارتداد الشيك';

  // Default
  return 'يتفاعل مع العنصر حسب السياق';
}
