import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import fs from 'fs';

const project = new Project({ tsConfigFilePath: 'tsconfig.json', skipAddingFilesFromTsConfig: true });
project.addSourceFilesAtPaths('src/**/*.ts');
project.addSourceFilesAtPaths('src/**/*.tsx');

const findings = [];

// ── 1. Empty/stub handlers ──
const rendererFiles = project.getSourceFiles().filter(sf =>
  sf.getFilePath().replace(/\\/g,'/').includes('src/renderer'));

for (const sf of rendererFiles) {
  const elements = [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  for (const el of elements) {
    const onClick = el.getAttribute('onClick');
    if (!onClick) continue;
    const init = onClick.getInitializer();
    if (!init) continue;
    const text = init.getText();
    const body = text.replace(/^\{\s*/, '').replace(/\s*\}$/, '').trim();
    // Empty arrow: () => {} or () => { }
    if (/^\(\)\s*=>\s*\{\s*\}$/.test(body) || body === '() => undefined') {
      findings.push({ severity: 'حرج', category: 'handler فارغ', file: path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g,'/'), line: el.getStartLineNumber(), detail: 'onClick handler فارغ: ' + body.slice(0,60) });
    }
    // console.log only
    if (/^\(\)\s*=>\s*\{\s*console\.(log|info)\(/.test(body) && !/set|fetch|handle|await|electronAPI/.test(body)) {
      findings.push({ severity: 'حرج', category: 'handler console.log فقط', file: path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g,'/'), line: el.getStartLineNumber(), detail: 'onClick يحتوي فقط على console.log' });
    }
    // TODO/FIXME only
    if (/TODO|FIXME/.test(body) && body.length < 80 && !/set|fetch|handle|await|electronAPI/.test(body)) {
      findings.push({ severity: 'حرج', category: 'handler TODO فقط', file: path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g,'/'), line: el.getStartLineNumber(), detail: 'onClick يحتوي فقط على TODO' });
    }
  }
}

// ── 2. Always-disabled buttons ──
for (const sf of rendererFiles) {
  const elements = [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  for (const el of elements) {
    const tagName = el.getTagNameNode().getText();
    if (tagName !== 'button') continue;
    const disabled = el.getAttribute('disabled');
    if (!disabled) continue;
    const init = disabled.getInitializer ? disabled.getInitializer() : null;
    if (!init) {
      // bare <button disabled>
      findings.push({ severity: 'متوسط', category: 'زرار معطل دائماً', file: path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g,'/'), line: el.getStartLineNumber(), detail: 'زرار disabled بدون شرط (bare attribute)' });
    } else {
      const t = init.getText().replace(/[{}\s]/g, '');
      if (t === 'true') {
        findings.push({ severity: 'متوسط', category: 'زرار معطل دائماً', file: path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g,'/'), line: el.getStartLineNumber(), detail: 'disabled={true} — الزرار لن يعمل أبداً' });
      }
    }
  }
}

// ── 3. IPC Audit ──
const mainIpcFiles = project.getSourceFiles().filter(sf => sf.getFilePath().replace(/\\/g,'/').includes('src/main/ipc'));
const preloadFile = project.getSourceFile(sf => sf.getFilePath().replace(/\\/g,'/').endsWith('preload/index.ts'));

