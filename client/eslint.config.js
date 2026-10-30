import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['useCart', 'useStudio', 'useFavorites'] }],
      // JSX usage isn't tracked without eslint-plugin-react, so only flag unused variables.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'after-used', ignoreRestSiblings: true }]
    }
  },
  {
    files: ['vite.config.js'],
    languageOptions: { globals: globals.node }
  }
];
