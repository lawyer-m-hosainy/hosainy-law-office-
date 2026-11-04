import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths('src/**/*.ts');
project.addSourceFilesAtPaths('src/**/*.tsx');

console.log('Total source files loaded:', project.getSourceFiles().length);

// 1. Analyze IPC Channels in main vs preload vs renderer
const mainIpcFiles = project.getSourceFiles().filter(sf => sf.getFilePath().includes('src/main/ipc') || sf.getFilePath().includes('src\\main\\ipc'));
const preloadFile = project.getSourceFile(sf => sf.getFilePath().endsWith('preload/index.ts') || sf.getFilePath().endsWith('preload\\index.ts'));
const rendererFiles = project.getSourceFiles().filter(sf => sf.getFilePath().includes('src/renderer') || sf.getFilePath().includes('src\\renderer'));

const registeredIpcMainChannels = new Map(); // channel -> file
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

// IPC calls from preload
const preloadInvokedChannels = new Map(); // channel -> method
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

// Preload exposed methods
const preloadMethods = new Set();
if (preloadFile) {
  // Look for contextBridge.exposeInMainWorld('electronAPI', { ... })
  const objectLiterals = preloadFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
  for (const obj of objectLiterals) {
    for (const prop of obj.getProperties()) {
      if (prop.getName) {
        preloadMethods.add(prop.getName());
      }
    }
  }
}

// Renderer calls to window.electronAPI or ipcRenderer
const rendererUsedElectronAPIMethods = new Map(); // methodName -> [file]
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

console.log('\n--- IPC AUDIT ---');
console.log('Registered in Main:', registeredIpcMainChannels.size);
console.log('Invoked by Preload:', preloadInvokedChannels.size);
console.log('Methods in Preload:', preloadMethods.size);
console.log('Preload methods called in Renderer:', rendererUsedElectronAPIMethods.size);

// Preload methods not called in renderer
const unusedPreloadMethods = [];
for (const m of preloadMethods) {
  if (!rendererUsedElectronAPIMethods.has(m)) {
    unusedPreloadMethods.push(m);
  }
}
console.log('Unused preload methods:', unusedPreloadMethods);

// Main channels not invoked anywhere
const unusedMainChannels = [];
for (const [ch, file] of registeredIpcMainChannels.entries()) {
  if (!preloadInvokedChannels.has(ch) && !rendererDirectIpcInvokes.has(ch)) {
    unusedMainChannels.push({ channel: ch, file });
  }
}
console.log('Main channels not called from Preload or Renderer:', unusedMainChannels);

// Preload/Renderer invoking channels not in Main
const unhandledPreloadChannels = [];
for (const [ch] of preloadInvokedChannels.entries()) {
  if (!registeredIpcMainChannels.has(ch)) {
    unhandledPreloadChannels.push(ch);
  }
}
console.log('Channels invoked but not registered in Main:', unhandledPreloadChannels);

// 2. Audit Catch Blocks
console.log('\n--- CATCH BLOCKS AUDIT ---');
const catchIssues = [];
for (const sf of project.getSourceFiles()) {
  if (sf.getFilePath().includes('node_modules') || sf.getFilePath().includes('dist')) continue;
  const catchClauses = sf.getDescendantsOfKind(SyntaxKind.CatchClause);
  for (const cc of catchClauses) {
    const block = cc.getBlock();
    const statements = block.getStatements();
    const blockText = block.getText();
    const filePath = sf.getFilePath();
    const line = cc.getStartLineNumber();

    if (statements.length === 0) {
      catchIssues.push({
        file: path.relative(process.cwd(), filePath),
        line,
        type: 'EMPTY_CATCH',
        snippet: blockText,
      });
    } else {
      // Check if it merely does nothing or only empty comment
      const nonCommentText = blockText.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/[{}\s]/g, '');
      if (nonCommentText.length === 0) {
        catchIssues.push({
          file: path.relative(process.cwd(), filePath),
          line,
          type: 'EMPTY_CATCH_COMMENTS_ONLY',
          snippet: blockText,
        });
      } else {
        // Check if error is logged, alerted, toasted, or rethrown
        const hasConsole = /console\.(error|warn|log)/.test(blockText);
        const hasAlert = /alert\(|toast|setError|notify|showError|setStatus/.test(blockText);
        const hasThrow = /throw\s+/.test(blockText);
        const hasReturnError = /return\s+\{[^}]*error/i.test(blockText) || /return\s+null/.test(blockText) || /return\s+false/.test(blockText);
        if (!hasConsole && !hasAlert && !hasThrow && !hasReturnError) {
          catchIssues.push({
            file: path.relative(process.cwd(), filePath),
            line,
            type: 'SILENT_OR_SWALLOWED_ERROR',
            snippet: blockText.slice(0, 100),
          });
        }
      }
    }
  }
}
console.log('Catch issues found:', catchIssues.length);
console.log(JSON.stringify(catchIssues, null, 2));

// 3. Audit JSX Interactive Elements
console.log('\n--- JSX INTERACTIVE ELEMENTS AUDIT ---');
const interactiveElements = [];
const emptyHandlerButtons = [];
const alwaysDisabledButtons = [];
const testIdCounts = new Map();

