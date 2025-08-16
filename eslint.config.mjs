// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'

export default withNuxt({
    languageOptions: {
        parser: vueParser,
        parserOptions: {
            parser: tsParser,
            project: ['./tsconfig.json'],
            tsconfigRootDir: import.meta.dirname,
            extraFileExtensions: ['.vue'],
        },
    },
    rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': ['warn', { ignoreVoid: true }],
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    },
})
