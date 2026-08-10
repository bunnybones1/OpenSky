const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
  root: true,
  env: {
    browser: true,
    es6: true
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'coverage',
    'config',
    '.eslintrc.cjs',
    'vite.config.mts'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
    ecmaVersion: 6,
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint',
    'simple-import-sort',
    'deprecation',
    'unused-imports',
    'prettier'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  rules: {
    'prefer-const': ['error'],
    '@typescript-eslint/no-redeclare': 'error',
    'comma-dangle': 'off',
    'no-prototype-builtins': 'off',
    'no-debugger': 'warn',
    'no-useless-rename': 'error',

    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    'unused-imports/no-unused-imports-ts': 'warn',
    'unused-imports/no-unused-vars-ts': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_'
      }
    ],
    'deprecation/deprecation': 'warn',
    '@typescript-eslint/explicit-member-accessibility': [
      'warn',
      {
        accessibility: 'no-public'
      }
    ],
    '@typescript-eslint/require-await': 'error',
    'prettier/prettier': 'warn'
  }
})
