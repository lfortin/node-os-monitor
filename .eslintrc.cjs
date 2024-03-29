module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  overrides: [
    {
      files: ['*.js', '*.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',

        // Possible Problems
        'array-callback-return': 'error',
        'no-await-in-loop': 'warn',
        'no-constructor-return': 'error',
        'no-promise-executor-return': 'error',
        'no-self-compare': 'error',
        'no-template-curly-in-string': 'error',
        'no-unmodified-loop-condition': 'error',
        'no-unreachable-loop': 'error',
        'no-unused-private-class-members': 'warn',
        'require-atomic-updates': 'warn',

        // Suggestions
        'block-scoped-var': 'error',
        'camelcase': ['error', { "properties": "always" }],
        'complexity': ['error', { "max": 10 }],
        'consistent-return': 'warn',
        'consistent-this': ["error", "self"],
        'curly': 'error',
        'default-case': 'error',
        'dot-notation': 'error',
        'eqeqeq': 'error',
        'func-style': ["error", "declaration"],
        'grouped-accessor-pairs': 'error',
        'max-depth': ["error", 5],
        'max-lines-per-function': ["error", 30],
        'max-nested-callbacks': ["error", 5],
        'max-params': ["error", 4],
        'max-statements': ["error", 15],
        'new-cap': ["error", { "newIsCap": true }],
        'no-alert': 'error',
        'no-confusing-arrow': 'warn',
        'no-console': 'error',
        'no-empty-function': 'error',
        'no-eval': 'error',
        'no-extend-native': 'warn',
        'no-extra-bind': 'error',
        'no-floating-decimal': 'error',
        'no-implied-eval': 'error',
        'no-inline-comments': 'warn',
        'no-invalid-this': 'error',
        'no-iterator': 'error',
        'no-labels': 'error',
        'no-lone-blocks': 'error',
        'no-lonely-if': 'error',
        'no-loop-func': 'error',
        'no-magic-numbers': 'off',
        'no-mixed-operators': 'warn',
        'no-multi-assign': 'warn',
        'no-multi-str': 'error',
        'no-negated-condition': 'error',
        'no-nested-ternary': 'error',
        'no-new': 'error',
        'no-new-func': 'error',
        'no-new-object': 'error',
        'no-param-reassign': 'error',
        'no-proto': 'error',
        'no-restricted-globals': ["off", "foo"],
        'no-return-assign': 'error',
        'no-return-await': 'error',
        'no-sequences': 'error',
        'no-throw-literal': 'error',
        'no-undef-init': 'error',
        'no-unneeded-ternary': 'warn',
        'no-useless-call': 'warn',
        'no-useless-computed-key': 'error',
        'no-useless-concat': 'error',
        'no-useless-constructor': 'warn',
        'no-useless-rename': 'error',
        'no-useless-return': 'error',
        'no-var': 'error',
        'no-void': 'error',
        'no-warning-comments': 'warn',
        'one-var': ["warn", "always"],
        'prefer-const': 'error',
        'prefer-destructuring': 'warn',
        'prefer-exponentiation-operator': 'error',
        'prefer-object-spread': 'warn',
        'prefer-rest-params': 'warn',
        'prefer-spread': 'warn',
        'prefer-template': 'error',
        'require-await': 'error',
        'spaced-comment': 'warn',
        'vars-on-top': 'error',
        'yoda': ["error", "never"],

        // Layout & Formatting
        // ...
      },
    },
  ],
};
