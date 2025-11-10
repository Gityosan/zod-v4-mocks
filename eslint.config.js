import stylistic from '@stylistic/eslint-plugin';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptEslintParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      '@stylistic': stylistic,
    },
    rules: {
      // TypeScript recommended rules
      ...typescriptEslint.configs['recommended-type-checked'].rules,
      ...typescriptEslint.configs['stylistic-type-checked'].rules,

      // Disable some overly strict rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',

      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: ['import', 'parameter'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: ['function'],
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: ['typeLike', 'typeAlias'],
          format: ['PascalCase'],
        },
        {
          selector: ['typeProperty'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allowSingleOrDouble',
        },
        {
          selector: ['objectLiteralProperty'],
          format: null,
        },
        {
          selector: ['variable'],
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          modifiers: ['const', 'global'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
      ],

      // Basic JavaScript rules
      'no-console': 'off',
      'no-shadow': 'error',
      'prefer-const': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      // Stylistic rules
      '@stylistic/padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'function',
        },
        {
          blankLine: 'always',
          prev: 'import',
          next: '*',
        },
        {
          blankLine: 'never',
          prev: 'import',
          next: 'import',
        },
      ],
    },
  },
  // Config files don't need strict type checking
  {
    files: ['*.config.js', '*.config.ts'],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
];
