import eslint from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import globals from 'globals'
import path from 'node:path'
import tseslint from 'typescript-eslint'

const allowedSourceNames = new Set([
  'error',
  'global-error',
  'index',
  'layout',
  'loading',
  'not-found',
  'page',
  'route',
  'template',
])

const jabsoPlugin = {
  rules: {
    'kebab-case-filenames': {
      meta: { type: 'suggestion', schema: [] },
      create: (context) => ({
        Program: (node) => {
          const filename = path.basename(context.filename)
          const sourceName = filename
            .replace(/\.d\.(?:ts|tsx)$/, '')
            .replace(/\.(?:[cm]?[jt]sx?)$/, '')
            .replace(/\.(?:test|spec)$/, '')
          const isConfig = sourceName.endsWith('.config')
          const isKebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sourceName)
          if (!allowedSourceNames.has(sourceName) && !isConfig && !isKebabCase) {
            context.report({ node, message: 'Source filenames must use kebab-case.' })
          }
        },
      }),
    },
  },
}

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/dist/**',
      '**/next-env.d.ts',
      '**/node_modules/**',
      '.spike-dumps/**',
      'spikes/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: { jabso: jabsoPlugin },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'jabso/kebab-case-filenames': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration',
          message: 'Use a const arrow function instead of a function declaration.',
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: ['apps/web/src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['src/app/**', 'src/screens/**', 'src/widgets/**'],
          message: 'Shared modules cannot depend on app, screens, or widgets.',
        }],
      }],
    },
  },
  {
    files: ['apps/web/src/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['src/app/**', 'src/screens/**'],
          message: 'Widgets cannot depend on app or screens.',
        }],
      }],
    },
  },
  {
    files: ['apps/web/src/screens/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['src/app/**'],
          message: 'Screens cannot depend on the app routing layer.',
        }],
      }],
    },
  },
  {
    files: ['apps/server/src/adapters/http/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['src/adapters/mcp/**', 'src/adapters/persistence/**', 'src/composition/**'],
          message: 'HTTP adapters depend on ports and domains, not concrete sibling adapters or composition.',
        }],
      }],
    },
  },
  {
    files: ['apps/server/src/adapters/mcp/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['src/adapters/http/**', 'src/adapters/persistence/**', 'src/composition/**'],
          message: 'MCP adapters depend on ports and domains, not concrete sibling adapters or composition.',
        }],
      }],
    },
  },
  {
    files: ['apps/server/src/adapters/persistence/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['src/adapters/http/**', 'src/adapters/mcp/**', 'src/composition/**'],
          message: 'Persistence adapters depend on ports and domains, not concrete sibling adapters or composition.',
        }],
      }],
    },
  },
  {
    files: ['apps/server/src/ports/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['src/adapters/**', 'src/composition/**'],
          message: 'Ports cannot depend on adapters or composition.',
        }],
      }],
    },
  },
)
