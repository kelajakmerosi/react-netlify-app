import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/components/**/*.tsx', 'src/pages/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            'Use shared UI primitive `Button` instead of raw <button> unless this file has migration exception flag and documented rationale.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='input']",
          message:
            'Use shared UI primitive `Input` (or Select/Textarea primitives) instead of raw <input> unless this file has migration exception flag and documented rationale.',
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            'Use shared UI primitive `Select` instead of raw <select> unless this file has migration exception flag and documented rationale.',
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message:
            'Use shared UI primitive `Textarea` instead of raw <textarea> unless this file has migration exception flag and documented rationale.',
        },
      ],
    },
  },
  {
    files: [
      'src/pages/admin/**/*.tsx',
      'src/components/ui/**/*.tsx',
      'src/**/*.test.tsx',
      'src/components/ui/LanguageSwitcher.tsx',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
)
