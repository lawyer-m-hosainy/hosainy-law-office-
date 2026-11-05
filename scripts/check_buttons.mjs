import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths('src/renderer/**/*.tsx');

console.log('Renderer TSX files:', project.getSourceFiles().length);

const results = [];

for (const sf of project.getSourceFiles()) {
  const rel = path.relative(process.cwd(), sf.getFilePath());
  const elements = [
    ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  for (const el of elements) {
    const tagName = el.getTagNameNode().getText();
    const onClick = el.getAttribute('onClick');
    const isButton = tagName === 'button';

    if (isButton || onClick) {
      let handlerSnippet = '';
      let issue = null;

      if (!onClick && isButton) {
        const typeAttr = el.getAttribute('type');
        const typeVal = typeAttr?.getInitializer()?.getText().replace(/['"]/g, '');
        if (typeVal !== 'submit') {
          // button without onClick and not type="submit"
          issue = 'NO_ONCLICK_AND_NOT_SUBMIT';
        }
      } else if (onClick) {
        const init = onClick.getInitializer();
        if (init) {
          handlerSnippet = init.getText();
          // check if empty
          if (init.getKind() === SyntaxKind.JsxExpression) {
            const expr = init.getExpression();
            if (expr) {
              const text = expr.getText().trim();
              if (text === '() => {}' || text === '() => { }' || text === 'function() {}' || text === '() => undefined') {
                issue = 'EMPTY_HANDLER';
              } else if (expr.getKind() === SyntaxKind.ArrowFunction || expr.getKind() === SyntaxKind.FunctionExpression) {
                const body = expr.getBody();
                const bodyText = body.getText().trim();
                if (bodyText === '{}' || bodyText === '') {
                  issue = 'EMPTY_HANDLER';
                } else if (/^\{?\s*console\.(log|info|debug)\(.*\);?\s*\}?$/.test(bodyText)) {
                  issue = 'CONSOLE_LOG_ONLY';
                } else if (/TODO|FIXME/i.test(bodyText) && !/set|fetch|handle|on|await|electronAPI/i.test(bodyText)) {
                  issue = 'TODO_ONLY';
                }
              }
            }
          }
        }
      }

      // Check disabled attribute
      const disabled = el.getAttribute('disabled');
      let disabledIssue = null;
      if (disabled) {
        const init = disabled.getInitializer ? disabled.getInitializer() : null;
        if (!init) {
          // <button disabled ...>
          disabledIssue = 'ALWAYS_DISABLED_BARE';
        } else {
          const dText = init.getText().replace(/[{}\s]/g, '');
          if (dText === 'true') {
            disabledIssue = 'ALWAYS_DISABLED_TRUE';
          } else if (dText === '!true' || dText === 'false') {
            disabledIssue = 'DISABLED_EXPRESSION_' + dText;
          }
        }
      }

      if (issue || disabledIssue) {
        results.push({
          file: rel,
          line: el.getStartLineNumber(),
          tagName,
          issue,
          disabledIssue,
          handlerSnippet: handlerSnippet.slice(0, 100),
          fullTag: el.getText().slice(0, 150),
        });
      }
    }
  }
}

console.log('Issues found:', results.length);
console.log(JSON.stringify(results, null, 2));
