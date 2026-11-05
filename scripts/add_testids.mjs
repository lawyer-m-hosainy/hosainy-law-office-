import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths('src/renderer/**/*.tsx');

const INTERACTIVE_TAGS = new Set(['button', 'select', 'textarea', 'input', 'a']);

function getPageName(filePath) {
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  if (rel.includes('App.tsx')) return 'app';
  if (rel.includes('ErrorBoundary')) return 'app';
  if (rel.includes('ExportButton')) return 'export';
  if (rel.includes('Header')) return 'header';
  if (rel.includes('Sidebar')) return 'sidebar';
  if (rel.includes('UniversalSearchModal')) return 'search';
  if (rel.includes('LockScreenModal')) return 'lock';
  if (rel.includes('AnnouncementsPage')) return 'announcements';
  if (rel.includes('CalendarExportModal')) return 'calendar-export';
  if (rel.includes('CalendarPage')) return 'calendar';
  if (rel.includes('CaseDetailsPage')) return 'case';
  if (rel.includes('CasesPage')) return 'cases';
  if (rel.includes('ClientsPage')) return 'clients';
  if (rel.includes('DashboardPage')) return 'dashboard';
  if (rel.includes('ExecutionsPage')) return 'executions';
  if (rel.includes('FinancePage')) return 'finance';
  if (rel.includes('HearingsPage')) return 'hearings';
  if (rel.includes('ReportsPage')) return 'reports';
  if (rel.includes('SettingsPage')) return 'settings';
  if (rel.includes('TasksPage')) return 'tasks';
  if (rel.includes('TrashBinPage')) return 'trash';
  if (rel.includes('CaseAnnouncementsTab')) return 'case.announcements';
  if (rel.includes('CaseDocumentsTab')) return 'case.documents';
  if (rel.includes('CaseExecutionsTab')) return 'case.executions';
  if (rel.includes('CaseFinanceTab')) return 'case.finance';
  if (rel.includes('CaseHearingsTab')) return 'case.hearings';
  if (rel.includes('CaseTasksTab')) return 'case.tasks';
  if (rel.includes('CaseTimelineTab')) return 'case.timeline';
  if (rel.includes('AuditLogsTab')) return 'settings.audit';
  if (rel.includes('BackupSettingsTab')) return 'settings.backup';
  if (rel.includes('SecuritySettingsTab')) return 'settings.security';
  return 'unknown';
}

function extractAction(handlerText) {
  const patterns = [
    /handle(\w+)/i, /set(\w+)/i, /on(\w+)/i, /toggle(\w+)/i,
    /open(\w+)/i, /close(\w+)/i, /delete(\w+)/i, /create(\w+)/i,
    /save(\w+)/i, /submit(\w+)/i, /cancel(\w+)/i, /load(\w+)/i,
    /fetch(\w+)/i, /navigate(\w+)/i,
  ];
  for (const p of patterns) {
    const m = handlerText.match(p);
    if (m) return camelToKebab(m[0]);
  }
  return null;
}

function camelToKebab(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase();
}

function getTextContent(el) {
  const parent = el.getParent();
  if (!parent) return '';
  const jsxElement = parent.getKind() === SyntaxKind.JsxElement ? parent : null;
  if (jsxElement) {
    const children = jsxElement.getJsxChildren();
    for (const child of children) {
      if (child.getKind() === SyntaxKind.JsxText) {
        const t = child.getText().trim();
        if (t.length > 0 && t.length < 60) return t;
      }
      if (child.getKind() === SyntaxKind.JsxElement) {
        try {
          const innerChildren = child.getJsxChildren ? child.getJsxChildren() : [];
          for (const ic of innerChildren) {
            if (ic.getKind() === SyntaxKind.JsxText) {
              const t = ic.getText().trim();
              if (t.length > 0 && t.length < 60) return t;
            }
          }
        } catch(e) {}
      }
    }
  }
  return '';
}

function arabicToAction(arabicText) {
  const map = {
    'إضافة موكل': 'add-client', 'إضافة قضية': 'add-case', 'إضافة جلسة': 'add-hearing',
    'إضافة مهمة': 'add-task', 'إضافة حركة': 'add-transaction', 'إضافة مستند': 'add-document',
    'إضافة ملاحظة': 'add-note', 'إضافة إعلان': 'add-announcement', 'إضافة إجراء': 'add-action',
    'إضافة تنفيذ': 'add-execution',
    'إضافة': 'add', 'حفظ': 'save', 'حذف': 'delete', 'تعديل': 'edit',
    'بحث': 'search', 'طباعة': 'print', 'إلغاء': 'cancel', 'تصدير': 'export',
    'إغلاق': 'close', 'فتح': 'open', 'عرض': 'view', 'تأكيد': 'confirm',
    'إعادة': 'retry', 'تحديث': 'refresh', 'رجوع': 'back', 'التالي': 'next',
    'السابق': 'prev', 'تطبيق': 'apply', 'نسخ': 'copy', 'استعادة': 'restore',
    'قفل': 'lock', 'دخول': 'login', 'مجلد البيانات': 'data-dir',
    'بحث شامل': 'universal-search', 'تفريغ': 'empty', 'استرجاع': 'recover',
    'إعادة المحاولة': 'retry', 'مسح': 'clear',
    'الرئيسية': 'nav-dashboard', 'الموكلين': 'nav-clients', 'القضايا': 'nav-cases',
    'الجلسات': 'nav-hearings', 'التقويم': 'nav-calendar', 'المالية': 'nav-finance',
    'التنفيذات': 'nav-executions', 'المهام': 'nav-tasks', 'التقارير': 'nav-reports',
    'الإعدادات': 'nav-settings', 'سلة المحذوفات': 'nav-trash',
  };
  for (const [ar, en] of Object.entries(map)) {
    if (arabicText.includes(ar)) return en;
  }
  return null;
}