for (const sf of rendererFiles) {
  const relPath = path.relative(process.cwd(), sf.getFilePath());
  // find JSX Opening Elements and Self Closing Elements
  const jsxElements = [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  for (const el of jsxElements) {
    const tagName = el.getTagNameNode().getText();
    const isButton = tagName === 'button';
    const isInput = tagName === 'input';
    const isSelect = tagName === 'select';
    const isTextarea = tagName === 'textarea';
    const isA = tagName === 'a';
    
    // Check if element has onClick
    const onClickAttr = el.getAttribute('onClick');
    const onChangeAttr = el.getAttribute('onChange');
    const onSubmitAttr = el.getAttribute('onSubmit');
    const isInteractive = isButton || isInput || isSelect || isTextarea || isA || Boolean(onClickAttr);

    if (!isInteractive) continue;

    // Check data-testid
    const testIdAttr = el.getAttribute('data-testid');
    let testId = null;
    if (testIdAttr) {
      if (testIdAttr.getInitializer) {
        testId = testIdAttr.getInitializer().getText().replace(/['"`]/g, '');
      }
    }

    if (testId) {
      testIdCounts.set(testId, (testIdCounts.get(testId) || 0) + 1);
    }

    // Check handler for buttons/clickable
    const handlerAttr = onClickAttr || onChangeAttr || onSubmitAttr;
    let handlerText = '';
    let isEmptyHandler = false;
    let isOnlyConsoleOrTodo = false;

    if (isButton || onClickAttr) {
      if (!onClickAttr) {
        // Form submit button might not have onClick, which is valid if form has onSubmit or type="submit"
        const typeAttr = el.getAttribute('type');
        const typeVal = typeAttr?.getInitializer ? typeAttr.getInitializer().getText().replace(/['"]/g, '') : '';
        if (typeVal !== 'submit') {
          // No onClick on button
        }
      } else {
        const init = onClickAttr.getInitializer();
        if (init) {
          handlerText = init.getText();
          // check empty: () => {}, () => { }, function() {}
          const cleaned = handlerText.replace(/^{?\s*\(?\s*\)?\s*=>\s*\{?\s*/, '').replace(/\}?\s*}?$/, '').trim();
          if (cleaned === '' || cleaned === '{}' || cleaned === '() => {}') {
            isEmptyHandler = true;
          } else if (/^(console\.log\(.*?\)|TODO|(\/\*.*?\*\/))\s*;?$/.test(cleaned)) {
            isOnlyConsoleOrTodo = true;
          }
        }
      }

      // Check disabled attribute
      const disabledAttr = el.getAttribute('disabled');
      if (disabledAttr) {
        const dInit = disabledAttr.getInitializer();
        if (dInit) {
          const dText = dInit.getText();
          if (dText === '{true}' || dText === '"true"') {
            alwaysDisabledButtons.push({ file: relPath, line: el.getStartLineNumber(), element: el.getText().slice(0, 100), reason: 'disabled={true}' });
          } else if (dText === '{!true}' || dText === '{false && ...}') {
            alwaysDisabledButtons.push({ file: relPath, line: el.getStartLineNumber(), element: el.getText().slice(0, 100), reason: 'impossible condition' });
          }
        } else {
          // bare disabled attribute: <button disabled>
          alwaysDisabledButtons.push({ file: relPath, line: el.getStartLineNumber(), element: el.getText().slice(0, 100), reason: 'bare disabled' });
        }
      }
    }

    if (isEmptyHandler || isOnlyConsoleOrTodo) {
      emptyHandlerButtons.push({
        file: relPath,
        line: el.getStartLineNumber(),
        element: el.getText().slice(0, 100),
        handler: handlerText,
        reason: isEmptyHandler ? 'empty handler' : 'console.log or TODO only',
      });
    }

    interactiveElements.push({
      file: relPath,
      line: el.getStartLineNumber(),
      tagName,
      testId,
      handlerText: handlerText.slice(0, 60),
    });
  }
}

console.log('Total interactive elements found:', interactiveElements.length);
console.log('Elements with data-testid:', interactiveElements.filter(e => e.testId).length);
console.log('Elements without data-testid:', interactiveElements.filter(e => !e.testId).length);
console.log('Empty handler buttons:', emptyHandlerButtons);
console.log('Always disabled buttons:', alwaysDisabledButtons);

// Check duplicate testIds
const duplicateTestIds = [];
for (const [id, count] of testIdCounts.entries()) {
  if (count > 1) {
    duplicateTestIds.push({ id, count });
  }
}
console.log('Duplicate test-ids:', duplicateTestIds);

// 4. DB Tables audit
console.log('\n--- DB TABLES AUDIT ---');
const migrationFiles = project.getSourceFiles().filter(sf => sf.getFilePath().includes('migrations'));
const tablesCreated = new Set();
for (const mf of migrationFiles) {
  const text = mf.getFullText();
  const matches = text.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi);
  for (const m of matches) {
    tablesCreated.add(m[1]);
  }
}
console.log('Tables defined in migrations:', Array.from(tablesCreated));

const tableReferences = new Map();
for (const t of tablesCreated) {
  tableReferences.set(t, 0);
}

const allBackendFiles = project.getSourceFiles().filter(sf => sf.getFilePath().includes('src/main') || sf.getFilePath().includes('src\\main'));
for (const sf of allBackendFiles) {
  if (sf.getFilePath().includes('migrations')) continue;
  const text = sf.getFullText();
  for (const t of tablesCreated) {
    const regex = new RegExp(`\\b${t}\\b`, 'i');
    if (regex.test(text)) {
      tableReferences.set(t, tableReferences.get(t) + 1);
    }
  }
}
console.log('Table references count across backend services:');
for (const [t, count] of tableReferences.entries()) {
  console.log(`  ${t}: ${count} files reference it`);
}
