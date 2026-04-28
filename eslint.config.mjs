import eslint from '@eslint/js';
import stencilPlugin from '@stencil/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const stencilRecommended = stencilPlugin.configs.flat.recommended;

export default defineConfig(
  globalIgnores(['dist', 'loader', 'www']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ...stencilRecommended,
    files: ['**/*.tsx'],
    languageOptions: {
      ...stencilRecommended.languageOptions,
      parserOptions: {
        ...stencilRecommended.languageOptions?.parserOptions,
        project: './tsconfig.eslint.json',
      },
    },
    plugins: {
      ...stencilRecommended.plugins,
      stencil: stencilPlugin,
    },
    rules: {
      ...stencilRecommended.rules,
      'stencil/ban-default-true': 'off',
      'stencil/reserved-member-names': 'warn',
      'stencil/strict-boolean-conditions': 'off',
      'stencil/class-pattern': [
        'error',
        {
          pattern: '^Zanit[A-Z].*$',
        },
      ],
      'stencil/decorators-style': 'off',
      'stencil/required-prefix': ['error', ['zanit']],
      'stencil/prefer-vdom-listener': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^h$',
        },
      ],
      'react/jsx-no-bind': 'off',
    },
  }
);
