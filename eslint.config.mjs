// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import tsParser from '@typescript-eslint/parser'
import antfu from '@antfu/eslint-config'

export default withNuxt(antfu({
        type: "app",
        typescript: true,
        formatters: true,
        stylistic: {
            indent: 2,
            semi: true,
            quotes: "double",
        },
    }, {
        rules: {
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': ['warn', { ignoreVoid: true }],
            '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
            "ts/no-redeclare": "off",
            "ts/consistent-type-definitions": ["error", "type"],
            "no-console": ["warn"],
            "antfu/no-top-level-await": ["off"],
            "node/prefer-global/process": ["off"],
            "node/no-process-env": ["error"],
            "perfectionist/sort-imports": ["error", {
                tsconfigRootDir: '.',
            }],
            "unicorn/filename-case": ["error", {
                case: "kebabCase",
                ignore: ["README.md"],
            }],
        },
    }
))