import tsParser from '@typescript-eslint/parser';

const INTERACTIVE_TAGS = new Set(['button', 'select', 'textarea', 'input']);

const requireDataTestIdRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require data-testid on interactive elements following page.section.action format',
    },
    messages: {
      missingTestId: 'Interactive element <{{tagName}}> must have a data-testid attribute in "page.section.action" format.',
      invalidPattern: 'data-testid "{{testId}}" does not match the required "page.section.action" pattern (at least 3 dot-separated parts).',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const tagName = node.name.name || (node.name.property && node.name.property.name);
        if (!tagName) return;

        // Check if element is naturally interactive or has onClick
        const isInteractiveTag = INTERACTIVE_TAGS.has(tagName);
        const hasOnClick = node.attributes.some(
          (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'onClick'
        );
        const hasOnChange = node.attributes.some(
          (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'onChange'
        );

        const isInteractive = isInteractiveTag || hasOnClick;
        if (!isInteractive) return;

        // Find data-testid attribute
        const testIdAttr = node.attributes.find(
          (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'data-testid'
        );

        if (!testIdAttr) {
          context.report({
            node,
            messageId: 'missingTestId',
            data: { tagName },
          });
          return;
        }

        // Validate pattern if static string: page.section.action (allow hyphens/underscores/digits in parts)
        if (testIdAttr.value && testIdAttr.value.type === 'Literal') {
          const val = String(testIdAttr.value.value);
          // pattern: part.part.part... (at least 3 segments separated by dots)
          const parts = val.split('.');
          if (parts.length < 3 || parts.some(p => p.trim() === '')) {
            context.report({
              node: testIdAttr,
              messageId: 'invalidPattern',
              data: { testId: val },
            });
          }
        }
      },
    };
  },
};

export default [
  {
    files: ['src/renderer/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        Node: 'readonly',
        Element: 'readonly',
        DocumentFragment: 'readonly',
        Image: 'readonly',
        Audio: 'readonly',
        Intl: 'readonly',
        __BUILD_TIMESTAMP__: 'readonly',
        __APP_VERSION__: 'readonly',
      },
    },
    plugins: {
      'custom-rules': {
        rules: {
          'require-data-testid': requireDataTestIdRule,
        },
      },
    },
    rules: {
      'no-undef': 'error',
      'custom-rules/require-data-testid': 'error',
    },
  },
];
