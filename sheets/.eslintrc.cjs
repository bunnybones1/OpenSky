module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
      }
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/jsx-runtime',
    'plugin:valtio/recommended',
    'prettier' // Add this line!
  ],
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'simple-import-sort',
    'react-refresh',
    'prettier'
  ],
  rules: {
    'linebreak-style': ['error', process.platform === 'win32' ? 'windows' : 'unix'],
    'no-debugger': 'warn',
    semi: 0,
    'react-refresh/only-export-components': 'warn',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'react/jsx-indent': ['error', 2],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['node_modules/*'],
            message:
              'Imports from node_modules not allowed. Import from workspace alias instead'
          }
        ]
      }
    ],
    'max-len': [
      'warn',
      {
        code: 90,
        tabWidth: 2,
        ignoreTrailingComments: true,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true
      }
    ],
    'comma-dangle': ['error', 'never'],
    'react/jsx-filename-extension': [
      1,
      { extensions: ['.js', '.jsx', '.ts', '.tsx'] }
    ],
    'react/no-set-state': 'off',
    'prettier/prettier': ['warn'],
    'prefer-promise-reject-errors': 'off',
    camelcase: 'off',
    'arrow-parens': ['warn', 'always'],
    // We like being able to specify types even when they're inferrable
    '@typescript-eslint/no-inferrable-types': 'off',
    // Explicit any's are sometimes necessary
    '@typescript-eslint/no-explicit-any': 'off',
    // A lot of the time these are necessary in react. eg.:
    // const value = 0
    // ...
    // <>{value && <SomeComponent />}</>
    // Will render 0 instead of SomeComponent
    'no-extra-boolean-cast': 'off',
    // Sometimes its necessary to ignore ts compilation errors, especiall
    // when dealing with third party libraries.
    '@typescript-eslint/ban-ts-comment': 2,
    // Typescript already does this validation for us
    'react/prop-types': 'off',
    'no-prototype-builtins': 2,
    '@typescript-eslint/no-non-null-assertion': 2,
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-var-requires': 'off',
    'function-paren-newline': 'off'
  }
}