const usedTestIds = new Map();
function makeUniqueTestId(base) {
  const count = usedTestIds.get(base) || 0;
  usedTestIds.set(base, count + 1);
  if (count === 0) return base;
  return `${base}-${count + 1}`;
}

const inventory = [];

// Process each file separately
for (const sf of project.getSourceFiles()) {
  const rel = path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g, '/');
  const pageName = getPageName(sf.getFilePath());
  
  const elements = [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  // Collect all insertions for this file: { position, testId }
  const insertions = [];
  let fileElementIndex = 0;

  for (const el of elements) {
    const tagName = el.getTagNameNode().getText();
    const onClickAttr = el.getAttribute('onClick');
    const onChangeAttr = el.getAttribute('onChange');
    const isInteractiveTag = INTERACTIVE_TAGS.has(tagName);
    const isInteractive = isInteractiveTag || Boolean(onClickAttr);

    if (!isInteractive) continue;
    if (el.getAttribute('data-testid')) continue;

    fileElementIndex++;

    const handler = onClickAttr || onChangeAttr;
    let handlerName = '';
    let handlerText = '';
    if (handler) {
      const init = handler.getInitializer();
      if (init) {
        handlerText = init.getText();
        const fnMatch = handlerText.match(/\{?\s*(?:\(\)\s*=>\s*)?(\w+)/);
        if (fnMatch) handlerName = fnMatch[1];
      }
    }

    const textContent = getTextContent(el);
    let section = pageName.includes('.') ? 'tab' : 'main';
    let action = '';

    if (handlerText) {
      const extracted = extractAction(handlerText);
      if (extracted) action = extracted;
    }

    if (!action && textContent) {
      const fromArabic = arabicToAction(textContent);
      if (fromArabic) action = fromArabic;
    }

    if (!action) {
      const titleAttr = el.getAttribute('title');
      if (titleAttr) {
        const titleInit = titleAttr.getInitializer();
        if (titleInit) {
          const titleText = titleInit.getText().replace(/['"{}]/g, '');
          const fromArabic = arabicToAction(titleText);
          if (fromArabic) action = fromArabic;
        }
      }
    }

    if (!action && tagName === 'input') {
      const typeAttr = el.getAttribute('type');
      if (typeAttr) {
        const typeInit = typeAttr.getInitializer();
        if (typeInit) {
          const typeText = typeInit.getText().replace(/['"]/g, '');
          action = `input-${typeText}`;
        }
      } else { action = 'input-text'; }
    }
    if (!action && tagName === 'select') action = 'select';
    if (!action && tagName === 'textarea') action = 'textarea';
    if (!action && tagName === 'a') action = 'link';
    if (!action) action = `${tagName}-${fileElementIndex}`;

    action = action.replace(/[^\w-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);

    const testIdBase = `${pageName}.${section}.${action}`;
    const testId = makeUniqueTestId(testIdBase);
    
    const lineNum = el.getStartLineNumber();

    // Find position to insert: after last attribute, or after tag name
    const attrs = el.getAttributes();
    let insertPos;
    if (attrs.length > 0) {
      insertPos = attrs[attrs.length - 1].getEnd();
    } else {
      insertPos = el.getTagNameNode().getEnd();
    }

    insertions.push({ position: insertPos, testId, lineNum });

    // Determine IPC channel from handler text
    let ipcChannel = '-';
    const ipcMatch = handlerText.match(/electronAPI\.(\w+)/);
    if (ipcMatch) ipcChannel = ipcMatch[1];

    inventory.push({
      page: pageName,
      section,
      testId,
      tagName,
      handlerName: handlerName || '-',
      ipcChannel,
      textContent: textContent.slice(0, 50) || '-',
      file: rel,
      line: lineNum,
    });
  }

  // Apply insertions in reverse order (bottom to top) to preserve positions
  insertions.sort((a, b) => b.position - a.position);
  for (const ins of insertions) {
    sf.insertText(ins.position, ` data-testid="${ins.testId}"`);
  }
}

project.saveSync();

console.log(`Added data-testid to ${inventory.length} elements across ${project.getSourceFiles().length} files.`);

// Write inventory JSON
fs.writeFileSync('scripts/inventory.json', JSON.stringify(inventory, null, 2));
console.log('Inventory written to scripts/inventory.json');
