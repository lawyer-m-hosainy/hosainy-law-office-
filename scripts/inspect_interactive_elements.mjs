import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths('src/renderer/**/*.tsx');

const INTERACTIVE_TAGS = new Set(['button', 'select', 'textarea', 'input', 'a']);

const fileStats = [];

for (const sf of project.getSourceFiles()) {
  const rel = path.relative(process.cwd(), sf.getFilePath());
  const elements = [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  const fileElements = [];
  for (const el of elements) {
    const tagName = el.getTagNameNode().getText();
    const onClick = el.getAttribute('onClick');
    const isInteractiveTag = INTERACTIVE_TAGS.has(tagName);
    const isInteractive = isInteractiveTag || Boolean(onClick);

    if (isInteractive) {
      fileElements.push({
        line: el.getStartLineNumber(),
        tagName,
        hasOnClick: Boolean(onClick),
        onClickText: onClick ? onClick.getText().slice(0, 50) : '',
        placeholder: el.getAttribute('placeholder')?.getText() || '',
        name: el.getAttribute('name')?.getText() || '',
        type: el.getAttribute('type')?.getText() || '',
        testId: el.getAttribute('data-testid')?.getText() || null,
      });
    }
  }

  if (fileElements.length > 0) {
    fileStats.push({
      file: rel,
      count: fileElements.length,
      elements: fileElements,
    });
  }
}

console.log('Total files with interactive elements:', fileStats.length);
let totalElements = 0;
for (const fs of fileStats) {
  totalElements += fs.count;
  console.log(`${fs.file}: ${fs.count} elements`);
}
console.log('Total interactive elements:', totalElements);
