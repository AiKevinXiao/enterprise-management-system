// @ts-check
const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 15000,
  expect: { timeout: 5000 },

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 5000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