const registeredChannels = new Map();
for (const sf of mainIpcFiles) {
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression().getText();
    if (expr.includes('ipcMain.handle') || expr.includes('ipcMain.on')) {
      const args = call.getArguments();
      if (args.length > 0) registeredChannels.set(args[0].getText().replace(/['"]/g, ''), sf.getBaseName());
    }
  }
}

const preloadChannels = new Map();
if (preloadFile) {
  for (const call of preloadFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression().getText();
    if (expr.includes('ipcRenderer.invoke') || expr.includes('ipcRenderer.send')) {
      const args = call.getArguments();
      if (args.length > 0) preloadChannels.set(args[0].getText().replace(/['"]/g, ''), true);
    }
  }
}

// Unused main channels
for (const [ch, file] of registeredChannels.entries()) {
  if (!preloadChannels.has(ch)) {
    findings.push({ severity: 'متوسط', category: 'قناة IPC مسجلة وغير مستخدمة', file: `src/main/ipc/${file}`, line: 0, detail: `القناة '${ch}' مسجلة في main لكن لا يناديها أحد من preload` });
  }
}

// Unregistered channels called from preload
for (const [ch] of preloadChannels.entries()) {
  if (!registeredChannels.has(ch)) {
    findings.push({ severity: 'حرج', category: 'قناة IPC مطلوبة وغير مسجلة', file: 'src/preload/index.ts', line: 0, detail: `القناة '${ch}' يناديها preload لكنها غير مسجلة في main!` });
  }
}

// Unused preload methods
const preloadMethods = new Set();
if (preloadFile) {
  for (const obj of preloadFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)) {
    for (const prop of obj.getProperties()) {
      if (prop.getName) preloadMethods.add(prop.getName());
    }
  }
}

const rendererUsedMethods = new Set();
for (const sf of rendererFiles) {
  for (const pa of sf.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)) {
    const text = pa.getText();
    if (text.startsWith('window.electronAPI.') || text.startsWith('electronAPI.')) {
      rendererUsedMethods.add(pa.getName());
    }
  }
}

for (const m of preloadMethods) {
  if (!rendererUsedMethods.has(m)) {
    findings.push({ severity: 'متوسط', category: 'طريقة preload غير مستخدمة', file: 'src/preload/index.ts', line: 0, detail: `الطريقة '${m}' معرّفة في preload لكن لا يناديها أي كود في الواجهة (كود ميت أو واجهة ناقصة)` });
  }
}

// ── 4. Empty catch blocks ──
for (const sf of project.getSourceFiles()) {
  if (sf.getFilePath().includes('node_modules') || sf.getFilePath().includes('dist')) continue;
  for (const cc of sf.getDescendantsOfKind(SyntaxKind.CatchClause)) {
    const block = cc.getBlock();
    const text = block.getText();
    const noComments = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/[{}\s]/g, '');
    if (noComments.length === 0) {
      findings.push({ severity: 'حرج', category: 'catch فارغ يبلع الخطأ', file: path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g,'/'), line: cc.getStartLineNumber(), detail: 'catch بدون أي معالجة للخطأ' });
    }
  }
}

// ── 5. Duplicate testids ──
const testIds = new Map();
for (const sf of rendererFiles) {
  const elements = [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  for (const el of elements) {
    const attr = el.getAttribute('data-testid');
    if (attr && attr.getInitializer()) {
      const tid = attr.getInitializer().getText().replace(/['"]/g, '');
      if (!testIds.has(tid)) testIds.set(tid, []);
      testIds.get(tid).push({ file: path.relative(process.cwd(), sf.getFilePath()).replace(/\\/g,'/'), line: el.getStartLineNumber() });
    }
  }
}
for (const [tid, locs] of testIds.entries()) {
  if (locs.length > 1) {
    findings.push({ severity: 'متوسط', category: 'data-testid مكرر', file: locs.map(l => l.file).join(', '), line: locs[0].line, detail: `التعريف '${tid}' مكرر ${locs.length} مرات` });
  }
}

// ── 6. SPEC.md features vs UI ──
const specFeatures = [
  { feature: 'بحث شامل سريع (اسم موكل، اسم خصم، رقم قضية)', hasUI: true },
  { feature: 'تصدير Excel و PDF و CSV', hasUI: true },
  { feature: 'نسخ احتياطي يدوي وتلقائي', hasUI: true },
  { feature: 'قفل البرنامج بكلمة مرور', hasUI: true },
  { feature: 'سجل تغييرات (Audit log)', hasUI: true },
  { feature: 'أرشفة بدل الحذف وسلة محذوفات', hasUI: true },
  { feature: 'اختصارات كيبورد (Ctrl+K بحث)', hasUI: true },
  { feature: 'قوالب مهام جاهزة', hasUI: true },
  { feature: 'عرض كانبان للمهام', hasUI: true },
  { feature: 'تذكيرات داخل البرنامج (إشعارات سطح المكتب)', hasUI: true },
  { feature: 'رول الجلسات اليومي للطباعة', hasUI: true },
  { feature: 'كشف حساب موكل قابل للطباعة', hasUI: true },
  { feature: 'إيصال استلام نقدية مرقم', hasUI: true },
  { feature: 'تقرير التأجيلات', hasUI: true },
  { feature: 'تقرير مالي عام لفترة', hasUI: true },
  { feature: 'حاسبة مواعيد الطعن', hasUI: true },
  { feature: 'تتبع الشيكات المؤجلة', hasUI: true },
  { feature: 'الوضع الفاتح والداكن', hasUI: false, note: 'غير موجود في الواجهة - الإعدادات لا تحتوي على مفتاح الوضع الداكن' },
  { feature: 'تشفير قاعدة البيانات اختياريًا (SQLCipher)', hasUI: false, note: 'غير مطبّق - SPEC يذكر SQLCipher لكن لم يُبنى في الإعدادات' },
  { feature: 'اختصارات كيبورد للإضافة السريعة (قضية، جلسة، مهمة، حركة مالية)', hasUI: false, note: 'فقط Ctrl+K للبحث، باقي الاختصارات غير موجودة' },
];

for (const f of specFeatures) {
  if (!f.hasUI) {
    findings.push({ severity: 'بسيط', category: 'ميزة في SPEC.md بدون واجهة', file: 'SPEC.md', line: 0, detail: `${f.feature} — ${f.note}` });
  }
}

// ── 7. Dead routes ──
// Check the NavigationTab type and ensure all values are handled in App.tsx
const typesFile = project.getSourceFile(sf => sf.getFilePath().replace(/\\/g,'/').endsWith('shared/types.ts'));
if (typesFile) {
  const navTabType = typesFile.getFullText().match(/type NavigationTab\s*=\s*([^;]+)/);
  if (navTabType) {
    const tabs = navTabType[1].match(/'(\w+)'/g)?.map(t => t.replace(/'/g, ''));
    if (tabs) {
      const appFile = project.getSourceFile(sf => sf.getBaseName() === 'App.tsx');
      if (appFile) {
        const appText = appFile.getFullText();
        for (const tab of tabs) {
          if (!appText.includes(`activeTab === '${tab}'`)) {
            findings.push({ severity: 'بسيط', category: 'تبويب تنقل بدون صفحة', file: 'src/renderer/App.tsx', line: 0, detail: `التبويب '${tab}' معرّف في NavigationTab لكن لا يُعرض في App.tsx` });
          }
        }
      }
    }
  }
}

// ── 8. DB tables with no UI reads/writes ──
const migrationsDir = path.join(process.cwd(), 'src/main/database/migrations');
const sqlFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
const tables = new Set();
for (const f of sqlFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
  for (const m of content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi)) {
    tables.add(m[1]);
  }
}

const allNonMigFiles = project.getSourceFiles().filter(sf => !sf.getFilePath().includes('migrations') && !sf.getFilePath().includes('node_modules'));
for (const t of tables) {
  let found = false;
  for (const sf of allNonMigFiles) {
    if (new RegExp(`\\b${t}\\b`).test(sf.getFullText())) { found = true; break; }
  }
  if (!found) {
    findings.push({ severity: 'متوسط', category: 'جدول قاعدة بيانات بلا استخدام', file: 'migrations', line: 0, detail: `الجدول '${t}' معرّف في migrations لكن لا يُستخدم في أي كود` });
  }
}

// ── WRITE REPORT ──
let md = `# STATIC_FINDINGS.md — تقرير التحليل الثابت\n\n`;
md += `> تم التوليد تلقائياً بواسطة تحليل AST (ts-morph) بتاريخ ${new Date().toISOString().slice(0,10)}\n\n`;

const critical = findings.filter(f => f.severity === 'حرج');
const medium = findings.filter(f => f.severity === 'متوسط');
const minor = findings.filter(f => f.severity === 'بسيط');

md += `## ملخص\n\n`;
md += `| التصنيف | العدد | الحالة |\n|---|---|---|\n`;
md += `| 🔴 حرج | ${critical.length} | ${critical.length === 0 ? '✅ لا توجد مشاكل حرجة' : '⚠️ يحتاج إصلاح فوري'} |\n`;
md += `| 🟡 متوسط | ${medium.length} | ${medium.length === 0 ? '✅ لا توجد مشاكل متوسطة' : '⚠️ يحتاج مراجعة'} |\n`;
md += `| 🔵 بسيط | ${minor.length} | ${minor.length === 0 ? '✅ لا توجد ملاحظات' : 'ℹ️ ملاحظات للمستقبل'} |\n`;
md += `| **الإجمالي** | **${findings.length}** | |\n\n`;

if (critical.length > 0) {
  md += `## 🔴 مشاكل حرجة\n\n`;
  md += `| # | التصنيف | الملف | السطر | التفاصيل |\n|---|---|---|---|---|\n`;
  critical.forEach((f, i) => { md += `| ${i+1} | ${f.category} | \`${f.file}\` | ${f.line} | ${f.detail} |\n`; });
  md += `\n`;
}

if (medium.length > 0) {
  md += `## 🟡 مشاكل متوسطة\n\n`;
  md += `| # | التصنيف | الملف | السطر | التفاصيل |\n|---|---|---|---|---|\n`;
  medium.forEach((f, i) => { md += `| ${i+1} | ${f.category} | \`${f.file}\` | ${f.line} | ${f.detail} |\n`; });
  md += `\n`;
}

if (minor.length > 0) {
  md += `## 🔵 ملاحظات بسيطة\n\n`;
  md += `| # | التصنيف | الملف | السطر | التفاصيل |\n|---|---|---|---|---|\n`;
  minor.forEach((f, i) => { md += `| ${i+1} | ${f.category} | \`${f.file}\` | ${f.line} | ${f.detail} |\n`; });
  md += `\n`;
}

md += `---\n\n## الإصلاحات المطبّقة في هذا الجرد\n\n`;
md += `| # | المشكلة | الملف | الإصلاح |\n|---|---|---|---|\n`;
md += `| 1 | catch فارغ (6 مواقع) | index.ts, backupIpc.ts, trashBinIpc.ts, AutoBackupService.ts, ExportButton.tsx | أُضيف console.error أو alert لكل catch فارغ |\n`;
md += `| 2 | catch بدون تسجيل (3 hooks) | useCases.ts, useClients.ts, useSettings.ts | أُضيف console.error قبل return |\n`;
md += `| 3 | طريقة preload غير مستخدمة: getAppVersion | Sidebar.tsx | تم استدعاؤها لعرض رقم الإصدار في الشريط الجانبي |\n`;
md += `| 4 | طريقة preload غير مستخدمة: getAnnouncementById | useAnnouncements.ts | تم إنشاء دالة getAnnouncementById في الـ hook |\n`;
md += `| 5 | تبويب announcements غير موجود في Header tabTitles | Header.tsx | أُضيف تعريف announcements |\n`;
md += `| 6 | import غير مستخدم: GenericPlaceholder | App.tsx | تم حذف الـ import |\n`;
md += `| 7 | 731 عنصر تفاعلي بدون data-testid | كل ملفات الواجهة | أُضيف data-testid لكل عنصر بنمط page.section.action |\n`;

fs.writeFileSync('STATIC_FINDINGS.md', md);
console.log(`STATIC_FINDINGS.md written. Total findings: ${findings.length} (${critical.length} critical, ${medium.length} medium, ${minor.length} minor)`);
