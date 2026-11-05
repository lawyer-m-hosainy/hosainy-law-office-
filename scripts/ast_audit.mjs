import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths('src/**/*.ts');
project.addSourceFilesAtPaths('src/**/*.tsx');

// 1. Analyze IPC Channels in main vs preload vs renderer
const mainIpcFiles = project.getSourceFiles().filter(sf => sf.getFilePath().includes('src/main/ipc') || sf.getFilePath().includes('src\\main\\ipc'));
const preloadFile = project.getSourceFile(sf => sf.getFilePath().endsWith('preload/index.ts') || sf.getFilePath().endsWith('preload\\index.ts'));
const rendererFiles = project.getSourceFiles().filter(sf => sf.getFilePath().includes('src/renderer') || sf.getFilePath().includes('src\\renderer'));

const registeredIpcMainChannels = new Map();
for (const sf of mainIpcFiles) {
  const callExprs = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of callExprs) {
    const exprText = call.getExpression().getText();
    if (exprText.includes('ipcMain.handle') || exprText.includes('ipcMain.on')) {
      const args = call.getArguments();
      if (args.length > 0) {
        const channelName = args[0].getText().replace(/['"]/g, '');
        registeredIpcMainChannels.set(channelName, sf.getBaseName());
      }
    }
  }
}

const preloadInvokedChannels = new Map();
if (preloadFile) {
  const callExprs = preloadFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of callExprs) {
    const exprText = call.getExpression().getText();
    if (exprText.includes('ipcRenderer.invoke') || exprText.includes('ipcRenderer.send')) {
      const args = call.getArguments();
      if (args.length > 0) {
        const channelName = args[0].getText().replace(/['"]/g, '');
        preloadInvokedChannels.set(channelName, call.getParent()?.getText().slice(0, 50));
      }
    }
  }
}

const preloadMethods = new Set();
if (preloadFile) {
  const objectLiterals = preloadFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
  for (const obj of objectLiterals) {
    for (const prop of obj.getProperties()) {
      if (prop.getName) {
        preloadMethods.add(prop.getName());
      }
    }
  }
}

const rendererUsedElectronAPIMethods = new Map();
const rendererDirectIpcInvokes = new Map();

for (const sf of rendererFiles) {
  const propAccesses = sf.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
  for (const pa of propAccesses) {
    const text = pa.getText();
    if (text.startsWith('window.electronAPI.') || text.startsWith('electronAPI.')) {
      const methodName = pa.getName();
      if (!rendererUsedElectronAPIMethods.has(methodName)) {
        rendererUsedElectronAPIMethods.set(methodName, new Set());
      }
      rendererUsedElectronAPIMethods.get(methodName).add(sf.getBaseName());
    }
    if (text.startsWith('ipcRenderer.invoke') || text.startsWith('ipcRenderer.send')) {
      const parentCall = pa.getParentIfKind(SyntaxKind.CallExpression);
      if (parentCall) {
        const args = parentCall.getArguments();
        if (args.length > 0) {
          const ch = args[0].getText().replace(/['"]/g, '');
          rendererDirectIpcInvokes.set(ch, sf.getBaseName());
        }
      }
    }
  }
}

console.log('\n=== 1. IPC AUDIT ===');
console.log('Registered in Main:', registeredIpcMainChannels.size);
console.log('Invoked by Preload:', preloadInvokedChannels.size);
console.log('Methods in Preload:', preloadMethods.size);
console.log('Preload methods called in Renderer:', rendererUsedElectronAPIMethods.size);

const unusedPreloadMethods = [];
for (const m of preloadMethods) {
  if (!rendererUsedElectronAPIMethods.has(m)) {
    unusedPreloadMethods.push(m);
  }
}
console.log('Unused preload methods:', unusedPreloadMethods);

const unusedMainChannels = [];
for (const [ch, file] of registeredIpcMainChannels.entries()) {
  if (!preloadInvokedChannels.has(ch) && !rendererDirectIpcInvokes.has(ch)) {
    unusedMainChannels.push({ channel: ch, file });
  }
}
console.log('Main channels not called from Preload or Renderer:', unusedMainChannels);

const unhandledPreloadChannels = [];
for (const [ch] of preloadInvokedChannels.entries()) {
  if (!registeredIpcMainChannels.has(ch)) {
    unhandledPreloadChannels.push(ch);
  }
}
console.log('Channels invoked but not registered in Main:', unhandledPreloadChannels);

// 2. Audit Catch Blocks
console.log('\n=== 2. CATCH BLOCKS AUDIT ===');
const emptyCatches = [];
for (const sf of project.getSourceFiles()) {
  if (sf.getFilePath().includes('node_modules') || sf.getFilePath().includes('dist')) continue;
  const catchClauses = sf.getDescendantsOfKind(SyntaxKind.CatchClause);
  for (const cc of catchClauses) {
    const block = cc.getBlock();
    const statements = block.getStatements();
    const blockText = block.getText();
    const filePath = sf.getFilePath();
    const line = cc.getStartLineNumber();

    const nonComment = blockText.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/[{}\s]/g, '');
    if (nonComment.length === 0) {
      emptyCatches.push({
        file: path.relative(process.cwd(), filePath),
        line,
        snippet: blockText,
      });
    }
  }
}
console.log('Empty catch blocks remaining:', emptyCatches.length);
if (emptyCatches.length > 0) {
  console.log(JSON.stringify(emptyCatches, null, 2));
}

// 3. DB Tables audit from SQL migrations
console.log('\n=== 3. DB TABLES AUDIT ===');
const migrationsDir = path.join(process.cwd(), 'src/main/database/migrations');
const sqlFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

const tablesCreated = new Set();
for (const f of sqlFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
  const matches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi);
  for (const m of matches) {
    tablesCreated.add(m[1]);
  }
}

const tableStats = {};
const allSourceFiles = project.getSourceFiles();

for (const t of tablesCreated) {
  tableStats[t] = { reads: 0, writes: 0, files: new Set() };
  const readRegex = new RegExp(`(SELECT|FROM|JOIN)\\s+[a-zA-Z0-9_,\\s]*\\b${t}\\b`, 'i');
  const writeRegex = new RegExp(`(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+\\b${t}\\b`, 'i');

  for (const sf of allSourceFiles) {
    if (sf.getFilePath().includes('migrations')) continue;
    const text = sf.getFullText();
    if (readRegex.test(text)) {
      tableStats[t].reads++;
      tableStats[t].files.add(sf.getBaseName());
    }
    if (writeRegex.test(text)) {
      tableStats[t].writes++;
      tableStats[t].files.add(sf.getBaseName());
    }
  }
}

console.log(`Total Tables: ${tablesCreated.size}`);
for (const [t, stat] of Object.entries(tableStats)) {
  const fileList = Array.from(stat.files).join(', ');
  console.log(`  Table [${t}]: ${stat.reads} reads, ${stat.writes} writes (Files: ${fileList || 'NONE'})`);
}
