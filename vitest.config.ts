/// <reference types="@vitest/browser/providers/playwright" />
/// <reference types="@vitest/browser/matchers" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      // Unit-tests
      {
        test: {
          name: { label: 'unit', color: 'magenta'},
          include: [
            'tests/unit/**/*.{test,spec}.ts',
            'tests/**/*.unit.{test,spec}.ts',
          ],
          environment: 'happy-dom',
        }
      },
      //  Browser tests
      {
        test: {
          name: { label: 'browser', color: 'green'},
          include: [
            'tests/browser/**/*.{test,spec}.ts',
            'tests/**/*.browser.{test,spec}.ts',
          ],
          browser: {
            enabled: true,
            provider: 'playwright',
            // https://vitest.dev/guide/browser/playwright
            instances: [
              { browser: 'chromium' },
              //{ browser: 'firefox' },
              //{ browser: 'webkit' },
            ],
          },
        },
      },
    ],
  },
})
