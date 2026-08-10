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
    'src/vendor',
    '.eslintrc.cjs',
    'vite.config.mts'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
    ecmaVersion: 2018,
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
    // General
    'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
    '@typescript-eslint/no-redeclare': 'error',
    'comma-dangle': 'off',
    'no-prototype-builtins': 'off',
    'no-debugger': 'warn',
    'no-useless-catch': 'off',
    'no-extra-boolean-cast': 'off',
    'no-self-assign': 'off',
    curly: 'error',
    'no-useless-rename': 'error',

    // Plugins
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
    // Typescript
    '@typescript-eslint/explicit-member-accessibility': [
      'warn',
      {
        accessibility: 'no-public'
      }
    ],
    '@typescript-eslint/no-implied-eval': 'off', // Keep off: Has performance implications and we never eval anyways
    '@typescript-eslint/prefer-regexp-exec': 'off',
    '@typescript-eslint/await-thenable': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/no-unsafe-argument': 'off',

    // Optional - Investigate if we can remove these TODO
    'no-inner-declarations': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/restrict-plus-operands': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'prettier/prettier': 'warn',

    // To cover setTimeout bug:
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.name='setTimeout'][arguments.length!=2]",
        message:
          'You must pass a timeout to setTimeout. Using undefined hits a Firefox bug. https://bugzilla.mozilla.org/show_bug.cgi?id=1839714'
      }
    ]
  }
})
